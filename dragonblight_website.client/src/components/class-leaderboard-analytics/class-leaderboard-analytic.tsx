import React, { useEffect, useState } from 'react';
import { Card, SegmentedControl } from "@radix-ui/themes";
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import "./class-leaderboard-analytic.css"
import { Dragonblight } from "../../clients/Dragonblight";
import { useNavigate, useParams } from "react-router";
import { ClassColor } from '../../helpers/classColorHelper';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { brackets } from "../../helpers/game-flavor";



ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ClassAnalytics: React.FC = () => {
  const { URLregion, URLbracket } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [region, setRegion] = useState<string>(URLregion ?? "us");
  const [bracket, setBracket] = useState<string>(URLbracket ?? "3v3");
  const [rating, setRating] = useState<number>(1500);
  const [classAnalyticsList, setClassAnalyticsList] = useState<Dragonblight.ClassAnalytics[]>([]);

  useEffect(() => {
    setLoading(true);
    const fetchData = async () => {
      const client = new Dragonblight.LeaderboardAnalyticsClient();
      const res = await client.getLeaderboardAnalytics(region, bracket);
      setClassAnalyticsList(res);
      setLoading(false);
    };

    fetchData().catch(console.error);
  }, [region, bracket]);

  function BracketClick(bracketName: string) {
    if (bracket !== bracketName) {
      navigate(`/class-stats/${region}/${bracketName}`, { replace: true });
      setBracket(bracketName);
    }
  }

  function RegionClick(regionName: string) {
    if (region !== regionName) {
      navigate(`/class-stats/${regionName}/${bracket}`, { replace: true });
      setRegion(regionName);
    }
  }

  const filteredClassAnalyticsList = classAnalyticsList.map(c => ({
    ...c,
    PvpEntries: c.PvpEntries.filter(entry => entry.rating >= rating)
  }));

  const sortedClassAnalyticsList = filteredClassAnalyticsList.sort((a, b) => b.PvpEntries.length - a.PvpEntries.length);
  const colors = sortedClassAnalyticsList.map(c => ClassColor.get(c.className));

  const data = {
    labels: sortedClassAnalyticsList.map(c => c.className),
    datasets: [
      {
        label: 'Total Players',
        data: sortedClassAnalyticsList.map(c => c.PvpEntries.length),
        backgroundColor: colors,
        borderColor: 'rgba(0, 0, 0, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    indexAxis: "y" as const,
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      
      title: {
        text: (bracket == 'rbg' ? bracket.toUpperCase() : bracket) + ' Class Stats',
        color: 'white',
        display: true,
      },
      legend: {
        display: false,
        position: 'right' as const
      },
    },
    scales: {
      x: {
        title: {
          display: false,
          color: 'white',
          
          text: 'Total Players',
        },
        grid: {
          offset: true,
          display: false,
        },
        ticks: {
          color: 'white', // Set x-axis labels to white
        },
      },
      y: {
        grid: {
          offset: true,
          display: false,
        },
        ticks: {
          color: 'white', // Set y-axis labels to white
        },
      },
    },
  };

  return (
    <div className="mobileOnlyFull w-[60vw] h-[90vh]">
      <div className="flex-col">
        <div className="flex-row justify-center flex px-0 py-3 flex-wrap">
          <div className={loading ? "div-disabled" : ""}>
            <SegmentedControl.Root
              className="w-[250px] grow-0"
              defaultValue={URLbracket ?? "3v3"}
            >
              <SegmentedControl.Item onClick={() => BracketClick("2v2")} value="2v2">
                2v2
              </SegmentedControl.Item>
              <SegmentedControl.Item onClick={() => BracketClick("3v3")} value="3v3">
                3v3
              </SegmentedControl.Item>
              {brackets().includes("5v5") && (
                <SegmentedControl.Item onClick={() => BracketClick("5v5")} value="5v5">
                  5v5
                </SegmentedControl.Item>
              )}
              <SegmentedControl.Item onClick={() => BracketClick("rbg")} value="rbg">
                RBG
              </SegmentedControl.Item>
            </SegmentedControl.Root>
          </div>
          <div className="grow"></div>
          <div className={loading ? "div-disabled" : ""}>
            <SegmentedControl.Root
              className="w-[100px] grow-0"
              defaultValue={URLregion ?? "us"}
            >
              <SegmentedControl.Item onClick={() => RegionClick("us")} value="us">
                US
              </SegmentedControl.Item>
              <SegmentedControl.Item onClick={() => RegionClick("eu")} value="eu">
                EU
              </SegmentedControl.Item>
            </SegmentedControl.Root>
          </div>
          <div className="grow"></div>
          <div className={loading ? "div-disabled" : ""}>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="CustomButton">
                  {rating} Minimum Rating
                  <ChevronDownIcon className="DropdownArrow" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content className="DropdownMenuContent" sideOffset={5}>
                {[1500, 1800, 2000, 2200, 2400, 2700].map(value => (
                  <DropdownMenu.Item
                    key={value}
                    className="RatingDropdownMenuItem"
                    onSelect={() => setRating(value)}
                  >
                    <div className="ClassItem"><span>{value} Minimum Rating</span></div>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </div>
        </div>
        <Card className="w-full h-[40vh]">
          <Bar className="w-full h-full" data={data} options={options} />
        </Card>
      </div>
    </div>
  );
};

export default ClassAnalytics;