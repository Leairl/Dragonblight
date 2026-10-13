import React, { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { Button } from '@radix-ui/themes';
import { ClassColor } from '../../helpers/classColorHelper';
import { blitzSpecs, shuffleSpecs, SoloSpecIcon } from '../../helpers/solo-bracket-specs';
import '../class-filter/class-filter.css';
import './solo-spec-filter.css';

interface SoloSpecFilterProps {
  //the selected spec's ladder slug, e.g. "solo-warrior-fury"
  selected: string;
  onSelect: (slug: string) => void;
  isBlitz: boolean;
  isShuffle: boolean;
}

//Picks which Solo ladder to show. Looks like the class filter, but only one spec can be
//chosen, since every spec is its own ladder.
const SoloSpecFilter: React.FC<SoloSpecFilterProps> = (props) => {
  const [isOpen, setIsOpen] = useState(false);
  const specList = props.isBlitz ? blitzSpecs : props.isShuffle ? shuffleSpecs : [];
  const current = specList.find((s) => s.slug === props.selected);
  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen} modal={false}>
      <DropdownMenu.Trigger asChild>
        <Button className="CustomButton" variant="soft" color="gray">
          {current && current.specName !== "" && (
            <img src={SoloSpecIcon(current)} alt="" className="ClassIcon" />
          )}
          <span style={{ color: ClassColor.get(current?.className ?? '') }}>
            {current && current.specName !== "" ? `${current.specName} ${current.className}` : 'Choose a spec'}
          </span>
          <ChevronDownIcon className={`DropdownArrow ${isOpen ? 'open' : ''}`} />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content className="DropdownMenuContent SoloSpecMenu" sideOffset={5}>
        {specList.map((spec) => (
          <DropdownMenu.Item
            key={spec.slug}
            className={`DropdownMenuItem ${spec.slug === props.selected ? 'selected' : ''}`}
            onSelect={() => props.onSelect(spec.slug)}
            style={{ color: ClassColor.get(spec.className) || 'white' }}
          >
            <div className="ClassItem">
              <img src={SoloSpecIcon(spec)} alt="" className="ClassIcon" />
              <span>{spec.specName} {spec.className}</span>
            </div>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};

export default SoloSpecFilter;
