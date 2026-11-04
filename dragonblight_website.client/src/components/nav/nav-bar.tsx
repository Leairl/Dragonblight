import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import { Card, Theme } from "@radix-ui/themes";
import * as Dialog from "@radix-ui/react-dialog";
import { Link } from "react-router";
import "./nav-bar.css";
import FlavorToggle from "./flavor-toggle";
import DialogCloseButton from "../dialog-close-button/dialog-close-button";
import { flavorHref } from "../../helpers/game-flavor";
function NavBar() {
  return (
    <Theme radius="none">
    <Card className="flex items-center w-full h-20">
      {/* this side and the empty one after the menu grow equally, which keeps the menu in the middle of the bar */}
      <div className="flex flex-1 items-center">
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
      <NavigationMenu.Root className="flex-none desktop-nav-menu">
        <NavigationMenu.List className="center flex gap-7 list-none rounded-[6px] ">
          <NavigationMenu.Item>
            <Link to="/">
              <NavigationMenu.Trigger className="group flex select-none items-center gap-[2px] rounded-[4px]  text-[15px] font-medium leading-none outline-hidden">
                <div className="blue-bottom-border cls-1">
                  <span className="nav-text">Home</span>
                </div>
              </NavigationMenu.Trigger>
            </Link>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <Link to="/rankings">
              <NavigationMenu.Trigger className="group flex select-none items-center gap-[2px] rounded-[4px] text-[15px] font-medium leading-none outline-hidden">
                <div className="blue-bottom-border cls-1">
                  <span className="nav-text">Rankings</span>
                </div>
              </NavigationMenu.Trigger>
            </Link>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <Link to="/activity">
              <NavigationMenu.Trigger className="group flex select-none items-center gap-[2px] rounded-[4px] text-[15px] font-medium leading-none outline-hidden">
                <div className="blue-bottom-border cls-1">
                  <span className="nav-text">Activity</span>
                </div>
              </NavigationMenu.Trigger>
            </Link>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <Link to="/cutoffs">
              <NavigationMenu.Trigger className="group flex select-none items-center gap-[2px] rounded-[4px] text-[15px] font-medium leading-none outline-hidden">
                <div className="blue-bottom-border cls-1">
                  <span className="nav-text">Cutoffs</span>
                </div>
              </NavigationMenu.Trigger>
            </Link>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <Link to="/class-stats/us/3v3">
              <NavigationMenu.Trigger className="group flex select-none items-center gap-[2px] rounded-[4px] text-[15px] font-medium leading-none outline-hidden">
                <div className="blue-bottom-border cls-1">
                  <span className="nav-text">Stats</span>
                </div>
              </NavigationMenu.Trigger>
            </Link>
          </NavigationMenu.Item>
          <NavigationMenu.Item >
            <Link to="https://discord.gg/3P9em5bKQb" target="_blank" rel="noopener noreferrer">
              <NavigationMenu.Trigger className="group flex select-none items-center gap-[2px] rounded-[4px] text-[15px] font-medium leading-none outline-hidden">
                <div className="blue-bottom-border cls-1">
                  <span className="nav-text">Discord</span>
                </div>
              </NavigationMenu.Trigger>
            </Link>
          </NavigationMenu.Item>

          {/* <div className="pr-10 mx-4 h-10 border-l border-gray-300"></div>
          <NavigationMenu.Item>
            <div className="px-3 py-2">
            <Link to="/login">
              <NavigationMenu.Trigger className="group flex grey-login-border select-none items-center gap-[2px] rounded-[4px] text-[15px] font-medium leading-none outline-hidden">
                <div className="bg-transparent font-semibold py-2 px-8 border border-gray-500 rounded-sm">
                <span className="mt-1 text-xs font-segoeFont"> Login </span>
                </div>
              </NavigationMenu.Trigger>
            </Link>
            </div>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <div className="pr-40 px-3 py-2">
            <Link to="/register">
              <NavigationMenu.Trigger className=" group flex select-none items-center gap-[2px] rounded-[4px] text-[15px] font-medium leading-none outline-hidden">
                <div className="btn btn-blue">
                  <span className="mt-1 text-xs font-segoeFont"> Register </span>
                </div>
              </NavigationMenu.Trigger>
            </Link>
            </div>
          </NavigationMenu.Item> */}
        </NavigationMenu.List>
      </NavigationMenu.Root>
      <div className="flex-1 desktop-nav-menu"></div>

      <div className="mobile-nav justify-center w-11/12">
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
    </Card>
    </Theme>
  );
}

export default NavBar;
