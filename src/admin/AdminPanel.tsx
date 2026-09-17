import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/services/firebase';
import {
  reviewValidationFn,
  resolveSupportTicketFn,
  callableErrorMessage,
  getAdminStatsFn,
  getAdminChartsFn,
  adminSearchUsersFn,
  adminGetUserDetailFn,
  adminListUsersFn,
  adminAdjustDiamondsFn,
  type AdminStats,
  type AdminCharts,
  type AdminUserHit,
  type AdminUserDetail,
} from '@/services/api';
import { ShieldCheck, CheckCircle, XCircle, FileImage, Loader2, LifeBuoy, Link2, Users, Wrench, ClipboardList, Coins, AlertTriangle, Bug, BadgeCheck, UserPlus, Search, ChevronLeft, Gift } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import toast from 'react-hot-toast';
import { SupportTicket } from '@/types';

// Mesmas cores da marca (src/index.css) — azul = clientes/receita, laranja =
// profissionais. É o par categórico já usado em todo o app, validado pro
// gráfico (CVD ΔE 32.8, normal-vision ΔE 41.5 — folgado nos dois).
const COLOR_BLUE = '#2563EB';
const COLOR_ORANGE = '#F97316';

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const shortDay = (iso: string) => iso.slice(8, 10) + '/' + iso.slice(5, 7);
// Espelha CHART_DAYS de functions/src/index.ts — só pro texto "últimos N dias".
const CHART_DAYS_LABEL = 14;

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
  const [tab, setTab] = useState<'overview' | 'kyc' | 'support' | 'users' | 'errors'>('overview');
  const [requests, setRequests] = useState<ValidationRequest[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refundInput, setRefundInput] = useState<Record<string, string>>({});
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsError, setStatsError] = useState('');
  const [statsLoading, setStatsLoading] = useState(true);
  const [errorLogs, setErrorLogs] = useState<ClientErrorLog[]>([]);
  const [charts, setCharts] = useState<AdminCharts | null>(null);
  const [chartsError, setChartsError] = useState('');
  const [chartsLoading, setChartsLoading] = useState(true);

  // Aba "Usuários" — busca por nome/e-mail OU navega a lista inteira de
  // clientes/profissionais, paginada; qualquer um dos dois caminhos abre o
  // mesmo retrato completo (userDetail).
  const [usersRole, setUsersRole] = useState<'professional' | 'client'>('professional');
  const [usersList, setUsersList] = useState<AdminUserHit[]>([]);
  const [usersListLoading, setUsersListLoading] = useState(false);
  const [usersListCursor, setUsersListCursor] = useState<number | null>(null);
  const [usersListDone, setUsersListDone] = useState(false);

  const [userSearch, setUserSearch] = useState('');
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userSearchError, setUserSearchError] = useState('');
  const [userHits, setUserHits] = useState<AdminUserHit[]>([]);
  const [userDetail, setUserDetail] = useState<AdminUserDetail | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);

  const [diamondAmount, setDiamondAmount] = useState('');
  const [diamondReason, setDiamondReason] = useState('');
  const [diamondSubmitting, setDiamondSubmitting] = useState(false);

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

  const fetchCharts = async () => {
    setChartsLoading(true);
    setChartsError('');
    try {
      const res = await getAdminChartsFn();
      setCharts(res.data);
    } catch (err) {
      setChartsError(callableErrorMessage(err, 'Erro ao carregar os gráficos.'));
    } finally {
      setChartsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    fetchStats();
    fetchCharts();
  }, []);

  const handleUserSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userSearch.trim().length < 2) return;
    setUserSearchLoading(true);
    setUserSearchError('');
    setUserDetail(null);
    try {
      const res = await adminSearchUsersFn({ query: userSearch.trim() });
      setUserHits(res.data.results);
      if (res.data.results.length === 0) setUserSearchError('Nenhum usuário encontrado.');
    } catch (err) {
      setUserSearchError(callableErrorMessage(err, 'Erro ao buscar usuário.'));
    } finally {
      setUserSearchLoading(false);
    }
  };

  const clearUserSearch = () => {
    setUserSearch('');
    setUserHits([]);
    setUserSearchError('');
  };

  const openUserDetail = async (userId: string) => {
    setUserDetailLoading(true);
    try {
      const res = await adminGetUserDetailFn({ userId });
      setUserDetail(res.data);
    } catch (err) {
      toast.error(callableErrorMessage(err, 'Erro ao carregar a conta.'));
    } finally {
      setUserDetailLoading(false);
    }
  };

  const closeUserDetail = () => {
    setUserDetail(null);
    setUserHits([]);
    setUserSearch('');
    setUserSearchError('');
    setDiamondAmount('');
    setDiamondReason('');
  };

  const fetchUsersList = async (role: 'professional' | 'client', reset: boolean) => {
    setUsersListLoading(true);
    try {
      const res = await adminListUsersFn({ role, cursorCreatedAt: reset ? null : usersListCursor });
      setUsersList((prev) => (reset ? res.data.results : [...prev, ...res.data.results]));
      setUsersListCursor(res.data.nextCursor);
      setUsersListDone(res.data.nextCursor === null);
    } catch (err) {
      toast.error(callableErrorMessage(err, 'Erro ao carregar a lista.'));
    } finally {
      setUsersListLoading(false);
    }
  };

  // Carrega a lista da aba "Usuários" na entrada e sempre que troca o papel
  // (Profissionais/Clientes) — mas não enquanto uma busca ou um detalhe estão abertos.
  useEffect(() => {
    if (tab === 'users' && !userDetail && userHits.length === 0) {
      setUsersList([]);
      setUsersListCursor(null);
      setUsersListDone(false);
      fetchUsersList(usersRole, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, usersRole]);

  const handleKyc = async (userId: string, decision: 'approved' | 'rejected') => {
    try {
      await reviewValidationFn({ userId, decision });
      toast.success(`Solicitação ${decision === 'approved' ? 'aprovada' : 'recusada'}!`);
      fetchAll();
    } catch (err) {
      toast.error(callableErrorMessage(err, 'Erro ao processar'));
    }
  };

  const handleKycFromDetail = async (userId: string, decision: 'approved' | 'rejected') => {
    await handleKyc(userId, decision);
    openUserDetail(userId);
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

  const handleTicketFromDetail = async (userId: string, ticketId: string, decision: 'resolved' | 'rejected' | 'in_review') => {
    await handleTicket(ticketId, decision);
    openUserDetail(userId);
  };

  const handleAdjustDiamonds = async (userId: string) => {
    const amount = Math.trunc(Number(diamondAmount));
    if (!amount) return;
    setDiamondSubmitting(true);
    try {
      await adminAdjustDiamondsFn({ userId, amount, reason: diamondReason.trim() || undefined });
      toast.success(`${amount > 0 ? '+' : ''}${amount} 💎 aplicado!`);
      setDiamondAmount('');
      setDiamondReason('');
      openUserDetail(userId);
    } catch (err) {
      toast.error(callableErrorMessage(err, 'Erro ao ajustar diamantes.'));
    } finally {
      setDiamondSubmitting(false);
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
          onClick={() => { setTab('users'); closeUserDetail(); }}
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-1.5 ${tab === 'users' ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
        >
          <Gift className="w-4 h-4" /> Usuários
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

          {/* Gráficos — período fixo dos últimos 14 dias. Consulta separada
              das métricas rápidas de cima porque lê documentos, não só
              contadores. */}
          {chartsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : chartsError ? (
            <div className="bg-danger/10 text-danger p-4 rounded-xl text-sm font-medium flex items-center justify-between gap-3">
              {chartsError}
              <button onClick={fetchCharts} className="font-bold underline flex-shrink-0">Tentar de novo</button>
            </div>
          ) : charts ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold text-slate-800">Novos usuários por dia</h3>
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: COLOR_BLUE }} />Clientes</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: COLOR_ORANGE }} />Profissionais</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">Últimos {CHART_DAYS_LABEL} dias</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={charts.days.map((d) => ({
                      day: shortDay(d),
                      clientes: charts.newClientsByDay[d] || 0,
                      profissionais: charts.newProfessionalsByDay[d] || 0,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#898781' }} axisLine={{ stroke: '#c3c2b7' }} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#898781' }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} labelFormatter={(v) => `Dia ${v}`} />
                      <Line type="monotone" dataKey="clientes" name="Clientes" stroke={COLOR_BLUE} strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="profissionais" name="Profissionais" stroke={COLOR_ORANGE} strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                  <h3 className="text-sm font-bold text-slate-800 mb-1">Faturamento por dia</h3>
                  <p className="text-xs text-slate-400 mb-3">Pagamentos aprovados · últimos {CHART_DAYS_LABEL} dias</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={charts.days.map((d) => ({ day: shortDay(d), receita: charts.revenueByDay[d] || 0 }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#898781' }} axisLine={{ stroke: '#c3c2b7' }} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#898781' }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `R$${v}`} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [BRL(Number(v) || 0), 'Receita']} labelFormatter={(v) => `Dia ${v}`} />
                      <Bar dataKey="receita" name="Receita" fill={COLOR_BLUE} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-1">Top profissionais por faturamento</h3>
                <p className="text-xs text-slate-400 mb-3">Pagamentos aprovados · últimos {CHART_DAYS_LABEL} dias</p>
                {charts.topProfessionals.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">Nenhuma compra de diamantes no período.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(160, charts.topProfessionals.length * 40)}>
                    <BarChart
                      data={charts.topProfessionals.map((p) => ({ name: p.name, faturamento: p.totalBRL, email: p.email }))}
                      layout="vertical"
                      margin={{ left: 8, right: 24 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 12, fill: '#52514e' }}
                        axisLine={false}
                        tickLine={false}
                        width={140}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        formatter={(v) => [BRL(Number(v) || 0), 'Faturamento']}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.email || ''}
                      />
                      <Bar dataKey="faturamento" fill={COLOR_BLUE} radius={[0, 4, 4, 0]} maxBarSize={22} label={{ position: 'right', fontSize: 11, fill: '#52514e', formatter: (v: unknown) => BRL(Number(v) || 0) }} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
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

      {tab === 'users' && (
        <div className="space-y-6">
          {userDetail ? (
            (() => {
              const u = userDetail.user;
              const isClient = u.role === 'client';
              const pendingKyc = userDetail.validation && (userDetail.validation as { status?: string }).status === 'pending';
              return (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                  <button
                    type="button"
                    onClick={closeUserDetail}
                    className="text-sm font-bold text-primary flex items-center gap-1 mb-4 hover:underline"
                  >
                    <ChevronLeft className="w-4 h-4" /> Voltar
                  </button>

                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h4 className="font-bold text-lg text-slate-900">{String(u.name || '—')}</h4>
                      <p className="text-sm text-slate-500">{String(u.email || '—')} · {String(u.phone || '—')}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {isClient ? 'Cliente' : 'Profissional'}
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${u.verified ? 'bg-success/10 text-success' : 'bg-amber-100 text-amber-700'}`}>
                          {u.verified ? 'Verificado' : 'Não verificado'}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {Number(u.coinsBalance || 0)} 💎
                        </span>
                        {typeof u.rating === 'number' && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            ★ {(u.rating as number).toFixed(1)} ({Number(u.reviewCount || 0)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações pendentes daquela conta específica, resolvidas direto
                      daqui — sem precisar ir pra aba CPF/Suporte procurar. */}
                  {pendingKyc && (
                    <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-3">
                      <span className="text-sm font-bold text-amber-800">Validação de CPF pendente</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleKycFromDetail(u.id as string, 'approved')} className="p-2 bg-success/10 text-success rounded-lg hover:bg-success hover:text-white transition-colors" title="Aprovar">
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleKycFromDetail(u.id as string, 'rejected')} className="p-2 bg-danger/10 text-danger rounded-lg hover:bg-danger hover:text-white transition-colors" title="Recusar">
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {userDetail.recentTickets.filter((t) => t.status === 'open' || t.status === 'in_review').map((t) => (
                    <div key={String(t.id)} className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                      <p className="text-sm font-bold text-amber-800">Chamado aberto: {String(t.subject)}</p>
                      <p className="text-sm text-slate-600">{String(t.message)}</p>
                      <textarea
                        rows={2}
                        placeholder="Resposta ao usuário…"
                        value={noteInput[String(t.id)] || ''}
                        onChange={(e) => setNoteInput((p) => ({ ...p, [String(t.id)]: e.target.value }))}
                        className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary bg-white"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          placeholder="💎 reembolso"
                          value={refundInput[String(t.id)] || ''}
                          onChange={(e) => setRefundInput((p) => ({ ...p, [String(t.id)]: e.target.value }))}
                          className="w-28 p-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary bg-white"
                        />
                        <button onClick={() => handleTicketFromDetail(u.id as string, String(t.id), 'resolved')} className="px-3 py-2 text-sm font-bold bg-success/10 text-success rounded-lg hover:bg-success hover:text-white transition-colors">
                          Resolver
                        </button>
                        <button onClick={() => handleTicketFromDetail(u.id as string, String(t.id), 'rejected')} className="px-3 py-2 text-sm font-bold bg-danger/10 text-danger rounded-lg hover:bg-danger hover:text-white transition-colors">
                          Recusar
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Dar/descontar diamantes na mão — o pedido explícito da usuária. */}
                  <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5" /> Dar/descontar diamantes
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="number"
                        placeholder="Ex: 50 ou -20"
                        value={diamondAmount}
                        onChange={(e) => setDiamondAmount(e.target.value)}
                        className="w-32 p-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Motivo (opcional)"
                        value={diamondReason}
                        onChange={(e) => setDiamondReason(e.target.value)}
                        className="flex-1 min-w-[160px] p-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary bg-white"
                      />
                      <button
                        type="button"
                        disabled={diamondSubmitting || !diamondAmount.trim()}
                        onClick={() => handleAdjustDiamonds(u.id as string)}
                        className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg disabled:opacity-50 flex items-center gap-2"
                      >
                        {diamondSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Aplicar
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                        {isClient ? 'Pedidos recentes' : 'Propostas recentes'}
                      </p>
                      {(isClient ? userDetail.recentRequests : userDetail.recentProposals).length === 0 ? (
                        <p className="text-xs text-slate-400">Nada por aqui.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {(isClient ? userDetail.recentRequests : userDetail.recentProposals).map((r) => (
                            <li key={String(r.id)} className="text-xs text-slate-600 flex items-center justify-between gap-2">
                              <span className="truncate">{isClient ? String(r.subcategory || r.category) : `Proposta · R$ ${r.estimatedPrice}`}</span>
                              <span className="text-slate-400 flex-shrink-0">{String(r.status)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Pagamentos recentes</p>
                      {userDetail.recentPayments.length === 0 ? (
                        <p className="text-xs text-slate-400">Nenhum pagamento.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {userDetail.recentPayments.map((p) => (
                            <li key={String(p.id)} className="text-xs text-slate-600 flex items-center justify-between gap-2">
                              <span>{BRL(Number(p.amount || 0))} · {Number(p.diamonds || 0)} 💎</span>
                              <span className="text-slate-400 flex-shrink-0">{String(p.status)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Transações (💎)</p>
                      {userDetail.recentTransactions.length === 0 ? (
                        <p className="text-xs text-slate-400">Nenhuma transação.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {userDetail.recentTransactions.map((t) => (
                            <li key={String(t.id)} className="text-xs text-slate-600 flex items-center justify-between gap-2">
                              <span className="truncate">{String(t.description)}</span>
                              <span className={`flex-shrink-0 font-bold ${Number(t.amount) >= 0 ? 'text-success' : 'text-danger'}`}>
                                {Number(t.amount) >= 0 ? '+' : ''}{String(t.amount)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Chamados de suporte</p>
                      {userDetail.recentTickets.length === 0 ? (
                        <p className="text-xs text-slate-400">Nenhum chamado.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {userDetail.recentTickets.map((t) => (
                            <li key={String(t.id)} className="text-xs text-slate-600 flex items-center justify-between gap-2">
                              <span className="truncate">{String(t.subject)}</span>
                              <span className="text-slate-400 flex-shrink-0">{String(t.status)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : userDetailLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Search className="w-4 h-4" /> Buscar usuário
                </h3>
                <form onSubmit={handleUserSearch} className="flex gap-2">
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="E-mail exato ou nome…"
                    className="flex-1 px-3 py-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                  />
                  {userHits.length > 0 || userSearchError ? (
                    <button type="button" onClick={clearUserSearch} className="px-4 py-2.5 bg-slate-100 text-slate-600 text-sm font-bold rounded-lg">
                      Limpar
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    disabled={userSearchLoading || userSearch.trim().length < 2}
                    className="px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-lg disabled:opacity-50 flex items-center gap-2"
                  >
                    {userSearchLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Buscar
                  </button>
                </form>
                {userSearchError && <p className="text-sm text-danger mt-2 font-medium">{userSearchError}</p>}

                {userHits.length > 0 && (
                  <div className="mt-3 divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {userHits.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => openUserDetail(u.id)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">
                            {u.name} <span className="font-normal text-slate-400">· {u.role === 'client' ? 'cliente' : 'profissional'}</span>
                          </p>
                          <p className="text-xs text-slate-500 truncate">{u.email}</p>
                        </div>
                        <span className="text-xs font-bold text-slate-400 flex-shrink-0">{u.coinsBalance} 💎</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {userHits.length === 0 && !userSearchError && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="flex gap-2 p-4 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={() => setUsersRole('professional')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${usersRole === 'professional' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      Profissionais
                    </button>
                    <button
                      type="button"
                      onClick={() => setUsersRole('client')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${usersRole === 'client' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      Clientes
                    </button>
                  </div>

                  {usersListLoading && usersList.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                  ) : usersList.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 font-medium">Nenhum usuário.</div>
                  ) : (
                    <>
                      <div className="divide-y divide-slate-100">
                        {usersList.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => openUserDetail(u.id)}
                            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate">{u.name || '(sem nome)'}</p>
                              <p className="text-xs text-slate-500 truncate">{u.email}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {u.verified && <BadgeCheck className="w-4 h-4 text-success" />}
                              <span className="text-xs font-bold text-slate-400">{u.coinsBalance} 💎</span>
                            </div>
                          </button>
                        ))}
                      </div>
                      {!usersListDone && (
                        <div className="p-4 text-center border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => fetchUsersList(usersRole, false)}
                            disabled={usersListLoading}
                            className="text-sm font-bold text-primary hover:underline disabled:opacity-50"
                          >
                            {usersListLoading ? 'Carregando…' : 'Carregar mais'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
