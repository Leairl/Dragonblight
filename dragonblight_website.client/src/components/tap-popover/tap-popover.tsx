import { ReactNode, useEffect, useRef, useState } from "react";
import { Popover } from "@radix-ui/themes";

interface TapPopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  triggerClassName?: string;
  contentClassName?: string;
}

//Radix tooltips and hover cards only open for a mouse, so tapping them on a phone does nothing.
//This opens on hover for a mouse and on tap for touch, and a tap anywhere else closes it.
const TapPopover = ({ trigger, children, side, triggerClassName, contentClassName }: TapPopoverProps) => {
  const [open, setOpen] = useState(false);
  //the kind of pointer that pressed the trigger, since a click event does not say
  const pointerType = useRef("");
  const closeTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => window.clearTimeout(closeTimer.current);
  }, []);

  function hoverOpen(type: string) {
    if (type !== "mouse") {
      return;
    }
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  }
  //a short delay lets the mouse cross the gap from the trigger into the popup, so a long list can be scrolled
  function hoverClose(type: string) {
    if (type !== "mouse") {
      return;
    }
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  }

  let shownSide: "top" | "bottom" = "bottom";
  if (side) {
    shownSide = side;
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
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
        //never wider than a phone's screen, so long titles wrap instead of running off its edge
        style={{ maxWidth: "min(24rem, calc(100vw - 24px))" }}
        //focusing the popup would scroll the page on a phone
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerEnter={(e) => hoverOpen(e.pointerType)}
        onPointerLeave={(e) => hoverClose(e.pointerType)}
      >
        {children}
      </Popover.Content>
    </Popover.Root>
  );
};

export default TapPopover;
