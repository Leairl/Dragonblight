import React from 'react';
import {  Heading, Skeleton } from "@radix-ui/themes";
import '../talent-viewer/talent-viewer.css';
import LoadingSpinner from '../loading-spinner/loading-spinner';
import { useCharacterTalents } from '../talent-viewer/use-character-talents';
import Glyphs from '../../data/glyph';
import { Card } from '@radix-ui/themes';
import { wowheadUrl } from "../../helpers/game-flavor";

interface GlyphViewerProps {
    charName : string
    server : string
    region : string
    charClass : string
    pet: boolean
}
const GlyphViewer: React.FC<GlyphViewerProps> = (props) => {
    const { talents: playerTalents, loading } = useCharacterTalents(props.server, props.charName, props.region);

      if (loading) {
        return <LoadingSpinner charClass={props.charClass} />;
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
          <div className='min-w-[200px] grow py-1 flex flex-row items-center'>
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
};

export default GlyphViewer;

