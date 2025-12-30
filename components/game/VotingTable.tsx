'use client';

import { Player, PlayerId } from '@/types/game';

interface VotingTableProps {
  players: Player[];
  currentPlayerId: PlayerId;
  selectedVote: PlayerId | null;
  isVoteLocked: boolean;
  onVote: (targetPlayerId: PlayerId) => void;
  onLockVote: () => void;
  onChangeVote: () => void;
}

const PLAYER_COLORS = [
  '#F59E0B', // yellow/orange
  '#8B5CF6', // purple
  '#F97316', // orange
  '#10B981', // green
  '#EF4444', // red
  '#3B82F6', // blue
];

export default function VotingTable({
  players,
  currentPlayerId,
  selectedVote,
  isVoteLocked,
  onVote,
  onLockVote,
  onChangeVote,
}: VotingTableProps) {
  const playerCount = players.length;
  
  // Calculate even spacing between players
  const angleSpacing = 360 / playerCount;
  
  // Find current player index
  const currentPlayerIndex = players.findIndex(p => p.id === currentPlayerId);
  
  // Reorder players so current player is first, followed by others in original order
  const reorderedPlayers = [...players];
  if (currentPlayerIndex !== -1) {
    const currentPlayer = reorderedPlayers.splice(currentPlayerIndex, 1)[0];
    reorderedPlayers.unshift(currentPlayer);
  }
  
  // Calculate angles with current player at 180° (bottom center)
  const angles = reorderedPlayers.map((_, index) => {
    if (index === 0) {
      return 180; // Current player always at bottom
    }
    return (180 + (index * angleSpacing)) % 360;
  });

  return (
    <div className="relative w-full h-[700px]">
      {/* Center table area - smaller for voting */}
      <div 
        className="absolute w-[280px] h-[224px] bg-gradient-to-br from-blue-900 to-blue-700 rounded-[50%] shadow-2xl border-8 border-blue-800"
        style={{ top: '30%', left: '35%', transform: 'translate(-50%, -50%)' }}
      >
      </div>

      {/* Players positioned in circle */}
      {reorderedPlayers.map((player, index) => {
        const angleInDegrees = angles[index];
        const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
        
        const radiusX = 26;
        const radiusY = 28;
        
        const centerX = 35;
        const centerY = 30;
        
        const xPercent = centerX + radiusX * Math.cos(angleInRadians);
        const yPercent = centerY + radiusY * Math.sin(angleInRadians);
        
        const originalIndex = players.findIndex(p => p.id === player.id);
        const color = PLAYER_COLORS[originalIndex % PLAYER_COLORS.length];
        const isCurrentPlayer = player.id === currentPlayerId;
        const isSelected = player.id === selectedVote;
        const canVoteForThisPlayer = !isCurrentPlayer && !player.isEliminated;

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
            {/* Voting buttons/status above avatar */}
            {canVoteForThisPlayer && (
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                {isSelected && !isVoteLocked ? (
                  // Show "Accused" text and action buttons
                  <div className="flex flex-col items-center gap-1">
                    <div className="bg-red-600 text-white text-xs px-3 py-1 rounded font-bold">
                      Accused
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={onLockVote}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded shadow-lg transition-colors"
                      >
                        Lock in Vote
                      </button>
                      <button
                        onClick={onChangeVote}
                        className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded shadow-lg transition-colors"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                ) : isSelected && isVoteLocked ? (
                  // Show only "Accused" when locked
                  <div className="bg-red-600 text-white text-xs px-3 py-1 rounded font-bold">
                    Accused
                  </div>
                ) : !selectedVote || !isVoteLocked ? (
                  // Show vote button only if no vote selected or vote not locked
                  (!selectedVote && (
                    <button
                      onClick={() => onVote(player.id)}
                      className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1 rounded shadow-lg transition-colors"
                    >
                      Vote
                    </button>
                  ))
                ) : null}
              </div>
            )}

            {/* Player avatar */}
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl shadow-xl ${
                isCurrentPlayer ? 'ring-4 ring-purple-500' : ''
              } ${player.isEliminated ? 'opacity-50 grayscale' : ''} ${
                isSelected ? 'ring-4 ring-red-500' : ''
              }`}
              style={{ backgroundColor: color }}
            >
              😊
            </div>

            {/* Player name */}
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              <div className="bg-white px-3 py-1 rounded-full shadow-lg text-sm font-semibold text-gray-800">
                {player.name}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

