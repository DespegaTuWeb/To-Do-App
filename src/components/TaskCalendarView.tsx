'use client';

import React, { useState, useEffect } from 'react';
import { 
  CalendarRange, ChevronLeft, ChevronRight, Sparkles, 
  Layers, Circle, Check, Plus, X, Calendar, Focus, ChevronDown 
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

  // Estado para la fecha seleccionada en móvil (YYYY-MM-DD)
  const [selectedMobileDateStr, setSelectedMobileDateStr] = useState<string>(() => toLocalYYYYMMDD(new Date()));

  // Estado para la tarea que se está programando de forma rápida en el backlog
  const [schedulingTaskId, setSchedulingTaskId] = useState<string | null>(null);

  // Filtro de agenda móvil: 'today' | 'tomorrow' | 'week' | 'custom' | 'overdue'
  const [mobileFilter, setMobileFilter] = useState<'today' | 'tomorrow' | 'week' | 'custom' | 'overdue'>('today');

  // Estado de despliegue del backlog (Ideas sin fecha)
  const [isBacklogExpanded, setIsBacklogExpanded] = useState(false);

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

  // Generar los 7 días a partir de la fecha ancla (para móvil, comenzando con la fecha seleccionada/ancla)
  const getMobileRollingDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(anchorDate);
      d.setDate(anchorDate.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const handlePrevMobileWeek = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newDate = new Date(anchorDate);
    newDate.setDate(anchorDate.getDate() - 7);
    
    if (newDate.getTime() < today.getTime()) {
      newDate.setTime(today.getTime());
    }
    
    const newDateStr = toLocalYYYYMMDD(newDate);
    setAnchorDate(newDate);
    setSelectedMobileDateStr(newDateStr);
    
    if (newDateStr === todayStr) {
      setMobileFilter('today');
    } else {
      setMobileFilter('custom');
    }
  };

  const handleNextMobileWeek = () => {
    const newDate = new Date(anchorDate);
    newDate.setDate(anchorDate.getDate() + 7);
    const newDateStr = toLocalYYYYMMDD(newDate);
    setAnchorDate(newDate);
    setSelectedMobileDateStr(newDateStr);
    
    if (newDateStr === todayStr) {
      setMobileFilter('today');
    } else {
      setMobileFilter('custom');
    }
  };

  const shouldShowPrevMobileWeek = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const anchor = new Date(anchorDate);
    anchor.setHours(0, 0, 0, 0);
    return anchor.getTime() > today.getTime();
  };

  const isNextMobileWeekDisabled = () => {
    const nextWeekDate = new Date(anchorDate);
    nextWeekDate.setDate(anchorDate.getDate() + 7);
    return nextWeekDate.getMonth() !== anchorDate.getMonth() || nextWeekDate.getFullYear() !== anchorDate.getFullYear();
  };

  // Generar los 7 días de la semana a partir del día de hoy real (para agrupar en el filtro de la semana)
  const getRollingDaysList = () => {
    const list = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      list.push(d);
    }
    return list;
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

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = toLocalYYYYMMDD(tomorrow);

  const todayVal = new Date(todayStr + 'T00:00:00').getTime();
  const endOfWeekVal = todayVal + 7 * 24 * 60 * 60 * 1000;
  const thisWeekCount = tasks.filter(t => {
    if (!t.fecha_limite || t.completado) return false;
    const tVal = new Date(t.fecha_limite + 'T00:00:00').getTime();
    return tVal >= todayVal && tVal <= endOfWeekVal;
  }).length;

  const overdueTasks = tasks.filter(t => t.fecha_limite && t.fecha_limite < todayStr && !t.completado);

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6 animate-fade-in">
      {/* 1. CUADRO PRINCIPAL DEL CALENDARIO */}
      <div className="flex-1 flex flex-col gap-5">
        {/* Cabecera superior con pestañas y controles de fecha */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--c-border)] pb-4">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-[var(--c-text-primary)] flex items-center gap-2">
              📅 Calendario y Planificación
            </h1>
            <p className="text-xs text-[var(--c-text-muted)] mt-1">
              {activeTab === 'month' && `${MONTH_NAMES[anchorDate.getMonth()]} ${anchorDate.getFullYear()}`}
              {activeTab === 'year' && `Año ${anchorDate.getFullYear()}`}
            </p>
          </div>

          <div className="hidden lg:flex items-center gap-3">
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

        {/* Panel de Horizontes Rápidos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--c-surface)] p-3 rounded-2xl border border-[var(--c-border)] shadow-sm">
          {[
            { id: 'hoy', label: 'Hoy', count: tasks.filter(t => t.fecha_limite === todayStr && !t.completado).length, color: 'text-indigo-500', clickable: false },
            { id: 'manana', label: 'Mañana', count: tasks.filter(t => t.fecha_limite === tomorrowStr && !t.completado).length, color: 'text-blue-500', clickable: false },
            { id: 'semana', label: 'Esta Semana', count: thisWeekCount, color: 'text-emerald-500', clickable: false },
            { id: 'vencidas', label: 'Vencidas', count: overdueTasks.length, color: overdueTasks.length > 0 ? 'text-rose-500 font-extrabold' : 'text-[var(--c-text-muted)]', clickable: overdueTasks.length > 0 }
          ].map(horizon => {
            const isClickable = horizon.clickable;
            const Component = isClickable ? 'button' : 'div';
            return (
              <Component
                key={horizon.id}
                type={isClickable ? 'button' : undefined}
                onClick={isClickable ? () => {
                  setMobileFilter('overdue');
                } : undefined}
                className={`flex flex-col gap-1 p-2.5 rounded-xl bg-[var(--c-page-bg)] border border-[var(--c-border)] text-left w-full ${
                  isClickable 
                    ? 'hover:border-rose-500/30 hover:bg-rose-500/[0.02] cursor-pointer transition-all active:scale-[0.98]' 
                    : ''
                }`}
              >
                <span className="text-[10px] font-bold text-[var(--c-text-muted)] uppercase tracking-wider">{horizon.label}</span>
                <span className={`text-base font-extrabold ${horizon.color}`}>{horizon.count} tareas</span>
              </Component>
            );
          })}
        </div>

        {/* Banner de tareas retrasadas */}
        {overdueTasks.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-[var(--c-text-primary)] animate-check-pop">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-rose-500 dark:text-rose-400 flex items-center gap-1.5">
                ⚠️ Tareas vencidas de días anteriores ({overdueTasks.length})
              </span>
              <p className="text-[10.5px] text-[var(--c-text-secondary)] leading-relaxed">
                Tienes pendientes del pasado sin completar. ¿Quieres moverlos todos al día de hoy para reagendar tu enfoque?
              </p>
            </div>
            <button
              onClick={async () => {
                for (const t of overdueTasks) {
                  await onUpdateTask(t.id, { fecha_limite: todayStr });
                }
              }}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold rounded-xl transition-smooth shadow-md shadow-rose-600/10 cursor-pointer self-start sm:self-center"
            >
              Pospone a Hoy
            </button>
          </div>
        )}

        {/* --- DETALLE VISTA: SEMANA --- */}
        {activeTab === 'week' && (
          <div className="hidden lg:grid grid-cols-7 gap-3 w-full">
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
          <div className="hidden lg:flex flex-col gap-1.5 w-full">
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
                      <div className="flex items-center gap-1.5">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          isToday ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20' : ''
                        }`}>
                          {day.getDate()}
                        </span>
                        {/* Indicadores de carga (puntos de color) */}
                        {dayTasks.length > 0 && (
                          <div className="flex items-center gap-0.5">
                            {dayTasks.slice(0, 3).map((t) => (
                              <span 
                                key={t.id} 
                                className="w-1 h-1 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: getCategoryDetails(t.categoria_id).color }}
                              />
                            ))}
                            {dayTasks.length > 3 && (
                              <span className="text-[7px] font-bold text-[var(--c-text-muted)] opacity-70 leading-none">
                                +{dayTasks.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
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

        {/* --- DETALLE VISTA: MÓVIL (SEMANA / MES) --- */}
        {(activeTab === 'week' || activeTab === 'month') && (
          <div className="lg:hidden flex flex-col gap-4">
            {/* Botones de Filtro Rápido en Móvil */}
            <div className="flex items-center gap-2 w-full">
              <div className="flex p-0.5 bg-black/5 dark:bg-black/20 border border-[var(--c-border)] rounded-xl text-[11px] font-bold flex-1">
                {[
                  { id: 'today', label: 'Día Actual' },
                  { id: 'week', label: 'Semana' }
                ].map(opt => {
                  const isActive = mobileFilter === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setMobileFilter(opt.id as any);
                        if (opt.id === 'today') {
                          setSelectedMobileDateStr(todayStr);
                          setAnchorDate(new Date()); // Resetea el carrusel a hoy
                        }
                      }}
                      className={`flex-1 py-2 rounded-lg text-center transition-smooth cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
                          : 'text-[var(--c-text-muted)] hover:text-[var(--c-text-primary)]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Selector de fecha personalizado (Datepicker flotante nativo) */}
              <div className="relative">
                <input
                  type="date"
                  onChange={(e) => {
                    if (e.target.value) {
                      const dateStr = e.target.value;
                      setSelectedMobileDateStr(dateStr);
                      if (dateStr === todayStr) {
                        setMobileFilter('today');
                      } else {
                        setMobileFilter('custom');
                      }
                      setAnchorDate(new Date(dateStr + 'T00:00:00')); // Mueve el inicio del carrusel al día seleccionado
                    }
                  }}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                />
                <button
                  type="button"
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-smooth border cursor-pointer ${
                    mobileFilter === 'custom'
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                      : 'border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-text-secondary)] hover:border-[var(--c-border-hover)]'
                  }`}
                  title="Elegir otra fecha"
                >
                  <Calendar className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Selector de días horizontal (Tira semanal rodante) - Oculto si se selecciona vista de Semana completa o Tareas Vencidas */}
            {mobileFilter !== 'week' && mobileFilter !== 'overdue' && (
              <div className="flex items-center gap-2 w-full">
                {/* Botón semana anterior (solo si no estamos en la semana de hoy) */}
                {shouldShowPrevMobileWeek() && (
                  <button
                    type="button"
                    onClick={handlePrevMobileWeek}
                    className="w-8 h-8 rounded-xl flex items-center justify-center border border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-text-secondary)] hover:border-[var(--c-border-hover)] transition-smooth cursor-pointer flex-shrink-0"
                    title="Semana anterior"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Tira Semanal de 7 días */}
                <div className="flex-1 flex items-center justify-between gap-1.5 overflow-x-auto py-1 no-scrollbar">
                  {getMobileRollingDays().map((day) => {
                    const dayStr = toLocalYYYYMMDD(day);
                    const isSelected = selectedMobileDateStr === dayStr;
                    const isToday = dayStr === todayStr;
                    const dayTasksCount = tasks.filter(t => t.fecha_limite === dayStr && !t.completado).length;

                    return (
                      <button
                        key={dayStr}
                        onClick={() => {
                          setSelectedMobileDateStr(dayStr);
                          if (dayStr === todayStr) {
                            setMobileFilter('today');
                          } else {
                            setMobileFilter('custom');
                          }
                        }}
                        className={`w-[36px] md:w-[42px] flex-shrink-0 p-2 rounded-xl flex flex-col items-center gap-1 transition-smooth border cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                            : isToday
                              ? 'border-indigo-500/25 text-indigo-500 bg-indigo-500/[0.01]'
                              : 'border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-text-secondary)] hover:border-[var(--c-border-hover)]'
                        }`}
                      >
                        <span className="text-[7.5px] font-extrabold tracking-wider uppercase opacity-65">
                          {WEEKDAY_NAMES[day.getDay() === 0 ? 6 : day.getDay() - 1].slice(0, 1)}
                        </span>
                        <span className="text-xs font-extrabold leading-none">{day.getDate()}</span>
                        {dayTasksCount > 0 && (
                          <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500 animate-pulse'}`} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Botón semana siguiente */}
                <button
                  type="button"
                  disabled={isNextMobileWeekDisabled()}
                  onClick={handleNextMobileWeek}
                  className="w-8 h-8 rounded-xl flex items-center justify-center border border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-text-secondary)] hover:border-[var(--c-border-hover)] disabled:opacity-20 disabled:pointer-events-none transition-smooth cursor-pointer flex-shrink-0"
                  title="Semana siguiente"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Tareas del día seleccionado en móvil */}
            <div className="glass-panel p-4 rounded-2xl border border-[var(--c-border)] flex flex-col gap-3" style={{ backgroundColor: 'var(--c-page-bg)' }}>
              <div className="flex items-center justify-between border-b border-[var(--c-border)] pb-2.5">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--c-text-primary)]">
                  {mobileFilter === 'today' && 'Agenda de Hoy'}
                  {mobileFilter === 'tomorrow' && 'Agenda de Mañana'}
                  {mobileFilter === 'week' && 'Planificación Semanal'}
                  {mobileFilter === 'custom' && `Agenda: ${selectedMobileDateStr.split('-').reverse().slice(0, 2).join('/')}`}
                  {mobileFilter === 'overdue' && 'Tareas Vencidas'}
                </span>
                <span className="text-[9px] font-extrabold text-[var(--c-text-muted)] bg-[var(--c-border)] px-1.5 py-0.2 rounded border border-[var(--c-border)]">
                  {mobileFilter === 'week' 
                    ? tasks.filter(t => {
                        if (!t.fecha_limite || t.completado) return false;
                        return t.fecha_limite >= todayStr && t.fecha_limite <= toLocalYYYYMMDD(new Date(Date.now() + 6 * 86400000));
                      }).length
                    : mobileFilter === 'overdue'
                      ? overdueTasks.length
                      : tasks.filter(t => t.fecha_limite === selectedMobileDateStr && !t.completado).length
                  } tareas
                </span>
              </div>

              {/* Listado de tareas móvil */}
              <div className="flex flex-col gap-3">
                {mobileFilter === 'week' ? (
                  // Vista de Semana Completa (7 días agrupados)
                  getRollingDaysList().map(day => {
                    const dayStr = toLocalYYYYMMDD(day);
                    const dayTasks = tasks
                      .filter(t => t.fecha_limite === dayStr && !t.completado)
                      .sort((a, b) => a.titulo.localeCompare(b.titulo));
                    const isToday = dayStr === todayStr;

                    return (
                      <div key={dayStr} className="flex flex-col gap-2">
                        {/* Cabecera del día de la semana */}
                        <div className="flex items-center justify-between pb-1 border-b border-[var(--c-border)]/50">
                          <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                            isToday ? 'text-indigo-500' : 'text-[var(--c-text-muted)]'
                          }`}>
                            {WEEKDAY_NAMES[day.getDay() === 0 ? 6 : day.getDay() - 1]} {day.getDate()}
                          </span>
                          {isToday && (
                            <span className="text-[8px] bg-indigo-500/10 text-indigo-500 px-1 py-0.2 rounded font-extrabold uppercase">
                              Hoy
                            </span>
                          )}
                        </div>

                        {/* Tareas de este día en la semana */}
                        <div className="flex flex-col gap-1.5 pl-1">
                          {dayTasks.length > 0 ? (
                            dayTasks.map(task => (
                              <div
                                key={task.id}
                                onClick={() => setSelectedTask(task)}
                                className="glass-panel p-2.5 rounded-xl border-l-2 cursor-pointer transition-smooth flex items-center justify-between gap-3"
                                style={{ borderLeftColor: getCategoryDetails(task.categoria_id).color, backgroundColor: 'var(--c-surface)' }}
                              >
                                <div className="flex items-start gap-2">
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await onToggleTask(task.id, !task.completado);
                                    }}
                                    className="text-[var(--c-text-muted)] hover:text-emerald-500 cursor-pointer mt-0.5"
                                  >
                                    <Circle className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="text-xs font-bold text-[var(--c-text-primary)] leading-snug line-clamp-2 text-left">
                                    {task.titulo}
                                  </span>
                                </div>
                                {task.categoria_id && (
                                  <span 
                                    className="text-[8px] font-extrabold px-1.5 py-0.5 rounded border flex-shrink-0"
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
                            <span className="text-[10px] text-[var(--c-text-muted)] italic pl-1 font-medium opacity-65">Sin pendientes</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : mobileFilter === 'overdue' ? (
                  // Vista de Tareas Vencidas
                  <div className="flex flex-col gap-2">
                    {overdueTasks.length > 0 ? (
                      overdueTasks
                        .sort((a, b) => a.titulo.localeCompare(b.titulo))
                        .map(task => (
                          <div
                            key={task.id}
                            onClick={() => setSelectedTask(task)}
                            className="glass-panel p-3 rounded-xl border-l-2 cursor-pointer transition-smooth flex items-center justify-between gap-3 animate-fade-in"
                            style={{ borderLeftColor: getCategoryDetails(task.categoria_id).color, backgroundColor: 'var(--c-surface)' }}
                          >
                            <div className="flex items-start gap-2.5">
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await onToggleTask(task.id, !task.completado);
                                }}
                                className="text-[var(--c-text-muted)] hover:text-emerald-500 cursor-pointer mt-0.5"
                              >
                                <Circle className="w-3.5 h-3.5" />
                              </button>
                              <div className="flex flex-col gap-0.5 text-left">
                                <span className="text-xs font-bold text-[var(--c-text-primary)] leading-snug line-clamp-2">
                                  {task.titulo}
                                </span>
                                <span className="text-[9.5px] font-extrabold text-rose-500">
                                  ⚠️ Venció el: {task.fecha_limite?.split('-').reverse().slice(0, 2).join('/')}
                                </span>
                              </div>
                            </div>
                            {task.categoria_id && (
                              <span 
                                className="text-[8px] font-extrabold px-1.5 py-0.5 rounded border flex-shrink-0"
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
                      <div className="flex flex-col items-center justify-center border border-dashed border-[var(--c-border)] rounded-xl py-8 opacity-45 text-center">
                        <Sparkles className="w-4.5 h-4.5 text-[var(--c-text-muted)] mb-1.5 animate-pulse" />
                        <span className="text-xs font-semibold text-[var(--c-text-muted)]">No hay tareas vencidas</span>
                      </div>
                    )}
                  </div>
                ) : (
                  // Vista de un solo día (Día Actual / Mañana / Custom)
                  <div className="flex flex-col gap-2">
                    {tasks.filter(t => t.fecha_limite === selectedMobileDateStr && !t.completado).length > 0 ? (
                      tasks
                        .filter(t => t.fecha_limite === selectedMobileDateStr && !t.completado)
                        .sort((a, b) => a.titulo.localeCompare(b.titulo))
                        .map(task => (
                          <div
                            key={task.id}
                            onClick={() => setSelectedTask(task)}
                            className="glass-panel p-3 rounded-xl border-l-2 cursor-pointer transition-smooth flex items-center justify-between gap-3"
                            style={{ borderLeftColor: getCategoryDetails(task.categoria_id).color, backgroundColor: 'var(--c-surface)' }}
                          >
                            <div className="flex items-start gap-2.5">
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await onToggleTask(task.id, !task.completado);
                                }}
                                className="text-[var(--c-text-muted)] hover:text-emerald-500 cursor-pointer mt-0.5"
                              >
                                <Circle className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-xs font-bold text-[var(--c-text-primary)] leading-snug line-clamp-2 text-left">
                                {task.titulo}
                              </span>
                            </div>
                            {task.categoria_id && (
                              <span 
                                className="text-[8px] font-extrabold px-1.5 py-0.5 rounded border flex-shrink-0"
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
                      <div className="flex flex-col items-center justify-center border border-dashed border-[var(--c-border)] rounded-xl py-8 opacity-45 text-center">
                        <Sparkles className="w-4.5 h-4.5 text-[var(--c-text-muted)] mb-1.5 animate-pulse" />
                        <span className="text-xs font-semibold text-[var(--c-text-muted)]">Día libre de tareas</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
        className={`w-full lg:w-80 rounded-2xl p-4 md:p-5 flex flex-col gap-3 border border-dashed transition-smooth h-fit ${
          draggedTaskId && activeDropCell === 'sinFecha'
            ? 'border-indigo-500/40 bg-indigo-500/[0.03] scale-[1.01]'
            : 'glass-panel border-[var(--c-border)] bg-[var(--c-page-bg)]/95 text-[var(--c-text-primary)]'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsBacklogExpanded(!isBacklogExpanded)}
          className="flex items-center justify-between w-full border-b border-[var(--c-border)] pb-3 cursor-pointer text-left focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-[var(--c-text-primary)]">Ideas Sin Fecha</h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] font-bold bg-[var(--c-border)] px-2 py-0.5 rounded-md border border-[var(--c-border)] text-[var(--c-text-secondary)]">
              {backlogTasks.length}
            </span>
            <ChevronDown className={`w-4 h-4 text-[var(--c-text-muted)] transition-transform duration-300 ${isBacklogExpanded ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isBacklogExpanded && (
          <div className="flex flex-col gap-3 animate-fade-in w-full">
            <p className="text-[10px] text-[var(--c-text-muted)] leading-normal pl-1">
              💡 Arrastra tareas desde aquí al calendario para programar su fecha, o arrastra desde el calendario hasta aquí para desprogramarlas.
            </p>

            {/* Lista del backlog */}
            <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[300px] lg:max-h-[600px] pr-1 w-full">
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
                    <div className="flex items-center justify-between gap-2 mt-1 pt-1.5 border-t border-[var(--c-border)]/35">
                      {task.categoria_id ? (
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
                      ) : <div />}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSchedulingTaskId(schedulingTaskId === task.id ? null : task.id);
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-[var(--c-border)] hover:bg-[var(--c-border-hover)] text-[9px] font-bold rounded-lg text-[var(--c-text-secondary)] hover:text-[var(--c-text-primary)] transition-smooth cursor-pointer"
                        title="Asignar fecha"
                      >
                        <Calendar className="w-3 h-3 text-indigo-500" />
                        <span>Programar</span>
                      </button>
                    </div>

                    {schedulingTaskId === task.id && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1.5 p-1 bg-[var(--c-page-bg)] border border-[var(--c-border)] rounded-xl flex flex-col gap-0.5 animate-check-pop"
                      >
                        {[
                          { label: 'Hoy', value: todayStr },
                          { label: 'Mañana', value: tomorrowStr },
                          { label: 'Próx. Lunes', value: toLocalYYYYMMDD(new Date(Date.now() + (8 - (new Date().getDay() || 7)) * 86400000)) }
                        ].map(opt => (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={async () => {
                              await onUpdateTask(task.id, { fecha_limite: opt.value });
                              setSchedulingTaskId(null);
                            }}
                            className="w-full text-left px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-[10px] font-bold transition-smooth text-[var(--c-text-primary)] cursor-pointer"
                          >
                            📅 {opt.label} ({opt.value.split('-').reverse().slice(0, 2).join('/')})
                          </button>
                        ))}
                        <div className="h-[1px] bg-[var(--c-border)] my-0.5" />
                        <input 
                          type="date"
                          onChange={async (e) => {
                            if (e.target.value) {
                              await onUpdateTask(task.id, { fecha_limite: e.target.value });
                              setSchedulingTaskId(null);
                            }
                          }}
                          className="w-full px-2 py-1 bg-[var(--c-input-bg)] border border-[var(--c-input-border)] rounded-lg text-[10px] text-[var(--c-text-primary)] focus:outline-none"
                        />
                      </div>
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
        )}
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
