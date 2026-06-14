'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  isDestructive = false,
}: ConfirmModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-md transition-opacity duration-300 animate-fade-in p-4">
      <div 
        className="w-full max-w-sm glass-panel rounded-2xl border border-[var(--c-border)] p-6 flex flex-col gap-4 animate-check-pop text-[var(--c-text-primary)]"
        style={{ backgroundColor: 'var(--c-page-bg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            isDestructive 
              ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
              : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
          }`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-extrabold text-[var(--c-text-primary)]">{title}</h3>
        </div>
        
        <p className="text-xs text-[var(--c-text-secondary)] leading-relaxed font-medium">
          {message}
        </p>

        <div className="flex items-center justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-[var(--c-text-secondary)] hover:text-[var(--c-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-smooth cursor-pointer border border-[var(--c-border)]"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-smooth cursor-pointer ${
              isDestructive 
                ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20' 
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/25'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
