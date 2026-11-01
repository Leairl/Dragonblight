// Urls and api responses carry the realm slug ("twisting-nether"), which is not what a realm is
// called. Blizzard's own realm name is better wherever it is available - it keeps realms that
// genuinely contain a hyphen, like Azjol-Nerub, spelled the way they are in game - so this is the
// fallback used until that name arrives.
function realmDisplayName(slug: string | undefined): string {
  return (slug ?? "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

//Blizzard's own name ("Zul'jin", "Area 52") when the response carries one, the capitalized slug otherwise
function realmName(realm: { name?: string; slug?: string } | undefined): string {
  if (realm?.name) {
    return realm.name;
  }
  return realmDisplayName(realm?.slug);
}

function realmSlug(name: string | undefined): string {
  return (name ?? "").toLowerCase().replace("'", "").replace(" ", "-");
}

function formerNames(
  previous: { name: string; realm: string }[] | undefined,
  currentRealm: string | undefined
): string {
  if (!previous?.length) {
    return "";
  }
  const names = previous.map((p) =>
    p.realm === currentRealm?.toLowerCase()
      ? p.name
      : p.name + "-" + realmDisplayName(p.realm)
  );
  return "Formerly " + names.join(", ");
}

export { realmDisplayName, realmName, realmSlug, formerNames};
