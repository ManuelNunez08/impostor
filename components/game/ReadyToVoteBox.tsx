'use client';

import { Player } from '@/types/game';

interface ReadyToVoteBoxProps {
    players: Player[];
    currentPlayerId: string;
    isCurrentPlayerReady: boolean;
    onReadyClick: () => void;
}

const PLAYER_COLORS = [
    '#F59E0B', '#8B5CF6', '#F97316', '#10B981', '#EF4444', '#3B82F6'
];

export default function ReadyToVoteBox({ players, currentPlayerId, isCurrentPlayerReady, onReadyClick }: ReadyToVoteBoxProps) {
    const readyPlayers = players.filter(p => p.isReadyToVote && !p.isEliminated);
    const activePlayers = players.filter(p => !p.isEliminated);
    const readyCount = readyPlayers.length;
    const totalCount = activePlayers.length;
    const majorityNeeded = Math.floor(totalCount / 2) + 1;

    return (
        <div className="bg-white rounded-lg shadow-lg p-4 mt-4">
            <h3 className="font-bold text-gray-800 mb-3">Ready to Vote</h3>

            <div className="mb-3">
                <div className="text-sm text-gray-600 mb-2">
                    {readyCount} / {totalCount} ready (need {majorityNeeded} for majority)
                </div>
                <div className="flex flex-wrap gap-2">
                    {readyPlayers.map((player, index) => {
                        const playerIndex = players.findIndex(p => p.id === player.id);
                        return (
                            <div
                                key={player.id}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                                style={{ backgroundColor: PLAYER_COLORS[playerIndex % PLAYER_COLORS.length] }}
                                title={player.name}
                            >
                                😊
                            </div>
                        );
                    })}
                </div>
            </div>

            {!isCurrentPlayerReady ? (
                <button
                    onClick={onReadyClick}
                    className="w-full bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                    I'm Ready to Vote
                </button>
            ) : (
                <div className="w-full bg-green-100 text-green-700 font-bold py-2 rounded-lg text-center">
                    ✓ You are ready
                </div>
            )}

            {readyCount >= majorityNeeded && (
                <div className="mt-2 text-xs text-center text-yellow-700 bg-yellow-50 py-2 rounded">
                    Majority reached! Voting will start soon...
                </div>
            )}
        </div>
    );
}

