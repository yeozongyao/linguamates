import React from 'react';
import { motion } from 'framer-motion';

const SubtitleOverlay = ({ text, isOriginal }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    className={`absolute ${isOriginal ? 'bottom-20' : 'bottom-4'} left-1/2 -translate-x-1/2 
                bg-black bg-opacity-75 px-4 py-2 rounded-lg max-w-[90%] text-center
                ${isOriginal ? 'text-gray-300 text-sm' : 'text-white text-base'}`}
  >
    {text}
  </motion.div>
);

export default SubtitleOverlay;