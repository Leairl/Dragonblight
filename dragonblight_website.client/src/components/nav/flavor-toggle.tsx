import { useState } from "react";
import { useLocation } from "react-router";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { CheckIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import { GameFlavor, getFlavor, setFlavor } from "../../helpers/game-flavor";

interface FlavorOption {
  flavor: GameFlavor;
  label: string;
  subtitle: string;
  icon: string; //transparent PNG in public/GameVersions
  soon?: boolean;
}

const options: FlavorOption[] = [
  { flavor: "retail", label: "Retail", subtitle: "Current expansion", icon: "/GameVersions/retail.png" },
  { flavor: "classic", label: "MoP", subtitle: "Mists of Pandaria Classic", icon: "/GameVersions/mop.png" },
  { flavor: "forever", label: "Forever", subtitle: "Rulesets & Legacy progression", icon: "/GameVersions/forever.png", soon: true },
];

//The game logo. Until its PNG exists it shows an empty rounded box, so the layout doesn't shift.
function FlavorIcon({ src, size }: { src: string; size: string }) {
  const [missing, setMissing] = useState(false);
  if (missing) {
    return <span className={size + " flex-none rounded-full border border-gray-700"}></span>;
  }
  return <img className={size + " flex-none object-contain"} src={src} alt="" onError={() => setMissing(true)} />;
}

// Switches the site between Retail, MoP Classic and WoW: Forever.
function FlavorToggle() {
  const current = getFlavor();
  // basename has already stripped the flavor, so this is the path to carry across.
  const { pathname } = useLocation();

  let selected = options[0];
  for (const option of options) {
    if (option.flavor === current) {
      selected = option;
    }
  }

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Game version"
          className="group flex items-center gap-2 rounded-lg border border-gray-700 bg-black/40 px-3 py-1.5 cursor-pointer text-white hover:border-gray-500 outline-hidden focus-visible:border-[#4dc4fd] max-[500px]:px-2"
        >
          <FlavorIcon src={selected.icon} size="h-7 w-7" />
          {/* on a phone the logo, this and the menu button all have to fit on one row */}
          <span className="font-semibold text-sm max-[500px]:hidden">{selected.label}</span>
          <ChevronDownIcon className="text-gray-400 transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          className="z-50 w-[280px] max-w-[calc(100vw-32px)] rounded-xl border border-gray-700 bg-[#1c1f24] p-2 shadow-[0_10px_38px_-10px_rgba(0,0,0,0.6)]"
        >
          <DropdownMenu.Label className="px-3 pt-1 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Game version
          </DropdownMenu.Label>
          {options.map((option) => {
            const active = option.flavor === current;
            let className = "flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer outline-hidden data-[highlighted]:bg-white/10";
            if (active) {
              className += " bg-white/5";
            }
            return (
              <DropdownMenu.Item key={option.flavor} className={className} onSelect={() => setFlavor(option.flavor, pathname)}>
                <FlavorIcon src={option.icon} size="h-9 w-9" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{option.label}</span>
                    {option.soon && (
                      <span className="rounded border border-amber-500/40 bg-amber-500/15 px-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-400">
                        Soon
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-400">{option.subtitle}</span>
                </div>
                {active && <CheckIcon className="h-5 w-5 flex-none text-[#4dc4fd]" />}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export default FlavorToggle;
