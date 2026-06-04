'use client';

import React, { useState, useEffect } from 'react';
import { X, UserPlus, Mail, Users, Trash2, ShieldAlert, Loader2 } from 'lucide-react';
import { supabase, Categoria } from '../lib/supabase';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Categoria[];
  currentUserId: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  categories,
  currentUserId,
}: ShareModalProps) {
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [emailInput, setEmailInput] = useState('');
  const [collaborators, setCollaborators] = useState<{ id: string; email_usuario: string }[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filtrar categorías que son propias (solo puedes compartir categorías de las cuales eres dueño)
  const ownedCategories = categories.filter((cat) => !cat.user_id || cat.user_id === currentUserId);

  // Seleccionar la primera categoría propia por defecto
  useEffect(() => {
    if (ownedCategories.length > 0 && !selectedCatId) {
      setSelectedCatId(ownedCategories[0].id);
    }
  }, [ownedCategories, selectedCatId]);

  // Cargar lista de colaboradores cuando cambia la categoría seleccionada
  useEffect(() => {
    if (!selectedCatId || !isOpen) return;

    const fetchCollaborators = async () => {
      setIsLoadingList(true);
      setErrorMessage(null);
      try {
        const { data, error } = await supabase
          .from('categorias_compartidas')
          .select('id, email_usuario')
          .eq('categoria_id', selectedCatId);

        if (error) throw error;
        setCollaborators(data || []);
      } catch (err: any) {
        console.error('Error cargando colaboradores:', err);
        setErrorMessage('No se pudieron cargar los colaboradores.');
      } finally {
        setIsLoadingList(false);
      }
    };

    fetchCollaborators();
  }, [selectedCatId, isOpen]);

  if (!isOpen) return null;

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatId) return;

    const targetEmail = emailInput.trim().toLowerCase();
    if (!targetEmail) return;

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetEmail)) {
      setErrorMessage('Por favor, ingresa un correo electrónico válido.');
      return;
    }

    setIsActionLoading(true);
    setErrorMessage(null);

    try {
      // Intentar insertar en la base de datos
      const { error } = await supabase
        .from('categorias_compartidas')
        .insert({
          categoria_id: selectedCatId,
          email_usuario: targetEmail,
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('Esta categoría ya está compartida con este correo.');
        }
        throw error;
      }

      // Refrescar lista y limpiar input
      setEmailInput('');
      const { data, error: reloadError } = await supabase
        .from('categorias_compartidas')
        .select('id, email_usuario')
        .eq('categoria_id', selectedCatId);

      if (reloadError) throw reloadError;
      setCollaborators(data || []);
    } catch (err: any) {
      console.error('Error al compartir:', err);
      setErrorMessage(err.message || 'Error al intentar compartir la categoría.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRemoveCollaborator = async (shareId: string) => {
    setIsActionLoading(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase
        .from('categorias_compartidas')
        .delete()
        .eq('id', shareId);

      if (error) throw error;

      // Refrescar lista
      setCollaborators(collaborators.filter((c) => c.id !== shareId));
    } catch (err: any) {
      console.error('Error al remover acceso:', err);
      setErrorMessage('No se pudo revocar el acceso.');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <div 
        className="w-full max-w-md glass-panel rounded-3xl p-6 shadow-2xl animate-check-pop bg-[var(--c-page-bg)]/95 text-[var(--c-text-primary)] border border-[var(--c-border)] flex flex-col gap-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold tracking-tight text-[var(--c-text-primary)]">Compartir Categoría</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--c-text-muted)] hover:text-[var(--c-text-primary)] hover:bg-white/5 dark:hover:bg-white/5 transition-smooth cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {ownedCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-6 gap-3 bg-slate-500/5 rounded-2xl border border-slate-500/10">
            <ShieldAlert className="w-8 h-8 text-amber-500 opacity-80" />
            <p className="text-xs text-[var(--c-text-secondary)]">
              No tienes ninguna categoría propia disponible para compartir. Crea una nueva categoría primero.
            </p>
          </div>
        ) : (
          <>
            {/* Formulario de selección y email */}
            <div className="flex flex-col gap-4">
              {/* Selector de Categoría */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[var(--c-text-muted)] uppercase tracking-wider pl-1">
                  Categoría a compartir
                </label>
                <select
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(e.target.value)}
                  className="w-full bg-[var(--c-input-bg)] border border-[var(--c-input-border)] rounded-xl px-3 py-2.5 text-xs text-[var(--c-text-primary)] focus:outline-none focus:border-indigo-500/50 transition-smooth font-medium cursor-pointer"
                >
                  {ownedCategories.map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-slate-900 text-white dark:bg-slate-950 dark:text-slate-100">
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Input Invitado */}
              <form onSubmit={handleAddCollaborator} className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[var(--c-text-muted)] uppercase tracking-wider pl-1">
                  Correo electrónico del colaborador
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--c-text-muted)]" />
                    <input
                      type="email"
                      required
                      placeholder="ejemplo@correo.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full bg-[var(--c-input-bg)] border border-[var(--c-input-border)] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[var(--c-text-primary)] focus:outline-none focus:border-indigo-500/50 transition-smooth placeholder:text-slate-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isActionLoading}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-smooth flex items-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer disabled:opacity-50"
                  >
                    {isActionLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Invitar</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Mensaje de Error */}
            {errorMessage && (
              <p className="text-[11px] text-rose-400 bg-rose-500/5 border border-rose-500/10 rounded-xl px-3 py-2 animate-fade-in font-medium">
                {errorMessage}
              </p>
            )}

            {/* Listado de colaboradores */}
            <div className="flex flex-col gap-2 mt-1">
              <span className="text-[10px] font-bold text-[var(--c-text-muted)] uppercase tracking-wider pl-1 flex items-center gap-1">
                <Users className="w-3 h-3 text-[var(--c-text-muted)]" />
                <span>Colaboradores actuales ({collaborators.length})</span>
              </span>

              <div className="max-h-[140px] overflow-y-auto pr-1 flex flex-col gap-1.5 custom-scrollbar">
                {isLoadingList ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                  </div>
                ) : collaborators.length === 0 ? (
                  <p className="text-[11px] text-[var(--c-text-secondary)] italic p-3 text-center bg-slate-500/5 rounded-xl border border-slate-500/10">
                    Aún no has compartido esta categoría con nadie.
                  </p>
                ) : (
                  collaborators.map((collab) => (
                    <div
                      key={collab.id}
                      className="flex items-center justify-between px-3 py-2 bg-slate-500/5 rounded-xl border border-slate-500/10 hover:bg-slate-500/10 hover:border-slate-500/20 transition-smooth group"
                    >
                      <span className="text-xs font-medium text-[var(--c-text-secondary)] truncate pr-4">
                        {collab.email_usuario}
                      </span>
                      <button
                        onClick={() => handleRemoveCollaborator(collab.id)}
                        disabled={isActionLoading}
                        className="text-[var(--c-text-muted)] hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-smooth cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-30"
                        title="Revocar acceso"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
