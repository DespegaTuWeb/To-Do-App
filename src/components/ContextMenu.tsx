'use client';

import React, { useEffect, useRef } from 'react';
import { Edit2, Trash2 } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  categoryName: string;
}

export default function ContextMenu({
  x,
  y,
  onClose,
  onRename,
  onDelete,
  categoryName,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera del menú
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  // Ajustar coordenadas para que no se salga de la pantalla
  let adjustedX = x;
  let adjustedY = y;

  if (typeof window !== 'undefined') {
    const menuWidth = 160; // aprox width
    const menuHeight = 100; // aprox height
    if (x + menuWidth > window.innerWidth) {
      adjustedX = window.innerWidth - menuWidth - 8;
    }
    if (y + menuHeight > window.innerHeight) {
      adjustedY = window.innerHeight - menuHeight - 8;
    }
  }

  return (
    <div
      ref={menuRef}
      style={{ top: `${adjustedY}px`, left: `${adjustedX}px` }}
      className="fixed z-50 min-w-[160px] glass-panel rounded-lg shadow-2xl p-1 animate-check-pop"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-400 border-b border-white/5 font-semibold">
        {categoryName}
      </div>
      <button
        onClick={() => {
          onRename();
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 rounded-md transition-smooth text-left"
      >
        <Edit2 className="w-3.5 h-3.5 text-blue-400" />
        Renombrar
      </button>
      <button
        onClick={() => {
          if (confirm(`¿Eliminar la categoría "${categoryName}"? Se borrarán todas sus tareas asociadas.`)) {
            onDelete();
          }
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-md transition-smooth text-left font-medium"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Eliminar
      </button>
    </div>
  );
}
