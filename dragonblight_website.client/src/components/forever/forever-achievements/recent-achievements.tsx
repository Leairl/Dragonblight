import { Badge, ChevronDownIcon, Text } from "@radix-ui/themes";
import { StarFilledIcon } from "@radix-ui/react-icons";
import { Dragonblight } from "../../../clients/Dragonblight";
import { achievementDate } from "./achievement-helpers";
import AchievementIcon from "./achievement-icon";

export default function RecentAchievements({ events, details, loading }: {
  events: Dragonblight.ForeverAchievementEvent[];
  details: Map<number, Dragonblight.ForeverAchievementDetails>;
  loading: boolean;
}) {
  if (events.length === 0) return null;
  return (
    <details className="forever-achievement-recent border-card">
      <summary>
        <span className="forever-recent-emblem"><StarFilledIcon aria-hidden /></span>
        <Text size="2" weight="medium" className="forever-recent-title">Recent achievements</Text>
        <Badge color="amber" variant="soft">{events.length}</Badge>
        <ChevronDownIcon className="forever-recent-chevron" aria-hidden />
      </summary>
      <ol className="forever-recent-list">
        {events.map((event, index) => {
          const detail = event.achievement ? details.get(event.achievement.id) : undefined;
          const date = achievementDate(event.timestamp);
          return (
            <li key={`${event.achievement?.id}/${index}`} className="forever-recent-row">
              <AchievementIcon key={detail?.icon ?? "missing"} src={detail?.icon} pending={loading && !detail} size={32} />
              <div className="forever-recent-name">
                <Text as="p" size="2" weight="medium">{detail?.achievement?.name ?? event.achievement?.name ?? "Unknown achievement"}</Text>
                {detail?.achievement?.category?.name && <Text as="p" size="1" color="gray">{detail.achievement.category.name}</Text>}
              </div>
              <Text size="1" color="gray" className="forever-recent-date">
                {date && event.timestamp != null ? <time dateTime={new Date(event.timestamp).toISOString()}>{date}</time> : "Date unavailable"}
              </Text>
            </li>
          );
        })}
      </ol>
    </details>
  );
}
