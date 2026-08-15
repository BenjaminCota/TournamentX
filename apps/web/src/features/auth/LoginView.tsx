import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Lock, Mail } from 'lucide-react';
import { TournamentXLogo } from '../../shared/components/TournamentXLogo';
import { UserRole } from '../../types';

interface LoginViewProps {
  currentUserRole: UserRole;
  setCurrentUserRole: (role: UserRole) => void;
  onLoginSuccess: () => void;
}

const roles: UserRole[] = ['Admin', 'Organizador', 'Árbitro', 'Capitán', 'Jugador', 'Espectador'];

export const LoginView: React.FC<LoginViewProps> = ({ currentUserRole, setCurrentUserRole, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    window.setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess();
    }, 500);
  };

  return (
    <main className="min-h-screen bg-[#0b0c10] text-white grid lg:grid-cols-2">
      <section className="hidden lg:flex p-12 border-r border-white/10 flex-col justify-between bg-[#101117]">
        <TournamentXLogo size="lg" />
        <div className="max-w-md">
          <h1 className="font-brand text-6xl font-black uppercase leading-none">Tu competencia comienza aquí.</h1>
          <p className="mt-5 text-slate-400">Administra torneos deportivos y esports desde un solo lugar.</p>
        </div>
        <p className="text-sm text-slate-600">TournamentX</p>
      </section>

      <section className="p-6 sm:p-12 flex items-center justify-center">
        <div className="w-full max-w-md">
          <button onClick={() => window.history.back()} className="mb-10 flex items-center gap-2 text-sm text-slate-500 hover:text-white"><ArrowLeft className="w-4 h-4" /> Volver</button>
          <div className="lg:hidden mb-10"><TournamentXLogo size="md" /></div>
          <h2 className="text-3xl font-bold">Iniciar sesión</h2>
          <p className="mt-2 text-sm text-slate-500">Ingresa tus datos para continuar.</p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <div>
              <label className="block mb-2 text-sm text-slate-300">Tipo de cuenta</label>
              <select value={currentUserRole} onChange={(event) => setCurrentUserRole(event.target.value as UserRole)} className="w-full rounded-lg border border-white/10 bg-[#14151c] px-4 py-3 text-sm outline-none focus:border-[#ff2e83]">
                {roles.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-2 text-sm text-slate-300">Correo electrónico</label>
              <div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-white/10 bg-[#14151c] py-3 pl-11 pr-4 text-sm outline-none focus:border-[#ff2e83]" /></div>
            </div>
            <div>
              <label className="block mb-2 text-sm text-slate-300">Contraseña</label>
              <div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-white/10 bg-[#14151c] py-3 pl-11 pr-4 text-sm outline-none focus:border-[#ff2e83]" /></div>
            </div>
            <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#ff2e83] px-5 py-3 font-semibold hover:bg-[#e11d48] disabled:opacity-60">{isLoading ? 'Ingresando...' : 'Entrar'} {!isLoading && <ArrowRight className="w-4 h-4" />}</button>
          </form>
        </div>
      </section>
    </main>
  );
};
