
import React from 'react';
import { ClassType, ClassLabels } from '../types';

interface ClassSelectorProps {
  selected: ClassType | null;
  onSelect: (type: ClassType) => void;
}

const ClassSelector: React.FC<ClassSelectorProps> = ({ selected, onSelect }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {(Object.entries(ClassLabels) as [ClassType, typeof ClassLabels[ClassType]][]).map(([key, info]) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className={`p-4 rounded-xl border-2 transition-all text-left ${
            selected === key 
              ? 'border-blue-600 ring-2 ring-blue-100 shadow-md scale-[1.02]' 
              : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}
        >
          <div className="flex flex-col gap-1">
            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full self-start ${info.color}`}>
              {info.level}
            </span>
            <h3 className="text-xl font-bold font-lexend mt-2">{info.name}</h3>
          </div>
        </button>
      ))}
    </div>
  );
};

export default ClassSelector;
