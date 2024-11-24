import React from 'react';
import { motion } from 'framer-motion';

const SubtitleOverlay = ({ text, isOriginal }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    className={`absolute ${isOriginal ? 'bottom-10 left-2/3' : 'bottom-10 left-1'}  -translate-x-1/2 
                bg-black bg-opacity-75 px-4 py-2 rounded-lg max-w-[90%] text-center
                ${isOriginal ? 'text-white text-base' : 'text-white text-base'} z-[55]`}
  >
    {text}
  </motion.div>
);

export default SubtitleOverlay;