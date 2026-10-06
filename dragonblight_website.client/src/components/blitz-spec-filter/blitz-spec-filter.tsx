import React, { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { Button } from '@radix-ui/themes';
import { ClassColor } from '../../helpers/classColorHelper';
import { blitzSpecs, blitzSpecIcon } from '../../helpers/blitz-specs';
import '../class-filter/class-filter.css';
import './blitz-spec-filter.css';

interface BlitzSpecFilterProps {
  //the selected spec's ladder slug, e.g. "blitz-warrior-fury"
  selected: string;
  onSelect: (slug: string) => void;
}

//Picks which Blitz ladder to show. Looks like the class filter, but only one spec can be
//chosen, since every spec is its own ladder.
const BlitzSpecFilter: React.FC<BlitzSpecFilterProps> = (props) => {
  const [isOpen, setIsOpen] = useState(false);
  const current = blitzSpecs.find((s) => s.slug === props.selected);

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger asChild>
        <Button className="CustomButton" variant="soft" color="gray">
          {current && current.specName !== "All" && (
            <img src={blitzSpecIcon(current)} alt="" className="ClassIcon" />
          )}
          <span style={{ color: ClassColor.get(current?.className ?? '') }}>
            {current && current.specName !== "All" ? `${current.specName} ${current.className}` : 'Choose a spec'}
          </span>
          <ChevronDownIcon className={`DropdownArrow ${isOpen ? 'open' : ''}`} />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content className="DropdownMenuContent BlitzSpecMenu" sideOffset={5}>
        {blitzSpecs.map((spec) => (
          <DropdownMenu.Item
            key={spec.slug}
            className={`DropdownMenuItem ${spec.slug === props.selected ? 'selected' : ''}`}
            onSelect={() => props.onSelect(spec.slug)}
            style={{ color: ClassColor.get(spec.className) || 'white' }}
          >
            <div className="ClassItem">
              <img src={blitzSpecIcon(spec)} alt="" className="ClassIcon" />
              <span>{spec.specName} {spec.className}</span>
            </div>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};

export default BlitzSpecFilter;
