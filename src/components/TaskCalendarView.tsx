'use client';

import React, { useState, useEffect } from 'react';
import { 
  CalendarRange, ChevronLeft, ChevronRight, Sparkles, 
  Layers, Circle, Check, Plus, X, Calendar, Focus 
} from 'lucide-react';
import { Pendiente, Categoria } from '../lib/supabase';
import TaskDetailModal from './TaskDetailModal';

interface TaskCalendarViewProps {
  tasks: Pendiente[];
  categories: Categoria[];
  onToggleTask: (id: string, completado: boolean) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onUpdateTask: (id: string, updates: Partial<Pendiente>) => Promise<void>;
  onCreateTask?: (titulo: string, fechaLimite: string | null, grupoNombre?: string | null, grupoColor?: string | null) => Promise<string>;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Helper local para formatear fechas a YYYY-MM-DD locales
const toLocalYYYYMMDD = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function TaskCalendarView({
  tasks,
  categories,
  onToggleTask,
  onDeleteTask,
  onUpdateTask,
  onCreateTask,
}: TaskCalendarViewProps) {
  // Vista activa: 'week' | 'month' | 'year'
  const [activeTab, setActiveTab] = useState<'week' | 'month' | 'year'>('month');
  
  // Fecha ancla para la navegación
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());

