import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { reviewValidationFn, resolveSupportTicketFn, callableErrorMessage } from '@/services/api';
import { ShieldCheck, CheckCircle, XCircle, FileImage, Loader2, LifeBuoy, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { SupportTicket } from '@/types';

interface ValidationRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  cpf?: string;
  docFrontUrl: string;
  docBackUrl: string;
  faceMatchDistance?: number | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: number;
}

const CAT_LABEL: Record<string, string> = {
  fake_lead: 'Pedido falso / reembolso',
  no_show: 'Não compareceu',
  abusive: 'Abuso',
  payment: 'Pagamento',
  app_error: 'Erro no app',
  other: 'Outro',
};

const badge = (status: string) =>
  status === 'pending' || status === 'open'
    ? 'bg-amber-100 text-amber-700'
    : status === 'approved' || status === 'resolved'
      ? 'bg-success/10 text-success'
      : status === 'in_review'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-danger/10 text-danger';

const AdminPanel = () => {
  const [tab, setTab] = useState<'kyc' | 'support'>('kyc');
  const [requests, setRequests] = useState<ValidationRequest[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refundInput, setRefundInput] = useState<Record<string, string>>({});
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});

  const fetchAll = async () => {
    try {
      const [vSnap, tSnap] = await Promise.all([
        getDocs(query(collection(db, 'validations'))),
        getDocs(query(collection(db, 'supportTickets'), orderBy('created_at', 'desc'))),
      ]);
      const v = vSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ValidationRequest));
      v.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return b.created_at - a.created_at;
      });
      setRequests(v);
      setTickets(tSnap.docs.map((d) => ({ id: d.id, ...d.data() } as SupportTicket)));
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar o painel');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleKyc = async (userId: string, decision: 'approved' | 'rejected') => {
    try {
      await reviewValidationFn({ userId, decision });
      toast.success(`Solicitação ${decision === 'approved' ? 'aprovada' : 'recusada'}!`);
      fetchAll();
    } catch (err) {
      toast.error(callableErrorMessage(err, 'Erro ao processar'));
    }
  };

  const handleTicket = async (
    ticketId: string,
    decision: 'resolved' | 'rejected' | 'in_review'
  ) => {
    try {
      await resolveSupportTicketFn({
        ticketId,
        decision,
        note: noteInput[ticketId] || '',
        refundDiamonds: Number(refundInput[ticketId]) || 0,
      });
      toast.success('Chamado atualizado.');
      fetchAll();
    } catch (err) {
      toast.error(callableErrorMessage(err, 'Erro ao atualizar o chamado'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const openTickets = tickets.filter((t) => t.status === 'open' || t.status === 'in_review').length;

  return (
    <div className="max-w-6xl mx-auto pb-12 pt-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-extrabold text-slate-900">Painel de Administração</h1>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('kyc')}
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${tab === 'kyc' ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
        >
          Documentos ({requests.filter((r) => r.status === 'pending').length})
        </button>
        <button
          onClick={() => setTab('support')}
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-1.5 ${tab === 'support' ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
        >
          <LifeBuoy className="w-4 h-4" /> Suporte ({openTickets})
        </button>
      </div>

      {tab === 'kyc' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          {requests.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-medium">Nenhuma solicitação.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {requests.map((req) => (
                <div key={req.id} className={`p-6 ${req.status === 'pending' ? 'bg-amber-50/30' : ''}`}>
                  <div className="flex flex-col md:flex-row gap-6 justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">{req.userName}</h3>
                      <p className="text-slate-500 text-sm">{req.userEmail}</p>
                      {req.cpf && <p className="text-slate-500 text-sm">CPF: {req.cpf}</p>}
                      {typeof req.faceMatchDistance === 'number' && (
                        <p className={`text-sm font-bold ${req.faceMatchDistance < 0.58 ? 'text-success' : 'text-danger'}`}>
                          Face-match: {req.faceMatchDistance.toFixed(3)} {req.faceMatchDistance < 0.58 ? '(bate)' : '(NÃO bate)'}
                        </p>
                      )}
                      <span className={`mt-2 inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${badge(req.status)}`}>
                        {req.status === 'pending' ? 'Pendente' : req.status === 'approved' ? 'Aprovado' : 'Recusado'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <a href={req.docFrontUrl} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                        <FileImage className="w-6 h-6 text-slate-400" />
                        <span className="text-xs font-bold text-slate-600">Doc Frente</span>
                      </a>
                      <a href={req.docBackUrl} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                        <FileImage className="w-6 h-6 text-slate-400" />
                        <span className="text-xs font-bold text-slate-600">Doc Verso</span>
                      </a>
                    </div>

                    {req.status === 'pending' && (
                      <div className="flex items-center gap-3">
                        <button onClick={() => handleKyc(req.userId, 'approved')} className="p-3 bg-success/10 text-success rounded-xl hover:bg-success hover:text-white transition-colors" title="Aprovar">
                          <CheckCircle className="w-6 h-6" />
                        </button>
                        <button onClick={() => handleKyc(req.userId, 'rejected')} className="p-3 bg-danger/10 text-danger rounded-xl hover:bg-danger hover:text-white transition-colors" title="Recusar">
                          <XCircle className="w-6 h-6" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'support' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          {tickets.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-medium">Nenhum chamado.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tickets.map((t) => (
                <div key={t.id} className={`p-6 ${t.status === 'open' ? 'bg-amber-50/30' : ''}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {CAT_LABEL[t.category] || t.category} · {t.userRole}
                      </span>
                      <h3 className="font-bold text-slate-900">{t.subject}</h3>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${badge(t.status)}`}>
                      {t.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{t.message}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {t.userName} · {t.userEmail}
                    {t.requestId && (
                      <a href={`/requests/${t.requestId}`} className="ml-2 text-primary font-bold inline-flex items-center gap-1">
                        <Link2 className="w-3 h-3" /> pedido #{t.requestId.slice(0, 6)}
                      </a>
                    )}
                  </p>

                  {(t.status === 'open' || t.status === 'in_review') && (
                    <div className="mt-3 space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <textarea
                        rows={2}
                        placeholder="Resposta ao usuário…"
                        value={noteInput[t.id] || ''}
                        onChange={(e) => setNoteInput((p) => ({ ...p, [t.id]: e.target.value }))}
                        className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          placeholder="💎 reembolso"
                          value={refundInput[t.id] || ''}
                          onChange={(e) => setRefundInput((p) => ({ ...p, [t.id]: e.target.value }))}
                          className="w-28 p-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button onClick={() => handleTicket(t.id, 'resolved')} className="px-3 py-2 text-sm font-bold bg-success/10 text-success rounded-lg hover:bg-success hover:text-white transition-colors">
                          Resolver
                        </button>
                        <button onClick={() => handleTicket(t.id, 'rejected')} className="px-3 py-2 text-sm font-bold bg-danger/10 text-danger rounded-lg hover:bg-danger hover:text-white transition-colors">
                          Recusar
                        </button>
                        {t.status === 'open' && (
                          <button onClick={() => handleTicket(t.id, 'in_review')} className="px-3 py-2 text-sm font-bold bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white transition-colors">
                            Em análise
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {t.resolution && (
                    <div className="mt-2 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700">
                      <span className="font-bold">Resposta:</span> {t.resolution}
                      {typeof t.refundedDiamonds === 'number' && t.refundedDiamonds > 0 && (
                        <span className="font-bold text-success"> · +{t.refundedDiamonds} 💎</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
