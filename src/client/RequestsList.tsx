import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useUserStore } from '@/store/userStore';
import { ServiceRequest } from '@/types';
import { Loader2, Plus, MapPin, Clock, FileText, SlidersHorizontal, ArrowUpDown, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PAGE_SIZE = 20;

type StatusFilter = 'all' | ServiceRequest['status'];
type SortMode = 'recent' | 'oldest';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'OPEN', label: 'Aguardando propostas' },
  { value: 'NEGOTIATING', label: 'Em negociação' },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'COMPLETED', label: 'Finalizado' },
  { value: 'CANCELED', label: 'Cancelado' },
];

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'oldest', label: 'Mais antigos' },
];

const RequestsList = () => {
  const { user } = useUserStore();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const fetchPage = useCallback(
    async (after: QueryDocumentSnapshot<DocumentData> | null) => {
      if (!user) return;
      const base = [
        collection(db, 'serviceRequests'),
        where('clientId', '==', user.id),
        orderBy('created_at', 'desc'),
        limit(PAGE_SIZE),
      ] as const;
      const q = after ? query(...base, startAfter(after)) : query(...base);
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceRequest));
      setRequests((prev) => (after ? [...prev, ...data] : data));
      setCursor(snap.docs[snap.docs.length - 1] ?? after);
      setHasMore(snap.docs.length === PAGE_SIZE);
    },
    [user]
  );

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        if (active) await fetchPage(null);
      } catch (error) {
        console.error('Erro ao buscar solicitações:', error);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchPage]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      await fetchPage(cursor);
    } catch (error) {
      console.error('Erro ao carregar mais solicitações:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'NEGOTIATING': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'CANCELED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'OPEN': return 'Aguardando Propostas';
      case 'NEGOTIATING': return 'Em negociação';
      case 'IN_PROGRESS': return 'Em andamento';
      case 'COMPLETED': return 'Finalizado';
      case 'CANCELED': return 'Cancelado';
      default: return status;
    }
  };

  const visibleRequests = requests
    .filter((r) => statusFilter === 'all' || r.status === statusFilter)
    .sort((a, b) => (sortMode === 'recent' ? b.created_at - a.created_at : a.created_at - b.created_at));

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Meus Pedidos</h1>
          <p className="text-slate-500 mt-1">Acompanhe o status das suas solicitações</p>
        </div>
        <Link 
          to="/request/new" 
          className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold hover:bg-primary-hover transition-colors flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <Plus className="w-5 h-5" />
          Novo Pedido
        </Link>
      </div>

      {requests.length > 0 && (
        <div className="flex items-center flex-wrap gap-3 mb-6">
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="relative flex-shrink-0 flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" /> Filtrar
            {statusFilter !== 'all' && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                1
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSortOpen(true)}
            className="flex-shrink-0 flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ArrowUpDown className="w-4 h-4" /> Ordenar
          </button>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center shadow-sm">
          <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Nenhum pedido encontrado</h2>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Você ainda não criou nenhuma solicitação de serviço. Que tal publicar a sua primeira necessidade agora?
          </p>
          <Link
            to="/request/new"
            className="inline-flex bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-hover transition-colors"
          >
            Criar Solicitação
          </Link>
        </div>
      ) : visibleRequests.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center shadow-sm">
          <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <SlidersHorizontal className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Nenhum pedido com esse filtro</h2>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Você tem pedidos, mas nenhum está no status escolhido.
          </p>
          <button onClick={() => setStatusFilter('all')} className="text-primary font-bold hover:underline">
            Limpar filtro
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {visibleRequests.map(request => (
            <Link 
              key={request.id} 
              to={`/requests/${request.id}`}
              className="block bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 hover:border-primary/50 hover:shadow-md transition-all group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(request.status)}`}>
                    {getStatusText(request.status)}
                  </span>
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {format(request.created_at, "dd 'de' MMMM", { locale: ptBR })}
                  </span>
                </div>
                <div className="font-bold text-primary text-sm group-hover:underline">
                  Ver detalhes &rarr;
                </div>
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-2">{request.subcategory || request.category} - {request.propertyType}</h3>
              <p className="text-slate-600 line-clamp-2 mb-4 text-sm">
                {request.description}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {request.neighborhood}, {request.city}
                </div>
              </div>
            </Link>
          ))}

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="mx-auto mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
            >
              {loadingMore ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Carregar mais'}
            </button>
          )}
        </div>
      )}

      {/* Filtrar */}
      {filterOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
          onClick={() => setFilterOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-extrabold text-slate-900">Filtrar por status</h2>
              <button onClick={() => setStatusFilter('all')} className="text-sm font-bold text-primary hover:underline">
                Limpar
              </button>
            </div>
            <div className="p-6 space-y-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setStatusFilter(opt.value);
                    setFilterOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-left font-bold transition-colors ${
                    statusFilter === opt.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                  {statusFilter === opt.value && <Check className="w-5 h-5" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Ordenar */}
      {sortOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
          onClick={() => setSortOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-extrabold text-slate-900">Ordenar por</h2>
              <button onClick={() => setSortOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-2">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setSortMode(opt.value);
                    setSortOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-left font-bold transition-colors ${
                    sortMode === opt.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                  {sortMode === opt.value && <Check className="w-5 h-5" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestsList;