'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Calendar, Keyboard } from 'lucide-react';

interface QuickInputProps {
  onSubmitTask: (titulo: string, fechaLimite: string | null) => Promise<void>;
  activeCategoryName: string;
}

export default function QuickInput({ onSubmitTask, activeCategoryName }: QuickInputProps) {
  const [titulo, setTitulo] = useState('');
  const [fechaLimite, setFechaLimite] = useState<string>('');
  const [shortcutText, setShortcutText] = useState('Ctrl + K');
  const inputRef = useRef<HTMLInputElement>(null);

  // Detectar sistema operativo para mostrar el atajo correcto (⌘K o Ctrl+K)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMac = navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
      setTimeout(() => {
        setShortcutText(isMac ? '⌘K' : 'Ctrl + K');
      }, 0);
    }
  }, []);

  // Listener global para atajo Ctrl + K / ⌘K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Soporta tanto Ctrl+K como Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        // Efecto visual rápido de parpadeo
        inputRef.current?.classList.add('ring-2', 'ring-white/20');
        setTimeout(() => {
          inputRef.current?.classList.remove('ring-2', 'ring-white/20');
        }, 150);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    const selectedDate = fechaLimite || null;
    
    // Guardar tarea
    await onSubmitTask(titulo.trim(), selectedDate);
    
    // Limpiar campos
    setTitulo('');
    setFechaLimite('');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2">
      <div className="relative flex items-center w-full">
        <input
          ref={inputRef}
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder={`Añadir tarea en "${activeCategoryName}"...`}
          className="w-full glass-input px-4 py-3.5 pr-32 text-sm md:text-base rounded-xl text-white placeholder:text-slate-500 font-normal focus:ring-1 focus:ring-white/10"
        />

        {/* Panel lateral derecho del input: fecha y atajo */}
        <div className="absolute right-3 flex items-center gap-2">
          {/* Selector de fecha minimalista integrado */}
          <div className="relative group flex items-center">
            <input
              type="date"
              value={fechaLimite}
              onChange={(e) => setFechaLimite(e.target.value)}
              className="absolute inset-0 opacity-0 w-8 h-8 cursor-pointer z-10"
              title="Añadir fecha límite"
            />
            <button
              type="button"
              className={`p-1.5 rounded-lg transition-smooth ${
                fechaLimite 
                  ? 'bg-blue-500/20 border border-blue-500/40 text-blue-400' 
                  : 'hover:bg-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
            </button>
            {fechaLimite && (
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 border border-white/10 text-[9px] px-1.5 py-0.5 rounded text-slate-300 pointer-events-none whitespace-nowrap shadow-xl">
                {fechaLimite}
              </span>
            )}
          </div>

          {/* Atajo visual */}
          <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] text-slate-400 font-mono pointer-events-none select-none">
            <Keyboard className="w-3 h-3" />
            {shortcutText}
          </kbd>

          {/* Botón de envío */}
          <button
            type="submit"
            className="flex items-center justify-center p-1.5 bg-white text-slate-950 rounded-lg hover:bg-slate-200 active:scale-95 transition-smooth cursor-pointer"
            title="Guardar Tarea"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>
      
      {/* Indicador rápido de fecha activa debajo de la barra */}
      {fechaLimite && (
        <div className="flex items-center gap-1.5 self-start px-2.5 py-1 bg-white/5 rounded-full border border-white/5 animate-check-pop">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-[10px] text-slate-400">Fecha límite: {fechaLimite}</span>
          <button
            type="button"
            onClick={() => setFechaLimite('')}
            className="text-[10px] text-slate-500 hover:text-red-400 font-semibold ml-1 cursor-pointer"
          >
            quitar
          </button>
        </div>
      )}
    </form>
  );
}
