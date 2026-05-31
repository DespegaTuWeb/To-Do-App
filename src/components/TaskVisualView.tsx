'use client';

import React, { useState } from 'react';
import { Layers, Sparkles, LayoutGrid, Circle } from 'lucide-react';
import { Pendiente, Categoria } from '../lib/supabase';
import { groupTasksByTimeline, getLocalDateString } from '../lib/utils';
import TaskDetailModal from './TaskDetailModal';

interface TaskVisualViewProps {
  tasks: Pendiente[];
  categories: Categoria[];
  onToggleTask: (id: string, completado: boolean) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onUpdateTask: (id: string, updates: Partial<Pendiente>) => Promise<void>;
}

export default function TaskVisualView({
  tasks,
  categories,
  onToggleTask,
  onDeleteTask,
  onUpdateTask,
}: TaskVisualViewProps) {
  const groups = groupTasksByTimeline(tasks);
  
  // Estados para Drag & Drop
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeColumn, setActiveColumn] = useState<string | null>(null);

  // Estado para el modal de detalle
  const [selectedTask, setSelectedTask] = useState<Pendiente | null>(null);

  const getCategoryDetails = (catId: string | null) => {
    const cat = categories.find((c) => c.id === catId);
    return {
      color: cat?.color || '#94a3b8',
      nombre: cat?.nombre || 'Inbox',
    };
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    setActiveColumn(columnKey);
  };

  const handleDragLeave = () => {
    setActiveColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    setActiveColumn(null);
    if (!draggedTaskId) return;

    let newDate: string | null = null;
    switch (columnKey) {
      case 'atrasados':
        newDate = getLocalDateString(-1); // Ayer
        break;
      case 'hoy':
        newDate = getLocalDateString(0); // Hoy
        break;
      case 'manana':
        newDate = getLocalDateString(1); // Mañana
        break;
      case 'estaSemana':
        newDate = getLocalDateString(3); // 3 días en el futuro
        break;
      case 'sinFecha':
      default:
        newDate = null; // Sin fecha
        break;
    }

    await onUpdateTask(draggedTaskId, { fecha_limite: newDate });
    setDraggedTaskId(null);
  };

  // Definición de las 4 columnas de la Línea de Tiempo (se verán amplias en la parte superior)
  const timelineColumns = [
    {
      key: 'atrasados',
      title: 'Atrasados',
      items: groups.atrasados,
      colorClass: 'border-rose-500/20 text-rose-500 bg-rose-500/5',
      dot: 'bg-rose-500',
    },
    {
      key: 'hoy',
      title: 'Hoy',
      items: groups.hoy,
      colorClass: 'border-indigo-500/20 text-indigo-500 bg-indigo-500/5',
      dot: 'bg-indigo-500',
    },
    {
      key: 'manana',
      title: 'Mañana',
      items: groups.manana,
      colorClass: 'border-blue-500/20 text-blue-500 bg-blue-500/5',
      dot: 'bg-blue-500',
    },
    {
      key: 'estaSemana',
      title: 'Esta Semana',
      items: groups.estaSemana,
      colorClass: 'border-emerald-500/20 text-emerald-500 bg-emerald-500/5',
      dot: 'bg-emerald-500',
    },
  ];

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-1">
        <LayoutGrid className="w-4 h-4 text-indigo-500" />
        <span className="text-xs font-bold text-luxury-secondary uppercase tracking-widest">
          Planificador Visual
        </span>
      </div>

      {/* 1. SECCIÓN SUPERIOR: Grid de 4 Columnas Temporales (Más amplias e intuitivas) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start w-full">
        {timelineColumns.map(({ key, title, items, colorClass, dot }) => {
          const isOver = activeColumn === key;

          return (
            <div
              key={key}
              onDragOver={(e) => handleDragOver(e, key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, key)}
              className={`flex flex-col gap-3 p-3.5 rounded-2xl glass-panel min-h-[300px] transition-smooth border border-dashed ${
                isOver 
                  ? 'border-indigo-500/40 bg-indigo-500/[0.02] scale-[1.01]' 
                  : 'border-white/5'
              }`}
            >
              {/* Encabezado */}
              <div className={`flex items-center justify-between p-2 rounded-xl border ${colorClass}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${dot} animate-pulse`} />
                  <span className="text-xs font-extrabold tracking-wide uppercase">{title}</span>
                </div>
                <span className="text-[10px] font-bold opacity-80 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                  {items.length}
                </span>
              </div>

              {/* Tareas en la Columna */}
              <div className="flex flex-col gap-2.5 flex-1">
                {items.length > 0 ? (
                  items.map((task) => {
                    const { color, nombre } = getCategoryDetails(task.categoria_id);
                    const isDragging = draggedTaskId === task.id;

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        className={`glass-panel glass-panel-hover p-3 rounded-xl cursor-grab active:cursor-grabbing transition-smooth flex flex-col gap-2 border-l-2 relative ${
                          isDragging ? 'opacity-20 scale-[0.98]' : 'opacity-100'
                        }`}
                        style={{ borderLeftColor: color }}
                        onClick={() => setSelectedTask(task)}
                      >
                        <div className="flex items-start gap-2.5 w-full">
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await onToggleTask(task.id, !task.completado);
                            }}
                            className="text-luxury-secondary hover:text-luxury-primary cursor-pointer flex-shrink-0 mt-0.5"
                          >
                            <Circle className="w-4 h-4 hover:scale-105 transition-smooth" />
                          </button>
                          <span className="text-xs font-bold text-luxury-primary leading-tight line-clamp-2">
                            {task.titulo}
                          </span>
                        </div>
                        {task.categoria_id && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-md border"
                              style={{
                                borderColor: `${color}25`,
                                color: color,
                                backgroundColor: `${color}08`,
                              }}
                            >
                              {nombre}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-center border border-dashed border-white/5 rounded-xl">
                    <Sparkles className="w-4 h-4 text-luxury-muted opacity-40 mb-2" />
                    <span className="text-[10px] text-luxury-muted font-medium italic">Sin pendientes</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. SECCIÓN INFERIOR: Ideas Sin Fecha (Backlog amplio horizontal) */}
      {(() => {
        const isOver = activeColumn === 'sinFecha';
        return (
          <div
            onDragOver={(e) => handleDragOver(e, 'sinFecha')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'sinFecha')}
            className={`flex flex-col gap-3.5 p-4.5 rounded-2xl glass-panel min-h-[160px] transition-smooth border border-dashed mt-2 ${
              isOver 
                ? 'border-indigo-500/40 bg-indigo-500/[0.02] scale-[1.005]' 
                : 'border-white/5'
            }`}
          >
            {/* Cabecera Backlog */}
            <div className="flex items-center justify-between p-2 rounded-xl border border-slate-500/20 text-slate-400 bg-slate-500/5 self-start px-4">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-extrabold tracking-wide uppercase">Ideas Sin Fecha (Backlog / Ideas)</span>
              </div>
              <span className="text-[10px] font-bold opacity-80 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 ml-3">
                {groups.sinFecha.length}
              </span>
            </div>

            {/* Grid de tarjetas sin fecha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 flex-1">
              {groups.sinFecha.length > 0 ? (
                groups.sinFecha.map((task) => {
                  const { color, nombre } = getCategoryDetails(task.categoria_id);
                  const isDragging = draggedTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className={`glass-panel glass-panel-hover p-3.5 rounded-xl cursor-grab active:cursor-grabbing transition-smooth flex flex-col gap-2 border-l-2 relative ${
                        isDragging ? 'opacity-20 scale-[0.98]' : 'opacity-100'
                      }`}
                      style={{ borderLeftColor: color }}
                      onClick={() => setSelectedTask(task)}
                    >
                      <div className="flex items-start gap-2.5 w-full">
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await onToggleTask(task.id, !task.completado);
                          }}
                          className="text-luxury-secondary hover:text-luxury-primary cursor-pointer flex-shrink-0 mt-0.5"
                        >
                          <Circle className="w-4 h-4 hover:scale-105 transition-smooth" />
                        </button>
                        <span className="text-xs font-bold text-luxury-primary leading-tight line-clamp-2">
                          {task.titulo}
                        </span>
                      </div>
                      {task.categoria_id && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-md border"
                            style={{
                              borderColor: `${color}25`,
                              color: color,
                              backgroundColor: `${color}08`,
                            }}
                          >
                            {nombre}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-8 text-center border border-dashed border-white/5 rounded-xl">
                  <Sparkles className="w-4 h-4 text-luxury-muted opacity-40 mb-1" />
                  <span className="text-[10px] text-luxury-muted font-medium italic">Sin pendientes en el tintero</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Modal de Detalle Único para la Vista Visual */}
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
