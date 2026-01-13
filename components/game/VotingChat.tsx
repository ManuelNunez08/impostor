'use client';

import { useState, useRef, useEffect } from 'react';
import { Player, PlayerId } from '@/types/game';

interface ChatMessage {
  id: string;
  playerId: PlayerId;
  playerName: string;
  message: string;
  timestamp: number;
}

interface VotingChatProps {
  players: Player[];
  currentPlayerId: PlayerId;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
}

const PLAYER_COLORS = [
  '#F59E0B', // yellow/orange
  '#8B5CF6', // purple
  '#F97316', // orange
  '#10B981', // green
  '#EF4444', // red
  '#3B82F6', // blue
];

export default function VotingChat({ players, currentPlayerId, messages, onSendMessage }: VotingChatProps) {
  const [inputMessage, setInputMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const MAX_CHARS = 40;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputMessage.trim();
    if (trimmed && trimmed.length <= MAX_CHARS) {
      onSendMessage(trimmed);
      setInputMessage('');
    }
  };

  const getPlayerColor = (playerId: PlayerId) => {
    const index = players.findIndex(p => p.id === playerId);
    return index !== -1 ? PLAYER_COLORS[index % PLAYER_COLORS.length] : '#999';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-3 flex flex-col w-[340px] h-[240px]">
      <h3 className="text-xs font-bold text-gray-800 mb-2">
        Speak your mind before voting
      </h3>
      
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-1 mb-2 min-h-0"
      >
        {messages.length === 0 ? (
          <div className="text-gray-400 text-[10px] text-center py-4">
            No messages yet. Start the discussion!
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex items-start gap-1.5">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0"
                style={{ backgroundColor: getPlayerColor(msg.playerId) }}
              >
                😊
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-gray-700">
                  {msg.playerName}
                  {msg.playerId === currentPlayerId && (
                    <span className="text-purple-600 ml-1">(You)</span>
                  )}
                </div>
                <div className="text-[10px] text-gray-800 break-words">
                  {msg.message}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="flex gap-1.5">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value.slice(0, MAX_CHARS))}
          placeholder="Type your message..."
          maxLength={MAX_CHARS}
          className="flex-1 px-2 py-1 border border-gray-300 rounded text-[10px] text-gray-800 focus:ring-1 focus:ring-purple-500 focus:border-transparent outline-none"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim()}
          className="bg-purple-600 text-white px-2 py-1 rounded text-[10px] font-semibold hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </form>
      
      <div className="text-[8px] text-gray-400 mt-0.5 text-right">
        {inputMessage.length}/{MAX_CHARS}
      </div>
    </div>
  );
}

