'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Calendar, Edit3, CheckCircle, Circle, AlignLeft, FileText, Check, X, GripVertical, FolderPlus } from 'lucide-react';
import { Pendiente } from '../lib/supabase';
import { formatSpanishDate, getLocalDateString } from '../lib/utils';
import CalendarModal from './CalendarModal';
import ConfirmModal from './ConfirmModal';
import { fireParticleConfetti } from '../lib/ParticleConfetti';

interface TaskItemProps {
  task: Pendiente;
  categoryColor?: string;
  categoryName?: string;
  onToggle: (id: string, completado: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Pendiente>) => Promise<void>;
  onOpenDetail?: (task: Pendiente) => void;
  onDragDisableChange?: (disabled: boolean) => void;
}

export default function TaskItem({
  task,
  categoryColor = '#3b82f6',
  categoryName,
  onToggle,
  onDelete,
  onUpdate,
  onOpenDetail,
  onDragDisableChange,
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.titulo);
  const [editNota, setEditNota] = useState(task.nota || '');
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [descText, setDescText] = useState(task.nota || '');
  const editInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  // Sincronizar descText si la nota cambia externamente
  useEffect(() => {
    setDescText(task.nota || '');
  }, [task.nota]);

  // Ajustar altura del textarea de forma dinámica
  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isExpanded, descText]);

  const handleSaveDesc = async () => {
    const trimmed = descText.trim() || null;
    if (trimmed !== task.nota) {
      await onUpdate(task.id, { nota: trimmed });
    }
  };

  const todayStr = getLocalDateString(0);
  const isOverdue = task.fecha_limite && task.fecha_limite < todayStr && !task.completado;

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveAll = async () => {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      setEditTitle(task.titulo);
      setIsEditing(false);
      return;
    }

    const updates: Partial<Pendiente> = {};
    if (trimmedTitle !== task.titulo) updates.titulo = trimmedTitle;
    
    const trimmedNota = editNota.trim() || null;
    if (trimmedNota !== task.nota) updates.nota = trimmedNota;

    if (Object.keys(updates).length > 0) {
      await onUpdate(task.id, updates);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSaveAll();
    }
    if (e.key === 'Escape') {
      setEditTitle(task.titulo);
      setEditNota(task.nota || '');
      setIsEditing(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Si hay texto seleccionado en la pantalla, ignorar el clic para evitar colapsar la tarjeta
    const selection = window.getSelection()?.toString();
    if (selection) return;

    const startTarget = mouseDownTargetRef.current as HTMLElement | null;
    const endTarget = e.target as HTMLElement;

    // Si el clic empezó en un input, textarea o botón, ignorar
    if (
      startTarget && (
        startTarget.closest('button') ||
        startTarget.closest('input') ||
        startTarget.closest('textarea') ||
        startTarget.closest('.glass-panel-hover button')
      )
    ) {
      return;
    }

    if (
      endTarget.closest('button') || 
      endTarget.closest('input') || 
      endTarget.closest('textarea') ||
      endTarget.closest('.glass-panel-hover button') ||
      isEditing
    ) {
      return;
    }
    setIsExpanded(!isExpanded);
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const willBeCompleted = !task.completado;
    onToggle(task.id, willBeCompleted);
    
    if (willBeCompleted) {
      fireParticleConfetti(e.clientX, e.clientY, categoryColor);
    }
  };

  const handleConvertToSubcategory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await onUpdate(task.id, {
      grupo_nombre: task.titulo,
      grupo_color: '#8b5cf6', // Violeta premium por defecto
      es_grupo: true
    });
  };

  return (
    <div
      onClick={handleCardClick}
      onMouseDown={(e) => {
        mouseDownTargetRef.current = e.target;
      }}
      className={`glass-panel glass-panel-hover rounded-xl p-2.5 flex flex-col gap-2 transition-smooth border-l-3 relative cursor-pointer group ${
        task.completado ? 'opacity-50' : 'opacity-100'
      }`}
      style={{ 
        borderLeftColor: categoryColor,
        '--card-glow': `${categoryColor}1f`
      } as React.CSSProperties}
    >
      {/* Fecha y hora de creación sutil en el borde superior derecho */}
      <span className="absolute top-1 right-2.5 text-[8px] md:text-[9px] text-luxury-muted/60 font-semibold tracking-wider pointer-events-none transition-opacity duration-200 group-hover:opacity-0 select-none">
        {new Date(task.created_at).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>

      <div className="flex items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {!isEditing && (
            <GripVertical className="w-3.5 h-3.5 text-luxury-secondary opacity-25 group-hover:opacity-75 flex-shrink-0 cursor-grab active:cursor-grabbing transition-smooth" />
          )}

          {/* Checkbox reactivo */}
          <button
            onClick={handleToggleClick}
            className="flex-shrink-0 text-luxury-secondary hover:text-luxury-primary transition-smooth focus:outline-none cursor-pointer"
          >
            {task.completado ? (
              <CheckCircle className="w-4.5 h-4.5 text-emerald-500 animate-check-pop fill-emerald-500/10" />
            ) : (
              <Circle className="w-4.5 h-4.5 hover:scale-105 transition-smooth" />
            )}
          </button>

          {/* Título y Detalles */}
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            {isEditing ? (
              <div className="flex flex-col gap-2 w-full pr-4" onKeyDown={handleKeyDown}>
                <input
                  ref={editInputRef}
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Título de la tarea"
                  draggable={false}
                  onDragStart={(e) => e.stopPropagation()}
                  onFocus={() => onDragDisableChange?.(true)}
                  onBlur={() => onDragDisableChange?.(false)}
                  onMouseEnter={() => onDragDisableChange?.(true)}
                  onMouseLeave={() => onDragDisableChange?.(false)}
                  className="bg-transparent text-xs md:text-sm font-bold text-luxury-primary focus:outline-none border-b border-indigo-500/20 w-full py-0.5"
                />
                <input
                  type="text"
                  value={editNota}
                  onChange={(e) => setEditNota(e.target.value)}
                  placeholder="Descripción (Ctrl+Enter para guardar)"
                  draggable={false}
                  onDragStart={(e) => e.stopPropagation()}
                  onFocus={() => onDragDisableChange?.(true)}
                  onBlur={() => onDragDisableChange?.(false)}
                  onMouseEnter={() => onDragDisableChange?.(true)}
                  onMouseLeave={() => onDragDisableChange?.(false)}
                  className="bg-transparent text-xs text-luxury-secondary focus:outline-none border-b border-indigo-500/5 w-full py-0.5 placeholder:text-luxury-muted font-normal"
                />
              </div>
            ) : (
              <div className="flex items-baseline gap-2 min-w-0 relative">
                <span
                  onMouseEnter={() => onDragDisableChange?.(true)}
                  onMouseLeave={() => onDragDisableChange?.(false)}
                  onTouchStart={() => onDragDisableChange?.(true)}
                  onTouchEnd={() => onDragDisableChange?.(false)}
                  className={`text-xs md:text-sm font-semibold truncate transition-smooth select-text ${
                    task.completado ? 'line-through text-luxury-muted' : 'text-luxury-primary hover:text-indigo-500'
                  }`}
                >
                  {task.titulo}
                </span>

                {task.nota && (
                  <AlignLeft className="w-3.5 h-3.5 text-luxury-secondary flex-shrink-0 ml-1.5 opacity-65 self-center" />
                )}
              </div>
            )}

            {/* Fila de detalles inferior */}
            {!isEditing && (
              <div className="flex items-center gap-2.5 flex-wrap mt-0.5 w-full">
                {categoryName && (
                  <span
                    onMouseEnter={() => onDragDisableChange?.(true)}
                    onMouseLeave={() => onDragDisableChange?.(false)}
                    onTouchStart={() => onDragDisableChange?.(true)}
                    onTouchEnd={() => onDragDisableChange?.(false)}
                    className="text-[9px] font-semibold px-2 py-0.5 rounded-full border select-text"
                    style={{
                      borderColor: `${categoryColor}25`,
                      color: categoryColor,
                      backgroundColor: `${categoryColor}08`,
                    }}
                  >
                    {categoryName}
                  </span>
                )}

                {task.fecha_limite && !isExpanded && (
                  <button
                    onClick={() => setShowCalendarModal(true)}
                    onMouseEnter={() => onDragDisableChange?.(true)}
                    onMouseLeave={() => onDragDisableChange?.(false)}
                    onTouchStart={() => onDragDisableChange?.(true)}
                    onTouchEnd={() => onDragDisableChange?.(false)}
                    className={`flex items-center gap-1 text-[10px] hover:text-luxury-primary transition-smooth bg-indigo-500/5 hover:bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/10 cursor-pointer select-text ${
                      isOverdue ? 'text-rose-500 border-rose-500/20 font-semibold' : 'text-luxury-secondary'
                    }`}
                    title="Cambiar fecha límite"
                  >
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    <span>
                      {task.fecha_limite === todayStr
                        ? 'Hoy'
                        : task.fecha_limite === getLocalDateString(1)
                        ? 'Mañana'
                        : formatSpanishDate(task.fecha_limite)}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Botones de acción rápidos a la derecha */}
        {isEditing ? (
          <div className="flex items-center gap-1">
            <button
              onClick={handleSaveAll}
              className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-smooth cursor-pointer"
              title="Guardar cambios"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setEditTitle(task.titulo);
                setEditNota(task.nota || '');
                setIsEditing(false);
              }}
              className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-smooth cursor-pointer"
              title="Cancelar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 max-md:opacity-100">
            {!isExpanded && !task.grupo_nombre && (
              <button
                onClick={handleConvertToSubcategory}
                className="p-1.5 text-luxury-secondary hover:text-emerald-500 hover:bg-emerald-500/5 rounded-lg transition-smooth cursor-pointer"
                title="Convertir en subcategoría"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 text-luxury-secondary hover:text-indigo-500 hover:bg-indigo-500/5 rounded-lg transition-smooth cursor-pointer"
              title="Editar título inline"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            {!isExpanded && (
              <button
                onClick={() => onDelete(task.id)}
                className="p-1.5 text-luxury-secondary hover:text-rose-500 hover:bg-rose-500/5 rounded-lg transition-smooth cursor-pointer"
                title="Eliminar tarea"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Dropdown de Detalles Expandibles */}
      {isExpanded && !isEditing && (
        <div className="mt-2 pt-2.5 border-t border-[var(--c-divider)] flex flex-col gap-3 text-xs animate-fade-in pl-[52px]">
          {/* Descripción */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-luxury-muted uppercase tracking-wide">Descripción</span>
            <textarea
              ref={textareaRef}
              value={descText}
              onChange={(e) => {
                setDescText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onBlur={() => {
                handleSaveDesc();
                onDragDisableChange?.(false);
              }}
              onFocus={() => onDragDisableChange?.(true)}
              onMouseEnter={() => onDragDisableChange?.(true)}
              onMouseLeave={() => onDragDisableChange?.(false)}
              placeholder="Añadir una descripción..."
              draggable={false}
              onDragStart={(e) => e.stopPropagation()}
              className="w-full min-h-[60px] glass-input text-xs rounded-xl p-2.5 resize-none placeholder:text-luxury-muted leading-relaxed font-normal transition-smooth shadow-sm overflow-hidden"
            />
          </div>

          {/* Fecha Límite */}
          <div className="flex items-center justify-between gap-4 mt-1 border-t border-[var(--c-divider)] pt-2.5">
            <div 
              onClick={(e) => {
                e.stopPropagation();
                setShowCalendarModal(true);
              }}
              onMouseEnter={() => onDragDisableChange?.(true)}
              onMouseLeave={() => onDragDisableChange?.(false)}
              onTouchStart={() => onDragDisableChange?.(true)}
              onTouchEnd={() => onDragDisableChange?.(false)}
              className="flex flex-col gap-0.5 cursor-pointer hover:bg-[var(--c-surface-hover)] p-1 -m-1 rounded-lg transition-smooth select-text"
              title="Haga clic para cambiar fecha límite"
            >
              <span className="text-[10px] font-bold text-luxury-muted uppercase tracking-wide">Fecha Límite</span>
              <span className="text-luxury-secondary font-medium pl-0.5">
                {task.fecha_limite ? formatSpanishDate(task.fecha_limite) : 'Sin fecha límite'}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5">
              {/* Botón Eliminar */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id);
                }}
                className="px-2.5 py-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 font-bold transition-smooth text-[10px] uppercase tracking-wide cursor-pointer border border-rose-500/10"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Calendario Personalizado */}
      <CalendarModal
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        onSelectDate={async (newDate) => {
          await onUpdate(task.id, { fecha_limite: newDate });
        }}
        currentValue={task.fecha_limite}
      />
    </div>
  );
}
