import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useUserStore } from '@/store/userStore';
import { Proposal, ServiceRequest } from '@/types';
import { ListSkeleton } from '@/components/Skeleton';
import { Briefcase, ChevronRight, CheckCircle, Clock, SlidersHorizontal, ArrowUpDown, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProposalWithJob extends Proposal {
  jobCategory?: string;
  jobPropertyType?: string;
  jobStatus?: string;
}

type StatusFilter = 'all' | Proposal['status'];
type SortMode = 'recent' | 'oldest' | 'price_desc';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'accepted', label: 'Aceitas' },
  { value: 'pending', label: 'Aguardando' },
  { value: 'rejected', label: 'Recusadas' },
];

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'oldest', label: 'Mais antigas' },
  { value: 'price_desc', label: 'Maior orçamento' },
];

const ProProposals = () => {
  const { user } = useUserStore();
  const [proposals, setProposals] = useState<ProposalWithJob[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    const fetchProposals = async () => {
      if (!user) return;

      try {
        const q = query(
          collection(db, 'proposals'),
          where('professionalId', '==', user.id)
        );
        
        const snapshot = await getDocs(q);
        const fetchedProposals = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ProposalWithJob[];
        
        // Carrega os dados do pedido de cada proposta (leitura direta por id, em paralelo)
        await Promise.all(
          fetchedProposals.map(async (p) => {
            const reqSnap = await getDoc(doc(db, 'serviceRequests', p.requestId));
            if (reqSnap.exists()) {
              const reqData = reqSnap.data() as ServiceRequest;
              p.jobCategory = reqData.subcategory || reqData.category;
              p.jobPropertyType = reqData.propertyType;
              p.jobStatus = reqData.status;
            }
          })
        );
        
        fetchedProposals.sort((a, b) => b.created_at - a.created_at);
        setProposals(fetchedProposals);
      } catch (err) {
        console.error("Erro ao buscar propostas:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProposals();
  }, [user]);

  const visibleProposals = proposals
    .filter((p) => statusFilter === 'all' || p.status === statusFilter)
    .sort((a, b) => {
      if (sortMode === 'oldest') return a.created_at - b.created_at;
      if (sortMode === 'price_desc') return b.estimatedPrice - a.estimatedPrice;
      return b.created_at - a.created_at;
    });

  if (loading) return <div className="max-w-5xl mx-auto py-2" aria-busy="true"><ListSkeleton count={3} /></div>;

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Minhas Propostas</h1>
        <p className="text-slate-500 mt-2">Acompanhe os orçamentos que você enviou para os clientes.</p>
      </div>

      {proposals.length > 0 && (
        <div className="flex items-center flex-wrap gap-3 -mt-4">
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

      {proposals.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center shadow-sm">
          <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Nenhuma proposta enviada</h2>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Você ainda não enviou orçamentos. Vá para a página inicial para encontrar serviços abertos na sua região.
          </p>
          <Link
            to="/home"
            className="inline-flex bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-hover transition-colors"
          >
            Buscar Serviços
          </Link>
        </div>
      ) : visibleProposals.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center shadow-sm">
          <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <SlidersHorizontal className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Nenhuma proposta com esse filtro</h2>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">Você tem propostas, mas nenhuma está no status escolhido.</p>
          <button onClick={() => setStatusFilter('all')} className="text-primary font-bold hover:underline">
            Limpar filtro
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {visibleProposals.map((p) => (
            <Link
              key={p.id}
              to={`/requests/${p.requestId}`}
              className="block bg-white p-6 rounded-2xl border border-slate-200 hover:border-primary/50 hover:shadow-md transition-all group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3 flex-wrap">
                  {p.status === 'accepted' ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold border bg-success/10 text-success-700 border-success/20 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> ACEITA
                    </span>
                  ) : p.status === 'rejected' ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold border bg-danger/10 text-danger border-danger/20 flex items-center gap-1">
                      RECUSADA
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-bold border bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> AGUARDANDO
                    </span>
                  )}
                  <span className="text-sm text-slate-500">
                    Enviada em {new Date(p.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="font-bold text-primary text-sm group-hover:underline flex items-center gap-1 flex-shrink-0">
                  Ver pedido <ChevronRight className="w-4 h-4" />
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-2/3">
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Serviço Solicitado</p>
                  <h3 className="text-xl font-bold text-slate-900 mb-4">{p.jobCategory} para {p.jobPropertyType}</h3>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-sm text-slate-700 italic line-clamp-2">"{p.message}"</p>
                  </div>
                </div>

                <div className="md:w-1/3 flex flex-row md:flex-col gap-6 md:gap-4 md:border-l border-slate-100 md:pl-6">
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Seu Orçamento</p>
                    <p className="text-2xl font-extrabold text-primary">R$ {p.estimatedPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Seu Prazo</p>
                    <p className="text-lg font-bold text-slate-700">{p.estimatedDays}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
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

export default ProProposals;