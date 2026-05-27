'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Calendar, Edit3, CheckCircle, Circle } from 'lucide-react';
import { Pendiente } from '../lib/supabase';
import { formatSpanishDate, getLocalDateString } from '../lib/utils';

interface TaskItemProps {
  task: Pendiente;
  categoryColor?: string;
  categoryName?: string;
  onToggle: (id: string, completado: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Pendiente>) => Promise<void>;
}

export default function TaskItem({
  task,
  categoryColor = '#3b82f6',
  categoryName,
  onToggle,
  onDelete,
  onUpdate,
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.titulo);
  const [isHovered, setIsHovered] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  const todayStr = getLocalDateString(0);
  const isOverdue = task.fecha_limite && task.fecha_limite < todayStr && !task.completado;

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  const handleRenameSubmit = async () => {
    if (!editTitle.trim() || editTitle.trim() === task.titulo) {
      setIsEditing(false);
      return;
    }
    await onUpdate(task.id, { titulo: editTitle.trim() });
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRenameSubmit();
    if (e.key === 'Escape') {
      setEditTitle(task.titulo);
      setIsEditing(false);
    }
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`glass-panel glass-panel-hover rounded-xl p-3.5 flex items-center justify-between gap-3 transition-smooth border-l-3 ${
        task.completado ? 'opacity-55' : 'opacity-100'
      }`}
      style={{ borderLeftColor: categoryColor }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Checkbox reactivo */}
        <button
          onClick={() => onToggle(task.id, !task.completado)}
          className="flex-shrink-0 text-slate-400 hover:text-white transition-smooth focus:outline-none cursor-pointer"
        >
          {task.completado ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 animate-check-pop fill-emerald-400/10" />
          ) : (
            <Circle className="w-5 h-5 hover:scale-105 transition-smooth" />
          )}
        </button>

        {/* Título y Detalles */}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          {isEditing ? (
            <input
              ref={editInputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleRenameSubmit}
              className="bg-transparent text-sm md:text-base text-white focus:outline-none border-b border-white/20 w-full"
            />
          ) : (
            <div className="flex items-baseline gap-2 min-w-0">
              <span
                onClick={() => setIsEditing(true)}
                className={`text-sm md:text-base font-medium truncate cursor-pointer transition-smooth select-text ${
                  task.completado ? 'line-through text-slate-500' : 'text-slate-100 hover:text-white'
                }`}
              >
                {task.titulo}
              </span>
            </div>
          )}

          {/* Fila de detalles inferior */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Tag de Categoría en modo timeline */}
            {categoryName && (
              <span 
                className="text-[9px] font-semibold px-2 py-0.5 rounded-full border"
                style={{ 
                  borderColor: `${categoryColor}20`, 
                  color: categoryColor,
                  backgroundColor: `${categoryColor}08`
                }}
              >
                {categoryName}
              </span>
            )}

            {/* Indicador de Fecha límite */}
            {task.fecha_limite && (
              <div
                className={`flex items-center gap-1 text-[10px] ${
                  isOverdue ? 'text-red-400 font-semibold' : 'text-slate-400'
                }`}
              >
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span>
                  {task.fecha_limite === todayStr 
                    ? 'Hoy' 
                    : task.fecha_limite === getLocalDateString(1) 
                    ? 'Mañana' 
                    : formatSpanishDate(task.fecha_limite)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Botones de acción rápidos a la derecha */}
      <div className={`flex items-center gap-1.5 transition-opacity duration-200 ${
        isHovered ? 'opacity-100' : 'opacity-0 md:opacity-0 max-md:opacity-100'
      }`}>
        <button
          onClick={() => setIsEditing(true)}
          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-white/5 rounded-lg transition-smooth cursor-pointer"
          title="Editar título"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            if (confirm('¿Eliminar esta tarea?')) {
              onDelete(task.id);
            }
          }}
          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-smooth cursor-pointer"
          title="Eliminar tarea"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
