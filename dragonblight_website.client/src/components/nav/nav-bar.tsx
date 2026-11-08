import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import { Card, Theme } from "@radix-ui/themes";
import * as Dialog from "@radix-ui/react-dialog";
import { DiscordLogoIcon } from "@radix-ui/react-icons";
import { Link, useLocation } from "react-router";
import "./nav-bar.css";
import FlavorToggle from "./flavor-toggle";
import DialogCloseButton from "../dialog-close-button/dialog-close-button";
import { flavorHref, getFlavor } from "../../helpers/game-flavor";

const discordUrl = "https://discord.gg/3P9em5bKQb";

interface NavTab {
  label: string;
  to: string;
  match: string; //the path the tab is active under. Home only matches "/" itself
  isNew?: boolean;
  retailOnly?: boolean; //hidden on MoP Classic for now
}

const tabs: NavTab[] = [
  { label: "Home", to: "/", match: "/" },
  { label: "Rankings", to: "/rankings", match: "/rankings" },
  { label: "Activity", to: "/activity", match: "/activity" },
  { label: "Cutoffs", to: "/cutoffs", match: "/cutoffs" },
  { label: "Stats", to: "/class-stats/us/3v3", match: "/class-stats" },
  { label: "Comp Score", to: "/composition-score", match: "/composition-score", isNew: true, retailOnly: true },
];

function isActive(tab: NavTab, pathname: string): boolean {
  if (tab.match === "/") {
    return pathname === "/";
  }
  return pathname.startsWith(tab.match);
}

