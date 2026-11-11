import { ReactNode, useEffect, useRef, useState } from "react";
import { Popover } from "@radix-ui/themes";

interface TapPopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  triggerClassName?: string;
  contentClassName?: string;
  //For a tooltip with nothing to scroll or click in it. The popup ignores the mouse, so it can't
  //sit over a neighbouring trigger and keep that one from opening, and it closes as soon as the
  //mouse leaves its trigger. Without it, the mouse can move into the popup, which a long list needs.
  passThrough?: boolean;
}

//The popover open right now, as its close function. Only one is open at a time: opening another
//closes this one, so moving quickly along a row of triggers never leaves several open.
let closeOpenPopover: (() => void) | null = null;

//Radix tooltips and hover cards only open for a mouse, so tapping them on a phone does nothing.
//This opens on hover for a mouse and on tap for touch, and a tap anywhere else closes it.
const TapPopover = ({ trigger, children, side, triggerClassName, contentClassName, passThrough }: TapPopoverProps) => {
  const [open, setOpen] = useState(false);
  //the kind of pointer that pressed the trigger, since a click event does not say
  const pointerType = useRef("");
  const closeTimer = useRef<number | undefined>(undefined);
  //this popover's own close function, the same one every render so it can be compared
  const closeThis = useRef(() => {
    window.clearTimeout(closeTimer.current);
    setOpen(false);
  });

  useEffect(() => {
    const close = closeThis.current;
    return () => {
      window.clearTimeout(closeTimer.current);
      if (closeOpenPopover === close) {
        closeOpenPopover = null;
      }
    };
  }, []);

  function show() {
    window.clearTimeout(closeTimer.current);
    if (closeOpenPopover !== null && closeOpenPopover !== closeThis.current) {
      closeOpenPopover();
    }
    closeOpenPopover = closeThis.current;
    setOpen(true);
  }

  function hide() {
    if (closeOpenPopover === closeThis.current) {
      closeOpenPopover = null;
    }
    closeThis.current();
  }

  //for touch: Radix opens it on a tap and closes it on a tap elsewhere
  function changeOpen(nowOpen: boolean) {
    if (nowOpen) {
      show();
    } else {
      hide();
    }
  }

  function hoverOpen(type: string) {
    if (type !== "mouse") {
      return;
    }
    show();
  }
  //A short delay lets the mouse cross the gap from the trigger into the popup, so a long list
  //can be scrolled. A pass-through popup can't be entered, so it closes straight away.
  function hoverClose(type: string) {
    if (type !== "mouse") {
      return;
    }
    window.clearTimeout(closeTimer.current);
    if (passThrough) {
      hide();
      return;
    }
    closeTimer.current = window.setTimeout(hide, 120);
  }

  let shownSide: "top" | "bottom" = "bottom";
  if (side) {
    shownSide = side;
  }

  //never wider than a phone's screen, so long titles wrap instead of running off its edge
  const contentStyle: React.CSSProperties = { maxWidth: "min(24rem, calc(100vw - 24px))" };
  if (passThrough) {
    contentStyle.pointerEvents = "none";
  }

  return (
    <Popover.Root open={open} onOpenChange={changeOpen}>
      <Popover.Trigger
        onClick={(e) => {
          //hovering already opened it, so a mouse click should not toggle it shut again
          if (pointerType.current === "mouse") {
            e.preventDefault();
          }
        }}
      >
        <button
          type="button"
          className={triggerClassName}
          onPointerDown={(e) => (pointerType.current = e.pointerType)}
          onPointerEnter={(e) => hoverOpen(e.pointerType)}
          onPointerLeave={(e) => hoverClose(e.pointerType)}
        >
          {trigger}
        </button>
      </Popover.Trigger>
      <Popover.Content
        size="1"
        side={shownSide}
        align="center"
        className={contentClassName}
        style={contentStyle}
        //focusing the popup would scroll the page on a phone
        onOpenAutoFocus={(e) => e.preventDefault()}
        //Radix hands focus back to the trigger on closing, which put a focus ring on the last
        //talent hovered whenever moving to the next one closed its popup
        onCloseAutoFocus={(e) => e.preventDefault()}
        onPointerEnter={(e) => hoverOpen(e.pointerType)}
        onPointerLeave={(e) => hoverClose(e.pointerType)}
      >
        {children}
      </Popover.Content>
    </Popover.Root>
  );
};

export default TapPopover;
