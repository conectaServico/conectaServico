import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useUserStore } from '@/store/userStore';
import { ServiceRequest } from '@/types';
import { Loader2, Plus, MapPin, Clock, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const RequestsList = () => {
  const { user } = useUserStore();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'serviceRequests'),
          where('clientId', '==', user.id)
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRequest));
        
        // Ordenação feita no frontend para não exigir a criação de Índices no Firebase
        data.sort((a, b) => b.created_at - a.created_at);
        
        setRequests(data);
      } catch (error) {
        console.error('Erro ao buscar solicitações:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [user]);

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
      ) : (
        <div className="grid gap-4">
          {requests.map(request => (
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
        </div>
      )}
    </div>
  );
};

export default RequestsList;