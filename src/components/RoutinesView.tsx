'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Edit3, Check, Calendar, Settings, Info, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Rutina, ItemRutina, Categoria } from '../lib/supabase';

interface RoutinesViewProps {
  routines: Rutina[];
  categories: Categoria[];
  onCreateRoutine: (nombre: string, descripcion: string | null, color: string, diasSemana: number[], items: string[], categoriaId: string | null) => Promise<void>;
  onToggleRoutineItem: (itemId: string, completado: boolean) => Promise<void>;
  onDeleteRoutine: (routineId: string) => Promise<void>;
  onUpdateRoutine: (routineId: string, updates: Partial<Rutina>, itemsToCreate?: string[], itemIdsToDelete?: string[]) => Promise<void>;
}

const PRESET_COLORS = [
  '#8b5cf6', // Violeta
  '#3b82f6', // Azul Cobalto
  '#10b981', // Esmeralda
  '#ec4899', // Rosa
  '#f59e0b', // Ámbar
  '#06b6d4', // Cian
  '#f97316', // Naranja
];

const DAYS_MAP = [
  { label: 'L', value: 1 },
  { label: 'M', value: 2 },
  { label: 'M', value: 3 },
  { label: 'J', value: 4 },
  { label: 'V', value: 5 },
  { label: 'S', value: 6 },
  { label: 'D', value: 0 },
];

