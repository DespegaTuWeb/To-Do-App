'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Calendar, Search, CheckCircle, Circle } from 'lucide-react';
import CalendarModal from './CalendarModal';
import { Pendiente, Categoria } from '../lib/supabase';

interface QuickInputProps {
  onSubmitTask: (
    titulo: string, 
    fechaLimite: string | null, 
    grupoNombre?: string | null, 
    grupoColor?: string | null
  ) => Promise<void>;
  activeCategoryName: string;
  tasks?: Pendiente[];
  categories?: Categoria[];
  onToggleTask?: (id: string, completado: boolean) => Promise<void>;
  onOpenDetail?: (task: Pendiente) => void;
  activeGroupName?: string | null;
  activeGroupColor?: string | null;
}

export default function QuickInput({ 
  onSubmitTask, 
  activeCategoryName,
  tasks = [],
  categories = [],
  onToggleTask,
  onOpenDetail,
  activeGroupName,
  activeGroupColor
}: QuickInputProps) {
  const [titulo, setTitulo] = useState('');
  const [fechaLimite, setFechaLimite] = useState<string>('');
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Listener para atajo global Ctrl + K / ⌘K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearchDropdown(prev => !prev);
      }
      if (e.key === 'Escape') {
        setShowSearchDropdown(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Autofoco al abrir el buscador
  useEffect(() => {
    if (showSearchDropdown) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 60);
    } else {
      setSearchVal('');
    }
  }, [showSearchDropdown]);

  // Cerrar al hacer clic fuera del dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // Evitar cerrar si hacemos clic en el botón de búsqueda
        const target = event.target as HTMLElement;
        if (target.closest('.search-toggle-btn')) return;
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    const selectedDate = fechaLimite || null;
    await onSubmitTask(titulo.trim(), selectedDate, activeGroupName, activeGroupColor);
    
    setTitulo('');
    setFechaLimite('');
  };

  const getCategoryDetails = (catId: string | null) => {
    const cat = categories.find((c) => c.id === catId);
    return {
      color: cat?.color || '#64748b',
      nombre: cat?.nombre || 'Inbox',
    };
  };

  // Filtrado en tiempo real
  const query = searchVal.toLowerCase().trim();
  const searchResults = query
    ? tasks.filter(t => 
        t.titulo.toLowerCase().includes(query) ||
        (t.nota && t.nota.toLowerCase().includes(query)) ||
        (t.grupo_nombre && t.grupo_nombre.toLowerCase().includes(query))
      )
    : tasks.slice(0, 5); // Mostrar últimas 5 tareas si está en blanco

  return (
    <div className="relative w-full flex flex-col gap-2">
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2">
        <div className="relative flex items-center w-full">
           <input
            ref={inputRef}
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder={`Añadir tarea en "${activeCategoryName}"...`}
            className="w-full glass-input px-4 py-2.5 pr-36 text-xs md:text-sm rounded-xl text-luxury-primary placeholder:text-slate-500 font-normal focus:ring-1 focus:ring-indigo-500/20"
          />

          {/* Panel lateral derecho del input: fecha, buscar y añadir */}
          <div className="absolute right-3 flex items-center gap-2">
            {/* Lupa para Buscar */}
            <button
              type="button"
              onClick={() => setShowSearchDropdown(!showSearchDropdown)}
              className={`search-toggle-btn p-1.5 rounded-lg transition-smooth cursor-pointer ${
                showSearchDropdown 
                  ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-400' 
                  : 'hover:bg-indigo-500/10 text-luxury-secondary hover:text-luxury-primary'
              }`}
              title="Buscar pendientes en todo el sistema (Ctrl+K)"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Selector de fecha */}
            <div className="relative flex items-center">
              <button
                type="button"
                onClick={() => setShowCalendarModal(true)}
                className={`p-1.5 rounded-lg transition-smooth cursor-pointer ${
                  fechaLimite 
                    ? 'bg-blue-500/20 border border-blue-500/40 text-blue-400' 
                    : 'hover:bg-indigo-500/10 text-luxury-secondary hover:text-luxury-primary'
                }`}
                title="Añadir fecha límite"
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>

            {/* Botón de envío */}
            <button
              type="submit"
              className="flex items-center justify-center p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:scale-95 transition-smooth cursor-pointer"
              title="Guardar Tarea"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>
        
        {/* Indicador de fecha activa */}
        {fechaLimite && (
          <div className="flex items-center gap-1.5 self-start px-2.5 py-1 bg-[var(--c-surface)] rounded-full border border-[var(--c-border)] animate-check-pop">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[10px] text-luxury-secondary">Fecha límite: {fechaLimite}</span>
            <button
              type="button"
              onClick={() => setFechaLimite('')}
              className="text-[10px] text-luxury-muted hover:text-red-500 font-semibold ml-1 cursor-pointer"
            >
              quitar
            </button>
          </div>
        )}

        {/* Modal de Calendario */}
        <CalendarModal
          isOpen={showCalendarModal}
          onClose={() => setShowCalendarModal(false)}
          onSelectDate={(dateStr) => setFechaLimite(dateStr || '')}
          currentValue={fechaLimite || null}
        />
      </form>

      {/* Floating Search Dropdown */}
      {showSearchDropdown && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 z-50 p-4 rounded-xl bg-[var(--c-page-bg)]/98 border border-[var(--c-border)] backdrop-blur-xl shadow-2xl flex flex-col gap-3 max-h-[350px] animate-fade-in"
        >
          <div className="relative w-full flex items-center">
            <input
              ref={searchInputRef}
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Buscar en tareas, descripciones o subcategorías..."
              className="w-full glass-input px-3.5 py-2.5 rounded-lg text-xs md:text-sm text-luxury-primary placeholder:text-luxury-muted focus:outline-none"
            />
            {searchVal && (
              <button 
                onClick={() => setSearchVal('')}
                className="absolute right-3.5 text-[10px] text-luxury-muted hover:text-luxury-primary font-bold"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1 overflow-y-auto divide-y divide-[var(--c-divider)] pr-1">
            {searchResults.length > 0 ? (
              searchResults.map((task) => {
                const { color, nombre } = getCategoryDetails(task.categoria_id);
                return (
                  <div 
                    key={task.id}
                    onClick={() => {
                      if (onOpenDetail) onOpenDetail(task);
                      setShowSearchDropdown(false);
                    }}
                    className="flex items-center justify-between gap-3 py-2.5 px-2 hover:bg-[var(--c-surface-hover)] rounded-lg transition-smooth cursor-pointer group/item text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (onToggleTask) {
                            await onToggleTask(task.id, !task.completado);
                          }
                        }}
                        className="flex-shrink-0 text-luxury-muted hover:text-luxury-primary transition-smooth focus:outline-none"
                      >
                        {task.completado ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500 animate-check-pop fill-emerald-500/10" />
                        ) : (
                          <Circle className="w-4 h-4 hover:scale-105 transition-smooth" />
                        )}
                      </button>
                      <div className="flex flex-col min-w-0">
                        <span className={`text-xs md:text-sm font-semibold truncate transition-smooth ${
                          task.completado ? 'line-through text-luxury-muted' : 'text-luxury-primary group-hover/item:text-indigo-400'
                        }`}>
                          {task.titulo}
                        </span>
                        {task.grupo_nombre && (
                          <span className="text-[9px] text-luxury-muted font-medium tracking-wide">
                            Subcategoría: {task.grupo_nombre}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <span 
                      className="text-[9px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 transition-smooth"
                      style={{
                        borderColor: `${color}35`,
                        color: color,
                        backgroundColor: `${color}0c`,
                      }}
                    >
                      {nombre}
                    </span>
                  </div>
                );
              })
            ) : (
              <span className="text-[10px] text-luxury-muted italic py-4 text-center">
                No se encontraron coincidencias.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
