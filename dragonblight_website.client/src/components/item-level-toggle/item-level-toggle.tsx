import { FC } from "react";
import { SegmentedControl } from "@radix-ui/themes";
import { useItemLevelMode } from "../../helpers/itemLevelMode";
import { getFlavor } from "../../helpers/game-flavor";

// PvE | PvP item level switch, shared by the profile and compare pages. MoP Classic has no PvP
// item level, so there is nothing to switch and it renders nothing.
const ItemLevelToggle: FC = () => {
  const [mode, setMode] = useItemLevelMode();
  if (getFlavor() !== "retail") return null;
  return (
    <SegmentedControl.Root
      size="1"
      value={mode}
      onValueChange={(v) => setMode(v === "pve" ? "pve" : "pvp")}
      title="Item level outside PvP, or in Arenas, Battlegrounds and War Mode"
    >
      <SegmentedControl.Item value="pve">PvE ilvl</SegmentedControl.Item>
      <SegmentedControl.Item value="pvp">PvP ilvl</SegmentedControl.Item>
    </SegmentedControl.Root>
  );
};

export default ItemLevelToggle;
