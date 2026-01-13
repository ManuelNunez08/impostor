'use client';

import { Category } from '@/types/game';
import TopicDropdown from '@/components/shared/TopicDropdown';

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

        {/* Possible Topics (dropdown) */}
        <div className="text-sm">
          <TopicDropdown category={category} />
          </div>
      </div>
    </div>
  );
}

