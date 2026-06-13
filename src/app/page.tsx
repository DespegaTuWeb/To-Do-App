'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { List, CalendarRange, Loader2, Command, Sun, Moon, LayoutGrid, LogOut, Clipboard, Check, Users } from 'lucide-react';
import { supabase, Categoria, Pendiente } from '../lib/supabase';
import CategoryTabs from '../components/CategoryTabs';
import QuickInput from '../components/QuickInput';
import TaskListView from '../components/TaskListView';
import TaskTimelineView from '../components/TaskTimelineView';
import TaskVisualView from '../components/TaskVisualView';
import TaskDetailModal from '../components/TaskDetailModal';
import AuthScreen from '../components/AuthScreen';
import ConfirmModal from '../components/ConfirmModal';
import ShareModal from '../components/ShareModal';
import ProductivityChat from '../components/ProductivityChat';
import AdminModal from '../components/AdminModal';
import { Sparkles } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import 'mobile-drag-drop/default.css';

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

// Helper seguro para acceder a localStorage en entornos restringidos (móviles, incognito)
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn('LocalStorage no disponible:', e);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('LocalStorage no disponible:', e);
    }
  }
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const lastLoadedUserIdRef = useRef<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [tasks, setTasks] = useState<Pendiente[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [convertingCategoryId, setConvertingCategoryId] = useState<string | null>(null);
  const [targetParentCategoryId, setTargetParentCategoryId] = useState<string>('inbox');
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
  const [sharedCategoryIds, setSharedCategoryIds] = useState<string[]>([]);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasPendingInvites, setHasPendingInvites] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const isInitialLoadRef = useRef(true);

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
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setAuthLoading(false);
      })
      .catch((err) => {
        console.error('Error al obtener sesión de Supabase:', err);
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

  // Inicializar polyfill de drag and drop en móviles/pantallas táctiles
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('mobile-drag-drop')
        .then(({ polyfill }) => {
          try {
            polyfill({
              holdToDrag: 200, // 200ms para no entorpecer el scroll nativo en móvil
            });
          } catch (e) {
            console.error('Error al iniciar polyfill de drag and drop:', e);
          }
        })
        .catch((err) => {
          console.error('Error al importar polyfill de drag and drop:', err);
        });
    }
  }, []);

  // Efecto para inicializar el tema
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = safeLocalStorage.getItem('theme') as 'dark' | 'light' | null;
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
    safeLocalStorage.setItem('theme', nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  // Carga de datos usando useCallback para poder invocarla desde suscripciones en tiempo real
  const loadData = useCallback(async (force = false) => {
    if (!user) {
      lastLoadedUserIdRef.current = null;
      return;
    }
    // Evitar recargar si ya cargó para este usuario y no es una recarga forzada
    if (!force && lastLoadedUserIdRef.current === user.id) return;

    try {
      if (isInitialLoadRef.current) {
        setIsLoading(true);
        isInitialLoadRef.current = false;
      }
      setErrorMessage(null);

      // Fetch Categorías (sin filtro user_id, RLS retornará propias y compartidas)
      const { data: catsData, error: catsError } = await supabase
        .from('categorias')
        .select('*')
        .order('created_at', { ascending: true });

      if (catsError) throw catsError;

      // Fetch Pendientes (sin filtro user_id, RLS retornará propias y compartidas)
      const { data: tasksData, error: tasksError } = await supabase
        .from('pendientes')
        .select('*')
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Fetch IDs de categorías compartidas aceptadas asociadas a este usuario
      const { data: sharedData, error: sharedError } = await supabase
        .from('categorias_compartidas')
        .select('categoria_id')
        .eq('aceptada', true);

      let acceptedSharedIds: string[] = [];
      if (!sharedError && sharedData) {
        acceptedSharedIds = sharedData.map((d) => d.categoria_id);
        setSharedCategoryIds(acceptedSharedIds);
      }

      // Consultar si hay invitaciones pendientes recibidas para el punto naranja de notificación
      if (user.email) {
        const { data: pendingData, error: pendingError } = await supabase
          .from('categorias_compartidas')
          .select('id')
          .eq('email_usuario', user.email.trim().toLowerCase())
          .eq('aceptada', false);

        if (!pendingError && pendingData) {
          setHasPendingInvites(pendingData.length > 0);
        }
      }

      // Consultar perfil de usuario para validar Premium
      const { data: profileData, error: profileError } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profileError && profileData) {
        let hasPremium = false;
        if (profileData.is_premium) {
          if (profileData.premium_valido_hasta) {
            const expiry = new Date(profileData.premium_valido_hasta);
            hasPremium = expiry > new Date();
          } else {
            hasPremium = true; // Premium permanente
          }
        }
        setIsPremium(hasPremium);
      } else {
        // Si no existe el perfil (por ejemplo, usuarios antiguos creados antes de la tabla/trigger)
        // se crea e inicializa. El admin es premium por defecto.
        const isUserAdmin = user.email?.trim().toLowerCase() === 'sebastianjimmysolo@gmail.com';
        const { data: newProfile, error: insertError } = await supabase
          .from('perfiles')
          .insert([{ id: user.id, email: user.email, is_premium: isUserAdmin }])
          .select()
          .single();

        if (!insertError && newProfile) {
          setIsPremium(newProfile.is_premium);
        } else {
          setIsPremium(false);
        }
      }

      const loadedCats = catsData || [];
      // Filtrar para mostrar solo las categorías propias o las compartidas y ACEPTADAS
      const visibleCats = loadedCats.filter(cat => 
        !cat.user_id || cat.user_id === user.id || acceptedSharedIds.includes(cat.id)
      );

      if (typeof window !== 'undefined') {
        const storedOrder = safeLocalStorage.getItem(`category_order_${user.id}`);
        if (storedOrder) {
          try {
            const ids = JSON.parse(storedOrder) as string[];
            visibleCats.sort((a, b) => {
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
      // Filtrar para mostrar solo las tareas de categorías visibles (o sin categoría)
      const visibleTasks = loadedTasks.filter(task => {
        if (!task.categoria_id) return true;
        return visibleCats.some(c => c.id === task.categoria_id);
      });

      if (typeof window !== 'undefined') {
        const storedTaskOrder = safeLocalStorage.getItem(`task_order_${user.id}`);
        if (storedTaskOrder) {
          try {
            const ids = JSON.parse(storedTaskOrder) as string[];
            visibleTasks.sort((a, b) => {
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

      let finalTasks = visibleTasks;
      try {
        const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local format
        const storedResetDate = safeLocalStorage.getItem(`last_routine_reset_${user.id}`);
        
        if (storedResetDate && storedResetDate !== todayStr) {
          const routineTasksToReset = visibleTasks.filter(t => {
            if (t.es_grupo || !t.completado) return false;
            const groupName = t.grupo_nombre;
            const groupNameLower = groupName?.toLowerCase() || '';
            const cat = visibleCats.find(c => c.id === t.categoria_id);
            const catNameLower = cat?.nombre?.toLowerCase() || '';
            
            if (!groupName) return false;
            
            // Una subcategoría es rutina si:
            // 1. Su nombre contiene 'rutina'
            // 2. Es el caso especial 'medicacion regular' en la pestaña 'Rex'
            // 3. Su tarea definitoria (es_grupo: true) tiene la palabra 'rutina' en su nota/descripción
            if (groupNameLower.includes('rutina')) return true;
            if (catNameLower === 'rex' && groupNameLower === 'medicacion regular') return true;
            
            const groupDefTask = visibleTasks.find(item => 
              item.es_grupo && 
              item.titulo === groupName && 
              item.categoria_id === t.categoria_id
            );
            return groupDefTask?.nota?.toLowerCase().includes('rutina') || false;
          });
          
          if (routineTasksToReset.length > 0) {
            const idsToReset = routineTasksToReset.map(t => t.id);
            await supabase
              .from('pendientes')
              .update({ completado: false })
              .in('id', idsToReset);
              
            finalTasks = visibleTasks.map(t => 
              idsToReset.includes(t.id) ? { ...t, completado: false } : t
            );
          }
        }
        safeLocalStorage.setItem(`last_routine_reset_${user.id}`, todayStr);
      } catch (resetErr) {
        console.error('Error al resetear rutinas diarias:', resetErr);
      }

      setCategories(visibleCats);
      setTasks(finalTasks);
      lastLoadedUserIdRef.current = user.id;
    } catch (err) {
      console.error('Error cargando datos de Supabase:', err);
      setErrorMessage(
        'No se pudo conectar con Supabase. Verifica tus variables de entorno (.env.local) o las tablas SQL.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Carga inicial
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Suscripción Realtime a cambios en Supabase
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('realtime_collaborative_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pendientes' },
        () => {
          loadData(true); // Recarga silenciosa al haber cambios de tareas
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categorias' },
        () => {
          loadData(true); // Recarga silenciosa al haber cambios de categorías
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categorias_compartidas' },
        () => {
          loadData(true); // Recarga silenciosa al cambiar invitaciones
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadData]);

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
    grupoColor?: string | null,
    categoriaId?: string | null,
    esGrupo?: boolean,
    nota?: string | null,
    completado?: boolean
  ): Promise<string> => {
    if (!user) return '';
    const tempId = generateUUID();
    const newTask: Pendiente = {
      id: tempId,
      created_at: new Date().toISOString(),
      titulo,
      nota: nota || null,
      fecha_limite: fechaLimite,
      completado: completado !== undefined ? completado : false,
      categoria_id: categoriaId !== undefined ? categoriaId : activeCategoryId, // Si se especifica, usarlo; de lo contrario, la pestaña activa
      user_id: user.id,
      grupo_nombre: grupoNombre || null,
      grupo_color: grupoColor || null,
      es_grupo: esGrupo || false,
    };

    // Actualización optimista de estado local
    setTasks((prev) => [newTask, ...prev]);

    try {
      const { data, error } = await supabase
        .from('pendientes')
        .insert([{
          titulo: newTask.titulo,
          nota: newTask.nota,
          fecha_limite: newTask.fecha_limite,
          completado: newTask.completado,
          categoria_id: newTask.categoria_id,
          user_id: user.id,
          grupo_nombre: newTask.grupo_nombre,
          grupo_color: newTask.grupo_color,
          es_grupo: newTask.es_grupo,
        }])
        .select()
        .single();

      if (error) throw error;

      // Reemplazar la tarea temporal con la real creada en la BD (para tener el UUID real)
      setTasks((prev) =>
        prev.map((t) => (t.id === tempId ? { ...t, id: data.id, created_at: data.created_at } : t))
      );
      return data.id;
    } catch (err) {
      console.error('Error insertando tarea:', err);
      // Revertir estado local en caso de fallo
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      alert('Error al guardar la tarea. Revisa tu conexión.');
      return tempId;
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

      // --- LOGICA DE REGISTRO AUTOMÁTICO DE RUTINAS ---
      if (completado) {
        const targetTask = previousTasks.find(t => t.id === id);
        if (targetTask && !targetTask.es_grupo) {
          const catName = categories.find(c => c.id === targetTask.categoria_id)?.nombre || '';
          const groupName = targetTask.grupo_nombre;
          const groupNameLower = groupName?.toLowerCase() || '';
          
          let isRoutine = false;
          if (groupName) {
            if (groupNameLower.includes('rutina')) {
              isRoutine = true;
            } else if (catName.toLowerCase() === 'rex' && groupNameLower === 'medicacion regular') {
              isRoutine = true;
            } else {
              // Buscar definición del grupo para comprobar si su nota contiene 'rutina'
              const groupDefTask = previousTasks.find(t => 
                t.es_grupo && 
                t.titulo === groupName && 
                t.categoria_id === targetTask.categoria_id
              );
              if (groupDefTask?.nota?.toLowerCase().includes('rutina')) {
                isRoutine = true;
              }
            }
          }

          if (isRoutine) {
            const now = new Date();
            const dd = String(now.getDate()).padStart(2, '0');
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const yy = String(now.getFullYear()).slice(-2);
            const formattedDate = `${dd}/${mm}/${yy}`;
            const regTitle = `[${targetTask.titulo}] completado ${formattedDate}`;

            await handleCreateTask(
              regTitle,
              null,
              'Completada',
              '#10b981',
              targetTask.categoria_id,
              false,
              'Registro automático de rutina.',
              true
            );
          }
        }
      }
      // ------------------------------------------------
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

  const handleUpdateTask = async (id: string, updates: Partial<Pendiente>) => {
    if (!user) return;
    const targetTask = tasks.find(t => t.id === id);
    if (!targetTask) return;

    const previousTasks = [...tasks];

    // Detectar si la tarea se está convirtiendo a grupo/subcategoría
    const isConvertingToGroup = !targetTask.es_grupo && updates.es_grupo === true;
    const hasDescription = !!targetTask.nota;

    // Detectar si el elemento que se actualiza es un grupo y si cambia su nombre o color
    const isGroupRename = targetTask.es_grupo && updates.titulo && updates.titulo !== targetTask.titulo;
    const isGroupColorChange = targetTask.es_grupo && updates.grupo_color && updates.grupo_color !== targetTask.grupo_color;

    // Si se convierte a grupo y tiene descripción, limpiamos la nota de la cabecera
    if (isConvertingToGroup && hasDescription) {
      updates.nota = null;
    }

    let updatedTasks = tasks.map((t) => (t.id === id ? { ...t, ...updates } : t));

    if (isGroupRename || isGroupColorChange) {
      const oldGroupName = targetTask.grupo_nombre || targetTask.titulo;
      const newGroupName = updates.titulo || oldGroupName;
      const newGroupColor = updates.grupo_color || targetTask.grupo_color;

      // Sincronizar el campo grupo_nombre del propio objeto de definición
      if (isGroupRename) {
        updates.grupo_nombre = newGroupName;
      }

      // Propagar optimistamente a todos los pendientes hijos
      updatedTasks = updatedTasks.map(t => {
        if (t.grupo_nombre === oldGroupName) {
          return { ...t, grupo_nombre: newGroupName, grupo_color: newGroupColor };
        }
        return t;
      });
    }

    // Si se está convirtiendo a grupo y tiene descripción, agregar la descripción como tarea hija optimista
    let newTaskId: string | null = null;
    if (isConvertingToGroup && hasDescription && targetTask.nota) {
      newTaskId = generateUUID();
      const newTask: Pendiente = {
        id: newTaskId,
        created_at: new Date().toISOString(),
        titulo: targetTask.nota,
        nota: null,
        fecha_limite: null,
        completado: false,
        categoria_id: targetTask.categoria_id,
        user_id: user.id,
        grupo_nombre: targetTask.titulo,
        grupo_color: updates.grupo_color || '#8b5cf6'
      };
      updatedTasks = [newTask, ...updatedTasks];
    }

    setTasks(updatedTasks);

    try {
      // 1. Actualizar la tarea original (que pasa a ser grupo)
      const { error } = await supabase
        .from('pendientes')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // 2. Si se convirtió y tenía descripción, insertar la nueva tarea hija en Supabase
      if (isConvertingToGroup && hasDescription && targetTask.nota && newTaskId) {
        const { error: insertError } = await supabase
          .from('pendientes')
          .insert([{
            id: newTaskId,
            titulo: targetTask.nota,
            categoria_id: targetTask.categoria_id,
            grupo_nombre: targetTask.titulo,
            grupo_color: updates.grupo_color || '#8b5cf6',
            user_id: user.id,
            completado: false
          }]);

        if (insertError) throw insertError;
      }

      // 3. Si es un grupo y cambió el nombre o el color, propagar el cambio en cascada en la BD
      if (isGroupRename || isGroupColorChange) {
        const oldGroupName = targetTask.grupo_nombre || targetTask.titulo;
        const newGroupName = updates.titulo || oldGroupName;
        const newGroupColor = updates.grupo_color || targetTask.grupo_color;

        const { error: cascadeError } = await supabase
          .from('pendientes')
          .update({
            grupo_nombre: newGroupName,
            grupo_color: newGroupColor
          })
          .eq('grupo_nombre', oldGroupName)
          .eq('user_id', user.id);

        if (cascadeError) throw cascadeError;
      }
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

  // Promover una subcategoría (grupo visual) a categoría de primer nivel (nueva pestaña)
  const handlePromoteGroupToCategory = async (groupName: string) => {
    if (!user) return;
    try {
      const definitionTask = tasks.find(t => t.es_grupo && (t.grupo_nombre === groupName || t.titulo === groupName));
      if (!definitionTask) return;

      const previousTasks = [...tasks];
      const previousCategories = [...categories];

      const newCatId = generateUUID();
      const finalColor = definitionTask.grupo_color || '#8b5cf6'; // Mantener color del grupo o usar violeta

      const newCat: Categoria = {
        id: newCatId,
        created_at: new Date().toISOString(),
        nombre: groupName,
        color: finalColor,
        user_id: user.id
      };

      // 1. Agregar la nueva categoría localmente
      setCategories((prev) => [...prev, newCat]);

      // 2. Insertar la nueva categoría en Supabase
      const { error: catError } = await supabase
        .from('categorias')
        .insert([{
          id: newCatId,
          nombre: groupName,
          color: finalColor,
          user_id: user.id
        }]);

      if (catError) {
        setCategories(previousCategories);
        throw catError;
      }

      // 3. Actualizar optimistamente las tareas (mover las tareas hijas a la nueva categoría y borrar la definición de grupo)
      setTasks(prev => prev
        .filter(t => t.id !== definitionTask.id) // Eliminar la definición de grupo
        .map(t => {
          if (t.grupo_nombre === groupName) {
            return { ...t, categoria_id: newCatId, grupo_nombre: null, grupo_color: null };
          }
          return t;
        })
      );

      // 4. Eliminar de Supabase la tarea definidora de grupo
      const { error: deleteError } = await supabase
        .from('pendientes')
        .delete()
        .eq('id', definitionTask.id)
        .eq('user_id', user.id);

      if (deleteError) {
        setTasks(previousTasks);
        setCategories(previousCategories);
        throw deleteError;
      }

      // 5. Mover en Supabase los pendientes del grupo a la nueva categoría y limpiar su grupo
      const { error: tasksError } = await supabase
        .from('pendientes')
        .update({ categoria_id: newCatId, grupo_nombre: null, grupo_color: null })
        .eq('grupo_nombre', groupName)
        .eq('user_id', user.id);

      if (tasksError) {
        setTasks(previousTasks);
        setCategories(previousCategories);
        throw tasksError;
      }

      setToastMessage(`Subcategoría "${groupName}" promovida a pestaña principal.`);
      setActiveCategoryId(newCatId);
    } catch (err) {
      console.error('Error al promover subcategoría:', err);
      alert('No se pudo promover la subcategoría.');
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
  const handleCreateCategory = async (nombre: string): Promise<string> => {
    if (!user) return '';
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
      return data.id;
    } catch (err) {
      console.error('Error creando categoría:', err);
      setCategories((prev) => prev.filter((c) => c.id !== tempId));
      alert('Error al crear la categoría.');
      return tempId;
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

    // Buscar la categoría que se va a eliminar
    const catToDelete = categories.find((c) => c.id === id);
    if (!catToDelete) return;

    // Verificar si es una categoría compartida donde el usuario es invitado
    const isShared = !!(catToDelete.user_id && catToDelete.user_id !== user.id);

    // Actualización optimista: quitar la categoría y sus tareas del estado local
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setTasks((prev) => prev.filter((t) => t.categoria_id !== id));

    // Si la categoría activa era la que eliminamos, regresamos a Inbox
    if (activeCategoryId === id) {
      setActiveCategoryId(null);
    }

    try {
      if (isShared) {
        // Caso compartido: El invitado "sale" de la categoría eliminando su invitación/colaboración
        const { error } = await supabase
          .from('categorias_compartidas')
          .delete()
          .eq('categoria_id', id)
          .eq('email_usuario', user.email?.trim().toLowerCase() || '');

        if (error) throw error;
      } else {
        // Caso propio: Primero eliminamos sus tareas asociadas para evitar conflictos de clave foránea
        const { error: tasksError } = await supabase
          .from('pendientes')
          .delete()
          .eq('categoria_id', id)
          .eq('user_id', user.id);

        if (tasksError) throw tasksError;

        // Luego eliminamos la categoría de la tabla categorias
        const { error: catError } = await supabase
          .from('categorias')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (catError) throw catError;
      }

      // Limpiar también el category_order del localStorage
      if (typeof window !== 'undefined') {
        const storedOrder = safeLocalStorage.getItem(`category_order_${user.id}`);
        if (storedOrder) {
          try {
            const ids = JSON.parse(storedOrder) as string[];
            const newIds = ids.filter((catId) => catId !== id);
            safeLocalStorage.setItem(`category_order_${user.id}`, JSON.stringify(newIds));
          } catch (e) {
            console.error('Error actualizando category_order en localStorage:', e);
          }
        }
      }
    } catch (err) {
      console.error('Error eliminando/abandonando categoría:', err);
      setCategories(previousCats);
      setTasks(previousTasks);
      alert('No se pudo eliminar la categoría.');
    }
  };


  // Convertir categoría en una subcategoría de otra
  const handleConvertToSubcategory = async (sourceId: string, targetParentId: string | null) => {
    if (!user) return;
    const sourceCat = categories.find(c => c.id === sourceId);
    if (!sourceCat) return;

    try {
      const sourceColor = sourceCat.color || '#8b5cf6';
      const sourceName = sourceCat.nombre;

      // 1. Crear la tarea definidora de grupo en la categoría destino
      const groupDefTaskId = generateUUID();
      const { error: defError } = await supabase
        .from('pendientes')
        .insert([{
          id: groupDefTaskId,
          titulo: sourceName,
          es_grupo: true,
          grupo_nombre: sourceName,
          grupo_color: sourceColor,
          categoria_id: targetParentId,
          user_id: user.id,
          completado: false
        }]);

      if (defError) throw defError;

      // 2. Mover todos los pendientes de la categoría origen a la categoría destino y asignarles el grupo
      const { error: moveTasksError } = await supabase
        .from('pendientes')
        .update({
          categoria_id: targetParentId,
          grupo_nombre: sourceName,
          grupo_color: sourceColor
        })
        .eq('categoria_id', sourceId)
        .eq('user_id', user.id);

      if (moveTasksError) throw moveTasksError;

      // 3. Eliminar la categoría origen
      const { error: deleteCatError } = await supabase
        .from('categorias')
        .delete()
        .eq('id', sourceId)
        .eq('user_id', user.id);

      if (deleteCatError) throw deleteCatError;

      // 4. Actualizar localmente el estado de categorías y tareas
      setCategories(prev => prev.filter(c => c.id !== sourceId));
      await loadData(true);

      setToastMessage(`Categoría "${sourceName}" convertida a subcategoría.`);
      
      // Si la categoría activa era la origen, ir a la destino
      if (activeCategoryId === sourceId) {
        setActiveCategoryId(targetParentId);
      }
    } catch (err) {
      console.error('Error al convertir categoría a subcategoría:', err);
      alert('No se pudo convertir la categoría a subcategoría.');
    }
  };

  // 8. REORDENAR CATEGORÍAS (Local y Persistente)
  const handleReorderCategories = (orderedCats: Categoria[]) => {
    setCategories(orderedCats);
    if (typeof window !== 'undefined' && user) {
      const ids = orderedCats.map((c) => c.id);
      safeLocalStorage.setItem(`category_order_${user.id}`, JSON.stringify(ids));
    }
  };

  // 9. REORDENAR PENDIENTES (Local y Persistente)
  const handleReorderTasks = (orderedTasks: Pendiente[]) => {
    setTasks(orderedTasks);
    if (typeof window !== 'undefined' && user) {
      const ids = orderedTasks.map((t) => t.id);
      safeLocalStorage.setItem(`task_order_${user.id}`, JSON.stringify(ids));
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

          {/* Botón Compartir */}
          <button
            onClick={() => setIsShareOpen(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-smooth cursor-pointer glass-panel border-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 glass-panel-hover relative"
            title="Compartir Categoría"
          >
            <Users className="w-4 h-4" />
            {hasPendingInvites && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-md shadow-amber-500/20" />
            )}
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
          <span className="text-xs text-slate-500 font-medium">Inicializando Keago...</span>
        </div>
      ) : (
        <main className="flex flex-col gap-6 flex-1">
          {/* Fila de Captura Rápida con Buscador Integrado */}
          <section className="flex gap-3">
            <div className="flex-1">
              <QuickInput
                onSubmitTask={async (t, f, gn, gc) => {
                  await handleCreateTask(t, f, gn, gc);
                }}
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
                sharedCategoryIds={sharedCategoryIds}
                onSelectCategory={setActiveCategoryId}
                onCreateCategory={async (nombre) => {
                  await handleCreateCategory(nombre);
                }}
                onRenameCategory={handleRenameCategory}
                onDeleteCategory={handleDeleteCategory}
                onReorderCategories={handleReorderCategories}
                onDropTaskOrGroup={handleMoveTaskOrGroup}
                onConvertToSubcategory={(id) => {
                  setConvertingCategoryId(id);
                  // Seleccionar por defecto la primera categoría que no sea la que se va a convertir
                  const otherCats = categories.filter(c => c.id !== id);
                  if (otherCats.length > 0) {
                    setTargetParentCategoryId(otherCats[0].id);
                  } else {
                    setTargetParentCategoryId('inbox');
                  }
                }}
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
                onCreateTask={async (t, f, gn, gc) => {
                  await handleCreateTask(t, f, gn, gc);
                }}
                activeGroupName={activeGroupName}
                onSelectGroup={(name, color) => {
                  setActiveGroupName(name);
                  setActiveGroupColor(color);
                }}
                onConvertGroupToTask={handleConvertGroupToTask}
                onPromoteGroupToCategory={handlePromoteGroupToCategory}
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

        {/* Botón Flotante de Panel de Administración (Solo para el Admin) */}
        {user?.email?.trim().toLowerCase() === 'sebastianjimmysolo@gmail.com' && (
          <button
            onClick={() => setIsAdminOpen(true)}
            className="w-11 h-11 rounded-full glass-panel glass-panel-hover flex items-center justify-center text-slate-400 hover:text-indigo-400 shadow-2xl transition-smooth cursor-pointer border border-white/10 animate-check-pop"
            title="Panel de Administración Premium"
          >
            <Users className="w-5 h-5" />
          </button>
        )}

        {/* Botón Flotante de Chat AI (Solo para Premium) */}
        {isPremium && (
          <button
            onClick={() => setIsChatOpen(true)}
            className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-2xl hover:scale-[1.08] hover:shadow-indigo-600/30 transition-smooth cursor-pointer border border-white/10 animate-check-pop"
            title="Preguntar a Keago AI"
          >
            <Sparkles className="w-4.5 h-4.5 animate-pulse" />
          </button>
        )}
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

      {/* Modal para Compartir Categorías */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        categories={categories}
        currentUserId={user.id}
        currentUserEmail={user.email || ''}
        onRefreshData={async () => {
          await loadData(true);
        }}
      />

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

      {/* Modal para convertir categoría en subcategoría */}
      {convertingCategoryId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setConvertingCategoryId(null)}
        >
          <div 
            className="w-full max-w-sm glass-panel rounded-3xl p-6 shadow-2xl animate-check-pop bg-[var(--c-page-bg)]/95 text-[var(--c-text-primary)] border border-[var(--c-border)] flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-luxury-primary">Convertir a Subcategoría</h3>
              <p className="text-xs text-[var(--c-text-secondary)]">
                La categoría "{categories.find(c => c.id === convertingCategoryId)?.nombre}" se convertirá en un grupo visual (subcategoría). Sus tareas se conservarán.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-[var(--c-text-muted)] uppercase tracking-wider pl-1">
                Selecciona la categoría de destino:
              </label>
              <select
                value={targetParentCategoryId}
                onChange={(e) => setTargetParentCategoryId(e.target.value)}
                className="w-full bg-[var(--c-input-bg)] border border-[var(--c-input-border)] rounded-xl px-3 py-2.5 text-xs text-[var(--c-text-primary)] focus:outline-none focus:border-indigo-500/50 transition-smooth font-medium cursor-pointer"
              >
                <option value="inbox" className="bg-slate-900 text-white dark:bg-slate-950 dark:text-slate-100">
                  Inbox / Hoy
                </option>
                {categories
                  .filter((c) => c.id !== convertingCategoryId)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-slate-900 text-white dark:bg-slate-950 dark:text-slate-100">
                      {cat.nombre}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-2.5 mt-2">
              <button
                onClick={() => setConvertingCategoryId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-luxury-secondary hover:text-luxury-primary hover:bg-white/5 transition-smooth cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const sourceId = convertingCategoryId;
                  const targetId = targetParentCategoryId === 'inbox' ? null : targetParentCategoryId;
                  setConvertingCategoryId(null);
                  handleConvertToSubcategory(sourceId, targetId);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-smooth shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                Convertir
              </button>
            </div>
          </div>
        </div>
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

      {/* Asistente de Productividad Chat AI */}
      {isPremium && (
        <ProductivityChat
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          tasks={tasks}
          categories={categories}
          currentUser={user}
          onCreateTask={async (titulo, catId, grupo, esGrupo, nota) => {
            return await handleCreateTask(titulo, null, grupo, '#8b5cf6', catId, esGrupo, nota);
          }}
          onToggleTask={handleToggleTask}
          onDeleteTask={handleDeleteTask}
          onCreateCategory={handleCreateCategory}
        />
      )}

      {/* Modal de Administración Premium (Solo para el Admin) */}
      {isAdminOpen && user?.email?.trim().toLowerCase() === 'sebastianjimmysolo@gmail.com' && (
        <AdminModal
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          currentUserId={user?.id || ''}
          onRefreshData={async () => {
            await loadData(true);
          }}
        />
      )}
    </div>
  );
}
