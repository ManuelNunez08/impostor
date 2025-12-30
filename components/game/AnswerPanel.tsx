'use client';

import { useState, useEffect } from 'react';
import { Question, Player } from '@/types/game';

interface AnswerPanelProps {
    question: Question | null;
    fromPlayer: Player | null;
    onAnswer: (answer: string) => void;
    onPass: () => void;
    timeLimit: number; // seconds
}

export default function AnswerPanel({ question, fromPlayer, onAnswer, onPass, timeLimit }: AnswerPanelProps) {
    const [answer, setAnswer] = useState('');
    const [timeRemaining, setTimeRemaining] = useState(timeLimit);

    useEffect(() => {
        if (!question) return;

        setTimeRemaining(timeLimit);
        const interval = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    // Auto-timeout handled by server
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [question, timeLimit]);

    const handleSubmit = () => {
        if (answer.trim()) {
            onAnswer(answer);
            setAnswer('');
        }
    };

    const handlePass = () => {
        onPass();
        setAnswer('');
    };

    if (!question || !fromPlayer) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-purple-600 shadow-2xl p-6 z-40">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="text-sm text-gray-600 mb-2">
                            <span className="font-bold text-purple-600">{fromPlayer.name}</span> asks you:
                        </div>
                        <div className="text-lg font-semibold text-gray-800 bg-gray-50 p-3 rounded-lg">
                            {question.question}
                        </div>
                    </div>
                    <div className="ml-6">
                        <div className="text-sm text-gray-600 mb-1">Response due in</div>
                        <div className={`text-3xl font-bold ${timeRemaining <= 10 ? 'text-red-600 animate-pulse' : 'text-gray-800'
                            }`}>
                            {timeRemaining}s
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <input
                        type="text"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                        placeholder="Type your response..."
                        className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-gray-800"
                        autoFocus
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={!answer.trim()}
                        className="bg-purple-600 text-white font-bold px-8 py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        Submit
                    </button>
                    <button
                        onClick={handlePass}
                        className="bg-gray-200 text-gray-700 font-bold px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Pass
                    </button>
                </div>
            </div>
        </div>
    );
}

