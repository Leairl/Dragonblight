import { Badge, Card, Flex, Heading, Progress, Text } from "@radix-ui/themes";
import { Dragonblight } from "../../../clients/Dragonblight";
import { stripWowMarkup } from "../../../helpers/equipmentHelper";
import { achievementCriteria, achievementDate, achievementStatus } from "./achievement-helpers";
import AchievementIcon from "./achievement-icon";

export default function AchievementCard({ entry, detail, loading }: {
  entry: Dragonblight.ForeverAchievementProgress;
  detail?: Dragonblight.ForeverAchievementDetails;
  loading: boolean;
}) {
  const definition = detail?.achievement;
  const name = definition?.name ?? entry.achievement?.name ?? `Achievement ${entry.id}`;
  const status = achievementStatus(entry);
  const date = achievementDate(entry.completed_timestamp);
  const criteria = achievementCriteria(definition, entry);
  return (
    <Card className="border-card forever-achievement-card">
      <Flex gap="3" align="start">
        <AchievementIcon key={detail?.icon ?? "missing"} src={detail?.icon} pending={loading && !detail} />
        <div className="forever-achievement-body">
          <Flex justify="between" align="start" gap="2" wrap="wrap">
            <Heading size="2">{name}</Heading>
            <Badge color={status === "completed" ? "green" : "gray"}>
              {status === "completed" ? "Completed" : status === "in-progress" ? "In progress" : "Status unavailable"}
            </Badge>
          </Flex>
          <Flex gap="2" wrap="wrap" mt="1">
            {definition?.category?.name && <Text size="1" color="gray">{definition.category.name}</Text>}
            {definition?.is_account_wide && <Badge color="gray" size="1">Account-wide</Badge>}
            {date && <Text size="1" color="gray">Completed {date}</Text>}
          </Flex>
          {definition?.description && <Text as="p" size="2" mt="2">{stripWowMarkup(definition.description)}</Text>}
          {definition?.reward_description && <Text as="p" size="2" color="amber" mt="2">{stripWowMarkup(definition.reward_description)}</Text>}
          {!definition && !loading && <Text as="p" size="1" color="gray" mt="2">Achievement details unavailable.</Text>}
          {status !== "completed" && criteria.length > 0 && (
            <details className="forever-achievement-requirements">
              <summary>Requirements ({criteria.length})</summary>
              <ul className="forever-achievement-criteria">
                {criteria.map((criterion) => (
                  <li key={criterion.id}>
                    <Flex justify="between" gap="2" wrap="wrap">
                      <Text size="1">{stripWowMarkup(criterion.label)}</Text>
                      <Text size="1" color={criterion.completed ? "green" : "gray"}>
                        {criterion.completed ? "Completed" : criterion.target != null && criterion.amount != null
                          ? `${criterion.amount.toLocaleString()} / ${criterion.target.toLocaleString()}`
                          : criterion.completed === false ? "Not completed" : "Progress unavailable"}
                      </Text>
                    </Flex>
                    {criterion.target != null && criterion.amount != null && !criterion.completed && (
                      <Progress size="1" mt="1" value={Math.max(0, Math.min(criterion.amount, criterion.target))} max={criterion.target}
                        aria-label={`${name}: ${criterion.label}`} aria-valuetext={`${criterion.amount} of ${criterion.target}`} />
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </Flex>
    </Card>
  );
}
