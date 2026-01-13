'use client';

import { Question, Player } from '@/types/game';
import { useEffect, useRef } from 'react';

interface CenterDialogueProps {
    questions: Question[];
    players: Player[];
}

export default function CenterDialogue({ questions, players }: CenterDialogueProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when questions change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [questions]);

    // Sort questions: answered first (by response time), then pending (by ask time)
    const answeredQuestions = questions
        .filter(q => q.answer !== null)
        .sort((a, b) => (b.answeredAt || 0) - (a.answeredAt || 0));

    const pendingQuestions = questions
        .filter(q => q.answer === null)
        .sort((a, b) => a.askedAt - b.askedAt);

    const getPlayerName = (playerId: string) => {
        return players.find(p => p.id === playerId)?.name || 'Unknown';
    };

    const getResponseStyle = (responseType: string | null) => {
        switch (responseType) {
            case 'pass':
                return 'bg-gray-100 text-gray-600 italic';
            case 'timed-out':
                return 'bg-red-50 text-red-600 italic';
            default:
                return 'bg-blue-50 text-gray-800';
        }
    };

    return (
        <div
            ref={scrollRef}
            className="absolute w-[340px] h-[240px] overflow-y-auto bg-white/95 backdrop-blur rounded-lg shadow-inner p-3 space-y-2"
            style={{ 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)',
                marginTop: '-60px' // Match table offset
            }}
        >
            {/* Answered Questions */}
            {answeredQuestions.map((q) => (
                <div key={q.id} className="border-l-4 border-green-500 pl-2 py-1.5">
                    <div className="text-[10px] text-gray-500 mb-0.5">
                        <span className="font-semibold">{getPlayerName(q.fromPlayerId)}</span> asks{' '}
                        <span className="font-semibold">{getPlayerName(q.toPlayerId)}</span>
                    </div>
                    <div className="text-xs text-gray-700 mb-1">
                        Q: {q.question}
                    </div>
                    <div className={`text-xs px-2 py-0.5 rounded ${getResponseStyle(q.responseType)}`}>
                        A: {q.answer}
                    </div>
                </div>
            ))}

            {/* Pending Questions */}
            {pendingQuestions.length > 0 && answeredQuestions.length > 0 && (
                <div className="border-t-2 border-gray-300 pt-2 mt-2">
                    <div className="text-[10px] font-semibold text-gray-500 mb-1">PENDING</div>
                </div>
            )}

            {pendingQuestions.map((q) => (
                <div key={q.id} className="border-l-4 border-yellow-500 pl-2 py-1.5 bg-yellow-50">
                    <div className="text-[10px] text-gray-500 mb-0.5">
                        <span className="font-semibold">{getPlayerName(q.fromPlayerId)}</span> asks{' '}
                        <span className="font-semibold">{getPlayerName(q.toPlayerId)}</span>
                    </div>
                    <div className="text-xs text-gray-700">
                        Q: {q.question}
                    </div>
                    <div className="text-[10px] text-yellow-600 mt-0.5 animate-pulse">
                        ⏳ Waiting for answer...
                    </div>
                </div>
            ))}

            {questions.length === 0 && (
                <div className="text-center text-gray-400 py-6 text-sm">
                    No questions yet. Start asking!
                </div>
            )}
        </div>
    );
}

