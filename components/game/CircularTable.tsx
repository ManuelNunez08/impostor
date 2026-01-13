'use client';

import { Player, PlayerId } from '@/types/game';

interface CircularTableProps {
    players: Player[];
    currentPlayerId: PlayerId;
    onAskPlayer: (targetPlayerId: PlayerId) => void;
    canAsk: boolean;
}

const PLAYER_COLORS = [
    '#F59E0B', // yellow/orange
    '#8B5CF6', // purple
    '#F97316', // orange
    '#10B981', // green
    '#EF4444', // red
    '#3B82F6', // blue
];

export default function CircularTable({ players, currentPlayerId, onAskPlayer, canAsk }: CircularTableProps) {
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
        <div className="absolute inset-0 w-full h-full">
            {/* Center table area - will contain dialogue */}
            <div className="absolute w-[500px] h-[400px] bg-gradient-to-br from-blue-900 to-blue-700 rounded-[50%] shadow-2xl border-8 border-blue-800"
                style={{ 
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)',
                    marginTop: '-60px' // Adjust to account for timer space
                }}>
            </div>

            {/* Players positioned in circle */}
            {reorderedPlayers.map((player, index) => {
                // Convert degree to radians (subtract 90 to start from top)
                const angleInDegrees = angles[index];
                const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
                
                // Use fixed pixel-based positioning relative to center
                // Radius in pixels - adjusted for better 4-player layout
                // Reduce vertical radius to prevent top/bottom players from sticking out too far
                const radiusX = 280; // Horizontal radius in pixels
                const radiusY = 240; // Vertical radius in pixels (reduced from 300)
                
                // Calculate offset from center in pixels
                const offsetX = radiusX * Math.cos(angleInRadians);
                const offsetY = radiusY * Math.sin(angleInRadians);
                
                // Use original player index for consistent coloring
                const originalIndex = players.findIndex(p => p.id === player.id);
                const color = PLAYER_COLORS[originalIndex % PLAYER_COLORS.length];
                const isCurrentPlayer = player.id === currentPlayerId;

                return (
                    <div
                        key={player.id}
                        className="absolute"
                        style={{
                            left: '50%',
                            top: '50%',
                            transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px - 60px))`,
                        }}
                    >
                        {/* Ask button - only show for non-eliminated players */}
                        {!isCurrentPlayer && canAsk && !player.isEliminated && (
                            <button
                                onClick={() => onAskPlayer(player.id)}
                                className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1 rounded shadow-lg transition-colors"
                            >
                                Ask
                            </button>
                        )}

                        {/* Player avatar */}
                        <div
                            className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl shadow-xl ${
                                isCurrentPlayer ? 'ring-4 ring-purple-500' : ''
                            } ${
                                player.isEliminated ? 'opacity-30 grayscale blur-[1px]' : ''
                            }`}
                            style={{ 
                                backgroundColor: player.isEliminated ? '#6B7280' : color 
                            }}
                        >
                            {player.isEliminated ? '💀' : '😊'}
                        </div>

                        {/* Player name */}
                        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                            <div className={`px-3 py-1 rounded-full shadow-lg text-sm font-semibold ${
                                player.isEliminated ? 'bg-gray-400 text-gray-700' : 'bg-white text-gray-800'
                            }`}>
                                {player.name}
                            </div>
                            <div className={`text-xs text-center mt-1 ${
                                player.isEliminated ? 'text-gray-500 font-bold' : 'text-gray-600'
                            }`}>
                                {player.isEliminated ? '💀 Eliminated' : (player.isReady ? 'Ready' : 'Not Ready')}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

