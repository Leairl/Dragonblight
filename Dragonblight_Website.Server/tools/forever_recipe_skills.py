#!/usr/bin/env python3
# Builds ForeverRecipes.tsv: per recipe, the skill it needs, the item that teaches it, and where that item comes from.
# Columns: recipe id, required skill (blank if unknown), pattern|trainer|learned|estimate|unknown|hidden, item id, item name,
# item icon URL, source,
# and the source's parts as JSON ([{"kind":"Drop","name":"Raging Rot Hide","zone":"Silverpine Forest","wowhead":"npc=1943"}])
# Rerun after a Forever patch that adds recipes, then restart the server. Wowhead gets one request a
# second and answers slowly, so a first full run takes hours; PARTIAL=1 writes the file at once from what's
# cached, and the cache dir makes later runs quick:
#   curl -o /tmp/sla.csv "https://wago.tools/db2/SkillLineAbility/csv?product=wow_classic_era"
#   curl -o /tmp/area.csv "https://wago.tools/db2/AreaTable/csv?product=wow_classic_era"
#   curl -o /tmp/spelleffect.csv "https://wago.tools/db2/SpellEffect/csv?product=wow_classic_era"
#   curl -L -o /tmp/classicdb.sql.gz "https://raw.githubusercontent.com/cmangos/classic-db/master/Full_DB/ClassicDB_1_12_1_z2815.sql.gz"
#   python3 -I tools/forever_recipe_skills.py appsettings.json /tmp/sla.csv /tmp/area.csv /tmp/spelleffect.csv /tmp/classicdb.sql.gz /tmp/forever-items ForeverRecipes.tsv
# Usage: python3 -I forever_recipe_skills.py <appsettings.json> <era SkillLineAbility.csv> <era AreaTable.csv> <era SpellEffect.csv>
#        <cmangos ClassicDB .sql or .sql.gz> <cache dir> <out.tsv>
#  1. every recipe of every Forever profession tier (static-forever-us)
#  2. every recipe item (item class 9): its item data says "Requires Tailoring (90)"
#  3. a recipe gets the level of the item named "<Pattern|Plans|...>: <recipe name>" for its profession
#  4. recipes no item teaches: the skill Classic's trainers ask before teaching them, from cmangos's
#     npc_trainer data (its spells are the trainer's teaching spells; SpellEffect's "learn spell" effect
#     links each to the recipe). Recipes learned with the profession itself need skill 1. The rest
#     (quest rewards, recipes new in Forever) get an estimate from Classic era's SkillLineAbility,
#     fitted to the exact levels found in step 3
#  5. each recipe item's icon, from Blizzard's item media
#  6. where each recipe item comes from: Wowhead Forever's item XML ("source" and "sourcemore"), one
#     request a second; recipes no item teaches are from a trainer. With PARTIAL=1 only what's already
#     cached is used, so the file can be written while a full run is still filling the cache.
import base64, csv, gzip, json, os, re, sys, time, urllib.error, urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

settings_path, sla_path, area_path, spelleffect_path, trainer_db_path, cache_dir, out_path = sys.argv[1:8]
os.makedirs(cache_dir, exist_ok=True)

with open(settings_path, encoding="utf-8-sig") as f:
    api = json.load(f)["BattlenetApi"]
basic = base64.b64encode(f"{api['clientId']}:{api['clientSecret']}".encode()).decode()
token = json.load(urllib.request.urlopen(urllib.request.Request(
    "https://oauth.battle.net/token", data=b"grant_type=client_credentials",
    headers={"Authorization": "Basic " + basic, "Content-Type": "application/x-www-form-urlencoded"})))["access_token"]

def blizzard(path, query=""):
    url = f"https://us.api.blizzard.com{path}?namespace=static-forever-us&locale=en_US{query}"
    for attempt in range(4):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"Authorization": "Bearer " + token}), timeout=60))
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            print("  retry", path, e, file=sys.stderr)
        except (urllib.error.URLError, TimeoutError) as e:
            print("  retry", path, e, file=sys.stderr)
    return None

