'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Shield, Calendar, Users, Loader2, Search, Check, AlertCircle, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  onRefreshData: () => Promise<void>;
}

interface Perfil {
  id: string;
  email: string;
  is_premium: boolean;
  premium_valido_hasta: string | null;
  created_at: string;
}

export default function AdminModal({ isOpen, onClose, currentUserId, onRefreshData }: AdminModalProps) {
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
  const [profiles, setProfiles] = useState<Perfil[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  // Cargar perfiles
  const fetchProfiles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error('Error cargando perfiles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProfiles();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filtrar perfiles por email
  const filteredProfiles = profiles.filter((profile) =>
    profile.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Manejar cambios en el perfil local antes de guardar
  const handleLocalProfileChange = (id: string, updates: Partial<Perfil>) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  // Guardar perfil en la base de datos
  const handleSaveProfile = async (profile: Perfil) => {
    setUpdatingId(profile.id);
    setErrorId(null);
    setSuccessId(null);

    try {
      // Si is_premium es false, aseguramos limpiar el valido_hasta
      const finalValidoHasta = profile.is_premium ? profile.premium_valido_hasta : null;

      const { error } = await supabase
        .from('perfiles')
        .update({
          is_premium: profile.is_premium,
          premium_valido_hasta: finalValidoHasta,
        })
        .eq('id', profile.id);

      if (error) throw error;

      setSuccessId(profile.id);
      setTimeout(() => setSuccessId(null), 3000);
      await onRefreshData(); // Refrescar los datos locales en el page principal
    } catch (err: any) {
      console.error('Error guardando perfil:', err);
      setErrorId(profile.id);
      setTimeout(() => setErrorId(null), 3000);
    } finally {
      setUpdatingId(null);
    }
  };

  // Asignar fechas rápidas
  const handleQuickExpiry = (id: string, days: number | null) => {
    let dateStr: string | null = null;
    if (days !== null) {
      const d = new Date();
      d.setDate(d.getDate() + days);
      // Establecer al final del día local
      d.setHours(23, 59, 59, 999);
      dateStr = d.toISOString();
    }
    handleLocalProfileChange(id, { is_premium: true, premium_valido_hasta: dateStr });
  };

  // Calcular estado y tiempo restante
  const getPremiumStatus = (profile: Perfil) => {
    if (!profile.is_premium) {
      return { status: 'Normal', colorClass: 'text-slate-500 dark:text-slate-400 bg-slate-500/5 border border-slate-500/10' };
    }
    if (!profile.premium_valido_hasta) {
      return { status: 'Premium Permanente', colorClass: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/15 font-bold' };
    }
    const expiry = new Date(profile.premium_valido_hasta);
    const now = new Date();
    if (expiry < now) {
      return { status: 'Expirado', colorClass: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/15' };
    }

    const diffTime = Math.abs(expiry.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      status: `Premium (Vence en ${diffDays} ${diffDays === 1 ? 'día' : 'días'})`,
      colorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 font-bold'
    };
  };

  // Formatear fecha de registro
  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  // Formatear fecha de expiración para el input type="date"
  const getFormattedDateForInput = (isoString: string | null) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl h-[80vh] glass-panel rounded-3xl p-6 shadow-2xl animate-check-pop text-[var(--c-text-primary)] border border-[var(--c-border)] flex flex-col gap-5 relative"
        style={{ backgroundColor: 'var(--c-page-bg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-base font-bold tracking-tight">Panel de Administración Beta</h2>
              <span className="text-[10px] text-[var(--c-text-muted)] font-semibold uppercase tracking-wider">Gestión de Accesos Premium</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--c-text-muted)] hover:text-[var(--c-text-primary)] hover:bg-white/5 transition-smooth cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--c-text-muted)]" />
          <input
            type="text"
            placeholder="Buscar usuario por correo electrónico..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--c-input-bg)] border border-[var(--c-input-border)] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[var(--c-text-primary)] focus:outline-none focus:border-indigo-500/50 transition-smooth placeholder:text-slate-500 font-medium"
          />
        </div>

        {/* Listado de perfiles */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3.5 custom-scrollbar">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <span className="text-xs text-[var(--c-text-secondary)] font-medium">Cargando perfiles de usuarios...</span>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-500/5 rounded-3xl border border-slate-500/10 gap-3">
              <Users className="w-9 h-9 text-[var(--c-text-muted)] opacity-60" />
              <p className="text-xs text-[var(--c-text-secondary)] font-medium">
                No se encontraron usuarios registrados {searchQuery && `para la búsqueda "${searchQuery}"`}.
              </p>
            </div>
          ) : (
            filteredProfiles.map((profile) => {
              const statusInfo = getPremiumStatus(profile);
              const isUpdating = updatingId === profile.id;
              const isSuccess = successId === profile.id;
              const isError = errorId === profile.id;

              return (
                <div
                  key={profile.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-500/5 rounded-2xl border border-slate-500/10 hover:border-slate-500/20 hover:bg-slate-500/10 transition-smooth gap-4 group relative overflow-hidden"
                >
                  {/* Detalles Usuario */}
                  <div className="flex flex-col min-w-[220px] max-w-[280px]">
                    <span className="text-xs font-bold text-[var(--c-text-primary)] truncate" title={profile.email}>
                      {profile.email}
                    </span>
                    <span className="text-[10px] text-[var(--c-text-muted)] font-semibold mt-0.5">
                      Registrado: {formatDate(profile.created_at)}
                    </span>
                    <div className="flex mt-2">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide flex items-center justify-center ${statusInfo.colorClass}`}>
                        {statusInfo.status}
                      </span>
                    </div>
                  </div>

                  {/* Controles de Configuración Premium */}
                  <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 justify-end">
                    {/* Switch Premium */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={profile.is_premium}
                        onChange={(e) =>
                          handleLocalProfileChange(profile.id, {
                            is_premium: e.target.checked,
                            premium_valido_hasta: e.target.checked ? profile.premium_valido_hasta : null,
                          })
                        }
                        className="w-4 h-4 text-indigo-600 bg-[var(--c-input-bg)] rounded border border-[var(--c-input-border)] focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                      />
                      <span className="text-xs font-semibold text-[var(--c-text-secondary)]">
                        Habilitar Premium
                      </span>
                    </label>

                    {/* Fecha de Expiración (Solo si premium está habilitado) */}
                    {profile.is_premium && (
                      <div className="flex flex-col gap-1 w-full sm:w-auto">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[var(--c-text-muted)]" />
                          <input
                            type="date"
                            value={getFormattedDateForInput(profile.premium_valido_hasta)}
                            onChange={(e) => {
                              const selectedDate = e.target.value;
                              const dateStr = selectedDate ? new Date(selectedDate + 'T23:59:59').toISOString() : null;
                              handleLocalProfileChange(profile.id, { premium_valido_hasta: dateStr });
                            }}
                            className="bg-[var(--c-input-bg)] border border-[var(--c-input-border)] rounded-lg px-2 py-1 text-[11px] text-[var(--c-text-primary)] focus:outline-none focus:border-indigo-500/50 transition-smooth font-medium cursor-pointer"
                          />
                        </div>

                        {/* Atajos Rápidos */}
                        <div className="flex gap-1 mt-1">
                          <button
                            onClick={() => handleQuickExpiry(profile.id, 30)}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-500/10 hover:bg-indigo-500/20 text-[var(--c-text-secondary)] hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-500/5 hover:border-indigo-500/30 cursor-pointer transition-smooth"
                          >
                            +30d
                          </button>
                          <button
                            onClick={() => handleQuickExpiry(profile.id, 90)}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-500/10 hover:bg-indigo-500/20 text-[var(--c-text-secondary)] hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-500/5 hover:border-indigo-500/30 cursor-pointer transition-smooth"
                          >
                            +90d
                          </button>
                          <button
                            onClick={() => handleQuickExpiry(profile.id, 365)}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-500/10 hover:bg-indigo-500/20 text-[var(--c-text-secondary)] hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-500/5 hover:border-indigo-500/30 cursor-pointer transition-smooth"
                          >
                            +1a
                          </button>
                          <button
                            onClick={() => handleQuickExpiry(profile.id, null)}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-500/10 hover:bg-indigo-500/20 text-[var(--c-text-secondary)] hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-500/5 hover:border-indigo-500/30 cursor-pointer transition-smooth flex items-center gap-0.5"
                          >
                            <Award className="w-2.5 h-2.5" />
                            <span>Perm</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Acciones de Guardar */}
                  <div className="flex items-center justify-end w-full md:w-auto mt-2 md:mt-0 flex-shrink-0">
                    <button
                      onClick={() => handleSaveProfile(profile)}
                      disabled={isUpdating}
                      className={`min-w-[70px] h-8 rounded-xl text-xs font-semibold px-3 py-1.5 transition-smooth flex items-center justify-center gap-1.5 shadow-md cursor-pointer ${
                        isSuccess
                          ? 'bg-emerald-600 text-white shadow-emerald-600/10'
                          : isError
                            ? 'bg-rose-600 text-white shadow-rose-600/10'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/10 disabled:opacity-50'
                      }`}
                    >
                      {isUpdating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isSuccess ? (
                        <Check className="w-3.5 h-3.5 animate-check-pop" />
                      ) : isError ? (
                        <AlertCircle className="w-3.5 h-3.5 animate-bounce" />
                      ) : (
                        <span>Guardar</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
