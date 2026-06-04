'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Sparkles, Folder, Plus, Undo2, ListTree, FolderPlus, Edit3 } from 'lucide-react';
import { Pendiente, Categoria } from '../lib/supabase';
import { getLocalDateString } from '../lib/utils';
import TaskItem from './TaskItem';
import ConfirmModal from './ConfirmModal';

const PREMIUM_GROUP_COLORS = [
  '#3b82f6', // Azul Cobalto
  '#10b981', // Esmeralda
  '#f59e0b', // Ámbar
  '#ec4899', // Rosa
  '#8b5cf6', // Violeta
  '#06b6d4', // Cian
  '#f43f5e', // Rosa Coral
  '#a855f7', // Púrpura
  '#14b8a6', // Menta
  '#f97316', // Naranja
];

interface TaskListViewProps {
  tasks: Pendiente[];
  categories: Categoria[];
  activeCategoryId: string | null;
  onToggleTask: (id: string, completado: boolean) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onUpdateTask: (id: string, updates: Partial<Pendiente>) => Promise<void>;
  onReorderTasks: (orderedTasks: Pendiente[]) => void;
  onOpenDetail?: (task: Pendiente) => void;
  onCreateTask?: (titulo: string, fechaLimite: string | null, grupoNombre?: string | null, grupoColor?: string | null) => Promise<void>;
  activeGroupName?: string | null;
  onSelectGroup?: (name: string | null, color: string | null) => void;
  onConvertGroupToTask?: (groupName: string) => Promise<void>;
  onPromoteGroupToCategory?: (groupName: string) => Promise<void>;
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
  onCreateTask,
  activeGroupName,
  onSelectGroup,
  onConvertGroupToTask,
  onPromoteGroupToCategory,
}: TaskListViewProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedGroupTaskDefId, setDraggedGroupTaskDefId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [disabledDragTaskId, setDisabledDragTaskId] = useState<string | null>(null);
  const [revertingGroupName, setRevertingGroupName] = useState<string | null>(null);
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
    e.dataTransfer.setData('task-id', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedTaskId || draggedTaskId === targetId) return;

    const targetTask = tasks.find((t) => t.id === targetId);
    const draggedTask = tasks.find((t) => t.id === draggedTaskId);
    if (!targetTask || !draggedTask) return;

    // Solo reordenar en la interfaz si ya están en el mismo grupo para evitar desmontar el nodo durante el arrastre
    if (draggedTask.grupo_nombre === targetTask.grupo_nombre) {
      const draggedIdx = tasks.findIndex((t) => t.id === draggedTaskId);
      const targetIdx = tasks.findIndex((t) => t.id === targetId);

      if (draggedIdx !== -1 && targetIdx !== -1) {
        const reordered = [...tasks];
        const [draggedItem] = reordered.splice(draggedIdx, 1);
        reordered.splice(targetIdx, 0, draggedItem);
        onReorderTasks(reordered);
      }
    }
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDraggedGroupTaskDefId(null);
  };

  const handleDragOverGroup = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnGroup = async (e: React.DragEvent, targetGroupName: string) => {
    e.preventDefault();
    // Si estamos arrastrando una subcategoría (grupo), no procesar como asignación de tarea
    if (draggedGroupTaskDefId) return;

    if (!draggedTaskId) return;

    const taskToUpdate = tasks.find(t => t.id === draggedTaskId);
    if (!taskToUpdate) {
      setDraggedTaskId(null);
      return;
    }

    const currentGroupName = taskToUpdate.grupo_nombre || 'General';
    setDraggedTaskId(null);

    if (currentGroupName === targetGroupName) return;

    const newGroupName = targetGroupName === 'General' ? null : targetGroupName;
    
    let newGroupColor = null;
    if (newGroupName) {
      const existing = tasks.find(t => t.grupo_nombre === newGroupName && t.grupo_color);
      newGroupColor = existing?.grupo_color || PREMIUM_GROUP_COLORS[Math.floor(Math.random() * PREMIUM_GROUP_COLORS.length)];
    }

    await onUpdateTask(taskToUpdate.id, {
      grupo_nombre: newGroupName,
      grupo_color: newGroupColor
    });
  };

  const handleGroupHeaderClick = (groupName: string) => {
    const isCurrentlyCollapsed = !!collapsedGroups[groupName];
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
    
    if (onSelectGroup) {
      if (isCurrentlyCollapsed) {
        onSelectGroup(groupName === 'General' ? null : groupName, getGroupColor(groupName));
      } else {
        onSelectGroup(null, null);
      }
    }
  };

  // Agrupar tareas por grupo respetando las definiciones de subcategorías creadas
  const groupDefinitions = pendingTasks.filter(t => t.es_grupo === true);
  const activeGroupNames = new Set(groupDefinitions.map(t => t.titulo));

  const groupedTasks: Record<string, Pendiente[]> = {};
  groupedTasks['General'] = [];
  
  groupDefinitions.forEach(g => {
    groupedTasks[g.titulo] = [];
  });

  const normalPendingTasks = pendingTasks.filter(t => t.es_grupo !== true);
  normalPendingTasks.forEach(task => {
    const gName = task.grupo_nombre;
    if (gName && activeGroupNames.has(gName)) {
      groupedTasks[gName].push(task);
    } else {
      groupedTasks['General'].push(task);
    }
  });

  const groupNames = ['General', ...groupDefinitions.map(g => g.titulo)].filter(name => {
    if (name === 'General') return groupedTasks['General'].length > 0;
    return true;
  });

  const getGroupColor = (groupName: string) => {
    if (groupName === 'General') return '#64748b';
    const def = groupDefinitions.find(g => g.titulo === groupName);
    return def?.grupo_color || '#8b5cf6';
  };

  // Limpiar el estado de arrastre si cambia la categoría activa o si los elementos cambian/se mueven
  React.useEffect(() => {
    setDraggedTaskId(null);
    setDraggedGroupTaskDefId(null);
  }, [activeCategoryId]);

  // Si la tarea arrastrada ya no está en la lista de pendientes (ej. se movió de categoría o se completó), limpiar el arrastre
  React.useEffect(() => {
    if (draggedTaskId && !pendingTasks.some(t => t.id === draggedTaskId)) {
      setDraggedTaskId(null);
    }
  }, [pendingTasks, draggedTaskId]);

  // Si el grupo arrastrado ya no está en las definiciones (ej. se borró o se convirtió), limpiar el arrastre
  React.useEffect(() => {
    if (draggedGroupTaskDefId && !groupDefinitions.some(g => g.id === draggedGroupTaskDefId)) {
      setDraggedGroupTaskDefId(null);
    }
  }, [groupDefinitions, draggedGroupTaskDefId]);

  // Handler para reordenar las subcategorías (arrastrando una sobre otra)
  const handleDragOverGroupHeader = (e: React.DragEvent, targetGroupName: string) => {
    e.preventDefault();
    if (!draggedGroupTaskDefId || targetGroupName === 'General') return;

    const targetGroupDef = groupDefinitions.find(g => g.titulo === targetGroupName);
    if (!targetGroupDef || targetGroupDef.id === draggedGroupTaskDefId) return;

    const draggedIdx = tasks.findIndex((t) => t.id === draggedGroupTaskDefId);
    const targetIdx = tasks.findIndex((t) => t.id === targetGroupDef.id);

    if (draggedIdx !== -1 && targetIdx !== -1) {
      const reordered = [...tasks];
      const [draggedItem] = reordered.splice(draggedIdx, 1);
      reordered.splice(targetIdx, 0, draggedItem);
      onReorderTasks(reordered);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-check-pop">
      {/* Lista de Tareas Activas (Pendientes) agrupadas */}
      <div className="flex flex-col gap-4">
        {pendingTasks.length > 0 ? (
          groupNames.map((groupName) => {
            const isActive = (groupName === 'General' && activeGroupName === null) || (activeGroupName === groupName);
            const groupTasks = groupedTasks[groupName];
            const isCollapsed = !!collapsedGroups[groupName];
            const groupColor = getGroupColor(groupName);

            const groupDef = groupDefinitions.find(g => g.titulo === groupName);
            const isDraggingGroup = draggedGroupTaskDefId && groupDef && draggedGroupTaskDefId === groupDef.id;

            return (
              <div
                key={groupName}
                onDragOver={handleDragOverGroup}
                onDrop={(e) => handleDropOnGroup(e, groupName)}
                className={`backdrop-blur-xl border rounded-xl p-3 transition-all duration-300 flex flex-col gap-2.5 ${
                  isActive
                    ? 'bg-indigo-600/5 border-indigo-500/30 shadow-lg shadow-indigo-500/5'
                    : 'bg-white/5 border-white/10'
                } ${isDraggingGroup ? 'opacity-25 scale-[0.98]' : 'opacity-100'}`}
              >
                {/* Cabecera del Grupo (Acordeón) y Zona de Arrastre para Subcategoría */}
                <div 
                  draggable={groupName !== 'General'}
                  onDragStart={(e) => {
                    if (groupName === 'General') return;
                    if (groupDef) {
                      // Para arrastrar a pestañas
                      e.dataTransfer.setData('task-id', groupDef.id);
                      e.dataTransfer.effectAllowed = 'move';
                      // Para reordenar localmente
                      setDraggedGroupTaskDefId(groupDef.id);
                    }
                  }}
                  onDragOver={(e) => handleDragOverGroupHeader(e, groupName)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center justify-between gap-2 border-b border-white/5 pb-1.5 transition-colors ${
                    groupName !== 'General' ? 'cursor-grab active:cursor-grabbing hover:bg-white/[0.02] rounded px-1 -mx-1' : ''
                  }`}
                  title={groupName !== 'General' ? 'Mantén presionado y arrastra para reordenar o mover a otra pestaña' : undefined}
                >
                  <button
                    onClick={() => handleGroupHeaderClick(groupName)}
                    className="flex items-center gap-2 text-xs font-bold text-luxury-primary hover:text-white transition-smooth cursor-pointer"
                  >
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${
                        isCollapsed ? '-rotate-90' : 'rotate-0'
                      }`}
                    />
                    <Folder className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{groupName}</span>
                    <span className="text-[10px] bg-white/10 text-slate-300 px-1.5 py-0.5 rounded-full font-medium">
                      {groupTasks.length}
                    </span>
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Botón para editar subcategoría */}
                    {groupName !== 'General' && groupDef && onOpenDetail && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDetail(groupDef);
                        }}
                        className="p-1 text-slate-500 hover:text-indigo-400 hover:bg-white/5 rounded transition-smooth cursor-pointer"
                        title="Editar detalles de la subcategoría"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Botón para promover subcategoría a Categoría principal */}
                    {groupName !== 'General' && onPromoteGroupToCategory && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPromoteGroupToCategory(groupName);
                        }}
                        className="p-1 text-slate-500 hover:text-indigo-400 hover:bg-white/5 rounded transition-smooth cursor-pointer"
                        title="Promover a pestaña de Categoría"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Botón para convertir subcategoría de vuelta a tarea normal */}
                    {groupName !== 'General' && onConvertGroupToTask && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (groupTasks.length > 0) {
                            setRevertingGroupName(groupName);
                          } else {
                            onConvertGroupToTask(groupName);
                          }
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-white/5 rounded transition-smooth cursor-pointer"
                        title="Deshacer subcategoría (convertir a tarea)"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Indicador de Color Visual con Neon Glow */}
                    {groupName !== 'General' && (
                      <div
                        className="w-2.5 h-2.5 rounded-full transition-all duration-300"
                        style={{
                          backgroundColor: groupColor,
                          boxShadow: `0 0 8px ${groupColor}`,
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Descripción de la subcategoría si existe y no está colapsado */}
                {!isCollapsed && groupDef && groupDef.nota && (
                  <p className="text-[11px] text-luxury-secondary/85 bg-white/[0.01] border border-white/5 rounded-lg px-3 py-2 ml-6 mr-2 -mt-1 mb-1 leading-relaxed font-normal italic">
                    {groupDef.nota}
                  </p>
                )}

                {/* Lista de tareas del grupo */}
                <div
                  className={`flex flex-col gap-1.5 transition-all duration-300 overflow-hidden ${
                    isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'
                  }`}
                >
                  {groupTasks.length > 0 ? (
                    groupTasks.map((task) => {
                      const { color } = getCategoryDetails(task.categoria_id);
                      const isDragging = draggedTaskId === task.id;

                      return (
                        <div
                          key={task.id}
                          draggable={disabledDragTaskId !== task.id}
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
                            onDragDisableChange={(disabled) => {
                              setDisabledDragTaskId(disabled ? task.id : null);
                            }}
                          />
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-[10px] text-luxury-muted italic py-3 text-center border border-dashed border-white/5 rounded-xl">
                      Subcategoría vacía. Escribe arriba o arrastra tareas aquí.
                    </div>
                  )}
                </div>
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
      {/* Confirmación para deshacer subcategoría con ítems */}
      {revertingGroupName && (
        <ConfirmModal
          isOpen={!!revertingGroupName}
          title="Deshacer Subcategoría"
          message={`Esta subcategoría contiene tareas. Si la deshaces, todas sus tareas asociadas se convertirán en tareas normales en esta misma categoría.`}
          confirmText="Confirmar"
          cancelText="Cancelar"
          onConfirm={() => {
            if (onConvertGroupToTask && revertingGroupName) {
              onConvertGroupToTask(revertingGroupName);
            }
            setRevertingGroupName(null);
          }}
          onCancel={() => setRevertingGroupName(null)}
        />
      )}
    </div>
  );
}
