#!/usr/bin/env bash
# Runs on the server as root, called by .github/workflows/deploy.yml.
# Unpacks a release next to the previous ones, switches the "current" symlink, restarts the service,
# and switches back to the previous release if the new one doesn't answer on port 5000.
set -euo pipefail

release="$1"   # commit sha
bundle="$2"    # uploaded tarball

app_dir=/opt/dragonblight
releases="$app_dir/releases"
env_file=/etc/dragonblight/dragonblight.env
health_url=http://127.0.0.1:5000/
keep=5

if [ ! -f "$env_file" ]; then
    echo "missing $env_file - see deploy/README.md for the one-time server setup" >&2
    exit 1
fi

target="$releases/$release"
rm -rf "$target"
mkdir -p "$target"
tar -xzf "$bundle" -C "$target"
rm -f "$bundle"
chmod +x "$target/app/Dragonblight_Website.Server"

# redis and postgres; "up" leaves running containers alone when nothing in the compose file changed
if command -v docker >/dev/null 2>&1; then
    mkdir -p "$app_dir/compose"
    cp "$target/deploy/docker-compose.yml" "$app_dir/compose/docker-compose.yml"
    docker compose -f "$app_dir/compose/docker-compose.yml" --env-file "$env_file" up -d --wait --wait-timeout 600
else
    echo "docker not installed - skipping redis/postgres, assuming they're already running" >&2
fi

if ! cmp -s "$target/deploy/dragonblight.service" /etc/systemd/system/dragonblight.service; then
    cp "$target/deploy/dragonblight.service" /etc/systemd/system/dragonblight.service
    systemctl daemon-reload
    systemctl enable dragonblight
fi

previous="$(readlink -f "$app_dir/current" || true)"

switch_to() {
    ln -sfn "$1" "$app_dir/current.tmp"
    mv -Tf "$app_dir/current.tmp" "$app_dir/current"
    systemctl restart dragonblight
}

healthy() {
    for _ in $(seq 1 60); do
        if curl -fsS -o /dev/null "$health_url"; then
            return 0
        fi
        sleep 2
    done
    return 1
}

switch_to "$target"

if healthy; then
    echo "deployed $release"
else
    echo "release $release did not come up; last log lines:" >&2
    journalctl -u dragonblight -n 100 --no-pager >&2 || true
    if [ -n "$previous" ] && [ -d "$previous" ] && [ "$previous" != "$target" ]; then
        echo "rolling back to $previous" >&2
        switch_to "$previous"
        if healthy; then
            echo "rollback is up" >&2
        else
            echo "rollback did not come up either" >&2
        fi
    fi
    exit 1
fi

# keep the newest $keep releases, never the one that's live
ls -1dt "$releases"/*/ | tail -n +$((keep + 1)) | while read -r old; do
    [ "$(readlink -f "$old")" = "$(readlink -f "$app_dir/current")" ] || rm -rf "$old"
done
