'use client';

import React, { useState, useEffect } from 'react';
import { List, CalendarRange, Loader2, Command, Sun, Moon, LayoutGrid, LogOut, Clipboard, Check } from 'lucide-react';
import { supabase, Categoria, Pendiente } from '../lib/supabase';
import CategoryTabs from '../components/CategoryTabs';
import QuickInput from '../components/QuickInput';
import TaskListView from '../components/TaskListView';
import TaskTimelineView from '../components/TaskTimelineView';
import TaskVisualView from '../components/TaskVisualView';
import TaskDetailModal from '../components/TaskDetailModal';
import AuthScreen from '../components/AuthScreen';
import ConfirmModal from '../components/ConfirmModal';
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

// Helper para generar UUIDs robustos incluso en contextos no seguros (HTTP)
const generateUUID = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

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
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [lastDeletedTask, setLastDeletedTask] = useState<Pendiente | null>(null);
  const [activeGroupName, setActiveGroupName] = useState<string | null>(null);
  const [activeGroupColor, setActiveGroupColor] = useState<string | null>(null);

  // Al cambiar de categoría activa, reiniciar el grupo activo
  useEffect(() => {
    setActiveGroupName(null);
    setActiveGroupColor(null);
  }, [activeCategoryId]);

  // Copiar tareas al portapapeles con fallback robusto
  const handleExportToClipboard = () => {
    if (tasks.length === 0) {
      alert('No hay tareas para exportar.');
      return;
    }

    let text = `# Mis Ideas y Tareas - Keago\n\n`;

    // Categoría activa o todas
    const targetCategoryId = activeCategoryId;

    if (targetCategoryId !== null) {
      // Exportar solo la categoría seleccionada
      const catName = categories.find(c => c.id === targetCategoryId)?.nombre || 'Categoría';
      text += `## Categoría: ${catName}\n`;
      const catTasks = tasks.filter(t => t.categoria_id === targetCategoryId);
      if (catTasks.length === 0) {
        text += `*(No hay tareas en esta categoría)*\n`;
      } else {
        catTasks.forEach(t => {
          const status = t.completado ? '[x]' : '[ ]';
          const date = t.fecha_limite ? ` (Fecha límite: ${t.fecha_limite})` : '';
          const note = t.nota ? `\n   Nota: ${t.nota}` : '';
          text += `- ${status} ${t.titulo}${date}${note}\n`;
        });
      }
    } else {
      // Exportar todas las categorías
      const inboxTasks = tasks.filter(t => t.categoria_id === null);
      if (inboxTasks.length > 0) {
        text += `## Inbox / Hoy\n`;
        inboxTasks.forEach(t => {
          const status = t.completado ? '[x]' : '[ ]';
          const date = t.fecha_limite ? ` (Fecha límite: ${t.fecha_limite})` : '';
          const note = t.nota ? `\n   Nota: ${t.nota}` : '';
          text += `- ${status} ${t.titulo}${date}${note}\n`;
        });
        text += `\n`;
      }

      categories.forEach(cat => {
        const catTasks = tasks.filter(t => t.categoria_id === cat.id);
        if (catTasks.length > 0) {
          text += `## Categoría: ${cat.nombre}\n`;
          catTasks.forEach(t => {
            const status = t.completado ? '[x]' : '[ ]';
            const date = t.fecha_limite ? ` (Fecha límite: ${t.fecha_limite})` : '';
            const note = t.nota ? `\n   Nota: ${t.nota}` : '';
            text += `- ${status} ${t.titulo}${date}${note}\n`;
          });
          text += `\n`;
        }
      });
    }

    const cleanText = text.trim();

    // Intentar navigator.clipboard.writeText
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(cleanText)
        .then(() => {
          setCopied(true);
          setToastMessage('¡Lista copiada al portapapeles!');
          setTimeout(() => {
            setCopied(false);
            setToastMessage(null);
          }, 2000);
        })
        .catch(err => {
          console.warn('Fallo navigator.clipboard, usando fallback:', err);
          fallbackCopyText(cleanText);
        });
    } else {
      fallbackCopyText(cleanText);
    }
  };

  // Método de respaldo clásico que funciona en cualquier contexto de navegador
  const fallbackCopyText = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        setCopied(true);
        setToastMessage('¡Lista copiada al portapapeles!');
        setTimeout(() => {
          setCopied(false);
          setToastMessage(null);
        }, 2000);
      } else {
        alert('No se pudo copiar el texto. Intente seleccionarlo manualmente.');
      }
    } catch (err) {
      console.error('Error en el fallback de copiado:', err);
      alert('Error al copiar al portapapeles.');
    }
  };

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

  const handleCreateTask = async (
    titulo: string, 
    fechaLimite: string | null, 
    grupoNombre?: string | null, 
    grupoColor?: string | null
  ) => {
    if (!user) return;
    const tempId = generateUUID();
    const newTask: Pendiente = {
      id: tempId,
      created_at: new Date().toISOString(),
      titulo,
      nota: null,
      fecha_limite: fechaLimite,
      completado: false,
      categoria_id: activeCategoryId, // Si estamos en Inbox es null, si no, toma la pestaña activa
      user_id: user.id,
      grupo_nombre: grupoNombre || null,
      grupo_color: grupoColor || null,
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
          grupo_nombre: newTask.grupo_nombre,
          grupo_color: newTask.grupo_color,
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
    const taskToDelete = tasks.find(t => t.id === id);
    if (!taskToDelete) return;

    setLastDeletedTask(taskToDelete);
    const previousTasks = [...tasks];

    // Actualización optimista
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setToastMessage('Tarea eliminada');

    // Desvanecer el Toast y borrar el historial de deshacer tras 5 segundos
    setTimeout(() => {
      setToastMessage(prev => prev === 'Tarea eliminada' ? null : prev);
      setLastDeletedTask(null);
    }, 5000);

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
      setLastDeletedTask(null);
      setToastMessage('Error al eliminar la tarea');
      setTimeout(() => setToastMessage(null), 2000);
    }
  };

  // RESTAURAR TAREA ELIMINADA (Deshacer)
  const handleUndoDelete = async () => {
    if (!lastDeletedTask || !user) return;
    
    // Restauración optimista
    const restoredTask = lastDeletedTask;
    setLastDeletedTask(null);
    setTasks(prev => [restoredTask, ...prev]);
    setToastMessage('Tarea restaurada');
    setTimeout(() => setToastMessage(prev => prev === 'Tarea restaurada' ? null : prev), 2000);

    try {
      const { error } = await supabase
        .from('pendientes')
        .insert(restoredTask);

      if (error) throw error;
    } catch (err) {
      console.error('Error restaurando tarea:', err);
      setTasks(prev => prev.filter(t => t.id !== restoredTask.id));
      setToastMessage('Error al restaurar tarea');
      setTimeout(() => setToastMessage(null), 2000);
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

  // Convertir subcategoría en tarea normal (Deshacer grupo)
  const handleConvertGroupToTask = async (groupName: string) => {
    if (!user) return;
    try {
      const definitionTask = tasks.find(t => t.es_grupo && t.grupo_nombre === groupName);
      if (!definitionTask) return;

      const previousTasks = [...tasks];
      const previousCategories = [...categories];

      // 1. Buscar o crear la categoría "General"
      let generalCat = categories.find(c => c.nombre.toLowerCase() === 'general');
      let generalCatId = generalCat?.id;

      if (!generalCat) {
        const tempCatId = generateUUID();
        const finalColor = '#3b82f6'; // Azul Cobalto premium por defecto para General
        const newCat: Categoria = {
          id: tempCatId,
          created_at: new Date().toISOString(),
          nombre: 'General',
          color: finalColor,
          user_id: user.id
        };

        // Actualizar categorías en el estado local
        setCategories((prev) => [...prev, newCat]);
        generalCatId = tempCatId;

        // Insertar la nueva categoría General en Supabase
        const { error: catError } = await supabase
          .from('categorias')
          .insert([{
            id: tempCatId,
            nombre: 'General',
            color: finalColor,
            user_id: user.id
          }]);

        if (catError) {
          console.error('Error creando categoría General:', catError);
          setCategories(previousCategories);
          throw catError;
        }
      }

      // 2. Actualizar optimistamente el estado local de las tareas
      setTasks(prev => prev.map(t => {
        if (t.id === definitionTask.id) {
          // La subcategoría misma vuelve a ser tarea normal (mantiene su categoría actual)
          return { ...t, es_grupo: false, grupo_nombre: null, grupo_color: null };
        }
        if (t.grupo_nombre === groupName) {
          // Las tareas hijas se mueven a la categoría "General" y se limpia su grupo
          return { ...t, categoria_id: generalCatId || null, grupo_nombre: null, grupo_color: null };
        }
        return t;
      }));

      // Paso 1 en BD: Cambiar la definición a tarea normal
      const { error: defError } = await supabase
        .from('pendientes')
        .update({ es_grupo: false, grupo_nombre: null, grupo_color: null })
        .eq('id', definitionTask.id)
        .eq('user_id', user.id);

      if (defError) {
        setTasks(previousTasks);
        if (!generalCat) setCategories(previousCategories);
        throw defError;
      }

      // Paso 2 en BD: Mover todos los pendientes de este grupo a la categoría General y limpiar grupo
      const { error: tasksError } = await supabase
        .from('pendientes')
        .update({ categoria_id: generalCatId, grupo_nombre: null, grupo_color: null })
        .eq('grupo_nombre', groupName)
        .eq('user_id', user.id);

      if (tasksError) {
        setTasks(previousTasks);
        if (!generalCat) setCategories(previousCategories);
        throw tasksError;
      }

      // Reiniciar grupo activo si es el que se está convirtiendo
      if (activeGroupName === groupName) {
        setActiveGroupName(null);
        setActiveGroupColor(null);
      }
    } catch (err) {
      console.error('Error al deshacer subcategoría:', err);
      alert('No se pudo deshacer la subcategoría.');
    }
  };

  // Mover una tarea o subcategoría (grupo) completa a otra categoría (Drag and Drop)
  const handleMoveTaskOrGroup = async (taskId: string, targetCategoryId: string | null) => {
    if (!user) return;
    const taskToMove = tasks.find(t => t.id === taskId);
    if (!taskToMove) return;

    const previousTasks = [...tasks];

    if (taskToMove.es_grupo) {
      const groupName = taskToMove.grupo_nombre;
      
      // Actualización optimista de estado local
      setTasks(prev => prev.map(t => {
        if (t.id === taskId) {
          return { ...t, categoria_id: targetCategoryId };
        }
        if (t.grupo_nombre === groupName) {
          return { ...t, categoria_id: targetCategoryId };
        }
        return t;
      }));

      try {
        // Actualizar la cabecera del grupo en la BD
        const { error: defError } = await supabase
          .from('pendientes')
          .update({ categoria_id: targetCategoryId })
          .eq('id', taskId)
          .eq('user_id', user.id);

        if (defError) throw defError;

        // Actualizar todas las tareas del grupo en la BD
        if (groupName) {
          const { error: tasksError } = await supabase
            .from('pendientes')
            .update({ categoria_id: targetCategoryId })
            .eq('grupo_nombre', groupName)
            .eq('user_id', user.id);

          if (tasksError) throw tasksError;
        }
      } catch (err) {
        console.error('Error al mover subcategoría y sus tareas:', err);
        setTasks(previousTasks);
        alert('No se pudo mover la subcategoría.');
      }
    } else {
      // Es una tarea normal
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, categoria_id: targetCategoryId } : t));

      try {
        const { error } = await supabase
          .from('pendientes')
          .update({ categoria_id: targetCategoryId })
          .eq('id', taskId)
          .eq('user_id', user.id);

        if (error) throw error;
      } catch (err) {
        console.error('Error al mover tarea a categoría:', err);
        setTasks(previousTasks);
        alert('No se pudo mover la tarea.');
      }
    }
  };

  // 5. CREACIÓN DE CATEGORÍA (Optimista)
  const handleCreateCategory = async (nombre: string) => {
    if (!user) return;
    const tempId = generateUUID();
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
    setDeletingCategoryId(id);
  };

  const confirmDeleteCategory = async (id: string) => {
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
      ? (activeGroupName ? `Inbox > ${activeGroupName}` : 'Inbox / Hoy')
      : `${categories.find((c) => c.id === activeCategoryId)?.nombre || 'Categoría'}${activeGroupName ? ` > ${activeGroupName}` : ''}`;

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
      <header className="flex items-center justify-between gap-4">
        {/* Logo "KEAGO" */}
        <div className="px-3 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/10 w-fit flex-shrink-0 animate-check-pop">
          <span className="font-extrabold text-base tracking-tighter">KEAGO</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón Exportar para Gemini */}
          <button
            onClick={handleExportToClipboard}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-smooth cursor-pointer glass-panel border-white/5 hover:text-slate-900 dark:hover:text-slate-100 glass-panel-hover ${
              copied
                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                : 'text-slate-400'
            }`}
            title={activeCategoryId ? "Copiar tareas de esta categoría" : "Copiar todas las tareas"}
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400 animate-check-pop" />
            ) : (
              <Clipboard className="w-4 h-4" />
            )}
          </button>

          {/* Interruptor de Vista Triple */}
          <div className="flex items-center p-0.5 glass-panel rounded-xl">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-smooth cursor-pointer ${
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
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-smooth cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Vista Calendario"
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span className="max-sm:hidden">Calendario</span>
            </button>
            <button
              onClick={() => setViewMode('visual')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-smooth cursor-pointer ${
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
          {/* Fila de Captura Rápida con Buscador Integrado */}
          <section className="flex gap-3">
            <div className="flex-1">
              <QuickInput
                onSubmitTask={handleCreateTask}
                activeCategoryName={activeCategoryName}
                tasks={tasks}
                categories={categories}
                onToggleTask={handleToggleTask}
                onOpenDetail={setSelectedTask}
                activeGroupName={activeGroupName}
                activeGroupColor={activeGroupColor}
              />
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
                onDropTaskOrGroup={handleMoveTaskOrGroup}
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
                onCreateTask={handleCreateTask}
                activeGroupName={activeGroupName}
                onSelectGroup={(name, color) => {
                  setActiveGroupName(name);
                  setActiveGroupColor(color);
                }}
                onConvertGroupToTask={handleConvertGroupToTask}
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

      {/* Toast de Notificación Flotante */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
          <div className="px-4 py-2.5 bg-white/90 dark:bg-slate-950/90 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl shadow-2xl backdrop-blur-md animate-check-pop flex items-center gap-2.5 pointer-events-auto">
            <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 animate-check-pop" />
            <span>{toastMessage}</span>
            {lastDeletedTask && toastMessage === 'Tarea eliminada' && (
              <button
                onClick={handleUndoDelete}
                className="ml-1 px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 border border-indigo-500/15 rounded-lg text-[10px] font-bold tracking-wide transition-smooth cursor-pointer uppercase"
              >
                Deshacer
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirmación para eliminar categoría */}
      {deletingCategoryId && (
        <ConfirmModal
          isOpen={!!deletingCategoryId}
          title="Eliminar Categoría"
          message={`¿Eliminar la categoría "${categories.find(c => c.id === deletingCategoryId)?.nombre}"? Se borrarán todas sus tareas asociadas.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          isDestructive={true}
          onConfirm={() => {
            const id = deletingCategoryId;
            setDeletingCategoryId(null);
            confirmDeleteCategory(id);
          }}
          onCancel={() => setDeletingCategoryId(null)}
        />
      )}

      {/* Barra de progreso flotante abajo */}
      {totalCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 glass-panel px-4 py-2.5 rounded-full shadow-lg border border-white/10 flex items-center gap-3 backdrop-blur-md animate-fade-in max-w-sm w-[90%] md:w-auto">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
            {completionRate}% completado
          </span>
          <div className="w-24 md:w-32 h-2 bg-slate-200 dark:bg-slate-700/60 rounded-full overflow-hidden flex-shrink-0">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold whitespace-nowrap">
            {completedCount}/{totalCount}
          </span>
        </div>
      )}
    </div>
  );
}
