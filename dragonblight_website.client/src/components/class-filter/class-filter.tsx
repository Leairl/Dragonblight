import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Popover } from '@radix-ui/themes';
import { CheckIcon, Cross2Icon } from '@radix-ui/react-icons';
import { Dragonblight } from '../../clients/Dragonblight';
import './class-filter.css';
import { getFlavor } from '../../helpers/game-flavor';
import { classIcon, specIcon } from '../../helpers/classIconHelper';
import { useMediaQuery } from '../../helpers/useMediaQuery';
import { ClassColor } from '../../helpers/classColorHelper';

export const all_classes = 'All Classes'
//what a ladder asks the server for: "Class:Spec" for a class with specs picked, otherwise the class
export function ladderFilter(selectedClasses: string[], selectedSpecs: string[]): string[] {
  const classAndSpecFilter: string[] = [];
  for (const className of selectedClasses) {
    const specsForClass = selectedSpecs.filter(spec => spec.startsWith(className + ":"));
    if (specsForClass.length > 0) {
      classAndSpecFilter.push(...specsForClass);
    } else {
      classAndSpecFilter.push(className);
    }
  }
  return classAndSpecFilter;
}

//adds the modifier class only when it applies
function withModifier(className: string, modifier: string, applies: boolean): string {
  if (applies) {
    return className + " " + modifier;
  }
  return className;
}

interface ClassFilterProps {
  region: string;
  onChange: (classes: string[], specs: string[]) => void;
  showSpecs?: boolean;
}

