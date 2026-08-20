import React from 'react';
import { motion } from 'motion/react';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

// Wraps a route's page so navigating between routes fades/slides rather than
// hard-cutting — paired with AnimatePresence in App.jsx.
const PageTransition = ({ children }) => (
  <motion.div
    initial="initial"
    animate="animate"
    exit="exit"
    variants={pageVariants}
    transition={{ duration: 0.25, ease: 'easeInOut' }}
    style={{ height: '100%' }}
  >
    {children}
  </motion.div>
);

export default PageTransition;
