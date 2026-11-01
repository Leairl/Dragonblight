import { FC } from "react";

//The connections between talent nodes, drawn the way the in-game talent screen draws them: an
//arrow from a talent to the one it unlocks, gold once both ends are taken and dark grey otherwise.
//
//Each arrow runs from the edge of one icon to the edge of the next rather than centre to centre,
//so no part of it sits behind an icon and the arrowhead lands just short of the talent it points
//at. Used by the profile's talent viewer and the compare page alike.

//Grid spacing for every retail talent tree on the site. The space between neighbouring icons
//(CELL - ICON) is what the arrows have to show themselves in; much below 20px and they shrink to
//bare arrowheads. At 52 the widest class's three trees still sit on one row at 1600px wide.
export const TALENT_CELL = 52; //px between the top-left corners of neighbouring nodes
export const TALENT_ICON = 32; //px icon size, matching .retailTalentIcon in the css

//arrow colours by state: taken in game, not taken, and the compare page's one-side-only edges
export type ArrowKind = "taken" | "untaken" | "del" | "add";

export interface TalentArrow {
  key: string;
  //centres of the two icons, in the grid's pixel space
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind: ArrowKind;
}

interface TalentArrowsProps {
  width: number;
  height: number;
  //icon size; arrows start and stop this far from each centre, at the icon's edge
  icon: number;
  arrows: TalentArrow[];
}

const GAP = 2; //px of air between an icon's edge and the arrow
const HEAD = 6; //px arrowhead length

//distance from a square icon's centre to its edge, travelling in direction (dx, dy)
function toEdge(dx: number, dy: number, half: number): number {
  const len = Math.hypot(dx, dy);
  return (half / Math.max(Math.abs(dx), Math.abs(dy))) * len;
}

const TalentArrows: FC<TalentArrowsProps> = (props) => {
  const half = props.icon / 2;
  return (
    <svg className="talentArrows" width={props.width} height={props.height}>
      <defs>
        {(["taken", "untaken", "del", "add"] as ArrowKind[]).map((kind) => (
          //one marker per colour: an svg marker cannot take its colour from the line using it
          <marker
            key={kind}
            id={`talentArrowHead-${kind}`}
            viewBox="0 0 10 10"
            refX="0"
            refY="5"
            markerWidth={HEAD}
            markerHeight={HEAD}
            markerUnits="userSpaceOnUse"
            orient="auto"
          >
            <path d="M0,0 L10,5 L0,10 z" className={`talentArrowHead ${kind}`} />
          </marker>
        ))}
      </defs>
      {props.arrows.map((a) => {
        const dx = a.x2 - a.x1;
        const dy = a.y2 - a.y1;
        const len = Math.hypot(dx, dy);
        if (len == 0) return null;
        const ux = dx / len;
        const uy = dy / len;
        const edge = toEdge(dx, dy, half);
        const start = edge + GAP;
        //the marker is drawn beyond the line's end, so the line stops a head's length early
        const end = len - edge - GAP - HEAD;
        if (end <= start) return null;
        return (
          <line
            key={a.key}
            x1={a.x1 + ux * start}
            y1={a.y1 + uy * start}
            x2={a.x1 + ux * end}
            y2={a.y1 + uy * end}
            className={`talentArrow ${a.kind}`}
            markerEnd={`url(#talentArrowHead-${a.kind})`}
          />
        );
      })}
    </svg>
  );
};

export default TalentArrows;
