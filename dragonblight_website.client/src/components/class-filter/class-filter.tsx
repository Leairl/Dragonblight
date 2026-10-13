import React, { useState, useEffect } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Checkbox from '@radix-ui/react-checkbox';
import { CheckIcon, ChevronDownIcon } from '@radix-ui/react-icons'; // Import the arrow icon
import { Button } from '@radix-ui/themes';
import { ClassColor } from '../../helpers/classColorHelper';
import './class-filter.css';

// Define World of Warcraft classes including 'All Classes'
const wowClasses = ['All Classes', 'Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest', 'Death Knight', 'Shaman', 'Mage', 'Warlock', 'Druid', 'Monk'];

// Import class icons
const classIcons = wowClasses.reduce((icons, className) => {
  if (className !== 'All Classes') {
    icons[className] = `/ProfileClassIcons/${className.replace(' ', '').toLowerCase()}.png`;
  }
  return icons;
}, {} as { [key: string]: string });

interface ClassFilterProps {
  onSelect: (selectedClasses: string[]) => void;
}

const ClassFilter : React.FC<ClassFilterProps> = (props) => {
  // Handle state management
  const [selectedClasses, setSelectedClasses] = useState<string[]>(['All Classes']);
  const [isOpen, setIsOpen] = useState(false); // State to track if the dropdown is open

  useEffect(() => {
    if (selectedClasses.length === 0) {
      setSelectedClasses(['All Classes']);
    }
    props.onSelect(selectedClasses);
  }, [selectedClasses]);

  const handleSelect = (event: React.MouseEvent, className: string) => {
    event.preventDefault();
    if (className === 'All Classes') {
      setSelectedClasses(['All Classes']);
    } else {
      setSelectedClasses(prev => {
        const newSelectedClasses = prev.includes(className)
          ? prev.filter(c => c !== className)
          : [...prev.filter(c => c !== 'All Classes'), className];
        return newSelectedClasses.length === wowClasses.length - 1 ? ['All Classes'] : newSelectedClasses;
      });
    }
  };
  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen} modal={false}>
      <DropdownMenu.Trigger asChild>
        <Button className="CustomButton" variant="soft" color="gray">
          {selectedClasses.includes("All Classes") && "All Classes"}
          {!selectedClasses.includes("All Classes") && "Filtered by"}
          <ChevronDownIcon className={`DropdownArrow ${isOpen ? 'open' : ''}`} /> {/* Add the arrow icon */}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content className="DropdownMenuContent" sideOffset={5}>
        {wowClasses.map((className) => (
          <DropdownMenu.CheckboxItem
            key={className}
            className={`DropdownMenuItem ${selectedClasses.includes(className) || selectedClasses.includes('All Classes') ? 'selected' : ''}`}
            checked={selectedClasses.includes(className) || selectedClasses.includes('All Classes')}
            onClick={(e) => handleSelect(e, className)}
            style={{ color: ClassColor.get(className) || "white" }} // Apply class color
          >
            <div className="ClassItem">
              <Checkbox.Root
                className="CheckboxRoot"
                checked={selectedClasses.includes(className) || selectedClasses.includes('All Classes')}
                onClick={(e) => handleSelect(e, className)}
              >
                <Checkbox.Indicator className="CheckboxIndicator">
                  <CheckIcon />
                </Checkbox.Indicator>
              </Checkbox.Root>
              {className !== 'All Classes' && (
                <img src={classIcons[className]} alt={className} className="ClassIcon" title={className} />
              )}
              <span>{className}</span>
            </div>
          </DropdownMenu.CheckboxItem>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};

export default ClassFilter;