import { FC, useEffect } from "react";
import { Card, Skeleton, Text } from "@radix-ui/themes";
import { CompareNotice, SideHeader, SlotRow, SpecPicker } from "./compare-shared";
import { CompareSide, useTalentSummaries } from "./talent-data";
import { commonSpecs, defaultSpec, diffGlyphs, findSpec, slotChangeCount } from "./talent-diff";
import "../retail-talent-viewer/retail-talent-viewer.css";
declare const $WowheadPower: { refreshLinks: () => void };

interface CompareGlyphsProps {
  left: CompareSide;
  right: CompareSide;
  //the spec in the url, shared with the talents tab
  specId?: number;
  onSpecChange: (specId: number) => void;
}

//MoP Classic only: glyphs come from the specialization groups, which retail's response leaves out.
const CompareGlyphs: FC<CompareGlyphsProps> = (props) => {
  const { leftSummary, rightSummary, loading, failed } = useTalentSummaries(props.left, props.right);
  const options = commonSpecs(leftSummary, rightSummary);
  const specId = options.some((o) => o.id == props.specId) ? props.specId : defaultSpec(options);
  const spec = options.find((o) => o.id == specId);
  const glyphs = diffGlyphs(leftSummary, rightSummary, specId);
  const changeCount = slotChangeCount(glyphs.major) + slotChangeCount(glyphs.minor);

  useEffect(() => {
    if (!loading) $WowheadPower.refreshLinks();
  });

  if (failed) return <CompareNotice text="Glyphs could not be loaded. Try again in a moment." />;
  if (!loading && options.length == 0) {
    return (
      <CompareNotice
        text={`${props.left.displayName ?? props.left.name} and ${props.right.displayName ?? props.right.name} have no specialization in common with talents set. Blizzard only reports a spec's talents once the character has played it.`}
      />
    );
  }

  return (
    <Card className="compare-diff border-card">
      <div className="diff-toolbar">
        {loading ? (
          <Skeleton width="320px" height="24px" />
        ) : (
          <SpecPicker options={options} specId={specId} className={props.left.className} onChange={props.onSpecChange} />
        )}
        <div className="grow" />
        {!loading && (
          <Text size="2">
            <b>{changeCount}</b> {changeCount == 1 ? "difference" : "differences"}
          </Text>
        )}
      </div>

      {loading ? (
        <div className="p-4">
          <Skeleton width="100%" height="160px" />
        </div>
      ) : (
        <>
          {spec && (
            <div className="talent-sides talent-sides-slotted">
              <SideHeader kind="del" side={props.left} spec={findSpec(leftSummary, specId)} isActiveSpec={spec.leftActive} summary={leftSummary} />
              <SideHeader kind="add" side={props.right} spec={findSpec(rightSummary, specId)} isActiveSpec={spec.rightActive} summary={rightSummary} />
            </div>
          )}
          <SlotRow label="Major" diff={glyphs.major} />
          <SlotRow label="Minor" diff={glyphs.minor} />
        </>
      )}
    </Card>
  );
};

export default CompareGlyphs;
