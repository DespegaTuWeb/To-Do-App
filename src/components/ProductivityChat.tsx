'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, X, Send, Loader2, Bot, User, ClipboardList, Mic, MicOff, Volume2, VolumeX, Square } from 'lucide-react';
import { supabase, Categoria, Pendiente } from '../lib/supabase';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ProductivityChatProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Pendiente[];
  categories: Categoria[];
  currentUser: any;
  onCreateTask: (titulo: string, categoriaId: string | null, grupo?: string | null, esGrupo?: boolean) => Promise<string>;
  onToggleTask: (id: string, completado: boolean) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onCreateCategory: (nombre: string) => Promise<string>;
}

export default function ProductivityChat({
  isOpen,
  onClose,
  tasks,
  categories,
  currentUser,
  onCreateTask,
  onToggleTask,
  onDeleteTask,
  onCreateCategory,
}: ProductivityChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy **Keago AI**, tu coach de productividad personal.\n\nAnalizo tus listas de tareas en tiempo real para ayudarte a priorizar, sugerir un orden óptimo de trabajo y detectar posibles cuellos de botella.\n\n¿En qué te puedo asesorar hoy?'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados para redimensionamiento
  const [width, setWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Estados de voz (Speech-to-Text y Text-to-Speech)
  const [isListening, setIsListening] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('keago_coach_audio_enabled') === 'true';
      } catch (e) {
        console.warn('LocalStorage no disponible:', e);
      }
    }
    return false;
  });
  const [currentlyPlayingIndex, setCurrentlyPlayingIndex] = useState<number | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll al final del chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Enfocar input al abrir
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  // Detectar versión móvil para ajustar anchos
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Lógica de Redimensionamiento por Arrastre
  const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      // Límites de ancho: mínimo 320px, máximo 85% de la pantalla
      if (newWidth >= 320 && newWidth <= window.innerWidth * 0.85) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Guardar preferencia de audio
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('keago_coach_audio_enabled', String(isAudioEnabled));
      } catch (e) {
        console.warn('Error guardando preferencia de audio:', e);
      }
    }
  }, [isAudioEnabled]);

  // Limpieza y control de APIs de voz al cerrar o desmontar
  useEffect(() => {
    if (!isOpen) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setCurrentlyPlayingIndex(null);
      if (isListening && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
    }
  }, [isOpen, isListening]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Lógica de Dictado por Voz (Speech-to-Text)
  const toggleListening = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta el reconocimiento de voz nativo. Te sugerimos usar Google Chrome o Microsoft Edge.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.interimResults = true;
        recognition.continuous = false;

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join('');

          setInputValue(transcript);
        };

        recognition.onerror = (event: any) => {
          console.error('Error de reconocimiento de voz:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error('Fallo al iniciar el reconocimiento de voz:', err);
        setIsListening(false);
      }
    }
  };

  // Lógica de Lectura de Respuestas (Text-to-Speech)
  const speakText = (text: string, index: number) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Si ya se está reproduciendo este mensaje, cancelarlo
    if (currentlyPlayingIndex === index) {
      window.speechSynthesis.cancel();
      setCurrentlyPlayingIndex(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Limpiar markdown del texto para lectura limpia
    const cleanText = text
      .replace(/[*#_~`\[\]()\-]/g, '')
      .replace(/<[^>]*>/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'es-ES';

    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find((v) => v.lang.startsWith('es-'));
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    utterance.onend = () => {
      setCurrentlyPlayingIndex(null);
    };

    utterance.onerror = (e) => {
      console.error('Error en SpeechSynthesis:', e);
      setCurrentlyPlayingIndex(null);
    };

    setCurrentlyPlayingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  // Auto-lectura de nuevas respuestas de la IA
  useEffect(() => {
    if (messages.length === 0 || !isAudioEnabled) return;
    const lastMsgIdx = messages.length - 1;
    const lastMsg = messages[lastMsgIdx];
    
    if (lastMsg.role === 'assistant' && lastMsgIdx > 0) {
      speakText(lastMsg.content, lastMsgIdx);
    }
  }, [messages.length, isAudioEnabled]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMessage = textToSend.trim();
    setInputValue('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // Filtrar y limpiar las tareas para enviar solo lo necesario a la IA (reducción de tokens y payload)
    const prunedTasks = tasks.map((t) => {
      const category = categories.find((c) => c.id === t.categoria_id);
      return {
        titulo: t.titulo,
        completado: t.completado,
        categoria: category ? category.nombre : 'Inbox (Sin categoría)',
        fecha_limite: t.fecha_limite || undefined,
        es_grupo: t.es_grupo || undefined,
        grupo: t.grupo_nombre || undefined,
        nota: t.nota || undefined,
      };
    });

    const categoryNames = categories.map((c) => c.nombre);

    const d = new Date();
    const currentDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const currentTime = d.toLocaleString();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          tasks: prunedTasks,
          categories: categoryNames,
          currentTime,
          currentDate,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al conectar con el asistente.');
      }

      const data = await response.json();
      
      // Mostrar la respuesta de texto de la IA
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);

      // Ejecutar las acciones inteligentes devueltas por Gemini
      if (data.actions && data.actions.length > 0) {
        const newlyCreatedCategories: Record<string, string> = {};
        const newlyCreatedTasks: Record<string, string> = {};
        const executedSummaries: string[] = [];

        for (const action of data.actions) {
          try {
            if (action.type === 'create_category') {
              const { nombre } = action.payload;
              if (nombre) {
                const catId = await onCreateCategory(nombre);
                newlyCreatedCategories[nombre.trim().toLowerCase()] = catId;
                executedSummaries.push(`📁 Categoría **${nombre}** creada`);
              }
            } else if (action.type === 'create_task') {
              const { titulo, categoria, es_grupo, grupo } = action.payload;
              if (titulo) {
                let targetCatId: string | null = null;
                if (categoria && categoria.toLowerCase() !== 'inbox' && categoria.toLowerCase() !== 'sin categoría') {
                  const localCatId = newlyCreatedCategories[categoria.trim().toLowerCase()];
                  if (localCatId) {
                    targetCatId = localCatId;
                  } else {
                    const matchedCat = categories.find(
                      (c) => c.nombre.trim().toLowerCase() === categoria.trim().toLowerCase()
                    );
                    if (matchedCat) {
                      targetCatId = matchedCat.id;
                    }
                  }
                }
                
                const taskId = await onCreateTask(titulo, targetCatId, grupo || null, es_grupo || false);
                newlyCreatedTasks[titulo.trim().toLowerCase()] = taskId;

                let locText = `📝 Tarea **${titulo}** creada`;
                if (categoria && categoria.toLowerCase() !== 'inbox' && categoria.toLowerCase() !== 'sin categoría') {
                  locText += ` en *${categoria}*`;
                  if (grupo) locText += ` > *${grupo}*`;
                } else if (grupo) {
                  locText += ` bajo el grupo *${grupo}*`;
                }
                executedSummaries.push(locText);
              }
            } else if (action.type === 'toggle_task') {
              const { titulo, completado } = action.payload;
              if (titulo) {
                const localTaskId = newlyCreatedTasks[titulo.trim().toLowerCase()];
                let targetTask = null;

                if (localTaskId) {
                  const matchedTask = tasks.find((t) => t.id === localTaskId);
                  if (matchedTask) {
                    targetTask = matchedTask;
                  } else {
                    targetTask = { id: localTaskId, titulo };
                  }
                } else {
                  const matchedTasks = tasks.filter(
                    (t) => t.titulo.trim().toLowerCase() === titulo.trim().toLowerCase()
                  );
                  if (matchedTasks.length > 0) {
                    targetTask = matchedTasks.find((t) => t.completado !== completado) || matchedTasks[0];
                  }
                }

                if (targetTask) {
                  await onToggleTask(targetTask.id, completado);
                  executedSummaries.push(`${completado ? '✅' : '⏳'} Tarea **${titulo}** marcada como ${completado ? 'completada' : 'pendiente'}`);
                } else {
                  executedSummaries.push(`⚠️ No se encontró la tarea **${titulo}** para cambiar estado`);
                }
              }
            } else if (action.type === 'delete_task') {
              const { titulo } = action.payload;
              if (titulo) {
                const localTaskId = newlyCreatedTasks[titulo.trim().toLowerCase()];
                let targetTask = null;

                if (localTaskId) {
                  targetTask = { id: localTaskId, titulo };
                } else {
                  targetTask = tasks.find(
                    (t) => t.titulo.trim().toLowerCase() === titulo.trim().toLowerCase()
                  );
                }

                if (targetTask) {
                  await onDeleteTask(targetTask.id);
                  executedSummaries.push(`🗑️ Tarea **${targetTask.titulo}** eliminada`);
                } else {
                  executedSummaries.push(`⚠️ No se encontró la tarea **${titulo}** para eliminar`);
                }
              }
            } else if (action.type === 'share_category') {
              const { categoria, email } = action.payload;
              if (categoria && email) {
                if (!currentUser) {
                  executedSummaries.push('⚠️ Acción fallida: Debes iniciar sesión para compartir categorías');
                  continue;
                }
                
                const localCatId = newlyCreatedCategories[categoria.trim().toLowerCase()];
                let matchedCat = null;
                if (localCatId) {
                  matchedCat = { id: localCatId, nombre: categoria, user_id: currentUser.id };
                } else {
                  matchedCat = categories.find(
                    (c) => c.nombre.trim().toLowerCase() === categoria.trim().toLowerCase()
                  );
                }
                
                if (matchedCat) {
                  const isOwned = !matchedCat.user_id || matchedCat.user_id === currentUser.id;
                  if (!isOwned) {
                    executedSummaries.push(`⚠️ Acción fallida: Solo el dueño de la categoría **${matchedCat.nombre}** puede compartirla`);
                    continue;
                  }

                  const targetEmail = email.trim().toLowerCase();
                  if (targetEmail === currentUser.email?.trim().toLowerCase()) {
                    executedSummaries.push('⚠️ Acción omitida: No puedes invitarte a ti mismo');
                    continue;
                  }

                  const { error } = await supabase
                    .from('categorias_compartidas')
                    .insert({
                      categoria_id: matchedCat.id,
                      email_usuario: targetEmail,
                      aceptada: false,
                      owner_id: currentUser.id,
                    });

                  if (error) {
                    if (error.code === '23505') {
                      executedSummaries.push(`ℹ️ La categoría **${matchedCat.nombre}** ya está compartida o invitada a **${targetEmail}**`);
                    } else {
                      throw error;
                    }
                  } else {
                    executedSummaries.push(`🤝 Invitación enviada a **${targetEmail}** para compartir **${matchedCat.nombre}**`);
                  }
                } else {
                  executedSummaries.push(`⚠️ No se encontró la categoría **${categoria}** para compartir`);
                }
              }
            }
          } catch (actionErr: any) {
            console.error(`Error al procesar acción ${action.type}:`, actionErr);
            executedSummaries.push(`❌ Error al ejecutar acción (${action.type}): ${actionErr.message || actionErr}`);
          }
        }

        if (executedSummaries.length > 0) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `✨ **Acciones completadas:**\n` + executedSummaries.map(s => `- ${s}`).join('\n')
            }
          ]);
        }
      }
    } catch (err: any) {
      console.error('Error en el chat:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **Error:** ${err.message || 'No se pudo obtener respuesta del coach. Asegúrate de configurar la variable de entorno GEMINI_API_KEY.'}`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(inputValue);
  };

  const handleSuggestionClick = (suggestionText: string) => {
    handleSend(suggestionText);
  };

  // Parser mejorado de Markdown para renderizar títulos, separadores, bolds y listas limpiamente en JSX
  const parseMarkdown = (text: string) => {
    return text.split('\n').map((line, lineIndex) => {
      const trimmed = line.trim();

      // 1. Separador Horizontal (---)
      if (trimmed === '---') {
        return <hr key={lineIndex} className="border-[var(--c-border)] my-3 opacity-60" />;
      }

      // 2. Encabezados (#, ##, ###)
      let isHeading = false;
      let headingLevel = 0;
      let headingText = '';

      if (trimmed.startsWith('### ')) {
        isHeading = true;
        headingLevel = 3;
        headingText = trimmed.substring(4);
      } else if (trimmed.startsWith('## ')) {
        isHeading = true;
        headingLevel = 2;
        headingText = trimmed.substring(3);
      } else if (trimmed.startsWith('# ')) {
        isHeading = true;
        headingLevel = 1;
        headingText = trimmed.substring(2);
      }

      const isListItem = trimmed.startsWith('- ') || trimmed.startsWith('* ');
      const content = isListItem 
        ? trimmed.substring(2) 
        : isHeading 
          ? headingText 
          : line;

      // Regex para negritas (**texto**)
      const parts: React.ReactNode[] = [];
      const boldRegex = /\*\*(.*?)\*\*/g;
      let match;
      let lastIndex = 0;

      while ((match = boldRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          parts.push(content.substring(lastIndex, match.index));
        }
        parts.push(
          <strong key={match.index} className="font-extrabold text-indigo-500 dark:text-indigo-400">
            {match[1]}
          </strong>
        );
        lastIndex = boldRegex.lastIndex;
      }

      if (lastIndex < content.length) {
        parts.push(content.substring(lastIndex));
      }

      // Renderizar Encabezados
      if (isHeading) {
        if (headingLevel === 1) {
          return (
            <h1 key={lineIndex} className="text-base md:text-lg font-black text-indigo-500 dark:text-indigo-400 mt-4 mb-1.5 leading-snug">
              {parts}
            </h1>
          );
        }
        if (headingLevel === 2) {
          return (
            <h2 key={lineIndex} className="text-sm md:text-base font-extrabold text-indigo-500 dark:text-indigo-400 mt-3 mb-1.5 leading-snug">
              {parts}
            </h2>
          );
        }
        return (
          <h3 key={lineIndex} className="text-xs md:text-sm font-bold text-indigo-500 dark:text-indigo-400 mt-2.5 mb-1 uppercase tracking-wider leading-snug">
            {parts}
          </h3>
        );
      }

      // Renderizar Ítems de Lista
      if (isListItem) {
        return (
          <li key={lineIndex} className="ml-4 list-disc text-xs md:text-sm text-[var(--c-text-primary)] mb-1.5 leading-relaxed">
            {parts}
          </li>
        );
      }

      // Renderizar Párrafos comunes
      return (
        <p key={lineIndex} className="text-xs md:text-sm text-[var(--c-text-primary)] min-h-[1em] mb-2 leading-relaxed">
          {parts}
        </p>
      );
    });
  };

  const suggestions = [
    '¿Cómo organizo mi día hoy?',
    '¿Qué tareas son críticas o urgentes?',
    '¿Detectas algún cuello de botella?',
    'Sugiéreme un orden de prioridad'
  ];

  return (
    <div
      className={`fixed top-0 right-0 h-full z-50 glass-panel border-l border-white/10 shadow-2xl flex flex-col transition-all duration-300 ease-in-out bg-[var(--c-page-bg)]/98 backdrop-blur-md ${
        isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
      }`}
      style={{
        width: isMobile ? '100%' : `${width}px`,
        maxWidth: isMobile ? '100%' : '85vw'
      }}
    >
      {/* Tirador de Redimensionamiento (Lado Izquierdo del Panel - Solo en escritorio) */}
      {isOpen && !isMobile && (
        <div
          onMouseDown={startResizing}
          className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-indigo-500/25 active:bg-indigo-500/40 transition-colors duration-150 z-50 flex items-center justify-center group"
          title="Arrastra para redimensionar"
        >
          <div className="w-[1.5px] h-10 bg-slate-500/30 group-hover:bg-indigo-400 rounded-full transition-colors duration-150" />
        </div>
      )}

      {/* Cabecera */}
      <div className="p-4 border-b border-[var(--c-border)] flex items-center justify-between bg-slate-500/5 dark:bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-extrabold tracking-tight text-gradient-luxury">Keago AI</h3>
            <span className="text-[9px] font-bold text-luxury-muted uppercase tracking-wider">Coach de Productividad</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Switch de Auto-lectura */}
          <button
            onClick={() => setIsAudioEnabled(prev => !prev)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-smooth cursor-pointer ${
              isAudioEnabled 
                ? 'text-indigo-500 hover:text-indigo-600 bg-indigo-500/10' 
                : 'text-[var(--c-text-muted)] hover:text-[var(--c-text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            title={isAudioEnabled ? "Auto-lectura: Activada" : "Auto-lectura: Desactivada"}
          >
            {isAudioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--c-text-muted)] hover:text-[var(--c-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-smooth cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cuerpo de Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
        {messages.map((msg, index) => {
          const isAI = msg.role === 'assistant';
          return (
            <div
              key={index}
              className={`flex gap-2.5 max-w-[85%] ${
                isAI ? 'self-start' : 'self-end flex-row-reverse'
              } animate-fade-in`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${
                  isAI
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/15'
                    : 'bg-purple-500/10 text-purple-400 border border-purple-500/15'
                }`}
              >
                {isAI ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
              </div>

              {/* Globo de mensaje y controles de audio */}
              <div className="flex flex-col gap-1 min-w-0">
                <div
                  className={`p-3 rounded-2xl text-xs md:text-sm shadow-sm relative group ${
                    isAI
                      ? 'glass-panel border-white/5 text-[var(--c-text-primary)] rounded-tl-none'
                      : 'bg-indigo-600/90 text-white rounded-tr-none border border-indigo-500/20 font-medium'
                  }`}
                >
                  {isAI ? (
                    <ul className="list-inside">{parseMarkdown(msg.content)}</ul>
                  ) : (
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  )}
                  
                  {/* Botón de reproducción de audio individual (solo para la IA) */}
                  {isAI && (
                    <button
                      onClick={() => speakText(msg.content, index)}
                      className={`absolute -right-7 top-1 p-1 rounded-md transition-smooth cursor-pointer bg-slate-500/5 hover:bg-slate-500/20 border border-slate-500/10 ${
                        currentlyPlayingIndex === index 
                          ? 'text-indigo-500 bg-indigo-500/10 border-indigo-500/25 animate-pulse' 
                          : 'text-[var(--c-text-muted)] hover:text-[var(--c-text-primary)]'
                      }`}
                      title={currentlyPlayingIndex === index ? "Detener lectura" : "Leer en voz alta"}
                    >
                      {currentlyPlayingIndex === index ? (
                        <Square className="w-3 h-3 fill-indigo-500 text-indigo-500" />
                      ) : (
                        <Volume2 className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Indicador de Carga */}
        {isLoading && (
          <div className="flex gap-2.5 max-w-[80%] self-start animate-pulse">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="glass-panel border-white/5 p-3 rounded-2xl rounded-tl-none flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Panel de Sugerencias */}
      {!isLoading && (
        <div className="px-4 py-2 flex flex-wrap gap-1.5 bg-slate-500/5 dark:bg-slate-950/15 border-t border-[var(--c-border)]/5">
          {suggestions.map((sug, idx) => (
            <button
              key={idx}
              onClick={() => handleSuggestionClick(sug)}
              className="text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border border-slate-500/10 hover:border-indigo-500/30 hover:bg-indigo-500/5 text-[var(--c-text-secondary)] hover:text-indigo-400 transition-smooth cursor-pointer flex items-center gap-1 bg-slate-500/5"
            >
              <ClipboardList className="w-2.5 h-2.5 opacity-60" />
              {sug}
            </button>
          ))}
        </div>
      )}

      {/* Input de Mensajes */}
      <div className="p-4 border-t border-[var(--c-border)] bg-slate-500/5 dark:bg-slate-950/25 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            placeholder={isLoading ? 'Keago AI está pensando...' : (isListening ? 'Escuchando tu dictado...' : 'Pregúntale a Keago AI...')}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            className="w-full glass-input pl-4 pr-20 py-3 rounded-xl text-xs md:text-sm placeholder:text-luxury-muted/50 focus:ring-1 focus:ring-indigo-500/20 disabled:opacity-60"
          />
          <div className="absolute right-1.5 flex items-center gap-1.5">
            {/* Botón de Micrófono (STT) */}
            <button
              type="button"
              onClick={toggleListening}
              disabled={isLoading}
              className={`p-2 rounded-lg transition-smooth cursor-pointer hover:bg-slate-500/10 ${
                isListening 
                  ? 'bg-red-500/10 text-red-500 border border-red-500/25 animate-pulse' 
                  : 'text-[var(--c-text-muted)] hover:text-[var(--c-text-primary)]'
              }`}
              title={isListening ? "Detener dictado" : "Dictar mensaje"}
            >
              {isListening ? (
                <MicOff className="w-3.5 h-3.5" />
              ) : (
                <Mic className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Botón de Enviar */}
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-500/10 text-white disabled:text-slate-500 rounded-lg transition-smooth cursor-pointer disabled:cursor-not-allowed shadow-md shadow-indigo-600/10"
              title="Enviar mensaje"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