export default function RoutinesView({
  routines,
  categories,
  onCreateRoutine,
  onToggleRoutineItem,
  onDeleteRoutine,
  onUpdateRoutine,
}: RoutinesViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Rutina | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  // Form states
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [color, setColor] = useState('#8b5cf6');
  const [diasSemana, setDiasSemana] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]); // Por defecto diario
  const [categoriaId, setCategoriaId] = useState<string>('');
  
  // Subtasks/Items creation states
  const [newItemText, setNewItemText] = useState('');
  const [tempItems, setTempItems] = useState<string[]>([]);
  const [existingItems, setExistingItems] = useState<ItemRutina[]>([]);
  const [itemIdsToDelete, setItemIdsToDelete] = useState<string[]>([]);

  // Get current day of week (0=Dom, 1=Lun, etc.)
  const todayValue = new Date().getDay();

  const handleOpenCreate = () => {
    setEditingRoutine(null);
    setNombre('');
    setDescripcion('');
    setColor('#8b5cf6');
    setDiasSemana([1, 2, 3, 4, 5, 6, 0]);
    setCategoriaId('');
    setNewItemText('');
    setTempItems([]);
    setExistingItems([]);
    setItemIdsToDelete([]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (routine: Rutina) => {
    setEditingRoutine(routine);
    setNombre(routine.nombre);
    setDescripcion(routine.descripcion || '');
    setColor(routine.color || '#8b5cf6');
    setDiasSemana(routine.dias_semana || []);
    setCategoriaId(routine.categoria_id || '');
    setNewItemText('');
    setTempItems([]);
    setExistingItems(routine.items || []);
    setItemIdsToDelete([]);
    setIsModalOpen(true);
  };

  const handleToggleDay = (value: number) => {
    setDiasSemana(prev => 
      prev.includes(value) ? prev.filter(d => d !== value) : [...prev, value]
    );
  };

  const handleApplyPreset = (preset: 'diario' | 'lv' | 'interdiario') => {
    if (preset === 'diario') {
      setDiasSemana([1, 2, 3, 4, 5, 6, 0]);
    } else if (preset === 'lv') {
      setDiasSemana([1, 2, 3, 4, 5]);
    } else if (preset === 'interdiario') {
      setDiasSemana([1, 3, 5]); // Lun, Mie, Vie
    }
  };

  const handleAddTempItem = () => {
    if (!newItemText.trim()) return;
    setTempItems(prev => [...prev, newItemText.trim()]);
    setNewItemText('');
  };

  const handleRemoveTempItem = (index: number) => {
    setTempItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleRemoveExistingItem = (id: string) => {
    setExistingItems(prev => prev.filter(item => item.id !== id));
    setItemIdsToDelete(prev => [...prev, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    try {
      const selectedCatId = categoriaId === '' ? null : categoriaId;

      if (editingRoutine) {
        // Mode edit
        const updates = {
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          color,
          dias_semana: diasSemana,
          categoria_id: selectedCatId,
        };
        await onUpdateRoutine(editingRoutine.id, updates, tempItems, itemIdsToDelete);
      } else {
        // Mode create
        await onCreateRoutine(
          nombre.trim(),
          descripcion.trim() || null,
          color,
          diasSemana,
          tempItems,
          selectedCatId
        );
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving routine:', err);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-check-pop">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between border-b border-[var(--c-border)] pb-4">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-[var(--c-text-primary)] flex items-center gap-2">
            🔄 Mis Rutinas Diarias
          </h1>
          <p className="text-xs text-[var(--c-text-muted)] mt-1">
            Gestiona tus hábitos cíclicos y tareas recurrentes.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-smooth shadow-lg shadow-indigo-500/25 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Rutina</span>
        </button>
      </div>

      {/* ROUTINES LIST */}
      {routines.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {routines.map(routine => {
            const isActiveToday = routine.dias_semana.includes(todayValue);
            const items = routine.items || [];

            return (
              <div
                key={routine.id}
                className={`glass-panel rounded-2xl p-4 flex flex-col gap-3 transition-all duration-300 ${
                  isActiveToday
                    ? 'glass-panel-hover border-[var(--c-border-hover)] shadow-lg shadow-indigo-600/5'
                    : 'opacity-60 bg-black/5 dark:bg-black/20 border-[var(--c-border)]'
                }`}
              >
                {/* Routine Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2.5 h-2.5 rounded-full" 
                        style={{ 
                          backgroundColor: routine.color || '#8b5cf6',
                          boxShadow: `0 0 8px ${routine.color || '#8b5cf6'}`
                        }} 
                      />
                      <h3 className="text-sm font-bold text-[var(--c-text-primary)]">{routine.nombre}</h3>
                    </div>
                    {routine.descripcion && (
                      <p className="text-[11px] text-[var(--c-text-muted)] leading-relaxed pl-4 font-normal">
                        {routine.descripcion}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleOpenEdit(routine)}
                      className="p-1.5 text-[var(--c-text-muted)] hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-smooth cursor-pointer"
                      title="Editar rutina"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`¿Estás seguro de eliminar la rutina "${routine.nombre}"?`)) {
                          await onDeleteRoutine(routine.id);
                        }
                      }}
                      className="p-1.5 text-[var(--c-text-muted)] hover:text-red-500 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-smooth cursor-pointer"
                      title="Eliminar rutina"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex items-center justify-between border-t border-b border-[var(--c-border)] py-2 pl-4">
                  {/* Frequency Visualizer */}
                  <div className="flex items-center gap-1">
                    {DAYS_MAP.map(d => {
                      const isConfigured = routine.dias_semana.includes(d.value);
                      const isToday = d.value === todayValue;
                      return (
                        <span
                          key={d.label}
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                            isConfigured
                              ? isToday
                                ? 'bg-indigo-600 text-white font-extrabold scale-110'
                                : 'bg-[var(--c-border)] text-[var(--c-text-secondary)]'
                              : 'text-[var(--c-text-muted)]/50'
                          }`}
                          title={isToday ? 'Hoy' : undefined}
                        >
                          {d.label}
                        </span>
                      );
                    })}
                  </div>

                  {/* Active Today Badge */}
                  {isActiveToday ? (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20 font-bold uppercase px-2 py-0.5 rounded-md tracking-wider">
                      Activa Hoy
                    </span>
                  ) : (
                    <span className="text-[10px] bg-[var(--c-border)] text-[var(--c-text-secondary)] border border-[var(--c-border)] font-bold uppercase px-2 py-0.5 rounded-md tracking-wider">
                      Descanso
                    </span>
                  )}
                </div>

                {/* Checklist (Subtasks) */}
                <div className="flex flex-col gap-1.5 pl-4 mt-1">
                  {items.length > 0 ? (
                    items.map(item => (
                      <button
                        key={item.id}
                        onClick={async () => {
                          if (isActiveToday) {
                            await onToggleRoutineItem(item.id, !item.completado);
                          }
                        }}
                        disabled={!isActiveToday}
                        className={`flex items-center gap-3 w-full text-left px-2.5 py-2 rounded-xl transition-all cursor-pointer ${
                          !isActiveToday 
                            ? 'cursor-not-allowed opacity-55' 
                            : 'hover:bg-black/5 dark:hover:bg-white/[0.02]'
                        }`}
                      >
                        {/* Checkbox Box */}
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 transition-smooth ${
                            item.completado
                              ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/10'
                              : 'border-[var(--c-border)] dark:border-white/20'
                          }`}
                        >
                          {item.completado && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>

                        {/* Title text */}
                        <span
                          className={`text-xs font-medium ${
                            item.completado
                              ? 'text-[var(--c-text-muted)]/80 line-through'
                              : 'text-[var(--c-text-primary)]'
                          }`}
                        >
                          {item.titulo}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="text-[10px] text-[var(--c-text-muted)] italic py-2">
                      Sin subtareas. Edita la rutina para agregar pasos.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty beautiful state */
        <div className="flex flex-col items-center justify-center py-20 px-4 glass-panel rounded-2xl border-dashed border-[var(--c-border)] text-center">
          <div className="w-12 h-12 bg-indigo-500/5 border border-indigo-500/10 rounded-full flex items-center justify-center mb-4 text-[var(--c-text-muted)]">
            <Info className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--c-text-secondary)]">No hay rutinas creadas</h3>
          <p className="text-xs text-[var(--c-text-muted)] mt-1 max-w-[300px] leading-relaxed">
            Las rutinas te permiten tener un checklist de acciones repetitivas que se limpian cada día de forma automática.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600/20 hover:bg-indigo-600/35 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 transition-smooth cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear mi primera rutina</span>
          </button>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal Container */}
          <div 
            className="relative w-full max-w-lg glass-panel border-[var(--c-border)] rounded-2xl shadow-2xl p-5 md:p-6 flex flex-col gap-4 text-[var(--c-text-primary)] overflow-y-auto max-h-[90vh] animate-check-pop"
            style={{ backgroundColor: 'var(--c-page-bg)' }}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-[var(--c-text-muted)] hover:text-[var(--c-text-primary)] rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-smooth cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-[var(--c-text-primary)] flex items-center gap-2">
              {editingRoutine ? '📝 Editar Rutina' : '🔄 Nueva Rutina'}
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Nombre */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[var(--c-text-muted)] uppercase tracking-wider">Nombre</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Medicación Rex, Rutina Mañana, Gym..."
                  className="px-3.5 py-2.5 rounded-xl border border-[var(--c-input-border)] bg-[var(--c-input-bg)] text-xs text-[var(--c-text-primary)] placeholder-[var(--c-text-muted)]/50 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 transition-smooth"
                />
              </div>

              {/* Descripción */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[var(--c-text-muted)] uppercase tracking-wider">Descripción (Opcional)</label>
                <textarea
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  placeholder="Explica brevemente de qué trata esta rutina..."
                  rows={2}
                  className="px-3.5 py-2.5 rounded-xl border border-[var(--c-input-border)] bg-[var(--c-input-bg)] text-xs text-[var(--c-text-primary)] placeholder-[var(--c-text-muted)]/50 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 transition-smooth resize-none"
                />
              </div>

              {/* Categoría asociada */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[var(--c-text-muted)] uppercase tracking-wider">Pestaña / Categoría Asociada (Opcional)</label>
                <select
                  value={categoriaId}
                  onChange={e => setCategoriaId(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-[var(--c-input-border)] bg-[var(--c-input-bg)] text-xs text-[var(--c-text-primary)] focus:outline-none focus:border-indigo-500/60 transition-smooth cursor-pointer"
                >
                  <option value="" className="bg-[var(--c-page-bg)] text-[var(--c-text-primary)]">Ninguna (Global)</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id} className="bg-[var(--c-page-bg)] text-[var(--c-text-primary)]">{c.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Color */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[var(--c-text-muted)] uppercase tracking-wider">Color de Tarjeta</label>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full transition-all duration-200 cursor-pointer ${
                        color === c ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-[var(--c-page-bg)] scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Frecuencia (Filtro de Días) */}
              <div className="flex flex-col gap-2 border-t border-[var(--c-border)] pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[var(--c-text-muted)] uppercase tracking-wider">Frecuencia (Días Activos)</label>
                  
                  {/* Preajustes rápidos */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('diario')}
                      className="px-2 py-1 bg-[var(--c-border)] hover:bg-[var(--c-border-hover)] text-[var(--c-text-secondary)] rounded text-[9px] font-bold cursor-pointer transition-smooth"
                    >
                      Diario
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('lv')}
                      className="px-2 py-1 bg-[var(--c-border)] hover:bg-[var(--c-border-hover)] text-[var(--c-text-secondary)] rounded text-[9px] font-bold cursor-pointer transition-smooth"
                    >
                      L - V
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('interdiario')}
                      className="px-2 py-1 bg-[var(--c-border)] hover:bg-[var(--c-border-hover)] text-[var(--c-text-secondary)] rounded text-[9px] font-bold cursor-pointer transition-smooth"
                    >
                      Interdiario
                    </button>
                  </div>
                </div>

                {/* Day selector buttons */}
                <div className="flex justify-between items-center gap-1.5 bg-[var(--c-input-bg)] p-2 rounded-xl border border-[var(--c-border)]">
                  {DAYS_MAP.map(d => {
                    const isSelected = diasSemana.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => handleToggleDay(d.value)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                            : 'text-[var(--c-text-secondary)] hover:bg-[var(--c-border)] hover:text-[var(--c-text-primary)]'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subtareas (Items) */}
              <div className="flex flex-col gap-2 border-t border-[var(--c-border)] pt-3">
                <label className="text-[11px] font-bold text-[var(--c-text-muted)] uppercase tracking-wider">Subtareas / Pasos de la Rutina</label>
                
                {/* Items ya existentes (en modo edición) */}
                {existingItems.length > 0 && (
                  <div className="flex flex-col gap-1.5 mb-2 pl-1 max-h-36 overflow-y-auto">
                    {existingItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-[var(--c-surface)] px-2.5 py-1.5 rounded-lg border border-[var(--c-border)] text-xs text-[var(--c-text-secondary)]">
                        <span>{item.titulo}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingItem(item.id)}
                          className="text-[var(--c-text-muted)] hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Items temporales en creación */}
                {tempItems.length > 0 && (
                  <div className="flex flex-col gap-1.5 mb-2 pl-1 max-h-36 overflow-y-auto">
                    {tempItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-[var(--c-surface)] px-2.5 py-1.5 rounded-lg border border-[var(--c-border)] text-xs text-[var(--c-text-secondary)]">
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTempItem(idx)}
                          className="text-[var(--c-text-muted)] hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Añadir item input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItemText}
                    onChange={e => setNewItemText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTempItem();
                      }
                    }}
                    placeholder="Ej: Tomar Higacure, Desayunar..."
                    className="flex-1 px-3 py-2 rounded-xl border border-[var(--c-input-border)] bg-[var(--c-input-bg)] text-xs text-[var(--c-text-primary)] placeholder-[var(--c-text-muted)]/50 focus:outline-none focus:border-indigo-500/60 transition-smooth"
                  />
                  <button
                    type="button"
                    onClick={handleAddTempItem}
                    className="px-3.5 bg-indigo-600/10 hover:bg-indigo-600/25 border border-indigo-500/25 text-indigo-400 rounded-xl text-xs font-bold transition-smooth cursor-pointer"
                  >
                    Agregar
                  </button>
                </div>
              </div>

              {/* Botón de envío */}
              <button
                type="submit"
                disabled={!nombre.trim()}
                className="w-full mt-2 py-3 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-smooth shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {editingRoutine ? 'Guardar Cambios' : 'Crear Rutina'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
