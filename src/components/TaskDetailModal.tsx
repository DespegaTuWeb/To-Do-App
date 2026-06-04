'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Edit3, Trash2, Tag, FileText, Check, Undo } from 'lucide-react';
import { Pendiente, Categoria } from '../lib/supabase';
import { formatSpanishDate } from '../lib/utils';
import CalendarModal from './CalendarModal';
import ConfirmModal from './ConfirmModal';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Pendiente;
  categories: Categoria[];
  onUpdate: (id: string, updates: Partial<Pendiente>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function TaskDetailModal({
  isOpen,
  onClose,
  task,
  categories,
  onUpdate,
  onDelete,
}: TaskDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.titulo);
  const [editNota, setEditNota] = useState(task.nota || '');
  const [editCatId, setEditCatId] = useState<string | null>(task.categoria_id);
  const [showCalendar, setShowCalendar] = useState(false);

  const [editGrupoNombre, setEditGrupoNombre] = useState(task.grupo_nombre || '');
  const [editGrupoColor, setEditGrupoColor] = useState(task.grupo_color || '#8b5cf6');

  // Sincronizar estados locales si la tarea cambia externamente
  useEffect(() => {
    setEditTitle(task.titulo);
    setEditNota(task.nota || '');
    setEditCatId(task.categoria_id);
    setEditGrupoNombre(task.grupo_nombre || '');
    setEditGrupoColor(task.grupo_color || '#8b5cf6');
  }, [task]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Bloquear el scroll de fondo
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

  const currentCategory = categories.find((c) => c.id === (isEditing ? editCatId : task.categoria_id));
  const categoryColor = currentCategory?.color || '#94a3b8';
  const categoryName = currentCategory?.nombre || 'Sin Categoría';

  const handleSave = async () => {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) return;

    await onUpdate(task.id, {
      titulo: trimmedTitle,
      nota: editNota.trim() || null,
      categoria_id: editCatId,
      grupo_nombre: editGrupoNombre.trim() || null,
      grupo_color: editGrupoNombre.trim() ? editGrupoColor : null,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(task.titulo);
    setEditNota(task.nota || '');
    setEditCatId(task.categoria_id);
    setEditGrupoNombre(task.grupo_nombre || '');
    setEditGrupoColor(task.grupo_color || '#8b5cf6');
    setIsEditing(false);
  };

  const handleDeleteClick = () => {
    onDelete(task.id);
    onClose();
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md transition-opacity duration-300 animate-fade-in p-4"
      onClick={onClose}
    >
      <div 
        className="glass-panel border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-check-pop flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        style={{ borderTop: `4px solid ${categoryColor}` }}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.01]">
          <div className="flex items-center gap-2 flex-wrap">
            <span 
              className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border tracking-wider"
              style={{ 
                borderColor: `${categoryColor}30`, 
                color: categoryColor,
                backgroundColor: `${categoryColor}08`
              }}
            >
              {categoryName}
            </span>
            {task.grupo_nombre && (
              <span 
                className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border tracking-wider"
                style={{ 
                  borderColor: `${task.grupo_color || '#8b5cf6'}30`, 
                  color: task.grupo_color || '#8b5cf6',
                  backgroundColor: `${task.grupo_color || '#8b5cf6'}08`,
                  boxShadow: `0 0 8px ${task.grupo_color || '#8b5cf6'}20`
                }}
              >
                Grupo: {task.grupo_nombre}
              </span>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-full transition-smooth text-luxury-secondary hover:text-luxury-primary cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
          {isEditing ? (
            /* Modo Edición */
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-luxury-secondary uppercase">Título de la tarea</label>
                <input 
                  type="text" 
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm font-bold text-luxury-primary focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-luxury-secondary uppercase">Descripción detallada</label>
                <textarea 
                  rows={4}
                  value={editNota}
                  onChange={(e) => setEditNota(e.target.value)}
                  placeholder="Escribe detalles adicionales..."
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs text-luxury-primary focus:ring-1 focus:ring-indigo-500/20 placeholder:text-slate-500 font-normal leading-relaxed resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-luxury-secondary uppercase">Categoría</label>
                  <select 
                    value={editCatId || ''} 
                    onChange={(e) => setEditCatId(e.target.value || null)}
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs text-luxury-primary focus:ring-1 focus:ring-indigo-500/20 cursor-pointer bg-slate-900/90"
                  >
                    <option value="">Inbox (Sin Categoría)</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-luxury-secondary uppercase">Fecha Límite</label>
                  <button 
                    type="button"
                    onClick={() => setShowCalendar(true)}
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs text-luxury-primary text-left flex items-center justify-between cursor-pointer hover:bg-white/5"
                  >
                    <span className="truncate">
                      {task.fecha_limite ? formatSpanishDate(task.fecha_limite) : 'Sin fecha'}
                    </span>
                    <Calendar className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-1">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-luxury-secondary uppercase">Grupo / Subcategoría</label>
                  <input 
                    type="text" 
                    placeholder="General, Compras, etc."
                    value={editGrupoNombre}
                    onChange={(e) => setEditGrupoNombre(e.target.value)}
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs text-luxury-primary focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-luxury-secondary uppercase">Color del Grupo</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={editGrupoColor}
                      onChange={(e) => setEditGrupoColor(e.target.value)}
                      className="w-10 h-10 rounded-xl border border-white/10 cursor-pointer bg-transparent p-1"
                    />
                    <span className="text-xs text-luxury-secondary font-mono">{editGrupoColor.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Modo Vista */
            <div className="flex flex-col gap-4">
              <h2 
                className="text-lg md:text-xl font-extrabold text-luxury-primary leading-tight cursor-pointer hover:text-indigo-500 transition-smooth"
                onClick={() => setIsEditing(true)}
              >
                {task.titulo}
              </h2>

              <div className="flex flex-col gap-1.5 border-t border-white/5 pt-4">
                <div className="flex items-center gap-1.5 text-luxury-secondary text-[10px] font-bold uppercase tracking-wider">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Descripción</span>
                </div>
                {task.nota ? (
                  <p className="text-xs md:text-sm text-luxury-secondary leading-relaxed bg-white/[0.01] border border-white/5 p-4 rounded-xl whitespace-pre-wrap font-normal">
                    {task.nota}
                  </p>
                ) : (
                  <p 
                    className="text-xs text-luxury-muted italic hover:text-indigo-500 cursor-pointer p-4 border border-dashed border-white/10 rounded-xl"
                    onClick={() => setIsEditing(true)}
                  >
                    Haz clic para agregar una descripción...
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4 mt-2 border-t border-white/5 pt-4 flex-wrap">
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <span className="font-bold text-luxury-secondary">Fecha límite:</span>
                  <button 
                    onClick={() => setShowCalendar(true)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 font-bold border border-indigo-500/10 cursor-pointer transition-smooth text-[11px]"
                  >
                    {task.fecha_limite ? formatSpanishDate(task.fecha_limite) : 'Asignar fecha'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 bg-white/[0.01] flex items-center justify-between gap-3">
          {isEditing ? (
            <>
              <button 
                onClick={handleCancel}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-luxury-secondary hover:text-luxury-primary rounded-xl transition-smooth hover:bg-white/5 cursor-pointer"
              >
                <Undo className="w-3.5 h-3.5" />
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-smooth cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Guardar Cambios
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={handleDeleteClick}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500/5 rounded-xl transition-smooth cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar Tarea
              </button>
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-smooth cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Editar Tarea
              </button>
            </>
          )}
        </div>
      </div>

      {/* Calendario Modal Interno */}
      <CalendarModal 
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
        onSelectDate={async (dateStr) => {
          if (isEditing) {
            // Guardar localmente en el modo edición
            await onUpdate(task.id, { fecha_limite: dateStr });
          } else {
            // Actualizar directamente en base de datos si no edita
            await onUpdate(task.id, { fecha_limite: dateStr });
          }
        }}
        currentValue={task.fecha_limite}
      />
    </div>,
    document.body
  );
}
