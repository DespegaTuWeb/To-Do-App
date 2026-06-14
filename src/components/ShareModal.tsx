'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus, Mail, Users, Trash2, ShieldAlert, Loader2, Check, Ban } from 'lucide-react';
import { supabase, Categoria } from '../lib/supabase';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Categoria[];
  currentUserId: string;
  currentUserEmail: string;
  onRefreshData: () => Promise<void>;
}

export default function ShareModal({
  isOpen,
  onClose,
  categories,
  currentUserId,
  currentUserEmail,
  onRefreshData,
}: ShareModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

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

  const [activeTab, setActiveTab] = useState<'compartir' | 'recibidas'>('compartir');
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [emailInput, setEmailInput] = useState('');
  const [collaborators, setCollaborators] = useState<{ id: string; email_usuario: string; aceptada: boolean }[]>([]);
  const [pendingInvites, setPendingInvites] = useState<{ id: string; categoria_id: string; owner_id: string; categorias: { nombre: string } | null }[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filtrar categorías que son propias (solo el dueño puede compartir)
  const ownedCategories = categories.filter((cat) => !cat.user_id || cat.user_id === currentUserId);

  // Seleccionar la primera por defecto o reajustar si la categoría seleccionada ya no existe en la lista
  useEffect(() => {
    if (ownedCategories.length > 0) {
      const exists = ownedCategories.some((c) => c.id === selectedCatId);
      if (!exists) {
        setSelectedCatId(ownedCategories[0].id);
      }
    } else {
      setSelectedCatId('');
    }
  }, [ownedCategories, selectedCatId]);

  // Cargar colaboradores de la categoría seleccionada
  const fetchCollaborators = async () => {
    if (!selectedCatId || activeTab !== 'compartir') return;
    setIsLoadingList(true);
    try {
      const { data, error } = await supabase
        .from('categorias_compartidas')
        .select('id, email_usuario, aceptada')
        .eq('categoria_id', selectedCatId);

      if (error) throw error;
      setCollaborators(data || []);
    } catch (err) {
      console.error('Error cargando colaboradores:', err);
    } finally {
      setIsLoadingList(false);
    }
  };

  // Cargar invitaciones recibidas pendientes
  const fetchPendingInvites = async () => {
    if (activeTab !== 'recibidas' || !currentUserEmail) return;
    setIsLoadingList(true);
    try {
      const { data, error } = await supabase
        .from('categorias_compartidas')
        .select(`
          id,
          categoria_id,
          owner_id,
          categorias (
            nombre
          )
        `)
        .eq('email_usuario', currentUserEmail.trim().toLowerCase())
        .eq('aceptada', false);

      if (error) throw error;
      // @ts-ignore
      setPendingInvites(data || []);
    } catch (err) {
      console.error('Error cargando invitaciones pendientes:', err);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'compartir') {
      fetchCollaborators();
    } else {
      fetchPendingInvites();
    }
  }, [selectedCatId, activeTab, isOpen, currentUserEmail]);

  if (!isOpen) return null;

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatId) return;

    const targetEmail = emailInput.trim().toLowerCase();
    if (!targetEmail) return;

    if (targetEmail === currentUserEmail.trim().toLowerCase()) {
      setErrorMessage('No puedes invitarte a ti mismo.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetEmail)) {
      setErrorMessage('Ingresa un correo electrónico válido.');
      return;
    }

    setIsActionLoading(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase
        .from('categorias_compartidas')
        .insert({
          categoria_id: selectedCatId,
          email_usuario: targetEmail,
          aceptada: false, // Por defecto pendiente
          owner_id: currentUserId,
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('Esta categoría ya está compartida con este correo.');
        }
        throw error;
      }

      setEmailInput('');
      fetchCollaborators();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error al enviar invitación.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRemoveCollaborator = async (shareId: string) => {
    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from('categorias_compartidas')
        .delete()
        .eq('id', shareId);

      if (error) throw error;
      setCollaborators(collaborators.filter((c) => c.id !== shareId));
      await onRefreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from('categorias_compartidas')
        .update({ aceptada: true })
        .eq('id', inviteId);

      if (error) throw error;
      setPendingInvites(pendingInvites.filter((p) => p.id !== inviteId));
      await onRefreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRejectInvite = async (inviteId: string) => {
    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from('categorias_compartidas')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;
      setPendingInvites(pendingInvites.filter((p) => p.id !== inviteId));
      await onRefreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsActionLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md glass-panel rounded-3xl p-6 shadow-2xl animate-check-pop text-[var(--c-text-primary)] border border-[var(--c-border)] flex flex-col gap-4 relative"
        style={{ backgroundColor: 'var(--c-page-bg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold tracking-tight text-[var(--c-text-primary)]">Colaboración</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--c-text-muted)] hover:text-[var(--c-text-primary)] hover:bg-white/5 transition-smooth cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pestanas del Modal */}
        <div className="flex p-0.5 bg-slate-500/5 border border-slate-500/10 rounded-xl">
          <button
            onClick={() => setActiveTab('compartir')}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-smooth cursor-pointer ${
              activeTab === 'compartir'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'text-[var(--c-text-muted)] hover:text-[var(--c-text-primary)]'
            }`}
          >
            Compartir Mis Listas
          </button>
          <button
            onClick={() => setActiveTab('recibidas')}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-smooth cursor-pointer relative ${
              activeTab === 'recibidas'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'text-[var(--c-text-muted)] hover:text-[var(--c-text-primary)]'
            }`}
          >
            Invitaciones Recibidas
            {pendingInvites.length > 0 && (
              <span className="absolute top-1.5 right-2 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            )}
          </button>
        </div>

        {activeTab === 'compartir' ? (
          ownedCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-6 gap-3 bg-slate-500/5 rounded-2xl border border-slate-500/10">
              <ShieldAlert className="w-8 h-8 text-amber-500 opacity-80" />
              <p className="text-xs text-[var(--c-text-secondary)]">
                No tienes ninguna categoría propia disponible para compartir. Crea una nueva categoría primero.
              </p>
            </div>
          ) : (
            <>
              {/* Formulario Compartir */}
              <div className="flex flex-col gap-3.5">
                {/* Selector */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-[var(--c-text-muted)] uppercase tracking-wider pl-1">
                    Categoría a compartir
                  </label>
                  <select
                    value={selectedCatId}
                    onChange={(e) => setSelectedCatId(e.target.value)}
                    className="w-full bg-[var(--c-input-bg)] border border-[var(--c-input-border)] rounded-xl px-3 py-2.5 text-xs text-[var(--c-text-primary)] focus:outline-none focus:border-indigo-500/50 transition-smooth font-medium cursor-pointer"
                  >
                    {ownedCategories.map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-[var(--c-page-bg)] text-[var(--c-text-primary)]">
                        {cat.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Enviar Invitación */}
                <form onSubmit={handleAddCollaborator} className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-[var(--c-text-muted)] uppercase tracking-wider pl-1">
                    Enviar invitación por correo
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--c-text-muted)]" />
                      <input
                        type="email"
                        required
                        placeholder="colaborador@correo.com"
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

              {errorMessage && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-500/5 border border-rose-500/10 rounded-xl px-3 py-2 animate-fade-in font-medium">
                  {errorMessage}
                </p>
              )}

              {/* Colaboradores */}
              <div className="flex flex-col gap-2 mt-1">
                <span className="text-[9px] font-bold text-[var(--c-text-muted)] uppercase tracking-wider pl-1 flex items-center gap-1">
                  <Users className="w-3 h-3 text-[var(--c-text-muted)]" />
                  <span>Invitados y Colaboradores ({collaborators.length})</span>
                </span>

                <div className="max-h-[140px] overflow-y-auto pr-1 flex flex-col gap-1.5 custom-scrollbar">
                  {isLoadingList ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                    </div>
                  ) : collaborators.length === 0 ? (
                    <p className="text-[11px] text-[var(--c-text-secondary)] italic p-3 text-center bg-slate-500/5 rounded-xl border border-slate-500/10">
                      Esta categoría es privada. Envía invitaciones arriba para compartirla.
                    </p>
                  ) : (
                    collaborators.map((collab) => (
                      <div
                        key={collab.id}
                        className="flex items-center justify-between px-3 py-2 bg-slate-500/5 rounded-xl border border-slate-500/10 hover:bg-slate-500/10 hover:border-slate-500/20 transition-smooth group"
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="text-xs font-semibold text-[var(--c-text-secondary)] truncate">
                            {collab.email_usuario}
                          </span>
                          <span className={`text-[9px] font-extrabold ${collab.aceptada ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400 animate-pulse'}`}>
                            {collab.aceptada ? 'Aceptado' : 'Pendiente'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveCollaborator(collab.id)}
                          disabled={isActionLoading}
                          className="text-[var(--c-text-muted)] hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-smooth cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-30 flex-shrink-0"
                          title="Revocar acceso / Cancelar invitación"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )
        ) : (
          /* PESTANA INVITACIONES RECIBIDAS PENDIENTES */
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold text-[var(--c-text-muted)] uppercase tracking-wider pl-1">
              Invitaciones de otras personas
            </span>

            <div className="max-h-[260px] overflow-y-auto pr-1 flex flex-col gap-2 custom-scrollbar">
              {isLoadingList ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                </div>
              ) : pendingInvites.length === 0 ? (
                <p className="text-[11px] text-[var(--c-text-secondary)] italic p-5 text-center bg-slate-500/5 rounded-xl border border-slate-500/10">
                  No tienes invitaciones pendientes por el momento.
                </p>
              ) : (
                pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-3 bg-slate-500/5 rounded-xl border border-slate-500/10 hover:border-slate-500/20 transition-smooth gap-3"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest leading-none mb-1">
                        Invitación Recibida
                      </span>
                      <span className="text-xs font-extrabold text-[var(--c-text-primary)] truncate">
                        {invite.categorias?.nombre || 'Categoría Compartida'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleAcceptInvite(invite.id)}
                        disabled={isActionLoading}
                        className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-smooth cursor-pointer shadow-md shadow-emerald-600/10 flex items-center justify-center"
                        title="Aceptar invitación"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRejectInvite(invite.id)}
                        disabled={isActionLoading}
                        className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-smooth cursor-pointer shadow-md shadow-rose-600/10 flex items-center justify-center"
                        title="Rechazar invitación"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
