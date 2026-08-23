import React, { useState } from 'react';
import { Mic } from 'lucide-react';
import { VoiceChatModal } from './VoiceChatModal';

export const VoiceAssistantFab = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 md:bottom-8 right-4 md:right-8 w-14 h-14 bg-gradient-to-r from-blue-500 to-primary-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform z-40 group"
      >
        <Mic size={24} className="group-hover:animate-pulse" />
      </button>

      {isOpen && <VoiceChatModal onClose={() => setIsOpen(false)} />}
    </>
  );
};



