'use client';

import { useState, useRef, useEffect } from 'react';
import { Category } from '@/types/game';

interface TopicDropdownProps {
  category: Category;
}

export default function TopicDropdown({ category }: TopicDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer text-gray-600 hover:text-gray-800 font-medium text-sm flex items-center gap-1"
      >
        Possible Topics {isOpen ? '▲' : '▼'}
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[300px] max-w-[400px] max-h-60 overflow-y-auto">
          <div className="p-3">
            <div className="grid grid-cols-2 gap-1 text-xs text-gray-700">
              {category.topics.map((topic, index) => (
                <div key={index} className="py-1">• {topic}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

