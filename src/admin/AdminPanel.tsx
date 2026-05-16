import { useState, useEffect } from 'react';
import { collection, query, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { ShieldCheck, CheckCircle, XCircle, FileImage, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface ValidationRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  docFrontUrl: string;
  docBackUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: number;
}

const AdminPanel = () => {
  const [requests, setRequests] = useState<ValidationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const q = query(collection(db, 'validations'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ValidationRequest));
      // Sort pending first, then by date
      data.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return b.created_at - a.created_at;
      });
      setRequests(data);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao buscar solicitações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (requestId: string, userId: string, action: 'approved' | 'rejected') => {
    try {
      // Atualiza status do pedido
      await updateDoc(doc(db, 'validations', requestId), { status: action });
      
      // Se aprovado, atualiza o usuário
      if (action === 'approved') {
        await updateDoc(doc(db, 'users', userId), { verified: true });
      } else {
        await updateDoc(doc(db, 'users', userId), { verified: false });
      }

      toast.success(`Solicitação ${action === 'approved' ? 'aprovada' : 'recusada'}!`);
      fetchRequests();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao processar ação');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12 pt-8 px-4">
      <div className="flex items-center gap-3 mb-8">
        <ShieldCheck className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-extrabold text-slate-900">Painel de Administração</h1>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">Validações de Documentos</h2>
          <p className="text-slate-500">Aprove ou recuse os profissionais que enviaram documentos.</p>
        </div>

        {requests.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-medium">
            Nenhuma solicitação encontrada.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map(req => (
              <div key={req.id} className={`p-6 ${req.status === 'pending' ? 'bg-amber-50/30' : ''}`}>
                <div className="flex flex-col md:flex-row gap-6 justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{req.userName}</h3>
                    <p className="text-slate-500 text-sm">{req.userEmail}</p>
                    <div className="mt-2 inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider items-center gap-1
                      ${req.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                        req.status === 'approved' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}
                    ">
                      {req.status === 'pending' ? 'Pendente' : req.status === 'approved' ? 'Aprovado' : 'Recusado'}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <a href={req.docFrontUrl} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                      <FileImage className="w-6 h-6 text-slate-400" />
                      <span className="text-xs font-bold text-slate-600">RG Frente</span>
                    </a>
                    <a href={req.docBackUrl} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                      <FileImage className="w-6 h-6 text-slate-400" />
                      <span className="text-xs font-bold text-slate-600">RG Verso</span>
                    </a>
                  </div>

                  {req.status === 'pending' && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleAction(req.id, req.userId, 'approved')}
                        className="p-3 bg-success/10 text-success rounded-xl hover:bg-success hover:text-white transition-colors"
                        title="Aprovar"
                      >
                        <CheckCircle className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() => handleAction(req.id, req.userId, 'rejected')}
                        className="p-3 bg-danger/10 text-danger rounded-xl hover:bg-danger hover:text-white transition-colors"
                        title="Recusar"
                      >
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
    </div>
  );
};

export default AdminPanel;