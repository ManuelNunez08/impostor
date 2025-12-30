'use client';

import { Category } from '@/types/game';

interface LobbySettingsProps {
  category: Category;
  minPlayers: number;
  maxPlayers: number;
}

export default function LobbySettings({ category, minPlayers, maxPlayers }: LobbySettingsProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Settings:</h3>
      
      <div className="space-y-4">
        {/* Category */}
        <div>
          <div className="text-sm text-gray-600 mb-1">Category</div>
          <div className="font-semibold text-gray-800 text-lg">
            {category.name}
          </div>
          {category.description && (
            <div className="text-xs text-gray-500 mt-1">
              {category.description}
            </div>
          )}
        </div>

        {/* Player Count */}
        <div>
          <div className="text-sm text-gray-600 mb-1">Number of players</div>
          <div className="font-semibold text-gray-800 text-lg">
            {minPlayers} - {maxPlayers}
          </div>
        </div>

        {/* Possible Topics (collapsible) */}
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-600 hover:text-gray-800 font-medium">
            Possible Topics ▼
          </summary>
          <div className="mt-2 max-h-40 overflow-y-auto">
            <div className="grid grid-cols-2 gap-1 text-xs text-gray-700">
              {category.topics.map((topic, index) => (
                <div key={index} className="py-1">• {topic}</div>
              ))}
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}

