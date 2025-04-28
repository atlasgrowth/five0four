import React from 'react';
import { cn } from '@/lib/utils';

interface BaySelectorProps {
  floor: number;
  selectedBay: number | null;
  onSelect: (bay: number) => void;
}

export default function BaySelector({ floor, selectedBay, onSelect }: BaySelectorProps) {
  // Calculate bays based on floor number (100s correspond to floor)
  const bays = Array.from({ length: 25 }, (_, i) => 100 * floor + 1 + i);
  
  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold mb-4">Select Bay for Floor {floor}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {bays.map(bay => (
          <button
            key={bay}
            onClick={() => onSelect(bay)}
            className={cn(
              "w-24 h-20 text-lg rounded-xl border transition-colors",
              selectedBay === bay
                ? "bg-sky-400 text-white border-sky-500 hover:bg-sky-500"
                : "bg-slate-100 hover:bg-emerald-200 border-slate-200"
            )}
          >
            {bay}
          </button>
        ))}
      </div>
    </div>
  );
}