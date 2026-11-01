import React, { useState, useEffect } from 'react';
import { Dragonblight } from '../../clients/Dragonblight';
import { Card } from '@radix-ui/themes';
import { shuffleSpecs, blitzSpecs } from '../../helpers/solo-bracket-specs';
import { getFlavor } from '../../helpers/game-flavor';
import { cleanTitle } from "../../helpers/ratingTierHelper";
import "./cutoffs.css";
import EstimateDialog from "./estimate-dialog";



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
    if (words.length === 2 && rankOneWords.includes(words[1])) return "#ff8a3d";
    if (title.startsWith("Gladiator") || title.startsWith("Hero of the")) return "#c07cff";
    if (title.startsWith("Duelist")) return "#5aa8ff";
    if (title.startsWith("Rival")) return "#4ee07a";
    return "#a8a19a";
}

const Cutoffs: React.FC<CutoffProps> = (props) => {
    // Handle state management
    const [rewards, setRewards] = useState<Dragonblight.PvpSeasonRewardWithRank[]>([]);
    const [estimates, setEstimates] = useState<Dragonblight.EstimatedCutoff[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    async function CutoffData() {
        setLoading(true);
        const DragonblightClient = new Dragonblight.PvpLeaderboardClient();
        setRewards((await DragonblightClient.getPvPRewards(props.region)) ?? []);
        try {
            setEstimates((await DragonblightClient.getEstimatedCutoffs(props.region)) ?? []);
        } catch {
            //the cards still show Blizzard's cutoff without an estimate
            setEstimates([]);
        }
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
    //the live estimate for a card, when its title is one of the percentage titles
    function estimateFor(reward: Dragonblight.PvpSeasonRewardWithRank): Dragonblight.EstimatedCutoff | undefined {
        return estimates.find((e) => e.bracket == props.bracket && e.ratingCutoff == reward.rating_cutoff);
    }

    //rules 11-16 as a short note, e.g. "2 new · -1 alt"
    function movementText(e: Dragonblight.EstimatedCutoff): string {
        const reasons: string[] = [];
        if (e.accountsEntered > 0) {
            reasons.push(`${e.accountsEntered} new`);
        }
        if (e.accountsLeft > 0) {
            reasons.push(`${e.accountsLeft} dropped`);
        }
        if (e.altsEntered > 0) {
            reasons.push(`+${e.altsEntered} alt`);
        }
        if (e.altsLeft > 0) {
            reasons.push(`-${e.altsLeft} alt`);
        }
        if (e.holdersReplaced > 0) {
            reasons.push(`${e.holdersReplaced} swapped to an alt`);
        }
        return reasons.join(" · ");
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
                    const estimate = estimateFor(i);
                    return (
                        //outer plate is the black frame; the inner one is clipped 1px smaller so the frame shows on the chamfers
                        <div key={`${i.achievement?.id}-${i.specialization?.id}-${i.faction?.type}`} className="cutoff-card">
                            <div className="cutoff-card-inner">
                                <span className="cutoff-tier" style={{ color: tierColor(title) }}>{title}</span>
                                {/* every spec has its own Solo Shuffle rewards, so without the spec those cards look identical */}
                                {i.specialization?.name && <span className="cutoff-label">{i.specialization.name}</span>}
                                <span className="cutoff-rating">{i.rating_cutoff}</span>
                                <div className="cutoff-meta">
                                    <span className="cutoff-label">Cutoff</span>
                                    <span className="cutoff-top">Top {i.rank}</span>
                                </div>
                                {estimate && (
                                    <>
                                        <div className="cutoff-meta" title={`${estimate.spots} spots + ${estimate.altsInside} alts · ${movementText(estimate)}`}>
                                            <span className="cutoff-label">Est. now</span>
                                            <span className="cutoff-top">{estimate.estimatedRating} · Top {estimate.estimatedRank}</span>
                                        </div>
                                        <EstimateDialog region={props.region} title={title} estimate={estimate} />
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

};

export default Cutoffs;