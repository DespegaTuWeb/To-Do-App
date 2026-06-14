'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, CalendarDays } from 'lucide-react';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (dateStr: string | null) => void;
  currentValue: string | null; // Formato YYYY-MM-DD
}

export default function CalendarModal({
  isOpen,
  onClose,
  onSelectDate,
  currentValue,
}: CalendarModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => {
    if (currentValue) {
      return new Date(currentValue + 'T00:00:00');
    }
    return new Date();
  });

  // Garantizar montaje en cliente para evitar fallos de SSR con createPortal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Bloquear el scroll del background cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Listener para cerrar con la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDaySelect = (day: number | null, e: React.MouseEvent) => {
    e.stopPropagation();
    if (day === null) return;
    
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const formatted = `${year}-${mStr}-${dStr}`;
    onSelectDate(formatted);
    onClose();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectDate(null);
    onClose();
  };

  const isSelected = (day: number | null) => {
    if (!day || !currentValue) return false;
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    return `${year}-${mStr}-${dStr}` === currentValue;
  };

  const isToday = (day: number | null) => {
    if (!day) return false;
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };

  // El modal se renderiza a través de un Portal directamente en document.body.
  // Esto previene fallas de contexto CSS (ej. transforms) y herencias de eventos de arrastre.
  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[3px] transition-opacity duration-300 animate-fade-in p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onMouseDown={(e) => e.stopPropagation()} // Prevenir eventos de drag
    >
      <div 
        className="glass-panel border-[var(--c-border)] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-check-pop text-[var(--c-text-primary)]"
        style={{ backgroundColor: 'var(--c-page-bg)' }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()} // Prevenir eventos de drag
      >
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--c-border)]">
          <div className="flex items-center gap-2 text-luxury-primary">
            <CalendarDays className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-semibold">Seleccionar fecha</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-smooth text-luxury-secondary hover:text-luxury-primary cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navegador de mes/año */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--c-border)] bg-black/5 dark:bg-white/[0.02]">
          <button 
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-luxury-secondary hover:text-luxury-primary transition-smooth cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs md:text-sm font-bold text-luxury-primary tracking-wide">
            {monthNames[month]} {year}
          </span>
          <button 
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-luxury-secondary hover:text-luxury-primary transition-smooth cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Grid de días */}
        <div className="p-4 flex flex-col gap-2">
          {/* Nombres de los días */}
          <div className="grid grid-cols-7 text-center">
            {dayNames.map((name) => (
              <span key={name} className="text-[10px] font-bold text-luxury-muted uppercase py-1">
                {name}
              </span>
            ))}
          </div>

          {/* Días del mes */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {days.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="h-8" />;
              }

              const selected = isSelected(day);
              const today = isToday(day);

              return (
                <button
                  key={`day-${day}`}
                  onClick={(e) => handleDaySelect(day, e)}
                  className={`h-8 w-8 mx-auto text-xs font-semibold rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                    selected
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                      : today
                      ? 'bg-indigo-500/10 text-indigo-500 ring-1 ring-indigo-500/20 font-bold'
                      : 'text-luxury-secondary hover:bg-indigo-500/5 hover:text-luxury-primary'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[var(--c-border)]">
          <button
            onClick={handleClear}
            className="text-[11px] font-bold text-luxury-muted hover:text-rose-500 px-3 py-1.5 hover:bg-rose-500/5 rounded-lg transition-smooth cursor-pointer"
          >
            Limpiar fecha
          </button>
          <button
            onClick={onClose}
            className="text-[11px] font-bold text-luxury-secondary hover:text-luxury-primary px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-smooth cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
