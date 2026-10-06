import React, { FC, useEffect, useState } from 'react';
import ProfileEquipment from './profile-equipment/profile-equipment';
import ProfileRating from './profile-rating/profile-rating';
import ProfileStats from './profile-stats/profile-stats';
import { Dragonblight } from '../../clients/Dragonblight';
import { useNavigate, useParams } from 'react-router';
import { getFlavor } from '../../helpers/game-flavor';
import { Flex, Text, SegmentedControl, Switch, Callout } from '@radix-ui/themes';
import "./profile.css"
import { useCookies } from 'react-cookie';
import { InfoCircledIcon } from "@radix-ui/react-icons";


const Profile: FC = () => {
    const [characterSummary, setcharacterSummary] = useState<Dragonblight.CharacterProfileSummary>();
    const [specName, setSpecName] = useState<string>();
    const [characterEquipmentSummary, setCharacterEquipmentSummary] = useState<Dragonblight.CharacterEquipmentSummary>();
    const [achievementsSummary, setAchievementsSummary] = useState<Dragonblight.CharacterAchievementsSummary>();

    const [characterNotFound, setCharacterNotFound] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [cookies, setCookie] = useCookies(["showModelViewer"]);
    //makes sure showModelViewer is always set to true, and to use our cookies whenever we refresh (keeps the switch at the same spot)
    const [showModelViewer, setShowModelViewer] = useState(
      cookies.showModelViewer ?? true
    );
    const { region, server, characterName, urlTab } = useParams();
    const navigate = useNavigate();
    // Glyphs are a MoP Classic feature - retail removed them in Legion.
    const showGlyphs = getFlavor() === "classic";
    const [currTab, setCurrTab] = useState<string>();
    const [err, setErr] = useState<string>();

    useEffect(() => {
      setCookie("showModelViewer", showModelViewer.toString(), { path: "/" });
    }, [showModelViewer, setCookie]);
    useEffect(() => {
      if (server == null || characterName == null || region == null) {
        return;
      }
        const CharacterClient = new Dragonblight.ProfileClient();
        const CharacterAchievementClient = new Dragonblight.AchievementClient();
        const slug = server?.replace(" ", "-")

        //profile data displayed before equipment sequentially
        setLoading(true)
        setErr("");
        CharacterClient.getProfile(slug, characterName, region).then((data) => {
          if (data?.charSummary == null) {
            setCharacterNotFound(true);
            setLoading(false);
            return;
          }
          setCharacterNotFound(false);
            setcharacterSummary(data.charSummary);
            setSpecName(data.charSummary.active_spec?.name);
            CharacterClient.getEquipment(slug, characterName, region).then((dataEquip) => {
                setCharacterEquipmentSummary(dataEquip);
                CharacterAchievementClient.getCharacterAchievements(slug, characterName, region).then((data) => {
                    setAchievementsSummary(data);
                })
                setLoading(false)
                })
        }).catch(() => {
            setCharacterNotFound(true);
            setLoading(false);
        });
    },
    [server, characterName, region])

    //updates the page to show the correct tab
    useEffect(() => {
      const tab = urlTab ?? 'gear'
      // a /glyphs link followed into retail has no pane to show
      ChangeTab(tab === 'glyphs' && !showGlyphs ? 'gear' : tab)
    }, [urlTab])



    function ChangeTab(newTab: string) {
      if (currTab == undefined) {
        return setCurrTab(newTab)
      }
      if (currTab != newTab) {
        navigate(`/profile/${region}/${server}/${characterName}/${newTab}`, { replace: true });
        setCurrTab(newTab);
      }
    }

    return( ((err && err != "") ? 
      <div className="w-[70vw]">
        <Callout.Root color="red">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text className="text-white txt-shadow">
            {err}
          </Callout.Text>
        </Callout.Root>
      </div>
      :
        // uses loading useState in profile.tsx, but is affected by useEffect in child profile components to allow change in display.
 <div className={characterNotFound ? "profile-page not-found grid" : "profile-page grid"}>
 <div className="button-row">
 <Text as="label" size="2">
   <Flex className='button-row'gap="2">
    {/* when setShowModelViewer changes, calls useEffect to use the correct ShowModelViewer on cookies*/}
          <div className={loading ? "div-disabled" : ""}>
            <SegmentedControl.Root
              className=" w-[250px] grow-0"
              value={currTab}
              defaultValue={"gear"}
            >
              <SegmentedControl.Item
                onClick={() => {
                  ChangeTab("gear");
                }}
                value="gear"
              >
                Gear
              </SegmentedControl.Item>
              <SegmentedControl.Item
                onClick={() => {
                  ChangeTab("talents");
                }}
                value="talents"
              >
                Talents
              </SegmentedControl.Item>
              <SegmentedControl.Item
                onClick={() => {
                  ChangeTab("alts");
                }}
                value="alts"
              >
                Alts
              </SegmentedControl.Item>
              {showGlyphs && (<SegmentedControl.Item
                onClick={() => {
                  ChangeTab("glyphs");
                }}
                value="glyphs"
              >
                Glyphs
              </SegmentedControl.Item>)}
            </SegmentedControl.Root>
          </div>
          <div className='flex grow'></div>
          <div className='self-center'>
          <Switch className='self-center'
                      onCheckedChange={(checked) => {
                        setShowModelViewer(checked);
                      }}
                      color="gray"
                      size="1"
                      radius="large"
                      checked={showModelViewer}
                    />
                    <span className="w-[160px] self-center"> Character Model Viewer </span>
                    </div>
   </Flex>
   
 </Text>
</div>
 <div className='flex-wrap flex flex-row justify-center'>
    <div className='flex flex-col'>
    <ProfileEquipment 
    currTab={currTab}
    characterProfileSummary={characterSummary} 
    characterEquipmentSummary={characterEquipmentSummary} 
    characterAchievementsSummary={achievementsSummary} 
    specName={specName}
    showModelViewer={showModelViewer}
    loading={loading} 
    characterNotFound={characterNotFound}
    ></ProfileEquipment> 
    <ProfileRating achievements={achievementsSummary} characterNotFound={characterNotFound}></ProfileRating>
    </div>
    <ProfileStats characterProfileSummary={characterSummary} characterEquipmentSummary={characterEquipmentSummary} loading={loading} characterNotFound={characterNotFound}></ProfileStats>
</div>
</div>
))};

export default Profile;
