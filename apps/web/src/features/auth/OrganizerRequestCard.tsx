import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Send } from 'lucide-react';
import { OrganizerRequest, UserRole } from '../../types';
import { tournamentXApi } from '../../services/apiClient';

interface OrganizerRequestCardProps { currentUserRole: UserRole }

export const OrganizerRequestCard: React.FC<OrganizerRequestCardProps> = ({ currentUserRole }) => {
  const [requests, setRequests] = useState<OrganizerRequest[]>([]);
  const [organizationName, setOrganizationName] = useState('');
  const [credentialReference, setCredentialReference] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const eligible = ['Jugador', 'Capitán', 'Espectador'].includes(currentUserRole);

  useEffect(() => {
    if (eligible) tournamentXApi.myOrganizerRequests().then((response) => setRequests(response.data)).catch(() => undefined);
  }, [eligible]);

  if (!eligible) return null;
  const pending = requests.find((request) => request.status === 'PENDING');
  const approved = requests.find((request) => request.status === 'APPROVED');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSending(true); setMessage('');
    try {
      const response = await tournamentXApi.createOrganizerRequest({ organizationName, credentialReference, description: 'Solicitud enviada desde el panel de TournamentX.' });
      setRequests((current) => [response.request, ...current]);
      setMessage('Solicitud enviada al administrador.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo enviar la solicitud'); }
    finally { setSending(false); }
  };

  return <section className="mx-auto mt-6 max-w-7xl px-6 lg:px-8">
    <div className="rounded-2xl border border-[#ff2e83]/25 bg-[#ff2e83]/[.07] p-5">
      <div className="flex items-start gap-3"><Building2 className="mt-0.5 h-5 w-5 text-[#ff2e83]"/><div className="flex-1"><h2 className="font-bold text-white">Convertirme en organizador</h2>
        {approved ? <p className="mt-2 flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 className="h-4 w-4"/> Solicitud aprobada. Vuelve a iniciar sesión para cargar el nuevo rol.</p>
          : pending ? <p className="mt-2 text-sm text-amber-300">Tu solicitud para {pending.organizationName} está pendiente de revisión.</p>
            : <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]"><input required minLength={2} value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} className="field" placeholder="Nombre de la organización"/><input required minLength={3} value={credentialReference} onChange={(event) => setCredentialReference(event.target.value)} className="field" placeholder="Folio o referencia de credencial"/><button disabled={sending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff2e83] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"><Send className="h-4 w-4"/>{sending ? 'Enviando' : 'Enviar solicitud'}</button></form>}
        {message && <p className="mt-2 text-xs text-slate-300">{message}</p>}
      </div></div>
    </div>
  </section>;
};
