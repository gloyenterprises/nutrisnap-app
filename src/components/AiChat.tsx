import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, SendHorizonal, Bot } from 'lucide-react';
import { getAiHealthAdvice } from '../services/geminiService';
import type { ChatMessage } from '../types';

const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
    const elements: React.ReactNode[] = [];
    let currentList: string[] = [];

    const flushList = (key: string | number) => {
        if (currentList.length > 0) {
            elements.push(
                <ul key={`ul-${key}`} className="list-disc pl-5 space-y-1 my-2">
                    {currentList.map((item, j) => <li key={j}>{item}</li>)}
                </ul>
            );
            currentList = [];
        }
    };

    text.split('\n').forEach((line, i) => {
        if (line.trim().startsWith('* ')) {
            currentList.push(line.substring(2));
        } else {
            flushList(i);
            const parts = line.split(/(\*\*.*?\*\*)/g);
            elements.push(
                <p key={i} className="my-1">
                    {parts.map((part, j) =>
                        part.startsWith('**') && part.endsWith('**') ?
                        <strong key={j}>{part.slice(2, -2)}</strong> :
                        part
                    )}
                </p>
            );
        }
    });

    flushList('end');

    return <>{elements}</>;
};


export const AiChat: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
        setMessages([
            {
                role: 'model',
                content: "Hi! I'm Nutri, your personal AI nutritionist. How can I help you on your health journey today? Ask me about meal ideas, healthy snacks, or understanding nutrition labels!",
            },
        ]);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage: ChatMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await getAiHealthAdvice(newMessages);
      setMessages([...newMessages, { role: 'model', content: response }]);
    } catch (error: any) {
      setMessages([...newMessages, { role: 'model', content: error.message || "Something went wrong." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center p-4 sm:items-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative z-50 bg-white dark:bg-gray-800 w-full max-w-lg h-[85vh] sm:h-[80vh] flex flex-col rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-center justify-between p-4 border-b border-teal-100 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="text-teal-500" />
            <h2 className="font-bold text-lg text-gray-800 dark:text-gray-100">Your AI Nutritionist</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'model' && (
                <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
                    <Bot size={20} className="text-white"/>
                </div>
              )}
              <div
                className={`max-w-sm p-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'model'
                    ? 'bg-teal-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-br-none'
                }`}
              >
                <SimpleMarkdown text={msg.content} />
              </div>
            </div>
          ))}
          {loading && (
             <div className="flex items-start gap-3">
                 <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
                    <Bot size={20} className="text-white"/>
                </div>
                <div className="max-w-sm p-3 rounded-2xl bg-teal-50 dark:bg-gray-700">
                    <div className="flex items-center gap-2 h-5">
                        <div className="animate-bounce bg-gray-400 rounded-full h-2 w-2"></div>
                        <div className="animate-bounce bg-gray-400 rounded-full h-2 w-2 [animation-delay:0.2s]"></div>
                        <div className="animate-bounce bg-gray-400 rounded-full h-2 w-2 [animation-delay:0.4s]"></div>
                    </div>
                </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-teal-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                  }
              }}
              placeholder="Ask for healthy advice..."
              className="flex-1 p-2.5 border border-teal-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-400 focus:outline-none resize-none bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
              rows={1}
              aria-label="Chat input for AI Nutritionist"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-teal-500 text-white font-bold p-2.5 rounded-lg hover:bg-teal-600 transition-colors disabled:bg-teal-300 disabled:cursor-not-allowed flex-shrink-0"
              aria-label="Send message"
            >
              <SendHorizonal size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
