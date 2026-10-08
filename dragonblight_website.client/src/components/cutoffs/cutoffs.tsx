import React, { useState, useEffect } from 'react';
import { Dragonblight } from '../../clients/Dragonblight';
import { Card } from '@radix-ui/themes';
import { shuffleSpecs } from '../../helpers/shuffle-specs';
import { blitzSpecs } from '../../helpers/blitz-specs';
import { getFlavor } from '../../helpers/game-flavor';


interface CutoffProps {
    bracket: string;
    region: string;
}

const Cutoffs : React.FC<CutoffProps> = (props) => {
  // Handle state management
const [rewards, setRewards] = useState<Dragonblight.PvpSeasonRewardWithRank[]>([]);

const [loading, setLoading] = useState<boolean>(true);

async function CutoffData() {
    setLoading(true);
    const DragonblightClient = new Dragonblight.PvpLeaderboardClient();
    setRewards((await DragonblightClient.getPvPRewards(props.region)) ?? []);
    setLoading(false);
}
    //names repeat across classes (Frost, Holy, Restoration, Protection), so a Shuffle reward is
    //matched to its ladder by spec id
    function getShuffleSpecId(bracket: string | undefined): number | undefined {
        return shuffleSpecs.find(s => s.slug == bracket)?.specId;
    }
    function getBlitzSpecId(bracket: string | undefined): number | undefined {
        return blitzSpecs.find(s => s.slug == bracket)?.specId;
    }
  useEffect(() => {
    CutoffData()
  }, [props.bracket, props.region]);

  //the rewards for the ladder on screen, makes a copy from filtering of the matching rewards and if it is classic it will sort
  const matching = rewards.filter(r => {
    return r.bracket?.type?.includes(props.bracket) ||
    (r.bracket?.type?.includes('BATTLEGROUNDS') && props.bracket == 'rbg') ||
    (r.bracket?.type?.includes('SHUFFLE') && r.specialization?.id != undefined && r.specialization.id == getShuffleSpecId(props.bracket)) ||
    (r.bracket?.type?.includes('BLITZ') && r.specialization?.id != undefined && r.specialization.id == getBlitzSpecId(props.bracket))
  });

  //classic publishes a cutoff for every title tier
  let ordered = matching;
  if (getFlavor() === "classic") {
    ordered = [...matching].sort((a, b) => b.rating_cutoff - a.rating_cutoff);
  }

  return (
    <div className="flex flex-row min-h-[64px] justify-center">
    <div className={!(loading && rewards != undefined) ? "mobileLeftPadding fadeIn flex flex-row flex-wrap wrap" : "mobileLeftPadding fadeOut flex flex-row flex-wrap wrap"}>
  { 
ordered.map((i) => {
    function getAchievementColor(AchievementName: string | undefined): string | undefined {
        if (AchievementName?.endsWith(' Gladiator')) {
            return "text-yellow-600"
        }
        if (AchievementName?.endsWith(' Legend')) {
            return "text-yellow-600"
        }
        if (AchievementName?.endsWith(' Warlord')) {
            return "text-yellow-600"
        }
        if (AchievementName?.endsWith(' Marshal')) {
            return "text-yellow-600"
        }
        if (AchievementName?.startsWith('Gladiator') || AchievementName?.startsWith('Hero of the')) {
            return "text-purple-500"
        }
        if (AchievementName?.startsWith('Duelist')) {
            return "text-blue-500"
        }
        if (AchievementName?.startsWith('Rival')) {
            return "text-green-500"
        }
        if (AchievementName?.startsWith('Challenger')) {
            return "text-neutral-500"
        }
    }
    function getCardBorder(AchievementName: string | undefined) {
        if (AchievementName?.endsWith(' Gladiator')) {
            return "border-yellow-600 border-2"
        }
        if (AchievementName?.endsWith(' Legend')) {
            return "border-yellow-600 border-2"
        }
        if (AchievementName?.endsWith(' Warlord')) {
            return "border-yellow-600 border-2"
        }
        if (AchievementName?.endsWith(' Marshal')) {
            return "border-yellow-600 border-2"
        }
        if (AchievementName?.startsWith('Gladiator') || AchievementName?.startsWith('Hero of the')) {
            return "border-purple-500 border-2"
        }
        if (AchievementName?.startsWith('Duelist')) {
            return "border-blue-500 border-2"
        }
        if (AchievementName?.startsWith('Rival')) {
            return "border-green-500 border-2"
        }
        if (AchievementName?.startsWith('Challenger')) {
            return "border-neutral-500 border-2"
        }
    }

    //Blizzard names carry the season ("Gladiator - Season 15", "Obsidian Legend: Dragonflight Season 2")
    //and sometimes a [DNT] marker; the card shows only the title itself
    const title = i.achievement?.name
      ?.replace(/\s*[-:]\s*(\w+ )*Season \d+/, '')
      .replace('[DNT] ', '')
      .trim();

  return (
    <Card className={`${getCardBorder(title) ?? ""} w-[180px] min-w-[180px] p-1 text-center mb-2 mr-2 grow-0`}>
        <span className={getAchievementColor(title)}><b>{title}</b></span>
        {/* every spec has its own Solo Shuffle rewards, so without the spec those cards look identical */}
        {i.specialization?.name && (
          <>
            <br></br>
            <span className="text-sm">{i.specialization.name}</span>
          </>
        )}
        <br></br>
        <span className="text-sm">Rating Cutoff: {i.rating_cutoff}</span>
        <br></br>
        <span className="text-xs italic">Ranks: 1 - {i.rank}</span>
    </Card>
  );
})
  }</div>
</div>
  );
};

export default Cutoffs;