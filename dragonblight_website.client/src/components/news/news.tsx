import React, { useEffect, useState } from 'react';
import { BlueTracker } from "./blue-tracker";
import { Badge, Button, Card, Heading, Separator, Skeleton } from "@radix-ui/themes";
import "./news.css"
import { Dragonblight } from "../../clients/Dragonblight";


const News: React.FC = () => {
    const [streamList, setStreamList] = useState<Dragonblight.Stream[]>([]);
    const [selectedStream, setSelectedStream] = useState<string>("");
    useEffect(() => {
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
        <div className="newsSection flex flex-row flex-wrap items-start justify-between">
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
                <div className="grow"></div>
                <div className="h-5 w-full">
                    <Badge className='float-right mx-3' color="purple"><a href="https://twitch.tv">Twitch</a></Badge>
                </div>
            </Card>
            <BlueTracker compact />
        </div>
    );
}
export default News
