import React from 'react';
import { blitzSpecs, shuffleSpecs, SoloSpecIcon, defaultBlitzSpec, defaultShuffleSpec } from '../../helpers/solo-bracket-specs';
import './solo-spec-filter.css';

interface SoloSpecFilterProps {
  //the selected spec's ladder slug, e.g. "solo-warrior-fury"
  selected: string;
  onSelect: (slug: string) => void;
  isBlitz: boolean;
  isShuffle: boolean;
  onClassSelect: (className: string | null) => void;
  selectedClass: string | null;
}

const classIcon = (className: string) =>
  `/ProfileClassIcons/${className.replace(/ /g, '').toLowerCase()}.png`;

//Picks which Solo ladder to show. Looks like the class filter, but only one spec can be
//chosen, since every spec is its own ladder.
const SoloSpecFilter: React.FC<SoloSpecFilterProps> = (props) => {
  const specList = props.isBlitz ? blitzSpecs : props.isShuffle ? shuffleSpecs : [];
  const overallSlug = props.isBlitz ? defaultBlitzSpec : defaultShuffleSpec;
  const current = specList.find((s) => s.slug === props.selected);

  const classNames = [...new Set(specList.filter((s) => s.specName !== '').map((s) => s.className))];
  const openClass = props.selectedClass ?? (current?.specName ? current.className : undefined);
  const openSpecs = specList.filter((s) => s.className === openClass && s.specName !== '');
  const isOverall = props.selected === overallSlug && props.selectedClass === null;
  return (
    <div className="ClassFilter SpecSpace">
      <div className="ClassRow">
        {classNames.map((className) => (
          //the slot anchors the spec icons under this class
          <div key={className} className="ClassSlot">
            <button
              className={`ClassButton ${openClass === className || isOverall ? 'selected' : ''}`}
              onClick={() => {
                //clicking the class that is already showing goes back to the whole ladder, like the class filter
                props.onClassSelect(props.selectedClass === className ? null : className);
                props.onSelect(overallSlug);
              }}
              title={className}
              style={{ borderColor: 'black' }}
            >
              <img src={classIcon(className)} alt={className} />
            </button>
            {openClass === className && openSpecs.length > 0 && (
              <div className="SpecPopout">
                {openSpecs.map((spec) => (
                  <button
                    key={spec.slug}
                    className={`SpecButton ${spec.slug === props.selected ? 'selected' : ''}`}
                    onClick={() => {
                      if (spec.slug === props.selected) {
                        //clicking the spec that is already showing goes back to that class from the overall ladder
                        props.onClassSelect(spec.className);
                        props.onSelect(overallSlug);
                      } else {
                        props.onClassSelect(null);
                        props.onSelect(spec.slug);
                      }
                    }}
                    title={`${spec.specName} ${spec.className}`}
                    style={{ borderColor: 'black' }}
                  >
                    <img src={SoloSpecIcon(spec)} alt={spec.specName} />
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

export default SoloSpecFilter;
