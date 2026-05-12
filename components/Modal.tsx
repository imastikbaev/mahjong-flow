'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  /** Pass false to prevent clicking the backdrop from closing. */
  closeOnBackdrop?: boolean;
  children: React.ReactNode;
  /** Max width class. Defaults to max-w-md. */
  maxWidth?: string;
}

/**
 * Reusable modal shell.
 * Handles: backdrop blur, Framer Motion enter/exit, Escape key, body scroll lock.
 */
export default function Modal({
  isOpen,
  onClose,
  closeOnBackdrop = true,
  children,
  maxWidth = 'max-w-md',
}: ModalProps) {
  // Trap scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!onClose) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        // Backdrop
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4
                     bg-black/40 backdrop-blur-sm"
          onClick={closeOnBackdrop ? onClose : undefined}
        >
          {/* Panel — stops click propagation so backdrop click works cleanly */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className={`relative w-full ${maxWidth}
                        bg-[#0e0e0e] border border-white/[0.07]
                        rounded-2xl shadow-2xl overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
