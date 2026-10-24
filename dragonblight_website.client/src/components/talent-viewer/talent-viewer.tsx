import React, { useEffect, useState } from 'react';
import Talents, { Talent } from '../../data/talent';
import { Card } from "@radix-ui/themes";
import './talent-viewer.css';
import { Dragonblight } from "../../clients/Dragonblight";
import { ClassColor } from '../../helpers/classColorHelper';
import { wowheadUrl } from "../../helpers/game-flavor";
declare const $WowheadPower: { refreshLinks: () => void };

interface TalentViewerProps {
    charName: string
    server: string
    region: string
    charClass: string
    charClassId: number
}
const TalentViewer: React.FC<TalentViewerProps> = (props) => {
    const [playerTalents, setPlayerTalents] = useState<Dragonblight.CharacterSpecializationsSummary>();
    const [loading, setLoading] = useState<boolean>(true);
    useEffect(() => {
        LoadTalents();
    }, []);
    useEffect(() => {
        $WowheadPower.refreshLinks();
    }, [loading]);

    if (loading) {
        return (
            <div className="grid min-h-[250px] w-full place-items-center overflow-x-scroll rounded-lg p-6 lg:overflow-visible">
                <svg
                    className="w-16 h-16 animate-spin text-gray-900/50"
                    viewBox="0 0 64 64"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                >
                    <path
                        d="M32 3C35.8083 3 39.5794 3.75011 43.0978 5.20749C46.6163 6.66488 49.8132 8.80101 52.5061 11.4939C55.199 14.1868 57.3351 17.3837 58.7925 20.9022C60.2499 24.4206 61 28.1917 61 32C61 35.8083 60.2499 39.5794 58.7925 43.0978C57.3351 46.6163 55.199 49.8132 52.5061 52.5061C49.8132 55.199 46.6163 57.3351 43.0978 58.7925C39.5794 60.2499 35.8083 61 32 61C28.1917 61 24.4206 60.2499 20.9022 58.7925C17.3837 57.3351 14.1868 55.199 11.4939 52.5061C8.801 49.8132 6.66487 46.6163 5.20749 43.0978C3.7501 39.5794 3 35.8083 3 32C3 28.1917 3.75011 24.4206 5.2075 20.9022C6.66489 17.3837 8.80101 14.1868 11.4939 11.4939C14.1868 8.80099 17.3838 6.66487 20.9022 5.20749C24.4206 3.7501 28.1917 3 32 3L32 3Z"
                        stroke="currentColor"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    ></path>
                    <path
                        d="M32 3C36.5778 3 41.0906 4.08374 45.1692 6.16256C49.2477 8.24138 52.7762 11.2562 55.466 14.9605C58.1558 18.6647 59.9304 22.9531 60.6448 27.4748C61.3591 31.9965 60.9928 36.6232 59.5759 40.9762"
                        stroke="currentColor"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                            color: `${ClassColor.get(
                                props.charClass
                                ?? "black"
                            )}`,
                        }}
                    ></path>
                </svg>
            </div>
        )
    }
    else {
        return (
            <div className="justify-center mb-4" style={{ display: 'flex', flexWrap: 'wrap' }}>
                <div className='grid min-w-[280px] max-w-[840px] overflow-x-scroll' key={"tab1"} style={{ flex: '1' }}>
                    <div className="m-2">
                        <div className="flex">
                            {[0, 1, 2].map(c => {
                                return (<div key={"tab1" + 'x' + c} className="flex-1 flex flex-col">
                                    {[0, 1, 2, 3, 4, 5].map(r => {
                                        const talent = Talents.find((talent) => talent.ClassID === props.charClassId && talent.ColumnIndex == c && talent.TierID == r);
                                        return (
                                            <div key={talent?.ID + '' + c + r} className="m-1.5 mb-4 w-[240px] h-[40px] talentIconWrapper" data-talented={IsTalented(talent) ? "true" : "false"}>
                                                {talent != null && (
                                                    <Card className='talentCard min-w-[240px] my-2 p-2 flex flex-row items-center'>
                                                        <a className="block w-[240px] h-[40px] talentIcon flex"
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


    async function LoadTalents() {
        setLoading(true);
        const client = new Dragonblight.TalentClient();
        setPlayerTalents(await client.getCharacterTalents(props.server, props.charName, props.region));
        setTimeout(() => {
            setLoading(false);
        }, 300)
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