//One row: the logo and version slider with the page tabs right after them, and the Discord button on the far right.
//Narrow screens swap the tabs and button for the menu button.
function NavBar() {
  //basename has already stripped the flavor, so this is the page's own path
  const { pathname } = useLocation();
  const isRetail = getFlavor() === "retail";
  const shownTabs = tabs.filter((tab) => isRetail || !tab.retailOnly);
  return (
    <Theme radius="none">
    <Card className="w-full">
      <div className="flex items-center gap-4 h-16">
        <div className="flex flex-none items-center">
          <Link
            to="/"
            className="flex-none flex h-[45px] w-[240px] max-[500px]:h-auto max-[500px]:w-[130px]"
          >
              <img src={`/Nav/db_io.webp`}></img>
          </Link>
          {/* on a phone the logo, this and the menu button all have to fit on one row */}
          <div className="flex flex-none items-center ml-4 max-[500px]:ml-2">
            <FlavorToggle />
          </div>
        </div>

        <NavigationMenu.Root className="desktop-nav-menu flex-1 justify-start ml-6">
          <NavigationMenu.List className="flex gap-7 list-none">
            {shownTabs.map((tab) => {
              let tabClass = "blue-bottom-border cls-1";
              if (isActive(tab, pathname)) {
                tabClass += " nav-tab-active";
              }
              return (
                <NavigationMenu.Item key={tab.to}>
                  <Link to={tab.to}>
                    <NavigationMenu.Trigger className="group flex select-none items-center gap-[2px] rounded-[4px] text-[15px] font-medium leading-none outline-hidden">
                      <div className={tabClass}>
                        <span className="nav-text">{tab.label}</span>
                        {tab.isNew && <span className="nav-new-badge">New</span>}
                      </div>
                    </NavigationMenu.Trigger>
                  </Link>
                </NavigationMenu.Item>
              );
            })}
          </NavigationMenu.List>
        </NavigationMenu.Root>

        <a
          className="desktop-nav-menu flex-none btn-blue rounded-sm p-2 items-center justify-center"
          href={discordUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Join our Discord"
          title="Join our Discord"
        >
          <DiscordLogoIcon width={22} height={22} aria-hidden />
        </a>

      <div className="mobile-nav ml-auto">
        <Dialog.Root>
          <Dialog.Trigger asChild>
            <button className="self-center flex-none flex items-center justify-center p-2 ml-auto cursor-pointer text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="backdrop-blur-sm data-[state=open]:animate-overlayShow fixed inset-0" />
            <Dialog.Content className="pb-5 mt-[40px] data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] w-[90vw] h-auto translate-x-[-50%] translate-y-[-50%] rounded-[6px] shadow-[hsl(206_22%_7%/35%)_0px_10px_38px_-10px,hsl(206_22%_7%/20%)_0px_10px_20px_-15px] bg-[#292c31] focus:outline-hidden">
              <DialogCloseButton />
              <div>
              <NavigationMenu.Root className="justify-left w-full">
        <NavigationMenu.List className="center flex flex-col items-left list-none rounded-[6px] mt-10 ">
          
          <NavigationMenu.Item>
            <div className="px-3 py-2 w-full">
            <a onClick={() => { window.location.href = flavorHref("/") }}>
            {/* acts as a button */}
              <NavigationMenu.Trigger className=" h-12  w-full group flex select-none items-center gap-[2px] rounded-[4px] text-[15px] font-medium leading-none outline-hidden">
                <div className="mobile-nav-frame">
                  <div className="mobile-nav-inner">
                    <span className="nav-text text-white">Home</span>
                  </div>
                </div>
              </NavigationMenu.Trigger>
            </a>
            </div>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <div className="px-3 py-2 w-full">
            <a onClick={() => { window.location.href = flavorHref("/rankings") }}>
            {/* acts as a button */}
              <NavigationMenu.Trigger className=" h-12  w-full group flex select-none items-center gap-[2px] rounded-[4px] text-[15px] font-medium leading-none outline-hidden">
                <div className="mobile-nav-frame">
                  <div className="mobile-nav-inner">
                    <span className="nav-text text-white">Rankings</span>
                  </div>
                </div>
              </NavigationMenu.Trigger>
            </a>
            </div>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <div className="px-3 py-2 w-full">
            <a onClick={() => { window.location.href = flavorHref("/activity") }}>
            {/* acts as a button */}
              <NavigationMenu.Trigger className=" h-12  w-full group flex select-none items-center gap-[2px] rounded-[4px] text-[15px] font-medium leading-none outline-hidden">
                <div className="mobile-nav-frame">
                  <div className="mobile-nav-inner">
                    <span className="nav-text text-white">Activity</span>
                  </div>
                </div>
              </NavigationMenu.Trigger>
            </a>
            </div>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <div className="px-3 py-2 w-full">
            <a onClick={() => { window.location.href = flavorHref("/cutoffs") }}>
            {/* acts as a button */}
              <NavigationMenu.Trigger className=" h-12  w-full group flex select-none items-center gap-[2px] rounded-[4px] text-[15px] font-medium leading-none outline-hidden">
                <div className="mobile-nav-frame">
                  <div className="mobile-nav-inner">
                    <span className="nav-text text-white">Cutoffs</span>
                  </div>
                </div>
              </NavigationMenu.Trigger>
            </a>
            </div>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <div className="px-3 py-2 w-full">
            <a onClick={() => { window.location.href = flavorHref("/class-stats") }}>
            {/* acts as a button */}
              <NavigationMenu.Trigger className=" h-12  w-full group flex select-none items-center gap-[2px] rounded-[4px] text-[15px] font-medium leading-none outline-hidden">
                <div className="mobile-nav-frame">
                  <div className="mobile-nav-inner">
                    <span className="nav-text text-white">Stats</span>
                  </div>
                </div>
              </NavigationMenu.Trigger>
            </a>
            </div>
          </NavigationMenu.Item>
          {/* Comp Score is retail only for now */}
          {isRetail && (
            <NavigationMenu.Item>
              <div className="px-3 py-2 w-full">
              <a onClick={() => { window.location.href = flavorHref("/composition-score") }}>
              {/* acts as a button */}
                <NavigationMenu.Trigger className=" h-12  w-full group flex select-none items-center gap-[2px] rounded-[4px] text-[15px] font-medium leading-none outline-hidden">
                  <div className="mobile-nav-frame">
                    <div className="mobile-nav-inner">
                      <span className="nav-text text-white">Comp Score</span>
                    </div>
                  </div>
                </NavigationMenu.Trigger>
              </a>
              </div>
            </NavigationMenu.Item>
          )}
          <NavigationMenu.Item>
            <div className="px-3 py-2 w-full">
            <a onClick={() => { window.location.href = "https://discord.gg/3P9em5bKQb" }}>
            {/* acts as a button */}
              <NavigationMenu.Trigger className=" h-12  w-full group flex select-none items-center gap-[2px] rounded-[4px] text-[15px] font-medium leading-none outline-hidden">
                <div className="mobile-nav-frame">
                  <div className="mobile-nav-inner">
                    <span className="nav-text text-white">Discord</span>
                  </div>
                </div>
              </NavigationMenu.Trigger>
            </a>
            </div>
          </NavigationMenu.Item>
        </NavigationMenu.List>
      </NavigationMenu.Root>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
      </div>
    </Card>
    </Theme>
  );
}

export default NavBar;
