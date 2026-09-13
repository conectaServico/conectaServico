import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { reviewValidationFn, resolveSupportTicketFn, callableErrorMessage, getAdminStatsFn, type AdminStats } from '@/services/api';
import { ShieldCheck, CheckCircle, XCircle, FileImage, Loader2, LifeBuoy, Link2, Users, Wrench, ClipboardList, Coins, AlertTriangle, Bug, BadgeCheck, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { SupportTicket } from '@/types';

interface ClientErrorLog {
  id: string;
  message: string;
  stack?: string;
  origin?: string;
  path?: string;
  userId?: string | null;
  userRole?: string | null;
  created_at: number;
}

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Abertos',
  NEGOTIATING: 'Em negociação',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluídos',
  CANCELED: 'Cancelados',
  EXPIRED: 'Expirados',
};

interface ValidationRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  cpf?: string;
  docFrontUrl?: string;
  docBackUrl?: string;
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
  const [tab, setTab] = useState<'overview' | 'kyc' | 'support' | 'errors'>('overview');
  const [requests, setRequests] = useState<ValidationRequest[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refundInput, setRefundInput] = useState<Record<string, string>>({});
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsError, setStatsError] = useState('');
  const [statsLoading, setStatsLoading] = useState(true);
  const [errorLogs, setErrorLogs] = useState<ClientErrorLog[]>([]);

  const fetchAll = async () => {
    try {
      const [vSnap, tSnap, eSnap] = await Promise.all([
        getDocs(query(collection(db, 'validations'))),
        getDocs(query(collection(db, 'supportTickets'), orderBy('created_at', 'desc'))),
        getDocs(query(collection(db, 'errorLogs'), orderBy('created_at', 'desc'), limit(100))),
      ]);
      const v = vSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ValidationRequest));
      v.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return b.created_at - a.created_at;
      });
      setRequests(v);
      setTickets(tSnap.docs.map((d) => ({ id: d.id, ...d.data() } as SupportTicket)));
      setErrorLogs(eSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ClientErrorLog)));
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar o painel');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    setStatsError('');
    try {
      const res = await getAdminStatsFn();
      setStats(res.data);
    } catch (err) {
      setStatsError(callableErrorMessage(err, 'Erro ao carregar as métricas.'));
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    fetchStats();
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

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setTab('overview')}
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-1.5 ${tab === 'overview' ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
        >
          <Users className="w-4 h-4" /> Visão geral
        </button>
        <button
          onClick={() => setTab('kyc')}
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${tab === 'kyc' ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
        >
CPF ({requests.filter((r) => r.status === 'pending').length})
        </button>
        <button
          onClick={() => setTab('support')}
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-1.5 ${tab === 'support' ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
        >
          <LifeBuoy className="w-4 h-4" /> Suporte ({openTickets})
        </button>
        <button
          onClick={() => setTab('errors')}
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-1.5 ${tab === 'errors' ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
        >
          <Bug className="w-4 h-4" /> Erros ({errorLogs.length})
        </button>
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          {statsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : statsError ? (
            <div className="bg-danger/10 text-danger p-4 rounded-xl text-sm font-medium flex items-center justify-between gap-3">
              {statsError}
              <button onClick={fetchStats} className="font-bold underline flex-shrink-0">Tentar de novo</button>
            </div>
          ) : stats ? (
            <>
              {stats.mpMode !== 'live' && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-sm font-bold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  {stats.mpMode === 'test'
                    ? 'Mercado Pago está em modo de TESTE — pagamentos reais não vão funcionar até trocar pra chave de produção.'
                    : 'Mercado Pago sem chave configurada — a compra de diamantes não vai funcionar.'}
                </div>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                  <div className="flex items-center gap-2 text-primary mb-2"><Users className="w-5 h-5" /><span className="text-xs font-bold uppercase tracking-wide text-slate-500">Clientes</span></div>
                  <p className="text-3xl font-extrabold text-slate-900">{stats.totalClients}</p>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><UserPlus className="w-3.5 h-3.5" /> +{stats.newClientsLast7Days} nos últimos 7 dias</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                  <div className="flex items-center gap-2 text-primary mb-2"><Wrench className="w-5 h-5" /><span className="text-xs font-bold uppercase tracking-wide text-slate-500">Profissionais</span></div>
                  <p className="text-3xl font-extrabold text-slate-900">{stats.totalProfessionals}</p>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><BadgeCheck className="w-3.5 h-3.5" /> {stats.verifiedProfessionals} verificados · +{stats.newProfessionalsLast7Days} em 7 dias</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                  <div className="flex items-center gap-2 text-primary mb-2"><ClipboardList className="w-5 h-5" /><span className="text-xs font-bold uppercase tracking-wide text-slate-500">Pedidos</span></div>
                  <p className="text-3xl font-extrabold text-slate-900">{stats.totalRequests}</p>
                  <p className="text-xs text-slate-400 mt-1">{stats.requestsByStatus.OPEN || 0} abertos agora</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                  <div className="flex items-center gap-2 text-primary mb-2"><Coins className="w-5 h-5" /><span className="text-xs font-bold uppercase tracking-wide text-slate-500">Receita aprovada</span></div>
                  <p className="text-3xl font-extrabold text-slate-900">
                    {stats.revenue.totalBRL.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{stats.revenue.totalDiamondsSold} 💎 vendidos · {stats.revenue.approvedPayments} pagamentos</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Pedidos por status</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_LABEL).map(([status, label]) => (
                    <span key={status} className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700">
                      {label}: {stats.requestsByStatus[status] || 0}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {tab === 'errors' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          {errorLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-medium">Nenhum erro registrado. 🎉</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {errorLogs.map((e) => (
                <div key={e.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-bold text-slate-900 text-sm">{e.message}</p>
                    <span className="text-xs text-slate-400 flex-shrink-0">{new Date(e.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {e.path || '—'} · {e.origin || 'client'} · {e.userRole || 'visitante'}
                  </p>
                  {e.stack && (
                    <pre className="mt-2 text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-2 overflow-x-auto text-slate-600 max-h-32">
                      {e.stack.slice(0, 600)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

                    {(req.docFrontUrl || req.docBackUrl) && (
                      <div className="flex flex-wrap gap-4">
                        {req.docFrontUrl && (
                          <a href={req.docFrontUrl} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                            <FileImage className="w-6 h-6 text-slate-400" />
                            <span className="text-xs font-bold text-slate-600">Doc Frente</span>
                          </a>
                        )}
                        {req.docBackUrl && (
                          <a href={req.docBackUrl} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                            <FileImage className="w-6 h-6 text-slate-400" />
                            <span className="text-xs font-bold text-slate-600">Doc Verso</span>
                          </a>
                        )}
                      </div>
                    )}

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
