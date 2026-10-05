import { XMLParser } from "fast-xml-parser";
import React, { useEffect, useState } from 'react';
import { Item, NewsModel } from "./news";
import { Badge, Button, Card, Heading, SegmentedControl, Separator, Skeleton } from "@radix-ui/themes";
import * as Tooltip from "@radix-ui/react-tooltip";
import "./news.css"
import { Dragonblight } from "../../clients/Dragonblight";


const News: React.FC = () => {
    const [news, setNews] = useState<NewsModel>();
    const [region, setRegion] = useState<string>("us");
    const [streamList, setStreamList] = useState<Dragonblight.Stream[]>([]);
    const [selectedStream, setSelectedStream] = useState<string>("");
    useEffect(() => {
        fetch("/data/news").then(
            (res) => res.text().then((text) => {
                const parser = new XMLParser();
                const jObj = parser.parse(text);
                console.log(jObj);
                setNews(jObj)
            })
        );

        // declare the data fetching function
        const fetchData = async () => {
            const client = new Dragonblight.TwitchClient();
            let res = await client.getWowTwitchStreams();
            res = res.sort((a, b) => a.viewerCount - b.viewerCount).reverse();
            setStreamList(res);
        }

        // call the function
        fetchData()
            // make sure to catch any error
            .catch(console.error);
    }, []);

    useEffect(() => {
        if (streamList && streamList.length > 0)
            setSelectedStream(streamList[0].userName ?? "");
        else
            setSelectedStream("");
    }, [streamList]);
    
    return (
        <div className="newsSection flex flex-row flex-wrap justify-between">
            <Card className="flex flex-col streamersCard px-0 mt-1">
                <div className="flex justify-between mx-4 mb-2">
                    <Heading size="5">Featured Stream</Heading>
                    <Heading size="5" className="float-right"> {selectedStream.charAt(0).toUpperCase() + selectedStream.slice(1)}</Heading>
                </div>
                <Separator className="w-full" />
                <div className="flex flex-col">
                    <div className="player_container">
                        {selectedStream == "" && <Skeleton className="twitchPlayer" />}
                        {selectedStream != "" && <iframe
                            key={selectedStream}
                            src={`https://player.twitch.tv/?channel=${selectedStream}&parent=${window.location.hostname}&autoplay=true&muted=true&width=100%`}
                            allowFullScreen={true}
                            width="100%"
                            className="twitchPlayer">
                        </iframe>}
                    </div>
                    <div className="flex flex-row flex-wrap m-2">
                        {streamList.map((streamer) => {
                            return (<Button variant="outline" color="gray" onClick={() => {setSelectedStream(streamer.userName ?? "")}} 
                                            disabled={streamer.userName == selectedStream}
                                            className={"m-1 cursor-pointer text-white w-[140px] justify-start" 
                                                    + (streamer.userName == selectedStream ? " bg-sky-900 cursor-auto" : "")} key={streamer.userName} 
                                                    title={streamer.userName + '\n' + streamer.viewerCount + ' Viewers'}>
                                    <span className="w-[75px] truncate text-left ">{streamer.userName}</span>
                                    <span className="dot"></span>{streamer.viewerCount}
                                </Button>)
                        })}
                    </div>
                </div>
                <div className="flex-grow"></div>
                <div className="h-5 w-full">
                    <Badge className='float-right mx-3' color="purple"><a href="https://twitch.tv">Twitch</a></Badge>
                </div>
            </Card>
            <Card className="flex flex-col newsCard px-0 h-[410px] mt-1">
                <div className="flex justify-between mx-4 mb-2">
                    <Heading size="5">News</Heading>
                    <SegmentedControl.Root
                        className="float-right h-[25px]"
                        value={region}
                    >
                        <SegmentedControl.Item value="us" onClick={() => setRegion("us")}>
                            US
                        </SegmentedControl.Item>
                        <SegmentedControl.Item value="eu" onClick={() => setRegion("eu")}>
                            EU
                        </SegmentedControl.Item>
                    </SegmentedControl.Root>
                </div>
                <Separator className="w-full" />
                <div className="flex flex-col w-full">

                    {
                    news?.rss.channel.item
                    .filter(ni => ni.link.includes("/"+region+"/") && ni.link.includes("/topic/"))
                    .slice(0, 10)
                    .map((newsItem: Item) => {
                        return (
                            <div key={"news"+newsItem.guid} className="p-1 rounded-lg hover:underline text-[#00c0ff] h-[30px] w-full">
                                <Tooltip.Provider delayDuration={100} key={"news" + newsItem.guid}>
                                    <Tooltip.Root>
                                    <Tooltip.Portal>
                                        <Tooltip.Content className="wow-tooltip block">
                                        <table>
                                                <tbody>
                                                <tr>
                                                    <td>
                                                    <table style={{width: "100%"}}>
                                                        <tbody>
                                                        <tr>
                                                            <td>
                                                            <table width="100%">
                                                                <tbody>
                                                                <tr>
                                                                    <td>
                                                                    <a className="whtt-name">
                                                                        <b className="whtt-name">{newsItem.title}</b>
                                                                    </a>
                                                                    </td>
                                                                </tr>
                                                                </tbody>
                                                            </table>
                                                            </td>
                                                        </tr>
                                                        </tbody>
                                                    </table>
                                                    <table style={{width: "100%"}}>
                                                        <tbody>
                                                        <tr>
                                                            <td>
                                                            <div className="tt-desc" dangerouslySetInnerHTML={{__html: newsItem.description}}>
                                                            </div>
                                                            </td>
                                                        </tr>
                                                        </tbody>
                                                    </table>
                                                    </td>
                                                    <th style={{backgroundPosition: "top right"}}></th>
                                                </tr>
                                                <tr>
                                                    <th style={{backgroundPosition: "bottom left"}}></th>
                                                    <th style={{backgroundPosition: "bottom right"}}></th>
                                                </tr>
                                                </tbody>
                                            </table>
                                        </Tooltip.Content>
                                    </Tooltip.Portal>
                                    <Tooltip.Trigger className="cursor-pointer  w-full text-left">
                                        <div className="float-left content-center mr-1 h-[24px]">
                                            <img src="data:image/x-icon;base64,AAABAAEAEBAAAAAAAABoBQAAFgAAACgAAAAQAAAAIAAAAAEACAAAAAAAAAEAAAAAAAAAAAAAAAEAAAAAAAAAAAAAJCIIAP///wDzlwEABgYGAP2UDAAWFQYA/70GAP66BwC/UQAA9IcCAP2rEQDSVwAADw8OAP9pCADXaQAAHRwJAOl4AAD9wxAAAgICAO1bAAAODgMA/IQWAP6xBgDqawAA6YYAAP2aFAD7fQcA/XcWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgICAgICBgYGBgYGAgICAgEQFRUVFRUPDw8RExUVBgEQBggDEgcHExMTFQMIBxcGAgYFExELCAoLChoFBRMXEAIEBRMTGwsTCw8GGQsTDRACAhoPERoaExYTGBMTFg0CAgIRAxoMFhMOExwTExQVDQICERUFExwTHBMbCRMTDw0CDRYcDBMNDBwJGxYcHBwNAg0NDQ0NDQ0NDRUNEw0NDQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP//AAD//wAA//8AAPwPAAAAAAAAAAAAAIAAAACAAAAAwAEAAMAAAADAAAAAgAAAAIAAAAD//wAA//8AAP//AAA="></img>
                                        </div>
                                        <a href={newsItem.link}>
                                        <h1 className="text-[#00c0ff] text-nowrap truncate text-ellipsis" >
                                            {newsItem.title}
                                        </h1>
                                        </a>
                                    </Tooltip.Trigger>
                                    </Tooltip.Root>
                                </Tooltip.Provider>
                            </div>)
                    })}
                </div>
                <div className="flex-grow"></div>
                <div className="h-5 w-full">
                    <Badge className='float-right mx-3'><a href="https://wowhead.com">Wowhead</a></Badge>
                </div>
            </Card>
        </div>
    );
}
export default News