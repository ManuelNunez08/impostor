'use client';

import { useState } from 'react';
import Table3D from '@/components/game/3d/Table3D';
import { Player } from '@/types/game';

export default function Test3DPage() {
  const [numPlayers, setNumPlayers] = useState(4);

  // Generate mock players based on count
  const mockPlayers: Player[] = Array.from({ length: numPlayers }, (_, i) => ({
    id: `player-${i + 1}`,
    name: `Player ${i + 1}`,
    isReady: true,
    isEliminated: false,
  }));

  return (
    <div className="w-full h-screen bg-black relative">
      {/* Control Panel */}
      <div className="absolute top-4 left-4 z-10 bg-white/95 p-4 rounded-lg shadow-xl max-w-sm">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">3D Scene Test</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Number of Players (Chairs): {numPlayers}
            </label>
            <input
              type="range"
              min="2"
              max="8"
              value={numPlayers}
              onChange={(e) => setNumPlayers(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>2</span>
              <span>8</span>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-300">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Controls:</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Left Click + Drag: Rotate camera</li>
              <li>• Scroll: Zoom in/out</li>
              <li>• Right Click + Drag: Pan (if enabled)</li>
            </ul>
          </div>

          <div className="pt-2 border-t border-gray-300">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Scene Info:</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Dark cylindrical pillar base</li>
              <li>• Wooden table on top</li>
              <li>• {numPlayers} colored chairs around table</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 3D Scene */}
      <Table3D players={mockPlayers} />
    </div>
  );
}

