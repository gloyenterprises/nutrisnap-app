import React, { useState } from 'react';
import { Sparkles, Share2 } from 'lucide-react';
import type { UserProfile } from '../types';

interface HeaderProps {
  onAssistantClick: () => void;
  userProfile: UserProfile | null;
}

export const Header: React.FC<HeaderProps> = ({ onAssistantClick, userProfile }) => {
    const [showCopiedMessage, setShowCopiedMessage] = useState(false);

    const handleShare = async () => {
        const shareData = {
            title: 'NutriSnap - AI Calorie Counter',
            text: 'Check out this cool AI-powered nutrition app!',
            url: window.location.origin,
        };

        const copyToClipboard = () => {
            navigator.clipboard.writeText(shareData.url).then(() => {
                setShowCopiedMessage(true);
                setTimeout(() => setShowCopiedMessage(false), 2000);
            }).catch(copyErr => {
                console.error("Clipboard write failed: ", copyErr);
                alert("Could not copy link. Please copy the URL from your browser's address bar.");
            });
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    copyToClipboard();
                }
            }
        } else {
            copyToClipboard();
        }
    };

  return (
    <header className="flex-shrink-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md z-10 p-4 border-b border-teal-100 dark:border-gray-700 shadow-sm">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
           <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">Hello, {userProfile?.name}!</h1>
        </div>
         <div className="flex items-center gap-1 sm:gap-2 relative">
            <button 
              onClick={handleShare}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-teal-500 rounded-lg hover:bg-teal-50 dark:hover:bg-gray-700 transition-colors"
              aria-label="Share App"
            >
                <Share2 size={20} />
            </button>
             {showCopiedMessage && (
                <div className="absolute top-full mt-2 right-0 text-xs bg-gray-800 text-white px-2 py-1 rounded-md animate-in fade-in-0 duration-300 z-10">
                    Link Copied!
                </div>
            )}
             <button 
              onClick={onAssistantClick}
              className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-teal-500 transition-colors p-2 rounded-lg hover:bg-teal-50 dark:hover:bg-gray-700"
              aria-label="Open AI Nutritionist chat"
            >
                <Sparkles size={24} className="text-teal-400" />
                <span className="hidden sm:inline">AI Nutritionist</span>
            </button>
        </div>
      </div>
    </header>
  );
};
