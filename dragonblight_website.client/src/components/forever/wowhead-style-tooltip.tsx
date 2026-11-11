import { wowheadQualityClass } from "../../helpers/wowhead-style";
import "./wowhead-style-tooltip.css";

export interface WowheadStyleTooltipProps {
  name: string;
  //Blizzard's quality type, e.g. "COMMON"; white when unknown
  quality?: string;
  //the icon Wowhead shows beside its tooltip (a 36px image); none when not given
  icon?: string;
  itemLevel?: number;
  requiredLevel?: number;
  //the item's effect, shown in green as "Use: ..."
  use?: string;
  //an effect already applied, shown in green as it is (e.g. "Attack Power +4 and Armor +16")
  effect?: string;
}

// A tooltip drawn with Wowhead's own markup and classes, so Wowhead's stylesheet (loaded with its
// tooltip script) gives it the same frame, font and colours as theirs. Used where Wowhead's data is
// wrong: its Forever armor kits show 0 for every value, so these carry Blizzard's text instead.
export default function WowheadStyleTooltip(props: WowheadStyleTooltipProps) {
  const nameClass = wowheadQualityClass(props.quality);
  return (
    <div className="wowhead-tooltip wowhead-style-tooltip" data-game="wow" data-type="item">
      {props.icon && (
        <div className="whtt-tooltip-icon">
          <div className="iconmedium">
            <ins style={{ backgroundImage: `url("${props.icon}")` }}></ins>
            <del></del>
          </div>
        </div>
      )}
      <table>
        <tbody>
          <tr>
            <td>
              <table className="wowhead-style-tooltip-head">
                <tbody>
                  <tr>
                    <td>
                      <b className={nameClass}>{props.name}</b>
                      {props.itemLevel !== undefined && props.itemLevel > 0 && (
                        <span className="q">
                          <br />
                          Item Level {props.itemLevel}
                        </span>
                      )}
                      {props.requiredLevel !== undefined && props.requiredLevel > 1 && (
                        <>
                          <br />
                          Requires Level {props.requiredLevel}
                        </>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
              <table className="wowhead-style-tooltip-body">
                <tbody>
                  <tr>
                    <td>
                      {props.use && <span className="q2">Use: {props.use}</span>}
                      {props.effect && <span className="q2">{props.effect}</span>}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
            <th style={{ backgroundPosition: "right top" }}></th>
          </tr>
          <tr>
            <th style={{ backgroundPosition: "left bottom" }}></th>
            <th style={{ backgroundPosition: "right bottom" }}></th>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
