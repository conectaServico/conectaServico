import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useUserStore } from '@/store/userStore';
import { Proposal, ServiceRequest } from '@/types';
import { Loader2, Briefcase, ChevronRight, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProposalWithJob extends Proposal {
  jobCategory?: string;
  jobPropertyType?: string;
  jobStatus?: string;
}

const ProProposals = () => {
  const { user } = useUserStore();
  const [proposals, setProposals] = useState<ProposalWithJob[]>([]);
  const [loading, setLoading] = useState(true);

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
        
        // Fetch job details for each proposal
        for (const p of fetchedProposals) {
          const reqSnap = await getDocs(query(collection(db, 'serviceRequests'), where('__name__', '==', p.requestId)));
          if (!reqSnap.empty) {
            const reqData = reqSnap.docs[0].data() as ServiceRequest;
            p.jobCategory = reqData.subcategory || reqData.category;
            p.jobPropertyType = reqData.propertyType;
            p.jobStatus = reqData.status;
          }
        }
        
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

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>;

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Minhas Propostas</h1>
        <p className="text-slate-500 mt-2">Acompanhe os orçamentos que você enviou para os clientes.</p>
      </div>

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
      ) : (
        <div className="grid gap-4">
          {proposals.map((p) => (
            <Link 
              key={p.id} 
              to={`/requests/${p.requestId}`}
              className="block bg-white p-6 rounded-2xl border border-slate-200 hover:border-primary/50 hover:shadow-md transition-all group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  {p.status === 'accepted' ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold border bg-success/10 text-success-700 border-success/20 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> ACEITA
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
                <div className="font-bold text-primary text-sm group-hover:underline flex items-center gap-1">
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
    </div>
  );
};

export default ProProposals;