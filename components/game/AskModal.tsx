'use client';

import { useState, useEffect } from 'react';
import { Player } from '@/types/game';
import { countWords } from '@/lib/utils/format';

interface AskModalProps {
    targetPlayer: Player | null;
    onSubmit: (question: string) => void;
    onCancel: () => void;
    maxWords: number;
    savedDraft?: string;
}

export default function AskModal({ targetPlayer, onSubmit, onCancel, maxWords, savedDraft }: AskModalProps) {
    const [question, setQuestion] = useState(savedDraft || '');
    const wordCount = countWords(question);
    const isValid = wordCount >= 2 && wordCount <= maxWords;

    useEffect(() => {
        if (savedDraft) {
            setQuestion(savedDraft);
        }
    }, [savedDraft]);

    const handleSubmit = () => {
        if (isValid) {
            onSubmit(question);
        }
    };

    if (!targetPlayer) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                    You are asking <span className="text-purple-600">{targetPlayer.name}</span>
                </h3>

                <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Type your question..."
                    className="w-full h-32 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none resize-none text-gray-800"
                    autoFocus
                />

                <div className="flex justify-between items-center mt-3">
                    <div className={`text-sm font-semibold ${wordCount > maxWords ? 'text-red-600' :
                            wordCount < 2 ? 'text-gray-400' :
                                'text-green-600'
                        }`}>
                        {wordCount} / {maxWords} words
                    </div>
                    {!isValid && wordCount > 0 && (
                        <div className="text-xs text-red-600">
                            {wordCount < 2 ? 'At least 2 words required' : 'Too many words'}
                        </div>
                    )}
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={handleSubmit}
                        disabled={!isValid}
                        className="flex-1 bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        Submit
                    </button>
                    <button
                        onClick={onCancel}
                        className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

