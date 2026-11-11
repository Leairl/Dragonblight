import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button, Popover } from "@radix-ui/themes";
import { CheckIcon, Cross2Icon, MixerHorizontalIcon } from "@radix-ui/react-icons";
import { useMediaQuery } from "../../../helpers/useMediaQuery";
import "./source-filter.css";

//adds the modifier class only when it applies
function withModifier(className: string, modifier: string, applies: boolean): string {
  if (applies) {
    return className + " " + modifier;
  }
  return className;
}

// A recipe list's source filter, laid out like the ladder's class filter: one Source button that opens
// a checklist (a popover on desktop, a sheet from the bottom on mobile), and a tag for each source
// picked. Several can be picked; none picked means All. A recipe with more than one source counts
// under each.
export default function SourceFilter({ counts, selected, onChange, label }: {
  counts: { kind: string; count: number }[]; selected: string[]; onChange: (kinds: string[]) => void; label: string;
}) {
  const [open, setOpen] = useState(false);
  //the width the professions cards switch to their mobile layout at
  const isMobile = useMediaQuery("(max-width: 800px)");

  function toggle(kind: string) {
    let next = [...selected, kind];
    if (selected.includes(kind)) {
      next = selected.filter((value) => value !== kind);
    }
    //every source picked is the same as no filter at all
    if (next.length === counts.length) {
      next = [];
    }
    onChange(next);
  }

  const allOn = selected.length === 0;
  const picker = (
    <div className="source-filter-picker">
      <div className="source-filter-picker-header">
        <span className="source-filter-picker-title">Source</span>
        <button type="button" className={withModifier("source-filter-all", "on", allOn)} aria-pressed={allOn} onClick={() => onChange([])}>
          All
        </button>
      </div>
      <div className="source-filter-options">
        {counts.map(({ kind, count }) => {
          const on = selected.includes(kind);
          return (
            <button key={kind} type="button" className={withModifier("source-filter-option", "on", on)} aria-pressed={on} onClick={() => toggle(kind)}>
              <span className="source-filter-check">{on && <CheckIcon />}</span>
              <span className="source-filter-name">{kind}</span>
              <span className="source-filter-count">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  let triggerText = "All";
  if (!allOn) {
    triggerText = String(selected.length);
  }
  const trigger = (
    <Button size="1" variant="soft" color="gray" aria-label={`Filter ${label} recipes by source`}>
      <MixerHorizontalIcon /> Source <span className="source-filter-trigger-count">{triggerText}</span>
    </Button>
  );

  let control = (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger>{trigger}</Popover.Trigger>
      <Popover.Content size="1" className="source-filter-popover" align="start">
        {picker}
      </Popover.Content>
    </Popover.Root>
  );
  if (isMobile) {
    control = (
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="source-filter-sheet-overlay" />
          <Dialog.Content className="source-filter-sheet" aria-describedby={undefined}>
            <Dialog.Title className="sr-only">Filter {label} recipes by source</Dialog.Title>
            <span className="source-filter-sheet-handle" aria-hidden />
            {picker}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <div className="source-filter">
      {control}
      {selected.map((kind) => (
        <span key={kind} className="source-filter-tag">
          <span className="source-filter-tag-body">{kind}</span>
          <button type="button" className="source-filter-tag-remove" aria-label={`Remove ${kind} filter`} onClick={() => toggle(kind)}>
            <Cross2Icon />
          </button>
        </span>
      ))}
      {selected.length > 0 && (
        <button type="button" className="source-filter-clear" onClick={() => onChange([])}>Clear all</button>
      )}
    </div>
  );
}
