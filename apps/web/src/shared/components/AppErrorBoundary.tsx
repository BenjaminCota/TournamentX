import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { TournamentXLogo } from './TournamentXLogo';

interface State { hasError: boolean }

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State { return { hasError: true }; }

  componentDidCatch(error: Error) {
    console.error('TournamentX UI error', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return <main className="grid min-h-screen place-items-center bg-[#090a0e] p-6 text-white">
      <section role="alert" className="surface w-full max-w-xl p-8 text-center">
        <TournamentXLogo size="md" className="mx-auto w-fit"/>
        <AlertTriangle className="mx-auto mt-8 h-10 w-10 text-amber-300"/>
        <h1 className="mt-4 text-2xl font-black">Esta vista no pudo cargarse</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Tus datos siguen guardados. Recarga la interfaz para volver al último estado estable.</p>
        <button type="button" onClick={() => window.location.reload()} className="mx-auto mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ff2e83] px-5 py-3 text-xs font-bold"><RotateCcw className="h-4 w-4"/> RECARGAR TOURNAMENTX</button>
      </section>
    </main>;
  }
}
