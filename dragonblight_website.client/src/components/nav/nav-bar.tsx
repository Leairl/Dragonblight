import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import { Button, Card, Theme } from "@radix-ui/themes";
import * as Dialog from "@radix-ui/react-dialog";
import { Link } from "react-router";
import "./nav-bar.css";
import FlavorToggle from "./flavor-toggle";
import { flavorHref } from "../../helpers/game-flavor";
function NavBar() {
  return (
    <Theme radius="none">
    <Card className="flex w-full h-20">
      <Link
        to="/"
        className="flex-none flex h-[60px] w-[240px]"
      >
          <img src={`/Nav/db_io.webp`}></img>
      </Link>
      <div className="flex items-center ml-4">
        <FlavorToggle />
      </div>
      <NavigationMenu.Root className="justify-end w-11/12 desktop-nav-menu mr-[1vw]">
        <NavigationMenu.List className="center flex justify-evenly list-none rounded-[6px] ">
          <NavigationMenu.Item>
            <Link to="/">
              <NavigationMenu.Trigger className="group flex select-none items-center gap-[2px] rounded-[4px]  text-[15px] font-medium leading-none outline-hidden">
                <div className="flex flex-col blue-bottom-border w-20 items-center cls-1">
                  <img 
                  src={`/Nav/armory.svg`} 
                  height="35px" 
                  width="35px" 
                  ></img>
                  <span className="mb-1 mt-1 text-xs font-segoeFont">Home</span>
                </div>
              </NavigationMenu.Trigger>
            </Link>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <Link to="/rankings">
              <NavigationMenu.Trigger className="group flex select-none items-center gap-[2px] rounded-[4px] text-[15px] font-medium leading-none outline-hidden">
                <div className="flex flex-col blue-bottom-border w-20 items-center cls-1">
                  <img
                    src={`/Nav/ranks icon.svg`}
                    height="35px"
                    width="35px"
                  ></img>
                  <span className="mb-1 mt-1 text-xs font-segoeFont">Rankings</span>
                </div>
              </NavigationMenu.Trigger>
            </Link>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <Link to="/activity">
              <NavigationMenu.Trigger className="group flex select-none items-center gap-[2px] rounded-[4px] text-[15px] font-medium leading-none outline-hidden">
                <div className="flex flex-col blue-bottom-border w-20 items-center cls-1">
                  <img
                    src={`/Nav/activity.svg`}
                    height="35px"
                    width="35px"
                  ></img>
                  <span className="mb-1 mt-1 text-xs font-segoeFont">Activity</span>
                </div>
              </NavigationMenu.Trigger>
            </Link>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <Link to="/class-stats/us/3v3">
              <NavigationMenu.Trigger className="group flex select-none items-center gap-[2px] rounded-[4px] text-[15px] font-medium leading-none outline-hidden">
                <div className="flex flex-col blue-bottom-border w-20 items-center cls-1">
                  <img
                    src={`/Nav/stats.svg`}
                    height="35px"
                    width="35px"
                  ></img>
                  <span className="mb-1 mt-1 text-xs font-segoeFont">Class Stats</span>
                </div>
              </NavigationMenu.Trigger>
            </Link>
          </NavigationMenu.Item>
          <NavigationMenu.Item >
            <Link to="https://discord.gg/ydesbvpcNS" target="_blank" rel="noopener noreferrer">
              <NavigationMenu.Trigger className="group flex select-none items-center gap-[2px] rounded-[4px] text-[15px] font-medium leading-none outline-hidden">
                <div className="flex flex-col blue-bottom-border w-20 items-center cls-1">
                  <img
                    src={`/Nav/discord.svg`}
                    height="35px"
                    width="35px"
                  ></img>
                  <span className="mb-1 mt-1 text-xs font-segoeFont">Discord</span>
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

      <div className="mobile-nav justify-center w-11/12">
        <Dialog.Root>
          <Dialog.Trigger asChild>
            <Button className="self-center flex-none flex items-center justify-center p-2 ml-auto cursor-pointer" variant="outline">
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
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="backdrop-blur-sm data-[state=open]:animate-overlayShow fixed inset-0" />
            <Dialog.Content className="pb-5 mt-[40px] data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] w-[90vw] h-auto translate-x-[-50%] translate-y-[-50%] rounded-[6px] shadow-[hsl(206_22%_7%/35%)_0px_10px_38px_-10px,hsl(206_22%_7%/20%)_0px_10px_20px_-15px] bg-[#292c31] focus:outline-hidden">
              <div className=" flex justify-end">
              <Dialog.Close asChild>
                  <button className="pt-7 text-2xl hover:opacity-50 focus:shadow-green7 inline-flex h-[35px] items-center justify-center rounded-[4px] px-[15px] font-medium leading-none">
                    <svg
                      width="30"
                      height="30"
                      viewBox="0 0 15 15"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                        fill="currentColor"
                        fillRule="evenodd"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                  </button>
                </Dialog.Close>
              </div>
              <div>
              <NavigationMenu.Root className="justify-left w-full">
        <NavigationMenu.List className="center flex flex-col items-left list-none rounded-[6px] mt-10 ">
          
          <NavigationMenu.Item>
            <div className="px-3 py-2 w-full">
            <a onClick={() => { window.location.href = flavorHref("/") }}>
            {/* acts as a button */}
              <NavigationMenu.Trigger className=" h-12  w-full group flex grey-login-border select-none items-center gap-[2px] rounded-[4px] text-[15px] font-medium leading-none outline-hidden">
                <div className="h-12 w-full bg-transparent font-semibold py-2 px-8 border border-gray-500 rounded-sm">
                <span className="mt-1 text-xl font-semibold  font-segoeFont text-white"> Home </span>
                </div>
              </NavigationMenu.Trigger>
            </a>
            </div>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <div className="px-3 py-2 w-full">
            <a onClick={() => { window.location.href = flavorHref("/rankings") }}>
            {/* acts as a button */}
              <NavigationMenu.Trigger className=" h-12  w-full group flex grey-login-border select-none items-center gap-[2px] rounded-[4px] text-[15px] font-medium leading-none outline-hidden">
                <div className="h-12 w-full bg-transparent font-semibold py-2 px-8 border border-gray-500 rounded-sm">
                <span className="mt-1 text-xl font-semibold  font-segoeFont text-white"> Rankings </span>
                </div>
              </NavigationMenu.Trigger>
            </a>
            </div>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <div className="px-3 py-2 w-full">
            <a onClick={() => { window.location.href = flavorHref("/activity") }}>
            {/* acts as a button */}
              <NavigationMenu.Trigger className=" h-12  w-full group flex grey-login-border select-none items-center gap-[2px] rounded-[4px] text-[15px] font-medium leading-none outline-hidden">
                <div className="h-12 w-full bg-transparent font-semibold py-2 px-8 border border-gray-500 rounded-sm">
                <span className="mt-1 text-xl font-semibold  font-segoeFont text-white"> Activity </span>
                </div>
              </NavigationMenu.Trigger>
            </a>
            </div>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <div className="px-3 py-2 w-full">
            <a onClick={() => { window.location.href = flavorHref("/class-stats") }}>
            {/* acts as a button */}
              <NavigationMenu.Trigger className=" h-12  w-full group flex grey-login-border select-none items-center gap-[2px] rounded-[4px] text-[15px] font-medium leading-none outline-hidden">
                <div className="h-12 w-full bg-transparent font-semibold py-2 px-8 border border-gray-500 rounded-sm">
                <span className="mt-1 text-xl font-semibold  font-segoeFont text-white"> Class Stats </span>
                </div>
              </NavigationMenu.Trigger>
            </a>
            </div>
          </NavigationMenu.Item>
          <NavigationMenu.Item>
            <div className="px-3 py-2 w-full">
            <a onClick={() => { window.location.href = "https://discord.gg/ydesbvpcNS" }}>
            {/* acts as a button */}
              <NavigationMenu.Trigger className=" h-12  w-full group flex grey-login-border select-none items-center gap-[2px] rounded-[4px] text-[15px] font-medium leading-none outline-hidden">
                <div className="h-12 w-full bg-transparent font-semibold py-2 px-8 border border-gray-500 rounded-sm">
                <span className="mt-1 text-xl font-semibold  font-segoeFont text-white"> Discord </span>
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