  // Estados para Drag & Drop
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeDropCell, setActiveDropCell] = useState<string | null>(null);

  // Detalle de tarea seleccionado
  const [selectedTask, setSelectedTask] = useState<Pendiente | null>(null);

  // Formulario rápido de creación dentro de una celda
  const [activeAddCell, setActiveAddCell] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState('');

  // Sincronizar fecha ancla con el día de hoy al iniciar
  useEffect(() => {
    setAnchorDate(new Date());
  }, []);

  const getCategoryDetails = (catId: string | null) => {
    const cat = categories.find((c) => c.id === catId);
    return {
      color: cat?.color || '#94a3b8',
      nombre: cat?.nombre || 'Inbox',
    };
  };

  // --- NAVEGACIÓN ---
  const handlePrev = () => {
    const newDate = new Date(anchorDate);
    if (activeTab === 'week') {
      newDate.setDate(anchorDate.getDate() - 7);
    } else if (activeTab === 'month') {
      newDate.setMonth(anchorDate.getMonth() - 1);
    } else if (activeTab === 'year') {
      newDate.setFullYear(anchorDate.getFullYear() - 1);
    }
    setAnchorDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(anchorDate);
    if (activeTab === 'week') {
      newDate.setDate(anchorDate.getDate() + 7);
    } else if (activeTab === 'month') {
      newDate.setMonth(anchorDate.getMonth() + 1);
    } else if (activeTab === 'year') {
      newDate.setFullYear(anchorDate.getFullYear() + 1);
    }
    setAnchorDate(newDate);
  };

  const handleToday = () => {
    setAnchorDate(new Date());
  };

  // --- CALCULO DE DÍAS PARA LAS VISTAS ---

  // Obtener lunes de la semana de una fecha dada
  const getMondayOf = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    // getDay() devuelve 0 para Domingo. Lo mapeamos a 7 para que el lunes sea 1
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  // Generar los 7 días de la semana activa
  const getWeekDays = () => {
    const monday = getMondayOf(anchorDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  };

  // Generar los días del mes en formato cuadrícula de lunes a domingo
  const getMonthDaysGrid = () => {
    const year = anchorDate.getFullYear();
    const month = anchorDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Encontrar lunes de la primera semana
    const gridStart = getMondayOf(firstDay);
    
    // Encontrar domingo de la última semana
    const lastDayDay = lastDay.getDay();
    const diffToSunday = lastDayDay === 0 ? 0 : 7 - lastDayDay;
    const gridEnd = new Date(lastDay);
    gridEnd.setDate(lastDay.getDate() + diffToSunday);
    gridEnd.setHours(23, 59, 59, 999);

    const days = [];
    let current = new Date(gridStart);
    while (current <= gridEnd) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  // --- DRAG & DROP HANDLERS ---
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    setActiveDropCell(dateStr);
  };

  const handleDragLeave = () => {
    setActiveDropCell(null);
  };

  const handleDrop = async (e: React.DragEvent, dateStr: string | null) => {
    e.preventDefault();
    setActiveDropCell(null);
    if (!draggedTaskId) return;

    // dateStr === null representa mover al backlog ("sin fecha")
    await onUpdateTask(draggedTaskId, { fecha_limite: dateStr });
    setDraggedTaskId(null);
  };

  // --- CREACIÓN RÁPIDA ---
  const handleQuickCreate = async (e: React.FormEvent, dateStr: string) => {
    e.preventDefault();
    if (!quickTitle.trim() || !onCreateTask) return;
    try {
      await onCreateTask(quickTitle.trim(), dateStr);
      setQuickTitle('');
      setActiveAddCell(null);
    } catch (err) {
      console.error('Error in quick create task:', err);
    }
  };

  // --- RENDERIZADO DE TAREAS EN DÍAS ---
  const getTasksForDate = (date: Date) => {
    const dateStr = toLocalYYYYMMDD(date);
    return tasks.filter(t => t.fecha_limite === dateStr && !t.completado);
  };

  // --- OBTENER TAREAS SIN FECHA (BACKLOG) ---
  const backlogTasks = tasks.filter(t => !t.fecha_limite && !t.completado);

  const todayStr = toLocalYYYYMMDD(new Date());

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6 animate-fade-in">
      {/* 1. CUADRO PRINCIPAL DEL CALENDARIO */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Cabecera superior con pestañas y controles de fecha */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--c-border)] pb-4">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-[var(--c-text-primary)] flex items-center gap-2">
              📅 Calendario y Planificación
            </h1>
            <p className="text-xs text-[var(--c-text-muted)] mt-1">
              {activeTab === 'week' && `Semana de ${WEEKDAY_NAMES[0]} ${toLocalYYYYMMDD(getWeekDays()[0]).split('-').reverse().join('/')}`}
              {activeTab === 'month' && `${MONTH_NAMES[anchorDate.getMonth()]} ${anchorDate.getFullYear()}`}
              {activeTab === 'year' && `Año ${anchorDate.getFullYear()}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Selector de tipo de vista */}
            <div className="flex p-0.5 bg-black/5 dark:bg-black/20 border border-[var(--c-border)] rounded-xl text-[11px] font-bold">
              {(['week', 'month', 'year'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition-smooth cursor-pointer ${
                    activeTab === tab 
                      ? 'bg-indigo-600/20 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 font-extrabold shadow-sm'
                      : 'text-[var(--c-text-muted)] hover:text-[var(--c-text-primary)] border border-transparent'
                  }`}
                >
                  {tab === 'week' ? 'Semana' : tab === 'month' ? 'Mes' : 'Año'}
                </button>
              ))}
            </div>

            {/* Controles de navegación */}
            <div className="flex items-center gap-1 bg-black/5 dark:bg-black/20 border border-[var(--c-border)] rounded-xl p-0.5">
              <button
                onClick={handlePrev}
                className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 text-[var(--c-text-muted)] hover:text-[var(--c-text-primary)] rounded-lg transition-smooth cursor-pointer"
                title="Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleToday}
                className="px-2.5 py-1 text-[10px] font-bold hover:bg-black/5 dark:hover:bg-white/5 text-[var(--c-text-muted)] hover:text-[var(--c-text-primary)] rounded-lg transition-smooth cursor-pointer border-l border-r border-[var(--c-border)]"
              >
                Hoy
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 text-[var(--c-text-muted)] hover:text-[var(--c-text-primary)] rounded-lg transition-smooth cursor-pointer"
                title="Siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* --- DETALLE VISTA: SEMANA --- */}
        {activeTab === 'week' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3 w-full">
            {getWeekDays().map((day) => {
              const dayStr = toLocalYYYYMMDD(day);
              const isToday = dayStr === todayStr;
              const dayTasks = getTasksForDate(day);
              const isOver = activeDropCell === dayStr;

              return (
                <div
                  key={dayStr}
                  onDragOver={(e) => handleDragOver(e, dayStr)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, dayStr)}
                  className={`flex flex-col gap-3 p-3 rounded-2xl glass-panel min-h-[360px] transition-smooth border border-dashed ${
                    isOver 
                      ? 'border-indigo-500/40 bg-indigo-500/[0.03] scale-[1.01]' 
                      : isToday 
                        ? 'border-indigo-500/30 bg-indigo-500/[0.01]' 
                        : 'border-[var(--c-border)]'
                  }`}
                >
                  {/* Cabecera del día */}
                  <div className={`flex items-center justify-between pb-2 border-b ${
                    isToday ? 'border-indigo-500/20 text-indigo-500' : 'border-[var(--c-border)] text-[var(--c-text-secondary)]'
                  }`}>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-extrabold tracking-wider uppercase opacity-60">
                        {WEEKDAY_NAMES[day.getDay() === 0 ? 6 : day.getDay() - 1]}
                      </span>
                      <span className="text-sm font-bold">
                        {day.getDate()} {MONTH_NAMES[day.getMonth()].slice(0, 3)}
                      </span>
                    </div>
                    {/* Botón rápido de agregar */}
                    {onCreateTask && (
                      <button
                        onClick={() => {
                          setActiveAddCell(activeAddCell === dayStr ? null : dayStr);
                          setQuickTitle('');
                        }}
                        className={`p-1 rounded-md transition-smooth hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer ${
                          activeAddCell === dayStr ? 'text-rose-400' : 'text-[var(--c-text-muted)] hover:text-[var(--c-text-primary)]'
                        }`}
                        title="Agregar tarea hoy"
                      >
                        {activeAddCell === dayStr ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  {/* Input rápido */}
                  {activeAddCell === dayStr && (
                    <form onSubmit={(e) => handleQuickCreate(e, dayStr)} className="flex gap-1 animate-fade-in">
                      <input
                        autoFocus
                        type="text"
                        required
                        value={quickTitle}
                        onChange={(e) => setQuickTitle(e.target.value)}
                        placeholder="Nueva tarea..."
                        className="flex-1 px-2 py-1 bg-[var(--c-input-bg)] border border-[var(--c-input-border)] rounded-lg text-[11px] text-[var(--c-text-primary)] focus:outline-none focus:border-indigo-500/50"
                      />
                      <button
                        type="submit"
                        className="p-1 bg-indigo-600 text-white rounded-lg text-xs cursor-pointer flex items-center justify-center"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </form>
                  )}

                  {/* Tareas de este día */}
                  <div className="flex flex-col gap-2 flex-1 overflow-y-auto max-h-[300px]">
                    {dayTasks.length > 0 ? (
                      dayTasks.map(task => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onClick={() => setSelectedTask(task)}
                          className="glass-panel glass-panel-hover p-2.5 rounded-xl border-l-2 cursor-grab active:cursor-grabbing transition-smooth flex flex-col gap-1.5"
                          style={{ borderLeftColor: getCategoryDetails(task.categoria_id).color }}
                        >
                          <div className="flex items-start gap-1.5">
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                await onToggleTask(task.id, !task.completado);
                              }}
                              className="text-[var(--c-text-muted)] hover:text-emerald-500 cursor-pointer mt-0.5 flex-shrink-0"
                            >
                              <Circle className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[11px] font-bold text-[var(--c-text-primary)] leading-snug line-clamp-3">
                              {task.titulo}
                            </span>
                          </div>
                          {task.categoria_id && (
                            <span 
                              className="text-[8px] font-extrabold px-1 py-0.2 rounded border self-start"
                              style={{ 
                                borderColor: `${getCategoryDetails(task.categoria_id).color}25`, 
                                color: getCategoryDetails(task.categoria_id).color,
                                backgroundColor: `${getCategoryDetails(task.categoria_id).color}08`
                              }}
                            >
                              {getCategoryDetails(task.categoria_id).nombre}
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-[var(--c-border)] rounded-xl py-6 opacity-45">
                        <Sparkles className="w-3.5 h-3.5 text-[var(--c-text-muted)] mb-1" />
                        <span className="text-[9px] font-semibold italic text-[var(--c-text-muted)]">Libre</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* --- DETALLE VISTA: MES --- */}
        {activeTab === 'month' && (
          <div className="flex flex-col gap-1.5 w-full">
            {/* Encabezado columnas Lunes - Domingo */}
            <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-extrabold text-[var(--c-text-muted)] uppercase tracking-widest pb-1">
              {WEEKDAY_NAMES.map(name => (
                <div key={name}>{name}</div>
              ))}
            </div>

            {/* Cuadrícula de casillas */}
            <div className="grid grid-cols-7 gap-2 w-full">
              {getMonthDaysGrid().map((day) => {
                const dayStr = toLocalYYYYMMDD(day);
                const isToday = dayStr === todayStr;
                const isCurrentMonth = day.getMonth() === anchorDate.getMonth();
                const dayTasks = getTasksForDate(day);
                const isOver = activeDropCell === dayStr;

                return (
                  <div
                    key={dayStr}
                    onDragOver={(e) => handleDragOver(e, dayStr)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, dayStr)}
                    className={`flex flex-col gap-1.5 p-2 rounded-xl min-h-[95px] md:min-h-[120px] transition-smooth border border-dashed ${
                      isOver 
                        ? 'border-indigo-500/40 bg-indigo-500/[0.03] scale-[1.01]' 
                        : isToday 
                          ? 'border-indigo-500/25 bg-indigo-500/[0.01]' 
                          : 'border-[var(--c-border)]'
                    } ${isCurrentMonth ? 'opacity-100 bg-[var(--c-surface)]' : 'opacity-35 bg-[var(--c-surface)]/40'}`}
                  >
                    {/* Número del día */}
                    <div className="flex items-center justify-between text-[10px] font-extrabold text-[var(--c-text-secondary)]">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        isToday ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20' : ''
                      }`}>
                        {day.getDate()}
                      </span>
                      {onCreateTask && isCurrentMonth && (
                        <button
                          onClick={() => {
                            setActiveAddCell(activeAddCell === dayStr ? null : dayStr);
                            setQuickTitle('');
                          }}
                          className="text-[var(--c-text-muted)] hover:text-[var(--c-text-primary)] transition-smooth cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Quick input inside grid */}
                    {activeAddCell === dayStr && (
                      <form onSubmit={(e) => handleQuickCreate(e, dayStr)} className="flex gap-0.5 animate-fade-in z-10">
                        <input
                          autoFocus
                          type="text"
                          required
                          value={quickTitle}
                          onChange={(e) => setQuickTitle(e.target.value)}
                          placeholder="Ok..."
                          className="flex-1 px-1.5 py-0.5 bg-[var(--c-input-bg)] border border-[var(--c-input-border)] rounded text-[9px] text-[var(--c-text-primary)] focus:outline-none focus:border-indigo-500/50 w-full"
                        />
                        <button
                          type="submit"
                          className="p-0.5 bg-indigo-600 text-white rounded text-[9px] cursor-pointer flex items-center justify-center"
                        >
                          <Check className="w-2.5 h-2.5" />
                        </button>
                      </form>
                    )}

                    {/* Lista de tareas */}
                    <div className="flex flex-col gap-1 overflow-y-auto max-h-[60px] md:max-h-[85px] no-scrollbar">
                      {dayTasks.length > 0 && (
                        dayTasks.map(task => (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            onClick={() => setSelectedTask(task)}
                            className="p-1 rounded bg-[var(--c-input-bg)] border border-[var(--c-border)] border-l-2 text-[9px] font-bold text-[var(--c-text-secondary)] truncate cursor-grab hover:bg-[var(--c-border-hover)] flex items-center gap-1"
                            style={{ borderLeftColor: getCategoryDetails(task.categoria_id).color }}
                            title={task.titulo}
                          >
                            <span 
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: getCategoryDetails(task.categoria_id).color }}
                            />
                            <span className="truncate">{task.titulo}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- DETALLE VISTA: AÑO --- */}
        {activeTab === 'year' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
            {MONTH_NAMES.map((monthName, monthIdx) => {
              // Dibujar un mini calendario para este mes
              const year = anchorDate.getFullYear();
              const firstDay = new Date(year, monthIdx, 1);
              const lastDay = new Date(year, monthIdx + 1, 0);
              
              // Padding al inicio
              // getDay de Domingo es 0, mapeamos Lunes a Domingo de 0 a 6
              const startDayOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
              const totalMonthDays = lastDay.getDate();

              // Agrupar días
              const days = [];
              for (let offset = 0; offset < startDayOffset; offset++) {
                days.push(null);
              }
              for (let dNum = 1; dNum <= totalMonthDays; dNum++) {
                days.push(new Date(year, monthIdx, dNum));
              }

              // Chequear si este mes tiene tareas
              const monthTasks = tasks.filter(t => {
                if (!t.fecha_limite) return false;
                const date = new Date(t.fecha_limite + 'T00:00:00');
                return date.getFullYear() === year && date.getMonth() === monthIdx && !t.completado;
              });

              return (
                <div
                  key={monthName}
                  onClick={() => {
                    const newDate = new Date(anchorDate);
                    newDate.setMonth(monthIdx);
                    setAnchorDate(newDate);
                    setActiveTab('month');
                  }}
                  className="p-3 bg-[var(--c-surface)] hover:bg-[var(--c-surface-hover)] border border-[var(--c-border)] rounded-2xl flex flex-col gap-2 transition-all cursor-pointer hover:scale-[1.01] hover:border-indigo-500/20"
                >
                  <div className="flex items-center justify-between border-b border-[var(--c-border)] pb-1">
                    <span className="text-xs font-bold text-[var(--c-text-primary)]">{monthName}</span>
                    {monthTasks.length > 0 && (
                      <span className="text-[9px] font-extrabold bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.2 rounded border border-indigo-500/15">
                        {monthTasks.length} act.
                      </span>
                    )}
                  </div>

                  {/* Grid miniatura */}
                  <div className="grid grid-cols-7 gap-0.5 text-center text-[7px] font-bold text-[var(--c-text-muted)]">
                    {WEEKDAY_NAMES.map(n => <div key={n}>{n.slice(0, 1)}</div>)}
                    
                    {days.map((day, idx) => {
                      if (!day) return <div key={`empty-${idx}`} />;
                      
                      const dayStr = toLocalYYYYMMDD(day);
                      const hasTasks = tasks.some(t => t.fecha_limite === dayStr && !t.completado);
                      const isToday = dayStr === todayStr;

                      return (
                        <div
                          key={dayStr}
                          className={`w-3.5 h-3.5 mx-auto rounded-full flex items-center justify-center text-[7px] font-medium transition-smooth ${
                            isToday
                              ? 'bg-indigo-600 text-white font-extrabold'
                              : hasTasks
                                ? 'bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 font-extrabold ring-1 ring-indigo-500/25'
                                : 'text-[var(--c-text-muted)]'
                          }`}
                        >
                          {day.getDate()}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. PANEL LATERAL: IDEAS SIN FECHA (BACKLOG) */}
      <div 
        onDragOver={(e) => handleDragOver(e, 'sinFecha')}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, null)}
        className={`w-full lg:w-80 rounded-2xl p-4 md:p-5 flex flex-col gap-4 border border-dashed transition-smooth ${
          draggedTaskId && activeDropCell === 'sinFecha'
            ? 'border-indigo-500/40 bg-indigo-500/[0.03] scale-[1.01]'
            : 'glass-panel border-[var(--c-border)] bg-[var(--c-page-bg)]/95 text-[var(--c-text-primary)]'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[var(--c-border)] pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-[var(--c-text-primary)]">Ideas Sin Fecha</h2>
          </div>
          <span className="text-[10px] font-bold bg-[var(--c-border)] px-2 py-0.5 rounded-md border border-[var(--c-border)] text-[var(--c-text-secondary)]">
            {backlogTasks.length}
          </span>
        </div>

        <p className="text-[10px] text-[var(--c-text-muted)] leading-normal pl-1">
          💡 Arrastra tareas desde aquí al calendario para programar su fecha, o arrastra desde el calendario hasta aquí para desprogramarlas.
        </p>

        {/* Lista del backlog */}
        <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto max-h-[300px] lg:max-h-[600px] pr-1">
          {backlogTasks.length > 0 ? (
            backlogTasks.map(task => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                onClick={() => setSelectedTask(task)}
                className="glass-panel glass-panel-hover p-3 rounded-xl border-l-2 cursor-grab active:cursor-grabbing transition-smooth flex flex-col gap-2"
                style={{ borderLeftColor: getCategoryDetails(task.categoria_id).color }}
              >
                <div className="flex items-start gap-2.5 w-full">
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await onToggleTask(task.id, !task.completado);
                    }}
                    className="text-[var(--c-text-muted)] hover:text-emerald-500 cursor-pointer mt-0.5 flex-shrink-0"
                  >
                    <Circle className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-bold text-[var(--c-text-primary)] leading-snug line-clamp-3">
                    {task.titulo}
                  </span>
                </div>
                {task.categoria_id && (
                  <span 
                    className="text-[8px] font-extrabold px-1.5 py-0.5 rounded border self-start"
                    style={{ 
                      borderColor: `${getCategoryDetails(task.categoria_id).color}25`, 
                      color: getCategoryDetails(task.categoria_id).color,
                      backgroundColor: `${getCategoryDetails(task.categoria_id).color}08`
                    }}
                  >
                    {getCategoryDetails(task.categoria_id).nombre}
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-[var(--c-border)] rounded-xl py-12 text-center opacity-55">
              <Sparkles className="w-5 h-5 text-yellow-500/80 mb-2 animate-pulse" />
              <span className="text-xs font-semibold text-[var(--c-text-secondary)]">Tintero limpio</span>
              <span className="text-[10px] text-[var(--c-text-muted)] mt-1 max-w-[150px]">
                ¡No tienes ideas sin programar!
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalle Único para la Vista de Calendario */}
      {selectedTask && (
        <TaskDetailModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          task={selectedTask}
          categories={categories}
          onUpdate={onUpdateTask}
          onDelete={onDeleteTask}
        />
      )}
    </div>
  );
}
