import React, { useState, useEffect } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Checkbox from '@radix-ui/react-checkbox';
import { CheckIcon, ChevronDownIcon } from '@radix-ui/react-icons'; // Import the arrow icon
import { Button } from '@radix-ui/themes';
import { ClassColor } from '../../helpers/classColorHelper';
import { Dragonblight } from '../../clients/Dragonblight';
import './class-filter.css';
import { getFlavor } from '../../helpers/game-flavor';

export const all_classes = 'All Classes'
const classIcon = (className: string) =>
  `/ProfileClassIcons/${className.replace(/ /g, '').toLowerCase()}.png`;
const specIcon = (className: string, spec: string) =>
  `/Specs/${spec.toLowerCase()}_${className.toLowerCase()}.png`;
interface ClassFilterProps {
  region: string;
  onChange: (classes: string[], specs: string[]) => void;
}

const ClassFilter: React.FC<ClassFilterProps> = (props) => {
  // Handle state management
  const [selectedClasses, setSelectedClasses] = useState<string[]>([all_classes]);
  const [wowClasses, setWowClasses] = useState<Dragonblight.WowClass[]>([]);
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);

  useEffect(() => {
    const DragonblightClient = new Dragonblight.PvpLeaderboardClient();
    DragonblightClient.getPlayableClasses(props.region)
      .then((result) => setWowClasses(result ?? []));
  }, [getFlavor()]);

  function update(classes: string[], specs: string[]) {
    setSelectedClasses(classes);
    setSelectedSpecs(specs);
    props.onChange(classes, specs);
  }

  const handleSelect = (event: React.MouseEvent, className: string) => {
    event.preventDefault();
    let classes: string[];
    if (className === all_classes) {
      classes = [all_classes];
    } else {
      classes = selectedClasses.includes(className)
        ? selectedClasses.filter(c => c !== className)
        : [...selectedClasses.filter(c => c !== all_classes), className];
      if (classes.length === 0 || classes.length === wowClasses.length) classes = [all_classes];
    }
    //specs of a class that was just deselected no longer apply
    const specs = selectedSpecs.filter(s => classes.includes(s.split(':')[0]));
    update(classes, specs);
  };

  const handleSpecSelect = (className: string, spec: string) => {
    // if the spec is selected and is already picked then we remove from the list
    // otherwise if its not in the array already we add to the prev list
    const key = `${className}:${spec}`;
    const specs = selectedSpecs.includes(key)
      ? selectedSpecs.filter(s => s !== key)
      : [...selectedSpecs, key];
    update(selectedClasses, specs);
  };
  return (

    <div className="ClassFilter SpecSpace MultiClass">
      <div className="ClassRow">
        {wowClasses.map((c) => (
          //the slot anchors the spec icons under this class
          <div key={c.id} className="ClassSlot">
            <button
              className={`ClassButton ${selectedClasses.includes(c.name) || selectedClasses.includes(all_classes) ? 'selected' : ''}`}
              onClick={(e) => handleSelect(e, c.name)}
              title={c.name}
              style={{ borderColor: 'black' }}
            >
              <img src={classIcon(c.name)} alt={c.name} />
            </button>
            {selectedClasses.includes(c.name) && (
              <div className="SpecPopout">
                {c.specs.map((spec) => (
                  <button
                    key={`${c.name}-${spec}`}
                    className={`SpecButton ${selectedSpecs.includes(`${c.name}:${spec}`) ? 'selected' : ''}`}
                    onClick={() => handleSpecSelect(c.name, spec)}
                    title={`${spec} ${c.name}`}
                    style={{ borderColor: "black" }}
                  >
                    <img src={specIcon(c.name, spec)} alt={spec} />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

};

export default ClassFilter;