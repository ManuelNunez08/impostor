'use client';

import { Player } from '@/types/game';

interface QuestionTrackerProps {
    players: Player[];
    maxQuestionsPerPlayer: number;
}

const PLAYER_COLORS = [
    '#F59E0B', '#8B5CF6', '#F97316', '#10B981', '#EF4444', '#3B82F6'
];

export default function QuestionTracker({ players, maxQuestionsPerPlayer }: QuestionTrackerProps) {
    return (
        <div className="bg-white rounded-lg shadow-lg p-4">
            <h3 className="font-bold text-gray-800 mb-3">Questions Asked</h3>
            <div className="space-y-2">
                {players.map((player, index) => (
                    <div key={player.id} className="flex items-center gap-2">
                        <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                            style={{ backgroundColor: PLAYER_COLORS[index % PLAYER_COLORS.length] }}
                        >
                            😊
                        </div>
                        <div className="flex gap-1">
                            {Array.from({ length: maxQuestionsPerPlayer }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-5 h-5 border-2 rounded ${i < player.questionsAsked
                                            ? 'bg-green-500 border-green-600'
                                            : 'bg-white border-gray-300'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

