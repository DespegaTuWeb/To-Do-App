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
        className="w-full max-w-sm glass-panel rounded-2xl border border-white/10 p-6 flex flex-col gap-4 animate-check-pop bg-slate-900/90 dark:bg-slate-950/90 light:bg-white/95"
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
        
        <p className="text-xs text-slate-400 leading-relaxed font-medium">
          {message}
        </p>

        <div className="flex items-center justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-smooth cursor-pointer border border-white/5"
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
