'use client';

import React, { useState, useEffect } from 'react';
import { List, CalendarRange, Loader2, Command } from 'lucide-react';
import { supabase, Categoria, Pendiente } from '../lib/supabase';
import CategoryTabs from '../components/CategoryTabs';
import QuickInput from '../components/QuickInput';
import TaskListView from '../components/TaskListView';
import TaskTimelineView from '../components/TaskTimelineView';

// Paleta de colores premium para nuevas categorías
const PREMIUM_COLORS = [
  '#3b82f6', // Azul
  '#10b981', // Esmeralda
  '#f59e0b', // Ámbar
  '#ec4899', // Rosa
  '#8b5cf6', // Violeta
  '#06b6d4', // Cian
  '#f43f5e', // Rosa Intenso
  '#a855f7', // Púrpura
  '#14b8a6', // Teal
];

export default function Home() {
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [tasks, setTasks] = useState<Pendiente[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Carga inicial de datos
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        // ── DIAGNÓSTICO TEMPORAL ─────────────────────────────────────────
        // Esto imprimirá en la consola del NAVEGADOR la URL exacta que usa Supabase.
        // Si ves algo raro (trailing slash, espacios, undefined) ¡ahí está el bug!
        console.log('[DEBUG] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
        console.log('[DEBUG] Anon Key (primeros 20 chars):', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20));
        // ────────────────────────────────────────────────────────────────

        // Fetch Categorías
        const { data: catsData, error: catsError } = await supabase
          .from('categorias')
          .select('*')
          .order('created_at', { ascending: true });

        if (catsError) throw catsError;

        // Fetch Pendientes
        const { data: tasksData, error: tasksError } = await supabase
          .from('pendientes')
          .select('*')
          .order('created_at', { ascending: false });

        if (tasksError) throw tasksError;

        setCategories(catsData || []);
        setTasks(tasksData || []);
      } catch (err) {
        console.error('Error cargando datos de Supabase:', err);
        setErrorMessage(
          'No se pudo conectar con Supabase. Verifica tus variables de entorno (.env.local) o las tablas SQL.'
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // 1. CREACIÓN DE TAREA (Optimista)
  const handleCreateTask = async (titulo: string, fechaLimite: string | null) => {
    const tempId = crypto.randomUUID();
    const newTask: Pendiente = {
      id: tempId,
      created_at: new Date().toISOString(),
      titulo,
      nota: null,
      fecha_limite: fechaLimite,
      completado: false,
      categoria_id: activeCategoryId, // Si estamos en Inbox es null, si no, toma la pestaña activa
    };

    // Actualización optimista de estado local
    setTasks((prev) => [newTask, ...prev]);

    try {
      const { data, error } = await supabase
        .from('pendientes')
        .insert([{
          titulo: newTask.titulo,
          fecha_limite: newTask.fecha_limite,
          completado: newTask.completado,
          categoria_id: newTask.categoria_id,
        }])
        .select()
        .single();

      if (error) throw error;

      // Reemplazar la tarea temporal con la real creada en la BD (para tener el UUID real)
      setTasks((prev) =>
        prev.map((t) => (t.id === tempId ? { ...t, id: data.id, created_at: data.created_at } : t))
      );
    } catch (err) {
      console.error('Error insertando tarea:', err);
      // Revertir estado local en caso de fallo
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      alert('Error al guardar la tarea. Revisa tu conexión.');
    }
  };

  // 2. TOGGLE COMPLETAR TAREA (Optimista)
  const handleToggleTask = async (id: string, completado: boolean) => {
    // Guardar copia del estado anterior
    const previousTasks = [...tasks];

    // Actualización optimista
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completado } : t))
    );

    try {
      const { error } = await supabase
        .from('pendientes')
        .update({ completado })
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Error toggling tarea:', err);
      // Revertir
      setTasks(previousTasks);
      alert('No se pudo actualizar el estado de la tarea.');
    }
  };

  // 3. ELIMINAR TAREA (Optimista)
  const handleDeleteTask = async (id: string) => {
    const previousTasks = [...tasks];

    // Actualización optimista
    setTasks((prev) => prev.filter((t) => t.id !== id));

    try {
      const { error } = await supabase
        .from('pendientes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Error eliminando tarea:', err);
      setTasks(previousTasks);
      alert('Error al eliminar la tarea.');
    }
  };

  // 4. ACTUALIZAR TAREA - Renombrar (Optimista)
  const handleUpdateTask = async (id: string, updates: Partial<Pendiente>) => {
    const previousTasks = [...tasks];

    // Actualización optimista
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );

    try {
      const { error } = await supabase
        .from('pendientes')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Error actualizando tarea:', err);
      setTasks(previousTasks);
      alert('No se pudo actualizar la tarea.');
    }
  };

  // 5. CREACIÓN DE CATEGORÍA (Optimista)
  const handleCreateCategory = async (nombre: string) => {
    const tempId = crypto.randomUUID();
    const randomColor = PREMIUM_COLORS[Math.floor(Math.random() * PREMIUM_COLORS.length)];
    const newCat: Categoria = {
      id: tempId,
      created_at: new Date().toISOString(),
      nombre,
      color: randomColor,
    };

    // Actualización optimista
    setCategories((prev) => [...prev, newCat]);

    try {
      const { data, error } = await supabase
        .from('categorias')
        .insert([{ nombre: newCat.nombre, color: newCat.color }])
        .select()
        .single();

      if (error) throw error;

      // Actualizar ID temporal con el real de la BD
      setCategories((prev) =>
        prev.map((c) => (c.id === tempId ? { ...c, id: data.id, created_at: data.created_at } : c))
      );
      // Opcionalmente enfocar la pestaña creada
      setActiveCategoryId(data.id);
    } catch (err) {
      console.error('Error creando categoría:', err);
      setCategories((prev) => prev.filter((c) => c.id !== tempId));
      alert('Error al crear la categoría.');
    }
  };

  // 6. RENOMBRAR CATEGORÍA (Optimista)
  const handleRenameCategory = async (id: string, nuevoNombre: string) => {
    const previousCats = [...categories];

    // Actualización optimista
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, nombre: nuevoNombre } : c))
    );

    try {
      const { error } = await supabase
        .from('categorias')
        .update({ nombre: nuevoNombre })
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Error renombrando categoría:', err);
      setCategories(previousCats);
      alert('No se pudo renombrar la categoría.');
    }
  };

  // 7. ELIMINAR CATEGORÍA (Optimista)
  const handleDeleteCategory = async (id: string) => {
    const previousCats = [...categories];
    const previousTasks = [...tasks];

    // Actualización optimista: quitar categoría y sus tareas locales (on delete cascade)
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setTasks((prev) => prev.filter((t) => t.categoria_id !== id));

    // Si la categoría activa era la que eliminamos, regresamos a Inbox
    if (activeCategoryId === id) {
      setActiveCategoryId(null);
    }

    try {
      const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Error eliminando categoría:', err);
      setCategories(previousCats);
      setTasks(previousTasks);
      alert('No se pudo eliminar la categoría.');
    }
  };

  // Nombre de la categoría activa para mostrar en el placeholder del input
  const activeCategoryName =
    activeCategoryId === null
      ? 'Inbox / Hoy'
      : categories.find((c) => c.id === activeCategoryId)?.nombre || 'Categoría';

  return (
    <div className="flex-1 w-full max-w-3xl mx-auto flex flex-col px-4 md:px-8 py-8 md:py-16 gap-8">
      {/* HEADER: Título y Selector de Vista */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
            <span className="font-bold text-base tracking-tighter">O</span>
            <span className="font-semibold text-xs tracking-tighter -ml-0.5 text-blue-400">S</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-white leading-tight">Personal Task OS</h1>
            <p className="text-[10px] text-slate-400 font-medium">MINIMALIST WORKSPACE</p>
          </div>
        </div>

        {/* Interruptor de Modo Dual de Visualización */}
        <div className="flex items-center p-0.5 bg-white/5 border border-white/5 rounded-xl">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-smooth cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white text-slate-950 shadow-md shadow-white/5'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Vista Lista"
          >
            <List className="w-3.5 h-3.5" />
            <span className="max-sm:hidden">Lista</span>
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-smooth cursor-pointer ${
              viewMode === 'timeline'
                ? 'bg-white text-slate-950 shadow-md shadow-white/5'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Vista Línea de Tiempo"
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span className="max-sm:hidden">Línea de Tiempo</span>
          </button>
        </div>
      </header>

      {/* ERROR MESSAGE (en caso de que falle Supabase) */}
      {errorMessage && (
        <div className="glass-panel border-red-500/20 bg-red-500/5 rounded-2xl p-4 text-xs md:text-sm text-red-400 flex flex-col gap-2 animate-check-pop">
          <span className="font-semibold">⚠️ Configuración Pendiente:</span>
          <p>{errorMessage}</p>
          <div className="text-[10px] text-slate-400 mt-1 font-mono bg-black/30 p-2 rounded border border-white/5">
            1. Ejecuta el script SQL en el editor SQL de Supabase.<br />
            2. Crea el archivo .env.local en la raíz del proyecto.<br />
            3. Rellena NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Inicializando Task OS...</span>
        </div>
      ) : (
        <main className="flex flex-col gap-6 flex-1">
          {/* Fila de Captura Rápida (Solo visible si no hay error crítico) */}
          <section className="flex flex-col gap-2">
            <QuickInput
              onSubmitTask={handleCreateTask}
              activeCategoryName={activeCategoryName}
            />
          </section>

          {/* Barra de Pestañas Dinámicas (Oculta en modo Timeline, tal como especificó el requerimiento) */}
          {viewMode === 'list' && (
            <section className="flex flex-col gap-1 border-b border-white/5 pb-2">
              <CategoryTabs
                categories={categories}
                activeCategoryId={activeCategoryId}
                onSelectCategory={setActiveCategoryId}
                onCreateCategory={handleCreateCategory}
                onRenameCategory={handleRenameCategory}
                onDeleteCategory={handleDeleteCategory}
              />
            </section>
          )}

          {/* Vistas Renderizables */}
          <section className="flex-1">
            {viewMode === 'list' ? (
              <TaskListView
                tasks={tasks}
                categories={categories}
                activeCategoryId={activeCategoryId}
                onToggleTask={handleToggleTask}
                onDeleteTask={handleDeleteTask}
                onUpdateTask={handleUpdateTask}
              />
            ) : (
              <TaskTimelineView
                tasks={tasks}
                categories={categories}
                onToggleTask={handleToggleTask}
                onDeleteTask={handleDeleteTask}
                onUpdateTask={handleUpdateTask}
              />
            )}
          </section>
        </main>
      )}

      {/* FOOTER: Atajo visual flotante o informativo */}
      <footer className="flex items-center justify-between text-[10px] text-slate-500 border-t border-white/5 pt-4">
        <span>Personal Task OS • v1.0.0</span>
        <div className="flex items-center gap-1 font-mono">
          <Command className="w-2.5 h-2.5" />
          <span>+ K enfoca la captura</span>
        </div>
      </footer>
    </div>
  );
}
