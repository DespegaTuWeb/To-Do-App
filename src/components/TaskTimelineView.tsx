'use client';

import React from 'react';
import { CalendarRange } from 'lucide-react';
import { Pendiente, Categoria } from '../lib/supabase';
import { groupTasksByTimeline } from '../lib/utils';
import TaskItem from './TaskItem';

interface TaskTimelineViewProps {
  tasks: Pendiente[];
  categories: Categoria[];
  onToggleTask: (id: string, completado: boolean) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onUpdateTask: (id: string, updates: Partial<Pendiente>) => Promise<void>;
}

export default function TaskTimelineView({
  tasks,
  categories,
  onToggleTask,
  onDeleteTask,
  onUpdateTask,
}: TaskTimelineViewProps) {
  const groups = groupTasksByTimeline(tasks);

  const getCategoryDetails = (catId: string | null) => {
    const cat = categories.find((c) => c.id === catId);
    return {
      color: cat?.color || '#94a3b8', // Color slate-400 por defecto para Inbox
      nombre: cat?.nombre || 'Inbox',
    };
  };

  const hasTasks =
    groups.atrasados.length > 0 ||
    groups.hoy.length > 0 ||
    groups.manana.length > 0 ||
    groups.estaSemana.length > 0 ||
    groups.sinFecha.length > 0;

  // Definición de estilo para cada grupo
  const groupConfig = [
    {
      key: 'atrasados',
      title: 'Atrasados',
      items: groups.atrasados,
      dotColor: 'bg-rose-500 ring-rose-500/20',
      textColor: 'text-rose-400',
    },
    {
      key: 'hoy',
      title: 'Hoy',
      items: groups.hoy,
      dotColor: 'bg-white ring-white/10',
      textColor: 'text-white font-bold',
    },
    {
      key: 'manana',
      title: 'Mañana',
      items: groups.manana,
      dotColor: 'bg-blue-400 ring-blue-400/20',
      textColor: 'text-blue-400',
    },
    {
      key: 'estaSemana',
      title: 'Esta Semana',
      items: groups.estaSemana,
      dotColor: 'bg-indigo-400 ring-indigo-400/20',
      textColor: 'text-indigo-400',
    },
    {
      key: 'sinFecha',
      title: 'Ideas sin Fecha',
      items: groups.sinFecha,
      dotColor: 'bg-slate-500 ring-slate-500/20',
      textColor: 'text-slate-400',
    },
  ];

  return (
    <div className="w-full flex flex-col gap-6 animate-check-pop">
      {hasTasks ? (
        <div className="relative pl-6 border-l border-white/10 flex flex-col gap-8 ml-3 py-1">
          {groupConfig.map(({ key, title, items, dotColor, textColor }) => {
            if (items.length === 0) return null;

            return (
              <div key={key} className="relative flex flex-col gap-3">
                {/* Nodo de cabecera en el eje de la línea de tiempo */}
                <span className={`absolute -left-[30px] top-1 w-3.5 h-3.5 rounded-full border border-slate-950 ring-4 ${dotColor}`} />
                
                {/* Cabecera del Grupo */}
                <h3 className={`text-xs md:text-sm font-semibold tracking-wide uppercase ${textColor}`}>
                  {title} <span className="text-[10px] text-slate-500 font-normal ml-1">({items.length})</span>
                </h3>

                {/* Lista de Tareas del Grupo */}
                <div className="flex flex-col gap-2.5">
                  {items.map((task) => {
                    const { color, nombre } = getCategoryDetails(task.categoria_id);
                    return (
                      <TaskItem
                        key={task.id}
                        task={task}
                        categoryColor={color}
                        categoryName={nombre}
                        onToggle={onToggleTask}
                        onDelete={onDeleteTask}
                        onUpdate={onUpdateTask}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Estado vacío del Timeline */
        <div className="flex flex-col items-center justify-center py-16 px-4 glass-panel rounded-2xl border-dashed border-white/10 text-center">
          <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-4 text-slate-400">
            <CalendarRange className="w-5 h-5 text-indigo-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">Línea de tiempo vacía</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-[260px]">
            No tienes pendientes activos planificados en el tiempo. ¡Excelente estado de organización!
          </p>
        </div>
      )}
    </div>
  );
}
