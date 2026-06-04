import React, { useEffect, useRef } from 'react';
import { Edit2, Trash2, FolderPlus } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  onConvertToSubcategory?: () => void;
  categoryName: string;
}

export default function ContextMenu({
  x,
  y,
  onClose,
  onRename,
  onDelete,
  onConvertToSubcategory,
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
    const menuWidth = 180; // aprox width
    const menuHeight = 140; // aprox height
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
      className="fixed z-50 min-w-[180px] glass-panel rounded-lg shadow-2xl p-1 animate-check-pop"
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
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 rounded-md transition-smooth text-left cursor-pointer"
      >
        <Edit2 className="w-3.5 h-3.5 text-blue-400" />
        Renombrar
      </button>

      {onConvertToSubcategory && (
        <button
          onClick={() => {
            onConvertToSubcategory();
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 rounded-md transition-smooth text-left cursor-pointer"
        >
          <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
          Convertir a Subcategoría
        </button>
      )}

      <button
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-md transition-smooth text-left font-medium cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Eliminar
      </button>
    </div>
  );
}
