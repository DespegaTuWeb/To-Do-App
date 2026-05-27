'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { Pendiente, Categoria } from '../lib/supabase';
import { getLocalDateString } from '../lib/utils';
import TaskItem from './TaskItem';

interface TaskListViewProps {
  tasks: Pendiente[];
  categories: Categoria[];
  activeCategoryId: string | null;
  onToggleTask: (id: string, completado: boolean) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onUpdateTask: (id: string, updates: Partial<Pendiente>) => Promise<void>;
}

export default function TaskListView({
  tasks,
  categories,
  activeCategoryId,
  onToggleTask,
  onDeleteTask,
  onUpdateTask,
}: TaskListViewProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const todayStr = getLocalDateString(0);

  // Filtrado de tareas según la categoría activa
  const filteredTasks = tasks.filter((task) => {
    if (activeCategoryId === null) {
      // Inbox/Hoy: sin categoría o con fecha límite hoy
      return task.categoria_id === null || task.fecha_limite === todayStr;
    }
    // Categoría dinámica
    return task.categoria_id === activeCategoryId;
  });

  const pendingTasks = filteredTasks.filter((t) => !t.completado);
  const completedTasks = filteredTasks.filter((t) => t.completado);

  const getCategoryDetails = (catId: string | null) => {
    const cat = categories.find((c) => c.id === catId);
    return {
      color: cat?.color || '#3b82f6',
      nombre: cat?.nombre || 'Inbox',
    };
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-check-pop">
      {/* Lista de Tareas Activas (Pendientes) */}
      <div className="flex flex-col gap-2">
        {pendingTasks.length > 0 ? (
          pendingTasks.map((task) => {
            const { color } = getCategoryDetails(task.categoria_id);
            return (
              <TaskItem
                key={task.id}
                task={task}
                categoryColor={color}
                onToggle={onToggleTask}
                onDelete={onDeleteTask}
                onUpdate={onUpdateTask}
              />
            );
          })
        ) : (
          /* Estado vacío hermoso */
          <div className="flex flex-col items-center justify-center py-12 px-4 glass-panel rounded-2xl border-dashed border-white/10 text-center">
            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-4 text-slate-400">
              <Sparkles className="w-5 h-5 text-yellow-400/80" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">No hay pendientes</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[260px]">
              Estás al día. ¡Crea una nueva tarea arriba para empezar a organizar tu jornada!
            </p>
          </div>
        )}
      </div>

      {/* Lista de Tareas Completadas (Ocultables) */}
      {completedTasks.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-white/5 pt-4">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-1.5 self-start text-xs font-semibold text-slate-400 hover:text-slate-200 transition-smooth cursor-pointer"
          >
            {showCompleted ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Completadas ({completedTasks.length})
          </button>

          {showCompleted && (
            <div className="flex flex-col gap-2 mt-1 animate-check-pop">
              {completedTasks.map((task) => {
                const { color } = getCategoryDetails(task.categoria_id);
                return (
                  <TaskItem
                    key={task.id}
                    task={task}
                    categoryColor={color}
                    onToggle={onToggleTask}
                    onDelete={onDeleteTask}
                    onUpdate={onUpdateTask}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
