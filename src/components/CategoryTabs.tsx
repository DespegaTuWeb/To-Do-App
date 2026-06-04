'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Inbox, GripVertical, ArrowUpDown } from 'lucide-react';
import { Categoria } from '../lib/supabase';
import ContextMenu from './ContextMenu';

interface CategoryTabsProps {
  categories: Categoria[];
  activeCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onCreateCategory: (nombre: string) => Promise<void>;
  onRenameCategory: (id: string, nuevoNombre: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onReorderCategories: (orderedCategories: Categoria[]) => void;
  onDropTaskOrGroup?: (taskId: string, targetCategoryId: string | null) => Promise<void>;
}

export default function CategoryTabs({
  categories,
  activeCategoryId,
  onSelectCategory,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
  onReorderCategories,
  onDropTaskOrGroup,
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

  // ID del elemento que se está arrastrando (reordenación de categorías)
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Estado para saber sobre qué pestaña se está arrastrando una tarea o subcategoría
  const [activeOverTabId, setActiveOverTabId] = useState<string | null | undefined>(undefined);

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

  // Ordenación alfabética exclusiva de categorías
  const handleSortAlphabetically = () => {
    const sorted = [...categories].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
    );
    onReorderCategories(sorted);
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
      if (!isTouchMoveRef.current) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(30);
        }
        setContextMenu({
          x: clientX,
          y: clientY - 40,
          categoryId,
          categoryName,
        });
      }
    }, 600);
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

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const draggedIdx = categories.findIndex((c) => c.id === draggedId);
    const targetIdx = categories.findIndex((c) => c.id === targetId);

    if (draggedIdx !== -1 && targetIdx !== -1) {
      const reordered = [...categories];
      const [draggedItem] = reordered.splice(draggedIdx, 1);
      reordered.splice(targetIdx, 0, draggedItem);
      onReorderCategories(reordered);
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  // Drag Over, Leave y Drop para tareas/grupos arrastrados a pestañas
  const handleDragOverTab = (e: React.DragEvent, id: string | null) => {
    e.preventDefault();
    setActiveOverTabId(id);
  };

  const handleDragLeaveTab = () => {
    setActiveOverTabId(undefined);
  };

  const handleDropTab = async (e: React.DragEvent, targetCategoryId: string | null) => {
    e.preventDefault();
    setActiveOverTabId(undefined);
    const taskId = e.dataTransfer.getData('task-id');
    if (!taskId) return;

    if (onDropTaskOrGroup) {
      await onDropTaskOrGroup(taskId, targetCategoryId);
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
      <div className="flex flex-wrap items-center gap-2 py-2">
        {/* Pestaña Inbox (Fija) */}
        <button
          onClick={() => onSelectCategory(null)}
          onDragOver={(e) => handleDragOverTab(e, null)}
          onDragLeave={handleDragLeaveTab}
          onDrop={(e) => handleDropTab(e, null)}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full border transition-smooth whitespace-nowrap cursor-pointer ${
            activeCategoryId === null
              ? 'bg-white text-slate-950 border-white shadow-lg'
              : activeOverTabId === null
              ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400 scale-[1.04] shadow-md shadow-indigo-500/10'
              : 'glass-panel text-luxury-secondary border-white/5 hover:text-luxury-primary glass-panel-hover'
          }`}
        >
          <Inbox className="w-3 h-3" />
          Inbox / Hoy
        </button>

        {/* Pestañas Dinámicas Reordenables */}
        {categories.map((cat) => {
          const isActive = activeCategoryId === cat.id;
          const isRenaming = renamingId === cat.id;
          const isDragging = draggedId === cat.id;

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
                  className="bg-transparent text-xs text-luxury-primary focus:outline-none w-24 max-w-[120px]"
                />
              </div>
            );
          }

          return (
            <div
              key={cat.id}
              draggable
              onDragOver={(e) => handleDragOver(e, cat.id)}
              onDragLeave={handleDragLeaveTab}
              onDragEnd={handleDragEnd}
              className={`flex items-center transition-all duration-200 ${
                isDragging ? 'opacity-30 scale-95' : 'opacity-100'
              }`}
            >
              <button
                onClick={() => onSelectCategory(cat.id)}
                onDragOver={(e) => handleDragOverTab(e, cat.id)}
                onDragLeave={handleDragLeaveTab}
                onDrop={(e) => handleDropTab(e, cat.id)}
                onContextMenu={(e) => handleContextMenu(e, cat.id, cat.nombre)}
                onTouchStart={(e) => handleTouchStart(e, cat.id, cat.nombre)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
                className={`flex items-center gap-1.5 pl-2.5 pr-3.5 py-1.5 text-xs font-semibold rounded-full border transition-smooth whitespace-nowrap cursor-pointer select-none group relative ${
                  isActive
                    ? 'bg-white text-slate-950 border-white shadow-lg shadow-white/5'
                    : activeOverTabId === cat.id
                    ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400 scale-[1.04] shadow-md shadow-indigo-500/10'
                    : 'glass-panel text-luxury-secondary border-white/5 hover:text-luxury-primary glass-panel-hover'
                }`}
              >
                <GripVertical className={`w-2.5 h-2.5 text-slate-500 mr-[-2px] cursor-grab active:cursor-grabbing transition-opacity duration-200 ${
                  isActive ? 'text-slate-600' : 'opacity-40 group-hover:opacity-100'
                }`} />

                <span
                  className="w-1.5 h-1.5 rounded-full transition-transform"
                  style={{ backgroundColor: cat.color || '#3b82f6' }}
                />
                {cat.nombre}
              </button>
            </div>
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
              className="bg-transparent text-xs md:text-sm text-luxury-primary focus:outline-none w-20 md:w-24 placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="p-1 hover:bg-white/10 rounded-full transition-smooth text-luxury-secondary hover:text-luxury-primary"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center justify-center p-2 rounded-full border border-dashed border-white/15 hover:border-white/30 text-luxury-secondary hover:text-luxury-primary transition-smooth cursor-pointer glass-panel-hover px-3 py-1.5"
              title="Añadir Categoría"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span className="text-xs">Añadir</span>
            </button>
          </div>
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
