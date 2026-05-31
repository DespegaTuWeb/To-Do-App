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
  onReorderTasks: (orderedTasks: Pendiente[]) => void;
  onOpenDetail?: (task: Pendiente) => void;
}

export default function TaskListView({
  tasks,
  categories,
  activeCategoryId,
  onToggleTask,
  onDeleteTask,
  onUpdateTask,
  onReorderTasks,
  onOpenDetail,
}: TaskListViewProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
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

  // Drag and drop task handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedTaskId || draggedTaskId === targetId) return;

    // Encontrar índices en el array global original
    const draggedIdx = tasks.findIndex((t) => t.id === draggedTaskId);
    const targetIdx = tasks.findIndex((t) => t.id === targetId);

    if (draggedIdx !== -1 && targetIdx !== -1) {
      const reordered = [...tasks];
      const [draggedItem] = reordered.splice(draggedIdx, 1);
      reordered.splice(targetIdx, 0, draggedItem);
      onReorderTasks(reordered);
    }
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-check-pop">
      {/* Lista de Tareas Activas (Pendientes) */}
      <div className="flex flex-col gap-2">
        {pendingTasks.length > 0 ? (
          pendingTasks.map((task) => {
            const { color } = getCategoryDetails(task.categoria_id);
            const isDragging = draggedTaskId === task.id;

            return (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                onDragOver={(e) => handleDragOver(e, task.id)}
                onDragEnd={handleDragEnd}
                className={`transition-all duration-200 ${
                  isDragging ? 'opacity-20 scale-[0.98]' : 'opacity-100'
                }`}
              >
                <TaskItem
                  task={task}
                  categoryColor={color}
                  onToggle={onToggleTask}
                  onDelete={onDeleteTask}
                  onUpdate={onUpdateTask}
                  onOpenDetail={onOpenDetail}
                />
              </div>
            );
          })
        ) : (
          /* Estado vacío hermoso */
          <div className="flex flex-col items-center justify-center py-12 px-4 glass-panel rounded-2xl border-dashed border-white/10 text-center">
            <div className="w-12 h-12 bg-indigo-500/5 border border-indigo-500/10 rounded-full flex items-center justify-center mb-4 text-luxury-secondary">
              <Sparkles className="w-5 h-5 text-yellow-400/80 animate-pulse" />
            </div>
            <h3 className="text-sm font-semibold text-luxury-primary">No hay pendientes</h3>
            <p className="text-xs text-luxury-secondary mt-1 max-w-[260px] leading-relaxed">
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
            className="flex items-center gap-1.5 self-start text-xs font-bold text-luxury-secondary hover:text-luxury-primary transition-smooth cursor-pointer"
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
                    onOpenDetail={onOpenDetail}
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
