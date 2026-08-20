import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, Mail, UserPlus } from 'lucide-react';
import { TournamentXLogo } from '../../shared/components/TournamentXLogo';
import { AuthUser } from '../../types';
import { tournamentXApi } from '../../services/apiClient';

interface LoginViewProps {
  onAuthenticated: (user: AuthUser) => void;
  onBackToHome: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onAuthenticated, onBackToHome }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setNotice('');
    const normalizedName = name.trim().replace(/\s+/g, ' ');
    const normalizedEmail = email.trim().toLowerCase();
    if (mode === 'register') {
      if (!/^[\p{L}][\p{L}\s.'-]*$/u.test(normalizedName) || normalizedName.length < 2 || normalizedName.length > 60) {
        setError('Escribe un nombre de 2 a 60 caracteres usando solo letras, espacios, guiones, puntos o apóstrofes.');
        return;
      }
      if (normalizedEmail.length > 120) {
        setError('El correo electrónico debe tener como máximo 120 caracteres.');
        return;
      }
      if (password.length > 128) {
        setError('La contraseña debe tener como máximo 128 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden. Verifícalas e inténtalo de nuevo.');
        return;
      }
    }
    setIsLoading(true);
    try {
      const session = mode === 'login'
        ? await tournamentXApi.login(normalizedEmail, password)
        : await tournamentXApi.register({ name: normalizedName, email: normalizedEmail, password });
      localStorage.setItem('tournamentx_token', session.token);
      localStorage.setItem('tournamentx_user', JSON.stringify(session.user));
      onAuthenticated(session.user);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'No fue posible iniciar sesión';
      if (message.startsWith('Cuenta creada.')) { setNotice(message); setMode('login'); setPassword(''); setConfirmPassword(''); }
      else setError(message);
    }
    finally { setIsLoading(false); }
  };

  return (
    <main className="tx-module-shell min-h-screen bg-[#08090d] text-white grid lg:grid-cols-[1.05fr_.95fr]">
      <section className="hidden lg:flex relative overflow-hidden p-14 border-r border-white/10 flex-col justify-between bg-[#0e1017]">
        <div className="absolute inset-0 bg-cyber-grid opacity-70" /><div className="absolute -right-28 top-24 w-96 h-96 rounded-full bg-[#ff2e83]/20 blur-[100px]" />
        <div className="relative"><TournamentXLogo size="lg" onClick={onBackToHome} /></div>
        <div className="relative max-w-lg"><span className="inline-flex px-3 py-1 rounded-full border border-[#ff2e83]/30 bg-[#ff2e83]/10 text-[#ff69a8] text-xs font-bold tracking-[.2em]">CONTROL TOTAL DEL TORNEO</span><h1 className="tx-hero-title mt-6 font-brand text-7xl font-black uppercase">Compite.<br/><span className="text-[#ff2e83]">Organiza.</span><br/>Domina.</h1><p className="mt-6 text-slate-400 max-w-md">Identidad, torneos, resultados en vivo, streams y premios desde una plataforma segura y sincronizada.</p></div>
        <div className="relative grid grid-cols-3 gap-3">{['8 módulos','Tiempo real','Datos sincronizados'].map((item) => <div key={item} className="rounded-xl border border-white/10 bg-white/[.03] p-3 text-xs text-slate-300"><CheckCircle2 className="w-4 h-4 text-[#ff2e83] mb-2" />{item}</div>)}</div>
      </section>
      <section className="p-6 sm:p-12 flex items-center justify-center">
        <div className="w-full max-w-md">
          <button type="button" onClick={onBackToHome} className="mb-8 flex items-center gap-2 text-sm text-slate-500 hover:text-white"><ArrowLeft className="w-4 h-4" /> Volver al inicio</button>
          <div className="lg:hidden mb-8"><TournamentXLogo size="md" onClick={onBackToHome} /></div>
          <div className="flex p-1 rounded-xl bg-white/[.04] border border-white/10 mb-7"><button type="button" onClick={() => { setMode('login'); setError(''); }} className={`flex-1 py-2.5 rounded-lg text-sm font-bold ${mode === 'login' ? 'bg-[#ff2e83] text-white' : 'text-slate-400'}`}>Iniciar sesión</button><button type="button" onClick={() => { setMode('register'); setError(''); }} className={`flex-1 py-2.5 rounded-lg text-sm font-bold ${mode === 'register' ? 'bg-[#ff2e83] text-white' : 'text-slate-400'}`}>Crear cuenta</button></div>
          <h2 className="text-3xl font-black">{mode === 'login' ? 'Bienvenido de vuelta' : 'Únete a TournamentX'}</h2>
          <p className="mt-2 text-sm text-slate-500">{mode === 'login' ? 'Tu rol y permisos se cargan de forma segura.' : 'La cuenta nueva inicia como Jugador; un administrador puede autorizar funciones adicionales.'}</p>
          <form onSubmit={submit} className="mt-7 space-y-4">
            {mode === 'register' && <label className="block"><span className="block mb-2 text-sm text-slate-300">Nombre completo</span><div className="relative"><UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><input required minLength={2} maxLength={60} value={name} onChange={(event) => setName(event.target.value.replace(/[^\p{L}\s.'-]/gu, ''))} className="field pl-11" placeholder="Ej. Ana López" autoComplete="name" /></div><small className="mt-2 block text-[11px] text-slate-500">De 2 a 60 caracteres: letras, espacios, guiones, puntos o apóstrofes.</small></label>}
            <label className="block"><span className="block mb-2 text-sm text-slate-300">Correo electrónico</span><div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><input type="email" required maxLength={120} value={email} onChange={(event) => setEmail(event.target.value.trimStart().toLowerCase())} className="field pl-11" autoComplete="email" inputMode="email" placeholder="nombre@correo.com" /></div>{mode === 'register' && <small className="mt-2 block text-[11px] text-slate-500">Usa un correo válido, por ejemplo nombre@correo.com (máximo 120 caracteres).</small>}</label>
            <label className="block"><span className="block mb-2 text-sm text-slate-300">Contraseña</span><div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><input type="password" required minLength={8} maxLength={128} {...(mode === 'register' ? { pattern: '(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}', title: 'Usa entre 8 y 128 caracteres, una mayúscula, una minúscula y un número' } : {})} value={password} onChange={(event) => setPassword(event.target.value)} className="field pl-11" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></div>{mode === 'register' && <small className="mt-2 block text-[11px] text-slate-500">De 8 a 128 caracteres, con mayúscula, minúscula y número.</small>}</label>
            {mode === 'register' && <label className="block"><span className="block mb-2 text-sm text-slate-300">Confirmar contraseña</span><div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><input type="password" required minLength={8} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="field pl-11" autoComplete="new-password" aria-invalid={Boolean(confirmPassword && password !== confirmPassword)} /></div>{confirmPassword && <small className={`mt-2 block text-[11px] ${password === confirmPassword ? 'text-emerald-400' : 'text-red-300'}`}>{password === confirmPassword ? 'Las contraseñas coinciden.' : 'Las contraseñas no coinciden.'}</small>}</label>}
            {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
            {notice && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{notice}</div>}
            <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#ff2e83] px-5 py-3.5 font-bold hover:bg-[#e92578] disabled:opacity-60 shadow-lg shadow-[#ff2e83]/20">{isLoading ? 'Validando...' : mode === 'login' ? 'Entrar a la plataforma' : 'Crear mi cuenta'} {!isLoading && <ArrowRight className="w-4 h-4" />}</button>
          </form>
          <p className="mt-6 border-t border-white/10 pt-5 text-xs leading-5 text-slate-500">Las sesiones se validan en el servidor y los permisos se asignan al perfil registrado. TournamentX no muestra contraseñas ni accesos precargados.</p>
        </div>
      </section>
    </main>
  );
};
