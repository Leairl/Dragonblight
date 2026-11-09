import { FC, useEffect, useState } from "react";
import { useParams } from "react-router";
import { Card } from "@radix-ui/themes";
import { Dragonblight } from "../../../clients/Dragonblight";
import { customAchievementTiers, numberedIcon, sortByTitleRank, tierCountText } from "../../../helpers/achievement-icons";
import TapPopover from "../../tap-popover/tap-popover";
import "./profile-title-rows.css";

interface ProfileTitleRowsProps {
  characterNotFound?: boolean;
}

//Phones only: the Gladiator and Rank 1 icons from the profile header, one row each under the rating
//cards with what they count spelled out. Tapping a row lists every title it counts.
const ProfileTitleRows: FC<ProfileTitleRowsProps> = ({ characterNotFound }) => {
  const { region, server, characterName } = useParams();
  const [tiers, setTiers] = useState<Dragonblight.TierAchievements[]>([]);

  useEffect(() => {
    setTiers([]);
    if (region == null || server == null || characterName == null) {
      return;
    }
    new Dragonblight.AchievementClient()
      .getCountofAllSeasonalAchievements(server.replace(" ", "-"), characterName, region)
      .then(setTiers)
      .catch(() => setTiers([]));
  }, [region, server, characterName]);

  const shown = sortByTitleRank(customAchievementTiers(tiers));
  if (characterNotFound || shown.length === 0) {
    return null;
  }

  return (
    <div className="profile-title-rows">
      {shown.map((a) => (
        <TapPopover
          key={a.tier}
          triggerClassName="profile-title-row-trigger"
          contentClassName="max-h-64 overflow-y-auto"
          trigger={
            <Card className="border-card profile-title-row">
              <img
                src={numberedIcon(a)}
                onError={(e) => {
                  //no image for this season yet - leave the space empty instead of showing a broken icon
                  e.currentTarget.style.visibility = "hidden";
                }}
                height="34px"
                width="34px"
                style={{ maxHeight: "34px", maxWidth: "34px" }}
              ></img>
              <span className="profile-title-row-text">{tierCountText(a)}</span>
            </Card>
          }
        >
          {a.achievements?.map((x) => (
            <div key={x.id}>{x.name}</div>
          ))}
        </TapPopover>
      ))}
    </div>
  );
};

export default ProfileTitleRows;
