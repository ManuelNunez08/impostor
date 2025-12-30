'use client';

import { Player } from '@/types/game';

interface LobbyTableProps {
  players: Player[];
  currentPlayerId: string;
  lobbyCode: string;
}

const PLAYER_COLORS = [
  '#F59E0B', // yellow
  '#8B5CF6', // purple
  '#F97316', // orange
  '#10B981', // green
  '#EF4444', // red
  '#3B82F6', // blue
];

export default function LobbyTable({ players, currentPlayerId, lobbyCode }: LobbyTableProps) {
  const playerCount = players.length;
  
  // Calculate even spacing between players
  const angleSpacing = 360 / playerCount;
  
  // Find current player index
  const currentPlayerIndex = players.findIndex(p => p.id === currentPlayerId);
  
  // Reorder players so current player is first, followed by others in original order
  const reorderedPlayers = [...players];
  if (currentPlayerIndex !== -1) {
    // Remove current player and add them at the beginning
    const currentPlayer = reorderedPlayers.splice(currentPlayerIndex, 1)[0];
    reorderedPlayers.unshift(currentPlayer);
  }
  
  // Calculate angles with current player at 180° (bottom center)
  const angles = reorderedPlayers.map((_, index) => {
    if (index === 0) {
      return 180; // Current player always at bottom
    }
    // Distribute other players evenly, starting from the right of current player
    return (180 + (index * angleSpacing)) % 360;
  });

  return (
    <div className="relative w-[600px] h-[500px] flex items-center justify-center">
      {/* Center table - smaller for lobby */}
      <div 
        className="absolute w-[400px] h-[300px] bg-gradient-to-br from-blue-900 to-blue-700 rounded-[50%] shadow-xl border-6 border-blue-800"
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      >
        {/* Lobby code in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="text-xs opacity-75 mb-1">LOBBY CODE</div>
            <div className="text-2xl font-bold tracking-wider">{lobbyCode}</div>
          </div>
        </div>
      </div>

      {/* Players positioned in circle */}
      {reorderedPlayers.map((player, index) => {
        // Convert degree to radians (subtract 90 to start from top)
        const angleInDegrees = angles[index];
        const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
        
        // Use percentage-based positioning relative to container
        // Radius as percentage of container (adjusted for elliptical table)
        const radiusX = 42; // 42% horizontal radius
        const radiusY = 45; // 45% vertical radius (slightly larger for better spacing)
        
        const xPercent = 50 + radiusX * Math.cos(angleInRadians);
        const yPercent = 50 + radiusY * Math.sin(angleInRadians);
        
        // Use original player index for consistent coloring
        const originalIndex = players.findIndex(p => p.id === player.id);
        const color = PLAYER_COLORS[originalIndex % PLAYER_COLORS.length];
        const isCurrentPlayer = player.id === currentPlayerId;

        return (
          <div
            key={player.id}
            className="absolute"
            style={{
              left: `${xPercent}%`,
              top: `${yPercent}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Ready indicator above avatar */}
            {player.isReady && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                  ✓ Ready
                </div>
              </div>
            )}

            {/* Player avatar */}
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl shadow-lg ${
                isCurrentPlayer ? 'ring-4 ring-purple-400' : ''
              }`}
              style={{ backgroundColor: color }}
            >
              😊
            </div>

            {/* Player name */}
            <div className="absolute -bottom-7 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              <div className="text-xs font-semibold text-gray-700 text-center">
                {player.name}
                {isCurrentPlayer && <div className="text-purple-600">(YOU)</div>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