//A class is either not filtered on, filtered on with all of its specs, or filtered on with some of
//them. "All specs" is stored as the class with no "Class:Spec" entries, which is what the server reads.
const ClassFilter: React.FC<ClassFilterProps> = (props) => {
  const [selectedClasses, setSelectedClasses] = useState<string[]>([all_classes]);
  const [wowClasses, setWowClasses] = useState<Dragonblight.WowClass[]>([]);
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  //the class whose specs are showing, in the popover or the mobile sheet
  const [openClass, setOpenClass] = useState<string | null>(null);
  //the width the ladder tables switch to their mobile layout at
  const isMobile = useMediaQuery("(max-width: 950px)");
  const canPickSpecs = props.showSpecs !== false;

  useEffect(() => {
    const DragonblightClient = new Dragonblight.PvpLeaderboardClient();
    DragonblightClient.getPlayableClasses(props.region)
      .then((result) => setWowClasses(result ?? []));
  }, [getFlavor()]);

  function update(classes: string[], specs: string[]) {
    let nextClasses = classes;
    let nextSpecs = specs;
    //every class with every spec is the same as no filter at all
    if (classes.length === 0 || (classes.length === wowClasses.length && specs.length === 0)) {
      nextClasses = [all_classes];
      nextSpecs = [];
    }
    setSelectedClasses(nextClasses);
    setSelectedSpecs(nextSpecs);
    props.onChange(nextClasses, nextSpecs);
  }

  function isSelected(className: string): boolean {
    return selectedClasses.includes(className);
  }
  function pickedSpecs(className: string): string[] {
    return selectedSpecs
      .filter(s => s.startsWith(className + ":"))
      .map(s => s.slice(className.length + 1));
  }
  function hasAllSpecs(className: string): boolean {
    return isSelected(className) && pickedSpecs(className).length === 0;
  }
  function isSpecOn(className: string, spec: string): boolean {
    return hasAllSpecs(className) || pickedSpecs(className).includes(spec);
  }
  function otherClasses(className: string): string[] {
    return selectedClasses.filter(c => c !== all_classes && c !== className);
  }
  function otherSpecs(className: string): string[] {
    return selectedSpecs.filter(s => !s.startsWith(className + ":"));
  }

  function removeClass(className: string) {
    update(otherClasses(className), otherSpecs(className));
  }
  function toggleWholeClass(className: string) {
    if (hasAllSpecs(className)) {
      removeClass(className);
      return;
    }
    update([...otherClasses(className), className], otherSpecs(className));
  }
  function toggleSpec(wowClass: Dragonblight.WowClass, spec: string) {
    let onSpecs = wowClass.specs.filter(s => isSpecOn(wowClass.name, s));
    if (onSpecs.includes(spec)) {
      onSpecs = onSpecs.filter(s => s !== spec);
    } else {
      onSpecs = [...onSpecs, spec];
    }
    if (onSpecs.length === 0) {
      removeClass(wowClass.name);
      return;
    }
    let classSpecs = onSpecs.map(s => `${wowClass.name}:${s}`);
    if (onSpecs.length === wowClass.specs.length) {
      classSpecs = [];
    }
    update([...otherClasses(wowClass.name), wowClass.name], [...otherSpecs(wowClass.name), ...classSpecs]);
  }
  function setPopoverOpen(className: string, open: boolean) {
    if (open) {
      setOpenClass(className);
    } else {
      setOpenClass(null);
    }
  }

  //the class's name, an "All" switch and its spec icons, shared by the popover and the mobile sheet
  function specPicker(wowClass: Dragonblight.WowClass) {
    return (
      <div className="class-filter-picker">
        <div className="class-filter-picker-header">
          <img src={classIcon(wowClass.name)} alt="" />
          <span className="class-filter-picker-title">{wowClass.name}</span>
          <button
            type="button"
            className={withModifier("class-filter-all", "on", hasAllSpecs(wowClass.name))}
            aria-pressed={hasAllSpecs(wowClass.name)}
            onClick={() => toggleWholeClass(wowClass.name)}
          >
            All
          </button>
        </div>
        <div className="class-filter-specs">
          {wowClass.specs.map((spec) => (
            <button
              key={spec}
              type="button"
              className={withModifier("class-filter-spec", "on", isSpecOn(wowClass.name, spec))}
              aria-pressed={isSpecOn(wowClass.name, spec)}
              onClick={() => toggleSpec(wowClass, spec)}
            >
              <span className="class-filter-check">
                {isSpecOn(wowClass.name, spec) && <CheckIcon />}
              </span>
              <img src={specIcon(wowClass.name, spec)} alt="" />
              <span>{spec}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function classButton(wowClass: Dragonblight.WowClass, onClick?: () => void) {
    let onSpecCount = 0;
    if (isSelected(wowClass.name)) {
      onSpecCount = wowClass.specs.filter(s => isSpecOn(wowClass.name, s)).length;
    }
    const dimmed = !selectedClasses.includes(all_classes) && !isSelected(wowClass.name);
    let buttonClass = withModifier("class-filter-class", "on", isSelected(wowClass.name));
    buttonClass = withModifier(buttonClass, "dimmed", dimmed);
    buttonClass = withModifier(buttonClass, "open", openClass === wowClass.name);
    return (
      <button
        type="button"
        className={buttonClass}
        title={wowClass.name}
        aria-label={wowClass.name}
        aria-pressed={isSelected(wowClass.name)}
        onClick={onClick}
        style={{ "--class-color": ClassColor.get(wowClass.name) } as React.CSSProperties}
      >
        <img src={classIcon(wowClass.name)} alt="" />
        {canPickSpecs && (
          <span className="class-filter-dots" aria-hidden>
            {wowClass.specs.map((spec, index) => (
              <span key={spec} className={withModifier("class-filter-dot", "on", index < onSpecCount)} />
            ))}
          </span>
        )}
      </button>
    );
  }

  function classSlot(wowClass: Dragonblight.WowClass) {
    if (!canPickSpecs) {
      return <div key={wowClass.id}>{classButton(wowClass, () => toggleWholeClass(wowClass.name))}</div>;
    }
    if (isMobile) {
      return <div key={wowClass.id}>{classButton(wowClass, () => setOpenClass(wowClass.name))}</div>;
    }
    return (
      <Popover.Root
        key={wowClass.id}
        open={openClass === wowClass.name}
        onOpenChange={(open) => setPopoverOpen(wowClass.name, open)}
      >
        <Popover.Trigger>{classButton(wowClass)}</Popover.Trigger>
        <Popover.Content size="1" className="class-filter-popover" align="center">
          {specPicker(wowClass)}
        </Popover.Content>
      </Popover.Root>
    );
  }

  function filterTag(className: string) {
    const specs = pickedSpecs(className);
    let tagTitle = `${className}: all specs`;
    if (specs.length > 0) {
      tagTitle = `${className}: ${specs.join(", ")}`;
    }
    return (
      <div key={className} className="class-filter-tag">
        <button
          type="button"
          className="class-filter-tag-body"
          title={tagTitle}
          disabled={!canPickSpecs}
          onClick={() => setOpenClass(className)}
        >
          <img src={classIcon(className)} alt="" />
          <span>{className}</span>
          {canPickSpecs && specs.length === 0 && <span className="class-filter-tag-all">All</span>}
          {specs.map((spec) => (
            <img key={spec} className="class-filter-tag-spec" src={specIcon(className, spec)} alt={spec} />
          ))}
        </button>
        <button
          type="button"
          className="class-filter-tag-remove"
          aria-label={`Remove ${className} filter`}
          onClick={() => removeClass(className)}
        >
          <Cross2Icon />
        </button>
      </div>
    );
  }

  const openWowClass = wowClasses.find(c => c.name === openClass);
  const activeClasses = selectedClasses.filter(c => c !== all_classes);
  return (
    <div className="class-filter">
      <div className="class-filter-row">{wowClasses.map(classSlot)}</div>
      {activeClasses.length > 0 && (
        <div className="class-filter-tags">
          {activeClasses.map(filterTag)}
          <button type="button" className="class-filter-clear" onClick={() => update([], [])}>
            Clear all
          </button>
        </div>
      )}
      <Dialog.Root
        open={isMobile && openWowClass != null}
        onOpenChange={(open) => { if (!open) { setOpenClass(null); } }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="class-filter-sheet-overlay" />
          <Dialog.Content className="class-filter-sheet" aria-describedby={undefined}>
            <Dialog.Title className="sr-only">{openClass} specs</Dialog.Title>
            <span className="class-filter-sheet-handle" aria-hidden />
            {openWowClass && specPicker(openWowClass)}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default ClassFilter;