# 1. recipes
recipes = []  # (profession id, recipe id, name)
for profession in blizzard("/data/wow/profession/index")["professions"]:
    pid = profession["id"]
    if pid == 2933:  # Test Profession [DNT]
        continue
    for tier in blizzard(f"/data/wow/profession/{pid}").get("skill_tiers", []):
        data = blizzard(f"/data/wow/profession/{pid}/skill-tier/{tier['id']}")
        for category in data.get("categories", []):
            if category["name"].lower() == "season of discovery":
                continue
            for recipe in category.get("recipes", []):
                recipes.append((pid, recipe["id"], recipe["name"]))
print(len(recipes), "recipes", file=sys.stderr)

# 2. recipe items, a thousand at a time by id
items = []
last = 0
while True:
    page = blizzard("/data/wow/search/item", f"&item_class.id=9&id=%5B{last + 1},%5D&_pageSize=1000&orderby=id")
    rows = page.get("results", [])
    if not rows:
        break
    for row in rows:
        items.append((row["data"]["id"], row["data"]["name"]["en_US"]))
    last = max(row["data"]["id"] for row in rows)
    if len(rows) < 1000:
        break
print(len(items), "recipe items", file=sys.stderr)

def requirement(item):
    item_id, name = item
    path = os.path.join(cache_dir, f"{item_id}.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    data = blizzard(f"/data/wow/item/{item_id}")
    skill = ((data or {}).get("preview_item", {}).get("requirements") or {}).get("skill")
    found = None
    if skill:
        found = {"id": item_id, "name": name, "profession": skill["profession"]["id"], "level": skill["level"]}
    if data is not None:
        with open(path, "w") as f:
            json.dump(found, f)
    return found

with ThreadPoolExecutor(8) as pool:
    taught = [t for t in pool.map(requirement, items) if t]

# 3. match by name: "Pattern: Red Woolen Bag" teaches Red Woolen Bag
levels = {}
teachers = {}
for t in taught:
    head, sep, rest = t["name"].partition(": ")
    if not sep:
        continue
    key = (t["profession"], rest.strip().lower())
    if key not in levels or t["level"] < levels[key]:
        levels[key] = t["level"]
        teachers[key] = t

with open(sla_path, encoding="utf-8") as f:
    sla = {int(r["ID"]): r for r in csv.DictReader(f)}

def yellow(pid, rid):
    era = sla.get(rid)
    if era and era["SkillLine"] == str(pid) and era["TrivialSkillLineRankLow"].isdigit() and int(era["TrivialSkillLineRankLow"]) > 0:
        return int(era["TrivialSkillLineRankLow"])
    return None

# 4a. Classic's trainer levels. cmangos lists each trainer's teaching spells with the skill it asks
# for (reqskillvalue); a teaching spell's "learn spell" effect (36) names the recipe spell it teaches.
learned_by = {}  # recipe spell -> teaching spells
with open(spelleffect_path, encoding="utf-8") as f:
    for r in csv.DictReader(f):
        if r["Effect"] == "36" and r["EffectTriggerSpell"].isdigit():
            learned_by.setdefault(int(r["EffectTriggerSpell"]), []).append(int(r["SpellID"]))
trainer_levels = {}  # (teaching spell, skill line) -> lowest skill any trainer asks
trainer_row = re.compile(r"\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+),")
opener = gzip.open if trainer_db_path.endswith(".gz") else open
with opener(trainer_db_path, "rt", encoding="utf-8", errors="replace") as f:
    for line in f:
        if not (line.startswith("INSERT INTO `npc_trainer` VALUES") or line.startswith("INSERT INTO `npc_trainer_template` VALUES")):
            continue
        for m in trainer_row.finditer(line):
            _, spell, _, skill, value, _ = map(int, m.groups())
            if skill == 0:
                continue
            key = (spell, skill)
            if key not in trainer_levels or value < trainer_levels[key]:
                trainer_levels[key] = value
print(len(trainer_levels), "trainer spells with a skill requirement", file=sys.stderr)

def trainer_level(pid, rid):
    era = sla.get(rid)
    if not era or era["SkillLine"] != str(pid) or not era["Spell"].isdigit():
        return None
    spell = int(era["Spell"])
    found = [trainer_levels[(t, pid)] for t in learned_by.get(spell, []) + [spell] if (t, pid) in trainer_levels]
    if not found:
        return None
    return max(1, min(found))

# recipes Classic gives with the profession itself (AcquireMethod 1), at skill 1
def learned_with_profession(pid, rid):
    era = sla.get(rid)
    return bool(era) and era["SkillLine"] == str(pid) and era["AcquireMethod"] == "1"

# 4b. the estimate: how far below Classic's yellow level the exact levels sit, by yellow band
pairs = []
for pid, rid, name in recipes:
    exact = levels.get((pid, name.lower()))
    y = yellow(pid, rid)
    if exact is not None and y is not None:
        pairs.append((y, exact))
bands = {}
for y, exact in pairs:
    bands.setdefault(min(y // 50, 6), []).append(y - exact)
gap_by_band = {}
for band, gaps in sorted(bands.items()):
    gaps.sort()
    gap_by_band[band] = gaps[len(gaps) // 2]
    print(f"yellow {band * 50}-{band * 50 + 49}: {len(gaps)} recipes, median gap {gap_by_band[band]}, spread {gaps[0]}..{gaps[-1]}", file=sys.stderr)

def estimate(y):
    band = min(y // 50, 6)
    gap = gap_by_band.get(band)
    if gap is None:
        gap = sorted(g for gs in bands.values() for g in gs)[len(pairs) // 2]
    return max(1, min(300, y - gap))

# how wrong the estimate would be on recipes whose level is known
errors = Counter(estimate(y) - exact for y, exact in pairs)
within = sum(n for e, n in errors.items() if abs(e) <= 10)
print(f"estimate within 10 of the real level for {within}/{len(pairs)} known recipes", file=sys.stderr)

# 5. sources, from Wowhead
with open(area_path, encoding="utf-8") as f:
    zones = {int(r["ID"]): r["AreaName_lang"] for r in csv.DictReader(f)}
source_names = {1: "Crafted", 2: "Drop", 3: "PvP", 4: "Quest", 5: "Vendor", 6: "Trainer", 7: "Discovery",
                8: "Redemption", 11: "World event", 12: "Achievement", 16: "Fishing", 21: "Pickpocketing"}

partial = os.environ.get("PARTIAL") == "1"

def item_icon(item_id):
    path = os.path.join(cache_dir, f"media-{item_id}.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    media = blizzard(f"/data/wow/media/item/{item_id}")
    if media is None:
        return ""
    icon = ""
    for asset in media.get("assets", []):
        if asset.get("key") == "icon":
            icon = asset.get("value", "")
    with open(path, "w") as f:
        json.dump(icon, f)
    return icon

def wowhead_item(item_id):
    path = os.path.join(cache_dir, f"wh-{item_id}.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    if partial:
        return None
    for attempt in range(4):
        time.sleep(1)
        try:
            req = urllib.request.Request(f"https://www.wowhead.com/forever/item={item_id}&xml", headers={"User-Agent": "Mozilla/5.0"})
            xml = urllib.request.urlopen(req, timeout=30).read().decode("utf-8")
            break
        except (urllib.error.URLError, TimeoutError) as e:
            print("  wowhead retry", item_id, e, file=sys.stderr)
            time.sleep(30 * (attempt + 1))
    else:
        return None
    info = {"icon": "", "source": [], "sourcemore": []}
    start = xml.find("<icon")
    if start >= 0:
        start = xml.find(">", start) + 1
        info["icon"] = xml[start:xml.find("</icon>", start)]
    start = xml.find("<json><![CDATA[")
    if start >= 0:
        start += len("<json><![CDATA[")
        body = json.loads("{" + xml[start:xml.find("]]></json>", start)] + "}")
        info["source"] = body.get("source", [])
        info["sourcemore"] = body.get("sourcemore", [])
    with open(path, "w") as f:
        json.dump(info, f)
    return info

def source_text(info):
    parts = []
    for n, code in enumerate(info["source"]):
        label = source_names.get(code, "Other")
        more = None
        if n < len(info["sourcemore"]):
            more = info["sourcemore"][n]
        if more and more.get("n"):
            where = more["n"]
            zone = zones.get(more.get("z"))
            if zone:
                where += f" ({zone})"
            label += f": {where}"
        if label not in parts:
            parts.append(label)
    return "; ".join(parts)

# Wowhead's sourcemore "t": the kind of page its "ti" id is on
wowhead_types = {1: "npc", 2: "object", 3: "item", 5: "quest", 6: "spell"}

# The same parts as source_text, one per label, so the page can link the mob, vendor or quest to Wowhead.
def source_parts(info):
    parts = []
    seen = set()
    for n, code in enumerate(info["source"]):
        part = {"kind": source_names.get(code, "Other")}
        label = part["kind"]
        more = None
        if n < len(info["sourcemore"]):
            more = info["sourcemore"][n]
        if more and more.get("n"):
            part["name"] = clean(more["n"])
            label += f": {more['n']}"
            zone = zones.get(more.get("z"))
            if zone:
                part["zone"] = zone
                label += f" ({zone})"
            page = wowhead_types.get(more.get("t"))
            if page and more.get("ti"):
                part["wowhead"] = f"{page}={more['ti']}"
        if label in seen:
            continue
        seen.add(label)
        parts.append(part)
    return parts

# Recipes still in Forever's data that no one can learn: no pattern teaches them and no trainer does
# either (the game's recipe table doesn't mark them). The server leaves "hidden" ones out of the
# not-learned list. Add to this by hand.
UNOBTAINABLE = {
    1384: "Draught of Tongues",  # Alchemy; never taught in Classic either
}

counts = Counter()
unknown = []
needed = {}
for pid, rid, name in recipes:
    t = teachers.get((pid, name.lower()))
    if t:
        needed[t["id"]] = None
with ThreadPoolExecutor(8) as pool:
    icons = dict(zip(needed, pool.map(item_icon, needed)))
print(len(needed), "recipe items to look up on Wowhead", file=sys.stderr)
for n, item_id in enumerate(needed):
    needed[item_id] = wowhead_item(item_id)
    if n % 100 == 0:
        print(" ", n, file=sys.stderr)

def clean(text):
    return " ".join(str(text).replace("\t", " ").split())

with open(out_path, "w", newline="") as f:
    #plain tab-separated lines: clean() already removed tabs and line breaks, and the server splits on tabs
    #without any quoting, so a name with a quote in it is written as it is
    class Out:
        def writerow(self, row):
            f.write("\t".join(str(value) for value in row) + "\r\n")
    out = Out()
    for pid, rid, name in recipes:
        exact = levels.get((pid, name.lower()))
        y = yellow(pid, rid)
        t = teachers.get((pid, name.lower()))
        if rid in UNOBTAINABLE:
            out.writerow([rid, "", "hidden", "", "", "", "Not obtainable", "[]"])
            counts["hidden"] += 1
            continue
        if exact is not None:
            info = needed.get(t["id"]) or {"icon": "", "source": [], "sourcemore": []}
            parts = json.dumps(source_parts(info), separators=(",", ":"))
            out.writerow([rid, exact, "pattern", t["id"], clean(t["name"]), clean(icons.get(t["id"], "")), clean(source_text(info)), parts])
            counts["pattern"] += 1
        elif trainer_level(pid, rid) is not None:
            out.writerow([rid, trainer_level(pid, rid), "trainer", "", "", "", "Trainer", '[{"kind":"Trainer"}]'])
            counts["trainer"] += 1
        elif learned_with_profession(pid, rid):
            out.writerow([rid, 1, "learned", "", "", "", "Trainer", '[{"kind":"Trainer"}]'])
            counts["learned"] += 1
        elif y is not None:
            out.writerow([rid, estimate(y), "estimate", "", "", "", "Trainer", '[{"kind":"Trainer"}]'])
            counts["estimate"] += 1
        else:
            out.writerow([rid, "", "unknown", "", "", "", "Trainer", '[{"kind":"Trainer"}]'])
            counts["unknown"] += 1
            unknown.append(f"{pid}\t{rid}\t{name}")
with open(out_path + ".unknown.txt", "w") as f:
    f.write("\n".join(unknown) + "\n")
print(dict(counts), file=sys.stderr)
