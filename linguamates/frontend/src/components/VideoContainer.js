import React from 'react';
import { VideoOff, MicOff } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import SubtitleOverlay from './SubtitleOverlay';

const VideoContainer = ({ 
  isLocal, 
  videoRef, 
  username, 
  isVideoEnabled, 
  isAudioEnabled,
  currentSubtitle 
}) => (
  <div className="relative aspect-video">
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isLocal}
      className="w-full h-full object-cover rounded-lg bg-gray-900"
    />
    
    {/* User info */}
    <div className="absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded flex items-center gap-2">
      <span>{username}</span>
      {isLocal && (
        <>
          {!isVideoEnabled && <VideoOff className="w-4 h-4" />}
          {!isAudioEnabled && <MicOff className="w-4 h-4" />}
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
);

export default VideoContainer;