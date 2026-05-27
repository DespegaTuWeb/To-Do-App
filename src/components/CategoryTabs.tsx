'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Inbox } from 'lucide-react';
import { Categoria } from '../lib/supabase';
import ContextMenu from './ContextMenu';

interface CategoryTabsProps {
  categories: Categoria[];
  activeCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onCreateCategory: (nombre: string) => Promise<void>;
  onRenameCategory: (id: string, nuevoNombre: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

export default function CategoryTabs({
  categories,
  activeCategoryId,
  onSelectCategory,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
}: CategoryTabsProps) {
  // Estado para la creación inline de categoría
  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);

  // Estado para renombrar categoría
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Estado del menú contextual
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    categoryId: string;
    categoryName: string;
  } | null>(null);

  // Soporte para Long Press en móvil
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTouchMoveRef = useRef(false);

  // Auto-focus en el input de añadir
  useEffect(() => {
    if (isAdding && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [isAdding]);

  // Auto-focus en el input de renombrar
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      setIsAdding(false);
      return;
    }
    await onCreateCategory(newCategoryName.trim());
    setNewCategoryName('');
    setIsAdding(false);
  };

  const handleRenameSubmit = async (id: string, value: string) => {
    if (!value.trim() || value.trim() === categories.find(c => c.id === id)?.nombre) {
      setRenamingId(null);
      return;
    }
    await onRenameCategory(id, value.trim());
    setRenamingId(null);
  };

  // Manejo de eventos del menú contextual (Clic derecho en PC)
  const handleContextMenu = (e: React.MouseEvent, categoryId: string, categoryName: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      categoryId,
      categoryName,
    });
  };

  // Manejo de eventos táctiles para Long Press (Móvil)
  const handleTouchStart = (e: React.TouchEvent, categoryId: string, categoryName: string) => {
    isTouchMoveRef.current = false;
    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;

    longPressTimeoutRef.current = setTimeout(() => {
      // Si no se movió el dedo, es un toque sostenido
      if (!isTouchMoveRef.current) {
        // Reproducir una vibración sutil si el móvil lo soporta
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(30);
        }
        setContextMenu({
          x: clientX,
          y: clientY - 40, // subimos un poco para que no quede debajo del dedo
          categoryId,
          categoryName,
        });
      }
    }, 600); // 600ms para disparar el long-press
  };

  const handleTouchEnd = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }
  };

  const handleTouchMove = () => {
    isTouchMoveRef.current = true;
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }
  };

  // Limpiar timers
  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2 px-1 -mx-1">
        {/* Pestaña Inbox (Fija) */}
        <button
          onClick={() => onSelectCategory(null)}
          className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-medium rounded-full border transition-smooth whitespace-nowrap cursor-pointer ${
            activeCategoryId === null
              ? 'bg-white text-slate-950 border-white shadow-lg'
              : 'glass-panel text-slate-400 border-white/5 hover:text-slate-200 glass-panel-hover'
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
          Inbox / Hoy
        </button>

        {/* Pestañas Dinámicas */}
        {categories.map((cat) => {
          const isActive = activeCategoryId === cat.id;
          const isRenaming = renamingId === cat.id;

          if (isRenaming) {
            return (
              <div key={cat.id} className="glass-panel border-white/10 rounded-full px-3 py-1 animate-check-pop">
                <input
                  ref={renameInputRef}
                  type="text"
                  defaultValue={cat.nombre}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSubmit(cat.id, e.currentTarget.value);
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  onBlur={(e) => handleRenameSubmit(cat.id, e.currentTarget.value)}
                  className="bg-transparent text-xs md:text-sm text-white focus:outline-none w-24 max-w-[120px]"
                />
              </div>
            );
          }

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              onContextMenu={(e) => handleContextMenu(e, cat.id, cat.nombre)}
              onTouchStart={(e) => handleTouchStart(e, cat.id, cat.nombre)}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchMove}
              className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-medium rounded-full border transition-smooth whitespace-nowrap cursor-pointer select-none ${
                isActive
                  ? 'bg-white text-slate-950 border-white shadow-lg shadow-white/5'
                  : 'glass-panel text-slate-400 border-white/5 hover:text-slate-200 glass-panel-hover'
              }`}
            >
              {/* Círculo indicador de color */}
              <span
                className="w-2 h-2 rounded-full transition-transform"
                style={{ backgroundColor: cat.color || '#3b82f6' }}
              />
              {cat.nombre}
            </button>
          );
        })}

        {/* Botón Añadir inline */}
        {isAdding ? (
          <form
            onSubmit={handleAddSubmit}
            className="flex items-center glass-panel border-white/10 rounded-full pl-3 pr-1 py-1 animate-check-pop"
          >
            <input
              ref={addInputRef}
              type="text"
              placeholder="Nueva..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsAdding(false);
              }}
              className="bg-transparent text-xs md:text-sm text-white focus:outline-none w-20 md:w-24 placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="p-1 hover:bg-white/10 rounded-full transition-smooth text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center justify-center p-2.5 rounded-full border border-dashed border-white/15 hover:border-white/30 text-slate-400 hover:text-slate-200 transition-smooth cursor-pointer glass-panel-hover"
            title="Añadir Categoría"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Menú Contextual */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          categoryName={contextMenu.categoryName}
          onClose={() => setContextMenu(null)}
          onRename={() => setRenamingId(contextMenu.categoryId)}
          onDelete={() => onDeleteCategory(contextMenu.categoryId)}
        />
      )}
    </div>
  );
}
