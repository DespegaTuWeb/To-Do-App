'use client';

import React, { useState, useEffect } from 'react';
import { List, CalendarRange, Loader2, Command, Sun, Moon, LayoutGrid, LogOut } from 'lucide-react';
import { supabase, Categoria, Pendiente } from '../lib/supabase';
import CategoryTabs from '../components/CategoryTabs';
import QuickInput from '../components/QuickInput';
import TaskListView from '../components/TaskListView';
import TaskTimelineView from '../components/TaskTimelineView';
import TaskVisualView from '../components/TaskVisualView';
import TaskDetailModal from '../components/TaskDetailModal';
import AuthScreen from '../components/AuthScreen';
import { User } from '@supabase/supabase-js';

// Paleta de colores premium para nuevas categorías
const PREMIUM_COLORS = [
  '#3b82f6', // Azul Cobalto
  '#10b981', // Esmeralda Brillante
  '#f59e0b', // Ámbar Metálico
  '#ec4899', // Rosa Eléctrico
  '#8b5cf6', // Violeta Real
  '#06b6d4', // Cian Nórdico
  '#f43f5e', // Rosa Coral
  '#a855f7', // Púrpura Orquídea
  '#14b8a6', // Menta Teal
  '#f97316', // Naranja Cobre
  '#fbbf24', // Oro Brillante
  '#34d399', // Verde Primavera
  '#60a5fa', // Azul Cielo
  '#a78bfa', // Lavanda Suave
  '#22c55e', // Verde Bosque
  '#6366f1', // Índigo Místico
  '#d946ef', // Magenta Imperial
  '#fb7185', // Rosa Fresa
  '#c084fc', // Lila
  '#2dd4bf', // Verde Agua
  '#818cf8', // Azul Lavanda
  '#059669', // Verde Jade
  '#0284c7', // Azul Océano
  '#b45309', // Canela Terracota
  '#701a75', // Ciruela Oscuro
  '#4d7c0f', // Verde Oliva
  '#be123c', // Rojo Rubí
  '#4338ca', // Violeta Nocturno
  '#0f766e', // Verde Pino
  '#ea580c', // Óxido Naranja
  '#0369a1', // Mar Profundo
  '#15803d', // Trébol Verde
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [tasks, setTasks] = useState<Pendiente[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'timeline' | 'visual'>('list');
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [selectedTask, setSelectedTask] = useState<Pendiente | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Escuchar estado de autenticación
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Efecto para inicializar el tema
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
      if (savedTheme) {
        setTheme(savedTheme);
        if (savedTheme === 'light') {
          document.documentElement.classList.add('light');
        } else {
          document.documentElement.classList.remove('light');
        }
      } else {
        const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
        const initialTheme = prefersLight ? 'light' : 'dark';
        setTheme(initialTheme);
        if (initialTheme === 'light') {
          document.documentElement.classList.add('light');
        } else {
          document.documentElement.classList.remove('light');
        }
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  // Carga inicial de datos
  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        setIsLoading(true);
        setErrorMessage(null);

        // Fetch Categorías
        const { data: catsData, error: catsError } = await supabase
          .from('categorias')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (catsError) throw catsError;

        // Fetch Pendientes
        const { data: tasksData, error: tasksError } = await supabase
          .from('pendientes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (tasksError) throw tasksError;

        const loadedCats = catsData || [];
        if (typeof window !== 'undefined') {
          const storedOrder = localStorage.getItem(`category_order_${user.id}`);
          if (storedOrder) {
            try {
              const ids = JSON.parse(storedOrder) as string[];
              loadedCats.sort((a, b) => {
                const idxA = ids.indexOf(a.id);
                const idxB = ids.indexOf(b.id);
                if (idxA === -1 && idxB === -1) return 0;
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
              });
            } catch (e) {
              console.error('Error parseando category_order:', e);
            }
          }
        }
        const loadedTasks = tasksData || [];
        if (typeof window !== 'undefined') {
          const storedTaskOrder = localStorage.getItem(`task_order_${user.id}`);
          if (storedTaskOrder) {
            try {
              const ids = JSON.parse(storedTaskOrder) as string[];
              loadedTasks.sort((a, b) => {
                const idxA = ids.indexOf(a.id);
                const idxB = ids.indexOf(b.id);
                if (idxA === -1 && idxB === -1) return 0;
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
              });
            } catch (e) {
              console.error('Error parseando task_order:', e);
            }
          }
        }
        setCategories(loadedCats);
        setTasks(loadedTasks);
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
  }, [user]);

  // Curar colores de categorías duplicados o planos automáticamente
  useEffect(() => {
    if (categories.length > 0 && !isLoading && user) {
      const healColors = async () => {
        const usedColors = new Set<string>();
        const categoriesToUpdate: { id: string; color: string }[] = [];
        
        categories.forEach((cat) => {
          if (usedColors.has(cat.color) || !PREMIUM_COLORS.includes(cat.color)) {
            const availableColors = PREMIUM_COLORS.filter(color => !usedColors.has(color));
            const newColor = availableColors.length > 0
              ? availableColors[Math.floor(Math.random() * availableColors.length)]
              : PREMIUM_COLORS[Math.floor(Math.random() * PREMIUM_COLORS.length)];
            
            categoriesToUpdate.push({ id: cat.id, color: newColor });
            usedColors.add(newColor);
          } else {
            usedColors.add(cat.color);
          }
        });

        if (categoriesToUpdate.length > 0) {
          console.log('[DEBUG] Curando colores duplicados para:', categoriesToUpdate);
          for (const item of categoriesToUpdate) {
            await supabase
              .from('categorias')
              .update({ color: item.color })
              .eq('id', item.id)
              .eq('user_id', user.id);
          }
          setCategories((prev) =>
            prev.map((c) => {
              const update = categoriesToUpdate.find((u) => u.id === c.id);
              return update ? { ...c, color: update.color } : c;
            })
          );
        }
      };
      
      healColors();
    }
  }, [categories, isLoading, user]);

  // 1. CREACIÓN DE TAREA (Optimista)
  const handleCreateTask = async (titulo: string, fechaLimite: string | null) => {
    if (!user) return;
    const tempId = crypto.randomUUID();
    const newTask: Pendiente = {
      id: tempId,
      created_at: new Date().toISOString(),
      titulo,
      nota: null,
      fecha_limite: fechaLimite,
      completado: false,
      categoria_id: activeCategoryId, // Si estamos en Inbox es null, si no, toma la pestaña activa
      user_id: user.id,
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
          user_id: user.id,
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
    if (!user) return;
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
        .eq('id', id)
        .eq('user_id', user.id);

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
    if (!user) return;
    const previousTasks = [...tasks];

    // Actualización optimista
    setTasks((prev) => prev.filter((t) => t.id !== id));

    try {
      const { error } = await supabase
        .from('pendientes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error eliminando tarea:', err);
      setTasks(previousTasks);
      alert('Error al eliminar la tarea.');
    }
  };

  // 4. ACTUALIZAR TAREA - Renombrar (Optimista)
  const handleUpdateTask = async (id: string, updates: Partial<Pendiente>) => {
    if (!user) return;
    const previousTasks = [...tasks];

    // Actualización optimista
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );

    try {
      const { error } = await supabase
        .from('pendientes')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error actualizando tarea:', err);
      setTasks(previousTasks);
      alert('No se pudo actualizar la tarea.');
    }
  };

  // 5. CREACIÓN DE CATEGORÍA (Optimista)
  const handleCreateCategory = async (nombre: string) => {
    if (!user) return;
    const tempId = crypto.randomUUID();
    // Algoritmo para evitar colores repetidos en categorías activas
    const usedColors = categories.map((c) => c.color);
    const unusedColors = PREMIUM_COLORS.filter((color) => !usedColors.includes(color));
    const finalColor = unusedColors.length > 0 
      ? unusedColors[Math.floor(Math.random() * unusedColors.length)]
      : PREMIUM_COLORS[Math.floor(Math.random() * PREMIUM_COLORS.length)];

    const newCat: Categoria = {
      id: tempId,
      created_at: new Date().toISOString(),
      nombre,
      color: finalColor,
      user_id: user.id,
    };

    // Actualización optimista
    setCategories((prev) => [...prev, newCat]);

    try {
      const { data, error } = await supabase
        .from('categorias')
        .insert([{ nombre: newCat.nombre, color: newCat.color, user_id: user.id }])
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
    if (!user) return;
    const previousCats = [...categories];

    // Actualización optimista
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, nombre: nuevoNombre } : c))
    );

    try {
      const { error } = await supabase
        .from('categorias')
        .update({ nombre: nuevoNombre })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error renombrando categoría:', err);
      setCategories(previousCats);
      alert('No se pudo renombrar la categoría.');
    }
  };

  // 7. ELIMINAR CATEGORÍA (Optimista)
  const handleDeleteCategory = async (id: string) => {
    if (!user) return;
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
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error eliminando categoría:', err);
      setCategories(previousCats);
      setTasks(previousTasks);
      alert('No se pudo eliminar la categoría.');
    }
  };

  // 8. REORDENAR CATEGORÍAS (Local y Persistente)
  const handleReorderCategories = (orderedCats: Categoria[]) => {
    setCategories(orderedCats);
    if (typeof window !== 'undefined' && user) {
      const ids = orderedCats.map((c) => c.id);
      localStorage.setItem(`category_order_${user.id}`, JSON.stringify(ids));
    }
  };

  // 9. REORDENAR PENDIENTES (Local y Persistente)
  const handleReorderTasks = (orderedTasks: Pendiente[]) => {
    setTasks(orderedTasks);
    if (typeof window !== 'undefined' && user) {
      const ids = orderedTasks.map((t) => t.id);
      localStorage.setItem(`task_order_${user.id}`, JSON.stringify(ids));
    }
  };

  // Nombre de la categoría activa para mostrar en el placeholder del input
  const activeCategoryName =
    activeCategoryId === null
      ? 'Inbox / Hoy'
      : categories.find((c) => c.id === activeCategoryId)?.nombre || 'Categoría';

  const pendingCount = tasks.filter(t => !t.completado).length;
  const completedCount = tasks.filter(t => t.completado).length;
  const totalCount = pendingCount + completedCount;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const filteredSearchTasks = tasks.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const titleMatch = t.titulo.toLowerCase().includes(q);
    const noteMatch = t.nota ? t.nota.toLowerCase().includes(q) : false;
    return titleMatch || noteMatch;
  });

  // Si está cargando la sesión de autenticación, mostrar pantalla de carga
  if (authLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[var(--c-page-bg)] gap-3 animate-fade-in">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="text-xs text-slate-500 font-medium tracking-wide uppercase">Cargando Sesión...</span>
      </div>
    );
  }

  // Si no hay usuario logueado, mostrar AuthScreen
  if (!user) {
    return <AuthScreen onAuthSuccess={() => {}} />;
  }

  return (
    <div className="flex-1 w-full max-w-3xl mx-auto flex flex-col px-4 md:px-8 py-8 md:py-16 gap-8">
      {/* HEADER: Título y Selector de Vista */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/10 flex-shrink-0">
            <span className="font-bold text-base tracking-tighter">O</span>
            <span className="font-semibold text-xs tracking-tighter -ml-0.5 text-indigo-200">S</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-extrabold leading-tight text-gradient-luxury">Personal Task OS</h1>
              {totalCount > 0 && (
                <div className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/15 px-2 py-0.5 rounded-lg text-[9px] font-extrabold text-indigo-500 tracking-wide animate-check-pop">
                  <div className="relative w-3 h-3 flex items-center justify-center flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="6" cy="6" r="4.5" fill="transparent" stroke="currentColor" className="opacity-15" strokeWidth="1" />
                      <circle 
                        cx="6" 
                        cy="6" 
                        r="4.5" 
                        fill="transparent" 
                        stroke="currentColor" 
                        strokeWidth="1" 
                        strokeDasharray={2 * Math.PI * 4.5} 
                        strokeDashoffset={2 * Math.PI * 4.5 * (1 - completionRate / 100)} 
                        className="transition-all duration-500"
                      />
                    </svg>
                  </div>
                  <span>{completionRate}% HECHO</span>
                </div>
              )}
            </div>
            <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">Luxury Workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Interruptor de Vista Triple */}
          <div className="flex items-center p-0.5 glass-panel rounded-xl">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-smooth cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Vista Lista"
            >
              <List className="w-3.5 h-3.5" />
              <span className="max-sm:hidden">Lista</span>
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-smooth cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Vista Línea de Tiempo"
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span className="max-sm:hidden">Línea de Tiempo</span>
            </button>
            <button
              onClick={() => setViewMode('visual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-smooth cursor-pointer ${
                viewMode === 'visual'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Vista Planificador Visual"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="max-sm:hidden">Visual</span>
            </button>
          </div>
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
          {/* Fila de Captura Rápida y Buscador Minimalista */}
          <section className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <QuickInput
                onSubmitTask={handleCreateTask}
                activeCategoryName={activeCategoryName}
              />
            </div>
            <div className="relative flex items-center sm:w-60 w-full">
              <input
                type="text"
                placeholder="Buscar pendientes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full glass-input px-3.5 py-3 text-xs md:text-sm rounded-xl text-luxury-primary placeholder:text-slate-500 font-normal focus:ring-1 focus:ring-indigo-500/20"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 text-slate-500 hover:text-luxury-primary text-[10px] font-bold cursor-pointer transition-smooth"
                >
                  limpiar
                </button>
              )}
            </div>
          </section>

          {/* Barra de Pestañas Dinámicas */}
          {viewMode === 'list' && (
            <section className="flex flex-col gap-1 border-b border-white/5 pb-2">
              <CategoryTabs
                categories={categories}
                activeCategoryId={activeCategoryId}
                onSelectCategory={setActiveCategoryId}
                onCreateCategory={handleCreateCategory}
                onRenameCategory={handleRenameCategory}
                onDeleteCategory={handleDeleteCategory}
                onReorderCategories={handleReorderCategories}
              />
            </section>
          )}

          {/* Vistas Renderizables */}
          <section className="flex-1">
            {viewMode === 'list' ? (
              <TaskListView
                tasks={filteredSearchTasks}
                categories={categories}
                activeCategoryId={activeCategoryId}
                onToggleTask={handleToggleTask}
                onDeleteTask={handleDeleteTask}
                onUpdateTask={handleUpdateTask}
                onReorderTasks={handleReorderTasks}
                onOpenDetail={setSelectedTask}
              />
            ) : viewMode === 'timeline' ? (
              <TaskTimelineView
                tasks={filteredSearchTasks}
                categories={categories}
                onToggleTask={handleToggleTask}
                onDeleteTask={handleDeleteTask}
                onUpdateTask={handleUpdateTask}
                onOpenDetail={setSelectedTask}
              />
            ) : (
              <TaskVisualView
                tasks={filteredSearchTasks}
                categories={categories}
                onToggleTask={handleToggleTask}
                onDeleteTask={handleDeleteTask}
                onUpdateTask={handleUpdateTask}
              />
            )}
          </section>
        </main>
      )}

      {/* Modal de Detalles Único de la Tarea (Global para List y Timeline) */}
      {selectedTask && (
        <TaskDetailModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          task={selectedTask}
          categories={categories}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      )}

      {/* Botones Flotantes en la esquina inferior derecha */}
      <div className="fixed bottom-6 right-6 z-[40] flex items-center gap-3">
        {/* Botón de Cerrar Sesión */}
        <button
          onClick={async () => {
            const { error } = await supabase.auth.signOut();
            if (error) alert('Error al cerrar sesión.');
          }}
          className="w-11 h-11 rounded-full glass-panel glass-panel-hover flex items-center justify-center text-slate-400 hover:text-red-400 shadow-2xl transition-smooth cursor-pointer border border-white/10"
          title="Cerrar Sesión"
        >
          <LogOut className="w-4.5 h-4.5" />
        </button>

        {/* Botón Flotante de Tema */}
        <button
          onClick={toggleTheme}
          className="w-11 h-11 rounded-full glass-panel glass-panel-hover flex items-center justify-center text-slate-400 hover:text-white shadow-2xl transition-smooth cursor-pointer border border-white/10"
          title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400 animate-check-pop" />
          ) : (
            <Moon className="w-5 h-5 text-indigo-600 animate-check-pop" />
          )}
        </button>
      </div>
    </div>
  );
}
