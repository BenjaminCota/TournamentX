import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, Mail, UserPlus } from 'lucide-react';
import { TournamentXLogo } from '../../shared/components/TournamentXLogo';
import { AuthUser } from '../../types';
import { tournamentXApi } from '../../services/apiClient';
import { isSupabaseConfigured } from '../../services/supabaseClient';

interface LoginViewProps {
  onAuthenticated: (user: AuthUser) => void;
  onBackToHome: () => void;
}

const demoAccounts = [
  { label: 'Administrador', email: 'admin@tournamentx.local', password: 'Admin123!' },
  { label: 'Organizador', email: 'organizer@tournamentx.local', password: 'Organizer123!' },
  { label: 'Capitán', email: 'captain@tournamentx.local', password: 'Captain123!' },
  { label: 'Jugador', email: 'player@tournamentx.local', password: 'Player123!' },
];

export const LoginView: React.FC<LoginViewProps> = ({ onAuthenticated, onBackToHome }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(isSupabaseConfigured ? '' : 'admin@tournamentx.local');
  const [password, setPassword] = useState(isSupabaseConfigured ? '' : 'Admin123!');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setIsLoading(true); setError(''); setNotice('');
    try {
      const session = mode === 'login'
        ? await tournamentXApi.login(email, password)
        : await tournamentXApi.register({ name, email, password });
      localStorage.setItem('tournamentx_token', session.token);
      localStorage.setItem('tournamentx_user', JSON.stringify(session.user));
      onAuthenticated(session.user);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'No fue posible iniciar sesión';
      if (message.startsWith('Cuenta creada.')) { setNotice(message); setMode('login'); setPassword(''); }
      else setError(message);
    }
    finally { setIsLoading(false); }
  };

  return (
    <main className="min-h-screen bg-[#08090d] text-white grid lg:grid-cols-[1.05fr_.95fr]">
      <section className="hidden lg:flex relative overflow-hidden p-14 border-r border-white/10 flex-col justify-between bg-[#0e1017]">
        <div className="absolute inset-0 bg-cyber-grid opacity-70" /><div className="absolute -right-28 top-24 w-96 h-96 rounded-full bg-[#ff2e83]/20 blur-[100px]" />
        <div className="relative"><TournamentXLogo size="lg" onClick={onBackToHome} /></div>
        <div className="relative max-w-lg"><span className="inline-flex px-3 py-1 rounded-full border border-[#ff2e83]/30 bg-[#ff2e83]/10 text-[#ff69a8] text-xs font-bold tracking-[.2em]">CONTROL TOTAL DEL TORNEO</span><h1 className="font-brand text-7xl font-black uppercase leading-[.9] mt-6">Compite.<br/><span className="text-[#ff2e83]">Organiza.</span><br/>Domina.</h1><p className="mt-6 text-slate-400 max-w-md">Identidad, torneos, resultados en vivo, streams y premios desde una plataforma segura y sincronizada.</p></div>
        <div className="relative grid grid-cols-3 gap-3">{['8 módulos','Tiempo real',isSupabaseConfigured ? 'Datos en Supabase' : 'Datos locales'].map((item) => <div key={item} className="rounded-xl border border-white/10 bg-white/[.03] p-3 text-xs text-slate-300"><CheckCircle2 className="w-4 h-4 text-[#ff2e83] mb-2" />{item}</div>)}</div>
      </section>
      <section className="p-6 sm:p-12 flex items-center justify-center">
        <div className="w-full max-w-md">
          <button type="button" onClick={onBackToHome} className="mb-8 flex items-center gap-2 text-sm text-slate-500 hover:text-white"><ArrowLeft className="w-4 h-4" /> Volver al inicio</button>
          <div className="lg:hidden mb-8"><TournamentXLogo size="md" onClick={onBackToHome} /></div>
          <div className="flex p-1 rounded-xl bg-white/[.04] border border-white/10 mb-7"><button type="button" onClick={() => { setMode('login'); setError(''); }} className={`flex-1 py-2.5 rounded-lg text-sm font-bold ${mode === 'login' ? 'bg-[#ff2e83] text-white' : 'text-slate-400'}`}>Iniciar sesión</button><button type="button" onClick={() => { setMode('register'); setError(''); }} className={`flex-1 py-2.5 rounded-lg text-sm font-bold ${mode === 'register' ? 'bg-[#ff2e83] text-white' : 'text-slate-400'}`}>Crear cuenta</button></div>
          <h2 className="text-3xl font-black">{mode === 'login' ? 'Bienvenido de vuelta' : 'Únete a TournamentX'}</h2>
          <p className="mt-2 text-sm text-slate-500">{mode === 'login' ? 'Tu rol y permisos se cargan de forma segura.' : isSupabaseConfigured ? 'La primera cuenta será Administrador; las siguientes iniciarán como Jugador.' : 'La cuenta nueva inicia como Jugador.'}</p>
          {isSupabaseConfigured && <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Base de datos Supabase conectada</div>}
          <form onSubmit={submit} className="mt-7 space-y-4">
            {mode === 'register' && <label className="block"><span className="block mb-2 text-sm text-slate-300">Nombre completo</span><div className="relative"><UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} className="field pl-11" placeholder="Nombre del usuario" /></div></label>}
            <label className="block"><span className="block mb-2 text-sm text-slate-300">Correo electrónico</span><div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="field pl-11" autoComplete="email" /></div></label>
            <label className="block"><span className="block mb-2 text-sm text-slate-300">Contraseña</span><div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><input type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="field pl-11" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></div></label>
            {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
            {notice && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{notice}</div>}
            <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#ff2e83] px-5 py-3.5 font-bold hover:bg-[#e92578] disabled:opacity-60 shadow-lg shadow-[#ff2e83]/20">{isLoading ? 'Validando...' : mode === 'login' ? 'Entrar a la plataforma' : 'Crear mi cuenta'} {!isLoading && <ArrowRight className="w-4 h-4" />}</button>
          </form>
          {mode === 'login' && <div className="mt-7 pt-6 border-t border-white/10"><p className="text-[11px] uppercase tracking-[.18em] text-slate-500 mb-3">Accesos locales de prueba · no sincronizan</p><div className="grid grid-cols-2 gap-2">{demoAccounts.map((account) => <button type="button" key={account.email} onClick={() => { setEmail(account.email); setPassword(account.password); }} className="rounded-lg border border-white/10 bg-white/[.03] px-3 py-2 text-left text-xs text-slate-300 hover:border-[#ff2e83]/50 hover:text-white">{account.label}</button>)}</div></div>}
        </div>
      </section>
    </main>
  );
};
