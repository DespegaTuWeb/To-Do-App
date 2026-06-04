'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, KeyRound, Mail, Sparkles } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const emailTrim = email.trim();

    if (!emailTrim || !password) {
      setErrorMsg('Por favor completa todos los campos.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        // Registro
        const { data, error } = await supabase.auth.signUp({
          email: emailTrim,
          password: password,
        });

        if (error) throw error;

        // Si se auto-confirma o requiere confirmación por email
        if (data.session) {
          onAuthSuccess();
        } else {
          setSuccessMsg('¡Cuenta registrada! Verifica tu correo electrónico para confirmar tu cuenta.');
          setEmail('');
          setPassword('');
        }
      } else {
        // Inicio de sesión
        const { error } = await supabase.auth.signInWithPassword({
          email: emailTrim,
          password: password,
        });

        if (error) throw error;
        onAuthSuccess();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      // Traducir algunos errores comunes
      let friendlyMessage = err.message || 'Ocurrió un error inesperado.';
      if (friendlyMessage.includes('Invalid login credentials')) {
        friendlyMessage = 'Credenciales incorrectas. Verifica tu email y contraseña.';
      } else if (friendlyMessage.includes('User already registered')) {
        friendlyMessage = 'El correo ya está registrado. Inicia sesión.';
      } else if (friendlyMessage.includes('Email not confirmed')) {
        friendlyMessage = 'El correo electrónico no ha sido confirmado aún. Revisa tu bandeja de entrada.';
      }
      setErrorMsg(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-[var(--c-page-bg)] animate-fade-in">
      {/* Decorative luxury backgrounds (glowing orbs) */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-72 h-72 rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md glass-panel rounded-3xl p-8 md:p-10 shadow-2xl relative z-10 border border-white/5 animate-check-pop">
        {/* Header/Logo */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/10 mb-4 animate-check-pop">
            <span className="font-extrabold text-2xl tracking-tighter">K</span>
          </div>
          <h2 className="text-2xl font-extrabold text-gradient-luxury tracking-tight mb-1">
            {isSignUp ? 'Crea tu Cuenta Luxury' : 'Accede a tu Workspace'}
          </h2>
          <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">
            Keago
          </p>
        </div>

        {/* Errors & Success notifications */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-xs text-red-400 animate-check-pop text-center font-medium">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-400 animate-check-pop text-center font-medium">
            {successMsg}
          </div>
        )}

        {/* Auth form */}
        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
              Email
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-4 w-4 h-4 text-slate-500" />
              <input
                type="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full glass-input pl-11 pr-4 py-3 rounded-xl text-xs md:text-sm text-luxury-primary placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
              Contraseña
            </label>
            <div className="relative flex items-center">
              <KeyRound className="absolute left-4 w-4 h-4 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full glass-input pl-11 pr-4 py-3 rounded-xl text-xs md:text-sm text-luxury-primary placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs md:text-sm font-extrabold tracking-wide uppercase transition-smooth shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{isSignUp ? 'Crear Cuenta' : 'Entrar al Workspace'}</span>
              </>
            )}
          </button>
        </form>

        {/* Tab switcher */}
        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-xs text-slate-400">
            {isSignUp ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta aún?'}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-indigo-400 hover:text-indigo-300 font-extrabold tracking-tight transition-smooth cursor-pointer ml-1.5 focus:outline-none"
            >
              {isSignUp ? 'Inicia Sesión' : 'Regístrate Gratis'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
