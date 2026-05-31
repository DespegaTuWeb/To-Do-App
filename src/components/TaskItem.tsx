'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Calendar, Edit3, CheckCircle, Circle, AlignLeft, FileText, Check, X, GripVertical } from 'lucide-react';
import { Pendiente } from '../lib/supabase';
import { formatSpanishDate, getLocalDateString } from '../lib/utils';
import CalendarModal from './CalendarModal';

interface TaskItemProps {
  task: Pendiente;
  categoryColor?: string;
  categoryName?: string;
  onToggle: (id: string, completado: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Pendiente>) => Promise<void>;
  onOpenDetail?: (task: Pendiente) => void;
}

export default function TaskItem({
  task,
  categoryColor = '#3b82f6',
  categoryName,
  onToggle,
  onDelete,
  onUpdate,
  onOpenDetail,
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.titulo);
  const [editNota, setEditNota] = useState(task.nota || '');
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

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
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('input') || 
      target.closest('.glass-panel-hover button') ||
      isEditing
    ) {
      return;
    }
    if (onOpenDetail) {
      onOpenDetail(task);
    }
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const willBeCompleted = !task.completado;
    onToggle(task.id, willBeCompleted);
    
    if (willBeCompleted) {
      import('../lib/ParticleConfetti').then(({ fireParticleConfetti }) => {
        fireParticleConfetti(e.clientX, e.clientY, categoryColor);
      });
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`glass-panel glass-panel-hover rounded-xl p-3.5 flex flex-col gap-2.5 transition-smooth border-l-3 relative cursor-pointer group ${
        task.completado ? 'opacity-50' : 'opacity-100'
      }`}
      style={{ 
        borderLeftColor: categoryColor,
        '--card-glow': `${categoryColor}1f`
      } as React.CSSProperties}
    >
      <div className="flex items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {!isEditing && (
            <GripVertical className="w-3.5 h-3.5 text-luxury-secondary opacity-25 group-hover:opacity-75 flex-shrink-0 cursor-grab active:cursor-grabbing transition-smooth" />
          )}

          {/* Checkbox reactivo */}
          <button
            onClick={handleToggleClick}
            className="flex-shrink-0 text-luxury-secondary hover:text-luxury-primary transition-smooth focus:outline-none cursor-pointer"
          >
            {task.completado ? (
              <CheckCircle className="w-5 h-5 text-emerald-500 animate-check-pop fill-emerald-500/10" />
            ) : (
              <Circle className="w-5 h-5 hover:scale-105 transition-smooth" />
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
                  className="bg-transparent text-sm md:text-base font-bold text-luxury-primary focus:outline-none border-b border-indigo-500/20 w-full py-0.5"
                />
                <input
                  type="text"
                  value={editNota}
                  onChange={(e) => setEditNota(e.target.value)}
                  placeholder="Descripción (Ctrl+Enter para guardar)"
                  className="bg-transparent text-xs text-luxury-secondary focus:outline-none border-b border-indigo-500/5 w-full py-0.5 placeholder:text-slate-500 font-normal"
                />
              </div>
            ) : (
              <div className="flex items-baseline gap-2 min-w-0 relative">
                <span
                  className={`text-sm md:text-base font-semibold truncate transition-smooth select-text ${
                    task.completado ? 'line-through text-luxury-muted' : 'text-luxury-primary hover:text-indigo-500'
                  }`}
                >
                  {task.titulo}
                </span>

                {task.nota && (
                  <AlignLeft className="w-3.5 h-3.5 text-luxury-secondary flex-shrink-0 ml-1.5 opacity-65 self-center" />
                )}

                {/* Quickview Popover al hacer Hover (Puro CSS Group Hover con animación suave) */}
                {task.nota && (
                  <div className="absolute left-6 bottom-full mb-2.5 z-40 w-72 p-3.5 rounded-xl bg-slate-950/95 border border-white/10 backdrop-blur-md shadow-2xl opacity-0 scale-95 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 transition-all duration-200">
                    <div className="flex items-center gap-1.5 mb-1.5 border-b border-white/5 pb-1">
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        Vista rápida de descripción
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed font-normal whitespace-pre-wrap">
                      {task.nota}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Fila de detalles inferior */}
            {!isEditing && (
              <div className="flex items-center gap-2.5 flex-wrap mt-0.5">
                {categoryName && (
                  <span
                    className="text-[9px] font-semibold px-2 py-0.5 rounded-full border"
                    style={{
                      borderColor: `${categoryColor}25`,
                      color: categoryColor,
                      backgroundColor: `${categoryColor}08`,
                    }}
                  >
                    {categoryName}
                  </span>
                )}

                <button
                  onClick={() => setShowCalendarModal(true)}
                  className={`flex items-center gap-1 text-[10px] hover:text-luxury-primary transition-smooth bg-indigo-500/5 hover:bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/10 cursor-pointer ${
                    isOverdue ? 'text-rose-500 border-rose-500/20 font-semibold' : 'text-luxury-secondary'
                  }`}
                  title="Cambiar fecha límite"
                >
                  <Calendar className="w-3 h-3 flex-shrink-0" />
                  <span>
                    {task.fecha_limite
                      ? task.fecha_limite === todayStr
                        ? 'Hoy'
                        : task.fecha_limite === getLocalDateString(1)
                        ? 'Mañana'
                        : formatSpanishDate(task.fecha_limite)
                      : 'Añadir fecha'}
                  </span>
                </button>
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
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 text-luxury-secondary hover:text-indigo-500 hover:bg-indigo-500/5 rounded-lg transition-smooth cursor-pointer"
              title="Editar título inline"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (confirm('¿Eliminar esta tarea?')) {
                  onDelete(task.id);
                }
              }}
              className="p-1.5 text-luxury-secondary hover:text-rose-500 hover:bg-rose-500/5 rounded-lg transition-smooth cursor-pointer"
              title="Eliminar tarea"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

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
