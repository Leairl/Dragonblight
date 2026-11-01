import React, { useState, useEffect } from 'react';
import { Dragonblight } from '../../clients/Dragonblight';
import { Card } from '@radix-ui/themes';
import { shuffleSpecs, blitzSpecs } from '../../helpers/solo-bracket-specs';
import { getFlavor } from '../../helpers/game-flavor';
import { cleanTitle, TitleColors } from "../../helpers/ratingTierHelper";
import "./cutoffs.css";



interface CutoffProps {
    bracket: string;
    region: string;
}
//"Grievous Gladiator: ... Season 2" -> "Grievous Glad"; classic's "(3v3)" goes too, since the tab shows the bracket
function cardTitle(name: string | undefined): string {
    let title = cleanTitle(name);
    for (const bracket of [" (2v2)", " (3v3)", " (5v5)"]) {
        title = title.replace(bracket, "");
    }
    const words = title.split(" ");
    return title;
}
const rankOneWords = ["Gladiator", "Legend", "Marshal", "Warlord"];

//the tier name's color; a two-word title ending in Glad/Legend/Marshal/Warlord is rank 1
function tierColor(title: string): string {
    const words = title.split(" ");
    if (title.includes(" Gladiator")) return "#ff8a3d";
    if (title.includes(" Legend")) return "#c07cff";
    if (title.includes(" Marshal") || title.includes(" Warlord")) return "#4ee07a";
    if (title.startsWith("Gladiator") || title.startsWith("Hero of the")) return "#c07cff";
    if (title.startsWith("Duelist")) return "#5aa8ff";
    if (title.startsWith("Rival")) return "#4ee07a";
    return "#a8a19a";
}

const Cutoffs: React.FC<CutoffProps> = (props) => {
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

    //the highest cutoff gets the molten line; on RBG both faction cards share it
    const topCutoff = Math.max(0, ...ordered.map((r) => r.rating_cutoff));

    return (
        <div className="cutoff-strip">
            <div className={`cutoff-cards ${loading ? "fadeOut" : "fadeIn"}`}>
                {ordered.map((i) => {
                    const title = cardTitle(i.achievement?.name);
                    return (
                        //outer plate is the black frame; the inner one is clipped 1px smaller so the frame shows on the chamfers
                        <div key={`${i.achievement?.id}-${i.specialization?.id}-${i.faction?.type}`} className="cutoff-card" > 
                            <div className="cutoff-card-inner">
                                <span className="cutoff-tier txt-shadow" style={{ color: tierColor(title) }}>{title}</span>
                                {/* every spec has its own Solo Shuffle rewards, so without the spec those cards look identical */}
                                {i.specialization?.name && <span className="cutoff-label">{i.specialization.name}</span>}
                                <span className={"cutoff-rating txt-shadow " + TitleColors(title)}>{i.rating_cutoff}</span>
                                <div className="cutoff-meta">
                                    <span className="cutoff-label">Cutoff</span>
                                    <span className="cutoff-top">Top {i.rank}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

};

export default Cutoffs;