# Deploying to the new server

`.github/workflows/deploy.yml` (Actions → **Deploy** → Run workflow) builds a self-contained linux-x64
Release and deploys it over SSH. On the server, `deploy/remote-deploy.sh`:

- unpacks it into `/opt/dragonblight/releases/<commit>`
- starts Redis and Postgres from `docker-compose.yml` (if Docker is installed)
- installs `dragonblight.service`
- points `/opt/dragonblight/current` at the new release and restarts the service
- checks `http://127.0.0.1:5000/` and switches back to the previous release if the new one doesn't respond
- keeps the last 5 releases

## One-time server setup (Ubuntu)

1. Install Docker with the compose plugin:

   ```bash
   curl -fsSL https://get.docker.com | sudo sh
   ```

2. Create the environment file. The app and docker compose both read it:

   ```bash
   sudo mkdir -p /etc/dragonblight
   sudo tee /etc/dragonblight/dragonblight.env >/dev/null <<'EOF'
   POSTGRES_PASSWORD='change-me'
   ConnectionStrings__Postgres='Host=localhost;Port=5432;Database=dragonblight;Username=dragonblight;Password=change-me'
   Redis__ConnectionString=localhost:6379
   EOF
   sudo chmod 600 /etc/dragonblight/dragonblight.env
   ```

   Use the same password on both lines.

3. Install Nginx. Proxy to `127.0.0.1:5000` and serve `/gear-planner` the same way the old server does
   (see `EC2-MIGRATION-PLAN.md`).

4. Give the SSH user passwordless `sudo`. This is already set up for `ubuntu` on Lightsail/EC2 images.

5. Set up daily Postgres backups (see [Backups](#backups)).

## Backups

Postgres and Redis data live in the Docker volumes `dragonblight_pgdata` and `dragonblight_redis_data`.
Deploys, restarts and reboots leave them alone. `docker compose down -v`, `docker volume rm`/`prune`,
or deleting the instance without a snapshot will lose them.

### Daily Postgres dumps

This keeps 14 days of dumps on the server:

```bash
sudo mkdir -p /var/backups/dragonblight
sudo tee /etc/cron.d/dragonblight-backup >/dev/null <<'EOF'
0 4 * * * root docker exec dragonblight_postgres_container pg_dump -U dragonblight -d dragonblight -Fc > /var/backups/dragonblight/pg-$(date +\%F).dump && find /var/backups/dragonblight -name 'pg-*.dump' -mtime +14 -delete
EOF
```

These dumps are on the same disk as the database. Also turn on Lightsail automatic snapshots
(instance → Snapshots), or copy the dumps somewhere else, so losing the server doesn't lose the data.

### Manual backup

```bash
docker exec dragonblight_postgres_container \
  pg_dump -U dragonblight -d dragonblight -Fc > ~/dragonblight-$(date +%F).dump
```

From your own machine: `scp <user>@<host>:~/dragonblight-*.dump .`

### Restore

```bash
docker exec -i dragonblight_postgres_container \
  pg_restore -U dragonblight -d dragonblight --clean --if-exists < dragonblight-YYYY-MM-DD.dump
```

## GitHub secrets

| Secret | Value |
|---|---|
| `DEPLOY_HOST` | Server IP or hostname |
| `DEPLOY_USER` | SSH user, e.g. `ubuntu` |
| `DEPLOY_KEY` | Private key for that user |
| `PROD_KNOWN_HOSTS` | Output of `ssh-keyscan -H <host>`. Check it against `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` on the server |

The deploy also uses the existing `BATTLENETAPICLIENTS`, `TWITCHAPICLIENTID` and `TWITCHAPICLIENTSECRET`.

## Useful commands on the server

```bash
systemctl status dragonblight
journalctl -u dragonblight -f
ls -l /opt/dragonblight/current
docker compose -f /opt/dragonblight/compose/docker-compose.yml --env-file /etc/dragonblight/dragonblight.env ps
```
