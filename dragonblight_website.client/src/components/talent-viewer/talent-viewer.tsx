import React from 'react';
import Talents, { Talent } from '../../data/talent';
import { Card } from "@radix-ui/themes";
import './talent-viewer.css';
import LoadingSpinner from '../loading-spinner/loading-spinner';
import { useCharacterTalents } from './use-character-talents';
import { wowheadUrl } from "../../helpers/game-flavor";

interface TalentViewerProps {
    charName: string
    server: string
    region: string
    charClass: string
    charClassId: number
}
const TalentViewer: React.FC<TalentViewerProps> = (props) => {
    const { talents: playerTalents, loading } = useCharacterTalents(props.server, props.charName, props.region);

    if (loading) {
        return <LoadingSpinner charClass={props.charClass} />;
    }
    else {
        return (
            <div className="justify-center mb-4" style={{ display: 'flex', flexWrap: 'wrap' }}>
                <div className='grid min-w-[280px] max-w-[840px] overflow-x-auto' key={"tab1"} style={{ flex: '1' }}>
                    <div className="m-2">
                        <div className="flex">
                            {[0, 1, 2].map(c => {
                                return (<div key={"tab1" + 'x' + c} className="flex-1 min-w-0 flex flex-col">
                                    {[0, 1, 2, 3, 4, 5].map(r => {
                                        const talent = Talents.find((talent) => talent.ClassID === props.charClassId && talent.ColumnIndex == c && talent.TierID == r);
                                        return (
                                            <div key={talent?.ID + '' + c + r} className="m-1.5 mb-4 w-[240px] h-[40px] max-[800px]:m-0.5 max-[800px]:mb-1 max-[800px]:w-auto max-[800px]:h-auto talentIconWrapper" data-talented={IsTalented(talent) ? "true" : "false"}>
                                                {talent != null && (
                                                    <Card className='talentCard min-w-[240px] max-[800px]:min-w-0 my-2 p-2 max-[800px]:p-1 flex flex-row items-center'>
                                                        <a className="block w-[240px] h-[40px] max-[800px]:w-full max-[800px]:h-auto talentIcon flex"
                                                            href={wowheadUrl(`spell=${talent.SpellID}`)}
                                                            data-points="0" data-max-points="3" data-wh-rename-link="true">
                                                        </a>
                                                    </Card>
                                                )}
                                            </div>
                                        );
                                    })}</div>);
                            })
                            }
                        </div>
                    </div>
                </div>
            </div>
        )
    }


    function IsTalented(talent: Talent | undefined) {
        if (talent == undefined) { return false; }
        const activeSpec = playerTalents?.specialization_groups?.find(s => s.is_active);
        if (activeSpec == undefined) { return false; }
        const activeSpecIndex = playerTalents?.specialization_groups?.indexOf(activeSpec);
        if (playerTalents?.specializations != undefined) {
            const tree = playerTalents?.specializations[activeSpecIndex ?? 0];
            const talented = tree?.talents?.some(t => (t.spell_tooltip?.spell?.id ?? 0) == talent.SpellID);
            return talented;
        }
        return false;
    }
};
export default TalentViewer;

