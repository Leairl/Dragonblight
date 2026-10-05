import React, { useEffect, useState } from 'react';
import {  Heading, Skeleton } from "@radix-ui/themes";
import './glyph-viewer.css';
import { Dragonblight } from "../../clients/Dragonblight";
import { ClassColor } from '../../helpers/classColorHelper';
import Glyphs from '../../data/glyph';
import { Card } from '@radix-ui/themes';
import { wowheadUrl } from "../../helpers/game-flavor";
declare const $WowheadPower: { refreshLinks: () => void };

interface GlyphViewerProps {
    charName : string
    server : string
    region : string
    charClass : string
    pet: boolean
}
const GlyphViewer: React.FC<GlyphViewerProps> = (props) => {
    const [playerTalents, setPlayerTalents] = useState<Dragonblight.CharacterSpecializationsSummary>();
    const [loading, setLoading] = useState<boolean>(true);
    useEffect(() => {
        LoadTalents();
      }, []);
      useEffect(() => {
        $WowheadPower.refreshLinks();
      }, [loading]);

      if (loading) {
        return(
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
            
              <div className='py-3'>
                {GlyphDisplay()}
              </div>
            
        )
      }

    function GlyphDisplay() {
      const glyphSections: React.JSX.Element[] = [];
      const glyphName = ["Major Glyphs", "Minor Glyphs"];
      glyphName.map(g => {
        glyphSections.push(GetSection(g))
      })
      return glyphSections
    }
    function GetSection(g: string) {
      const glyphs: React.JSX.Element[] = [];
      [0,1,2].map((i) => {
        let glyphType = 0;
        if (g == 'Minor Glyphs') {
          glyphType = 1;
        }
        glyphs.push(loading ? GetSkeletonGlyph() : GetGlyph(i, glyphType))
      })
    return(
      <div className='grid'>
        <Heading size="3" className={'mt-3 mb-3 ml-2'}>{g}</Heading>
        <div className = 'flex-wrap justify-between m-2 flex flex-row'>
        {glyphs}
        </div>
      </div>
    )
    }
    function GetSkeletonGlyph(): React.JSX.Element {

      return(
          <div className='min-w-[200px] flex-grow py-1 flex flex-row items-center'>
            <Skeleton width="40px" height="40px">
            </Skeleton>
            <Skeleton className='ml-1'width="1px" height="10px">
            </Skeleton>
          </div>
      )
    }
    function GetGlyph(i: number, glyphType: number): React.JSX.Element {

      return(
          <Card className='min-w-[300px] my-2 p-2 flex flex-row items-center'>
            <div className='w-[44px] h-[44px] mr-3'>
            <a className="block w-[40px] h-[40px] talentIcon"
                                                        href={getActiveGlyphIcon(i, glyphType) == 0 
                                                          ? wowheadUrl(`item=206953/charred-glyph`)
                                                          :wowheadUrl(`spell=${getActiveGlyphIcon(i, glyphType)}`)}
                                                        >
                                                        </a>
            </div>
            <span className='w-[200px] text-wrap'> {getActiveGlyphName(i, glyphType)} </span>
          </Card>
      )
    }
    //pulls correct glyphtype of any glyph for a character
    function getActiveGlyphName(i : number, glyphType: number) {
      const ActiveGlyphName = playerTalents?.specialization_groups?.find(e => {
        return(e.is_active)
        })?.glyphs
        if (ActiveGlyphName) {
          return(ActiveGlyphName.filter(glyph => {
            return RetrieveGlyphs(glyph.id)?.Field_3_4_0_43659_001 == glyphType
          })[i]?.name) ?? "Empty Glyph Slot";
        }
        else {
          return "Empty Glyph Slot";
        }
    }

        //pulls correct glyphtype of any glyph for a character
        function getActiveGlyphIcon(i : number, glyphType: number) {
          const ActiveGlyphIcon = playerTalents?.specialization_groups?.find(e => {
            return(e.is_active)
            })?.glyphs
            if (ActiveGlyphIcon) {
              const GlyphData = (ActiveGlyphIcon.filter(glyph => {
                return RetrieveGlyphs(glyph?.id)?.Field_3_4_0_43659_001 == glyphType
              })[i]);
              return RetrieveGlyphs(GlyphData?.id)?.SpellID ?? 0
            }
            else {
              return 0;
            }
        }
    function RetrieveGlyphs(id: number) {
      return(
        Glyphs.find(g => {
          return(g.ID == id)
        })
      )
    }
    async function LoadTalents() 
    {
        setLoading(true);
        const client = new Dragonblight.TalentClient();
        setPlayerTalents(await client.getCharacterTalents(props.server,props.charName, props.region));
        setTimeout(() => {
            setLoading(false);
        }, 300)
    }

};

export default GlyphViewer;

