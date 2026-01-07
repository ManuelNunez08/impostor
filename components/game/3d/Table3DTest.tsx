'use client';

import Table3D from './Table3D';
import { Player } from '@/types/game';

/**
 * Test component to preview the 3D table scene
 * You can use this to test the static environment before integrating with the game
 */
export default function Table3DTest() {
  // Mock players for testing
  const mockPlayers: Player[] = [
    { id: '1', name: 'Player 1', isReady: true, isEliminated: false },
    { id: '2', name: 'Player 2', isReady: true, isEliminated: false },
    { id: '3', name: 'Player 3', isReady: true, isEliminated: false },
    { id: '4', name: 'Player 4', isReady: true, isEliminated: false },
  ];

  return (
    <div className="w-full h-screen bg-black">
      <div className="absolute top-4 left-4 z-10 bg-white/90 p-4 rounded-lg">
        <h2 className="text-xl font-bold mb-2">3D Table Test Scene</h2>
        <p className="text-sm text-gray-600">
          Use mouse to rotate, scroll to zoom
        </p>
        <p className="text-sm text-gray-600 mt-2">
          Players: {mockPlayers.length}
        </p>
      </div>
      <Table3D players={mockPlayers} />
    </div>
  );
}

