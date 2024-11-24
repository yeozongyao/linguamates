// VideoContainer.js
import React from 'react';
import ReactDOM from 'react-dom';
import { VideoOff, MicOff } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import SubtitleOverlay from './SubtitleOverlay';

const VideoContainer = ({ 
  isLocal, 
  videoRef, 
  username, 
  isVideoEnabled, 
  isAudioEnabled,
  currentSubtitle,
  children // For rendering controls and settings
}) => {
  const content = (
    <div className="fixed inset-0 w-screen h-screen flex flex-col bg-black">
      {/* Video container */}
      <div className="relative flex-1">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* User info */}
        <div className="absolute top-4 left-4 text-white bg-black/50 px-3 py-2 rounded-lg flex items-center gap-2 text-lg">
          <span>{username}</span>
          {isLocal && (
            <>
              {!isVideoEnabled && <VideoOff className="w-5 h-5" />}
              {!isAudioEnabled && <MicOff className="w-5 h-5" />}
            </>
          )}
        </div>
        
        {/* Subtitles */}
        <AnimatePresence>
          {currentSubtitle?.original && (
            <SubtitleOverlay 
              key="original"
              text={currentSubtitle.original} 
              isOriginal={true} 
            />
          )}
          {currentSubtitle?.translated && (
            <SubtitleOverlay 
              key="translated"
              text={currentSubtitle.translated} 
              isOriginal={false} 
            />
          )}
        </AnimatePresence>
      </div>

      {/* Controls and other UI elements */}
      {children}
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
};

export default VideoContainer;