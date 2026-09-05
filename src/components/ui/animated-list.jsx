'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../lib/utils';

/**
 * Magic UI Animated List — adapted for Vite + framer-motion.
 * @see https://magicui.design/docs/components/animated-list
 */
export function AnimatedListItem({ children, className }) {
  return (
    <motion.div
      layout
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, originY: 0 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 40 }}
      className={cn('mx-auto w-full', className)}
    >
      {children}
    </motion.div>
  );
}

export const AnimatedList = React.memo(function AnimatedList({
  children,
  className,
  delay = 1000,
  ...props
}) {
  const [index, setIndex] = useState(0);
  const childrenArray = useMemo(() => React.Children.toArray(children), [children]);

  useEffect(() => {
    if (index >= childrenArray.length - 1) return undefined;
    const timeout = setTimeout(() => {
      setIndex((prev) => prev + 1);
    }, delay);
    return () => clearTimeout(timeout);
  }, [index, delay, childrenArray.length]);

  const itemsToShow = useMemo(
    () => childrenArray.slice(0, index + 1).reverse(),
    [index, childrenArray]
  );

  return (
    <div className={cn('flex flex-col items-center gap-3', className)} {...props}>
      <AnimatePresence>
        {itemsToShow.map((item) => (
          <AnimatedListItem key={item.key}>{item}</AnimatedListItem>
        ))}
      </AnimatePresence>
    </div>
  );
});
