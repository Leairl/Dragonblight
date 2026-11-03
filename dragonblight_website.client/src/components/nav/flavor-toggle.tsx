import { useRef, useState } from "react";
import { useLocation } from "react-router";
import { GameFlavor, getFlavor, setFlavor } from "../../helpers/game-flavor";

const SLIDE_MILLISECONDS = 200;

// Switches the site between Retail and MoP Classic.
function FlavorToggle() {
  const [selected, setSelected] = useState<GameFlavor>(getFlavor());
  const slideTimer = useRef(0);
  // basename has already stripped the flavor, so this is the path to carry across.
  const { pathname } = useLocation();

  //switching reloads the page, so it waits for the blue pill to finish sliding first
  function selectFlavor(flavor: GameFlavor) {
    setSelected(flavor);
    clearTimeout(slideTimer.current);
    slideTimer.current = window.setTimeout(() => setFlavor(flavor, pathname), SLIDE_MILLISECONDS);
  }

  let pillPosition = "";
  if (selected === "classic") {
    pillPosition = "translate-x-full";
  }

  return (
    <div className="relative grid grid-cols-2 p-1 rounded-full border border-gray-700 bg-black/40" role="group" aria-label="Game version">
      <span
        className={"absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-[#4dc4fd] transition-transform duration-200 motion-reduce:transition-none " + pillPosition}
      ></span>
      {(["retail", "classic"] as const).map((flavor) => {
        const active = selected === flavor;
        let label = "Retail";
        if (flavor === "classic") {
          label = "MoP";
        }
        let className = "relative w-16 py-1 text-center text-sm font-['Poppins'] italic font-extrabold cursor-pointer transition-colors duration-200 max-[500px]:w-12 max-[500px]:text-xs ";
        if (active) {
          className += "text-black";
        } else {
          className += "text-gray-400 hover:text-white";
        }
        return (
          <button
            key={flavor}
            type="button"
            onClick={() => selectFlavor(flavor)}
            aria-pressed={active}
            className={className}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default FlavorToggle;
