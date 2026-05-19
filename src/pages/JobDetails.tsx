import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, updateDoc, writeBatch, getDocs, increment } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { ServiceRequest, Proposal, Review, Unlock, User } from '@/types';
import { useUserStore } from '@/store/userStore';
import { MapPin, Clock, Briefcase, AlertCircle, ShieldCheck, ChevronLeft, Loader2, MessageSquare, Calendar, Hammer, Image as ImageIcon, Send, Edit2, X, Check, LockOpen, Maximize, FileText, Info, MoreVertical, Map, Trash2, Phone, Mail } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ConfirmModal';

const RequestDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUserStore();
  
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pro Proposal Form State
  const [message, setMessage] = useState('');
  const [sendingProposal, setSendingProposal] = useState(false);

  // Edit Request State
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editUrgency, setEditUrgency] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  
  // Reviews
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewWouldHireAgain, setReviewWouldHireAgain] = useState(true);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [acceptingProposal, setAcceptingProposal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Confirm Modal States
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ proposalId: string, professionalId: string } | null>(null);

  // Unlocks & Coins
  const [hasUnlocked, setHasUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [clientPhone, setClientPhone] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const UNLOCK_COST = 10;

  useEffect(() => {
    if (!id) return;

    const fetchRequest = async () => {
      try {
        const docRef = doc(db, 'serviceRequests', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setRequest({ id: docSnap.id, ...docSnap.data() } as ServiceRequest);
        } else {
          setError('Pedido não encontrado.');
        }
      } catch (err) {
        setError('Erro ao carregar pedido.');
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();

    // Listen for proposals
    const q = query(collection(db, 'proposals'), where('requestId', '==', id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const proposalsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Proposal));
      setProposals(proposalsData);
    });

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (!id || !user?.id) return;
    const fetchReview = async () => {
      try {
        const q = query(collection(db, 'reviews'), where('requestId', '==', id));
        const snap = await getDocs(q);
        const review = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Review))
          .find((r) => r.clientId === user.id) || null;
        setExistingReview(review);
      } catch {
        setExistingReview(null);
      }
    };
    fetchReview();

    // Verificar se o profissional já desbloqueou e buscar dados do cliente
    if (user.role === 'professional') {
      const checkUnlockAndFetchClient = async () => {
        try {
          if (request?.clientId) {
            const clientDoc = await getDoc(doc(db, 'users', request.clientId));
            if (clientDoc.exists()) {
              const clientData = clientDoc.data() as User;
              setClientPhone(clientData.phone || null);
              setClientName(clientData.name || null);
            }
          }

          const q = query(collection(db, 'unlocks'), where('requestId', '==', id), where('professionalId', '==', user.id));
          const snap = await getDocs(q);
          if (!snap.empty) {
            setHasUnlocked(true);
          }
        } catch (e) {
          console.error(e);
        }
      };
      checkUnlockAndFetchClient();
    }
  }, [id, user?.id, request?.clientId]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin w-12 h-12 text-primary" /></div>;
  if (error || !request) return <div className="text-center py-20"><p className="text-danger font-bold">{error || 'Pedido não encontrado'}</p></div>;

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

  const handleUnlockContact = async () => {
    if (!user || !request || !id) return;

    if (!user.photo_url) {
      toast.error('Você precisa ter uma foto de perfil para desbloquear contatos. Vá em Meu Perfil e adicione uma foto.');
      return;
    }
    
    if ((user.coinsBalance || 0) < UNLOCK_COST) {
      toast.error('Saldo insuficiente. Você precisa de mais diamantes para desbloquear.');
      return;
    }

    setUnlocking(true);
    try {
      const now = Date.now();
      const batch = writeBatch(db);

      // Desconta moedas do usuário
      const userRef = doc(db, 'users', user.id);
      batch.update(userRef, { coinsBalance: increment(-UNLOCK_COST) });

      // Registra o desbloqueio
      const unlockRef = doc(collection(db, 'unlocks'));
      batch.set(unlockRef, {
        requestId: id,
        professionalId: user.id,
        cost: UNLOCK_COST,
        created_at: now
      });

      // Registra transação
      const txRef = doc(collection(db, 'transactions'));
      batch.set(txRef, {
        userId: user.id,
        amount: -UNLOCK_COST,
        type: 'UNLOCK_CONTACT',
        description: `Desbloqueio do pedido #${id.substring(0, 5)}`,
        created_at: now
      });

      // Incrementa no pedido
      const jobRef = doc(db, 'serviceRequests', id);
      batch.update(jobRef, { unlockCount: increment(1) });

      await batch.commit();

      setHasUnlocked(true);
      setRequest({ ...request, unlockCount: (request.unlockCount || 0) + 1 });
      
      // Atualiza saldo local do usuário
      useUserStore.getState().setUser({ ...user, coinsBalance: (user.coinsBalance || 0) - UNLOCK_COST });
      
      // Tentar buscar o telefone do cliente
      const clientDoc = await getDoc(doc(db, 'users', request.clientId));
      if (clientDoc.exists()) {
        const clientData = clientDoc.data() as User;
        setClientPhone(clientData.phone || null);
        setClientName(clientData.name || null);
      }
      
      toast.success('Contato desbloqueado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao desbloquear contato. Tente novamente.');
    } finally {
      setUnlocking(false);
    }
  };

  const handleSendProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !request) return;

    if (!user.photo_url) {
      toast.error('Você precisa ter uma foto de perfil para enviar orçamentos. Vá em Meu Perfil e adicione uma foto.');
      return;
    }

    setSendingProposal(true);
    try {
      const newProposal: Omit<Proposal, 'id'> = {
        requestId: request.id,
        professionalId: user.id,
        professionalName: user.name,
        professionalPhoto: user.photo_url || '',
        professionalRating: 5.0, // Default for now
        estimatedPrice: 0,
        estimatedDays: 'A combinar',
        message,
        status: 'pending',
        created_at: Date.now()
      };

      await addDoc(collection(db, 'proposals'), newProposal);
      
      // Limpar formulário
      setMessage('');
      toast.success('Mensagem enviada com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar proposta. Tente novamente.');
    } finally {
      setSendingProposal(false);
    }
  };

  const handleEditClick = () => {
    if (!request) return;
    setEditDescription(request.description);
    setEditUrgency(request.urgency);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!request || !id) return;
    setSavingEdit(true);
    try {
      const docRef = doc(db, 'serviceRequests', id);
      await updateDoc(docRef, {
        description: editDescription,
        urgency: editUrgency
      });
      
      // Atualizar o state local
      setRequest({
        ...request,
        description: editDescription,
        urgency: editUrgency
      });
      
      setIsEditing(false);
      toast.success('Pedido atualizado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar as edições.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;

    if (confirmAction.proposalId === 'start') {
      setIsConfirmOpen(false);
      setConfirmAction(null);
      handleStartWork();
    } else if (confirmAction.proposalId === 'complete') {
      setIsConfirmOpen(false);
      setConfirmAction(null);
      handleCompleteWork();
    } else {
      handleAcceptProposal();
    }
  };

  const handleAcceptProposal = async () => {
    if (!request || !id || !confirmAction) return;
    
    setAcceptingProposal(true);
    setIsConfirmOpen(false);
    
    const { proposalId, professionalId } = confirmAction;

    try {
      const now = Date.now();
      const batch = writeBatch(db);

      const jobRef = doc(db, 'serviceRequests', id);
      batch.update(jobRef, {
        status: 'NEGOTIATING',
        acceptedProfessionalId: professionalId,
        acceptedProposalId: proposalId
      });

      const acceptedRef = doc(db, 'proposals', proposalId);
      batch.update(acceptedRef, { status: 'accepted', accepted_at: now, updated_at: now });

      proposals
        .filter((p) => p.id !== proposalId)
        .forEach((p) => {
          const ref = doc(db, 'proposals', p.id);
          batch.update(ref, { status: 'rejected', updated_at: now });
        });

      // Lógica de Estorno (Refund)
      const unlocksQuery = query(collection(db, 'unlocks'), where('requestId', '==', id));
      const unlocksSnap = await getDocs(unlocksQuery);
      
      unlocksSnap.docs.forEach(uDoc => {
        const unlockData = uDoc.data() as Unlock;
        if (unlockData.professionalId !== professionalId) {
          // Devolver as moedas
          const proRef = doc(db, 'users', unlockData.professionalId);
          batch.update(proRef, { coinsBalance: increment(unlockData.cost) });
          
          // Registrar transação de reembolso
          const txRef = doc(collection(db, 'transactions'));
          batch.set(txRef, {
            userId: unlockData.professionalId,
            amount: unlockData.cost,
            type: 'REFUND',
            description: 'Reembolso por não ter sido escolhido no pedido',
            created_at: now
          });
        }
      });

      await batch.commit();

      setRequest({ ...request, status: 'NEGOTIATING', acceptedProfessionalId: professionalId, acceptedProposalId: proposalId });
      
      // Redirecionar para o chat
      navigate(`/chats/${id}_${professionalId}`);

    } catch (err) {
      console.error("Erro ao aceitar proposta:", err);
      const code = (err as any)?.code ? String((err as any).code) : '';
      toast.error(code ? `Ocorreu um erro ao aceitar a proposta (${code}).` : 'Ocorreu um erro ao aceitar a proposta.');
    } finally {
      setAcceptingProposal(false);
      setConfirmAction(null);
    }
  };

  const handleStartWork = async () => {
    if (!request || !id) return;
    setUpdatingStatus(true);
    try {
      await updateDoc(doc(db, 'serviceRequests', id), { status: 'IN_PROGRESS', started_at: Date.now() });
      setRequest({ ...request, status: 'IN_PROGRESS', started_at: Date.now() });
      toast.success('Serviço marcado como em andamento!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao iniciar o serviço.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCompleteWork = async () => {
    if (!request || !id) return;
    setUpdatingStatus(true);
    try {
      await updateDoc(doc(db, 'serviceRequests', id), { status: 'COMPLETED', completed_at: Date.now() });
      setRequest({ ...request, status: 'COMPLETED', completed_at: Date.now() });
      toast.success('Serviço finalizado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao finalizar o serviço.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!user || !request || !id) return;
    if (!request.acceptedProfessionalId) {
      toast.error('Não foi possível identificar o profissional contratado.');
      return;
    }
    if (existingReview) return;
    setSubmittingReview(true);
    try {
      const reviewData: Omit<Review, 'id'> = {
        requestId: id,
        clientId: user.id,
        professionalId: request.acceptedProfessionalId,
        rating: reviewRating,
        comment: reviewComment.trim(),
        wouldHireAgain: reviewWouldHireAgain,
        created_at: Date.now()
      };
      const ref = await addDoc(collection(db, 'reviews'), reviewData);
      setExistingReview({ id: ref.id, ...reviewData });

      // Atualizar nota média do profissional
      const reviewsSnap = await getDocs(query(collection(db, 'reviews'), where('professionalId', '==', request.acceptedProfessionalId)));
      const allReviews = reviewsSnap.docs.map(d => d.data() as Review);
      
      let totalRating = 0;
      allReviews.forEach(r => totalRating += r.rating);
      const newRating = totalRating / allReviews.length;
      
      await updateDoc(doc(db, 'users', request.acceptedProfessionalId), {
        rating: newRating,
        reviewCount: allReviews.length
      });
      
      toast.success('Avaliação enviada com sucesso!');

    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar avaliação.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const hasAlreadyProposed = proposals.some(p => p.professionalId === user?.id);
  const isClientOwner = user?.role === 'client' && request?.clientId === user?.id;
  const canEdit = isClientOwner && request?.status === 'OPEN';

  const getHiddenName = (fullName: string | null | undefined) => {
    if (!fullName) return 'Cliente';
    const parts = fullName.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[1][0]}.`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-bold w-fit">
        <ChevronLeft className="w-5 h-5" />
        Voltar para lista
      </button>

      {/* Main Request Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full">
                  {request.category}
                </span>
                {request.subcategory && (
                  <span className="text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full">
                    {request.subcategory}
                  </span>
                )}
                <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border ${getStatusColor(request.status)}`}>
                  {getStatusText(request.status)}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                {request.subcategory || request.category} para {request.propertyType}
              </h1>
          </div>
          
          {canEdit && !isEditing && (
            <button 
              onClick={handleEditClick}
              className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-colors h-fit"
            >
              <Edit2 className="w-4 h-4" /> Editar Pedido
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="bg-primary/5 p-6 rounded-2xl border border-primary/20 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-primary flex items-center gap-2">
                <Edit2 className="w-5 h-5" /> Editando Pedido
              </h3>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Descrição</label>
              <textarea
                rows={4}
                className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-900 outline-none"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Urgência</label>
                <select
                  className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-900 outline-none"
                  value={editUrgency}
                  onChange={(e) => setEditUrgency(e.target.value)}
                >
                  <option value="Baixa (Pode esperar)">Baixa (Pode esperar)</option>
                  <option value="Média (Próximas semanas)">Média (Próximas semanas)</option>
                  <option value="Alta (O quanto antes)">Alta (O quanto antes)</option>
                  <option value="Emergência (Imediato)">Emergência (Imediato)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-xl font-bold hover:bg-primary-hover transition-colors disabled:opacity-70"
              >
                {savingEdit ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5" /> Salvar</>}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Detalhes do Pedido</h3>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{request.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <Clock className="w-5 h-5 text-primary mb-2" />
                <p className="text-xs text-slate-500 font-medium mb-1">Urgência</p>
                <p className="font-bold text-slate-900 text-sm">{request.urgency}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <Hammer className="w-5 h-5 text-primary mb-2" />
                <p className="text-xs text-slate-500 font-medium mb-1">Materiais</p>
                <p className="font-bold text-slate-900 text-sm">{request.materialOption}</p>
              </div>

              {request.areaSize && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <Maximize className="w-5 h-5 text-primary mb-2" />
                  <p className="text-xs text-slate-500 font-medium mb-1">Tamanho do local</p>
                  <p className="font-bold text-slate-900 text-sm">{request.areaSize} m²</p>
                </div>
              )}

              {request.hasBlueprint !== undefined && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <FileText className="w-5 h-5 text-primary mb-2" />
                  <p className="text-xs text-slate-500 font-medium mb-1">Possui planta?</p>
                  <p className="font-bold text-slate-900 text-sm">{request.hasBlueprint ? 'Sim' : 'Não'}</p>
                </div>
              )}

              {request.preferredDate && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <Calendar className="w-5 h-5 text-primary mb-2" />
                  <p className="text-xs text-slate-500 font-medium mb-1">Data preferencial</p>
                  <p className="font-bold text-slate-900 text-sm">
                    {new Date(request.preferredDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                  </p>
                </div>
              )}

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 sm:col-span-2">
                <MapPin className="w-5 h-5 text-primary mb-2" />
                <p className="text-xs text-slate-500 font-medium mb-1">Local</p>
                <p className="font-bold text-slate-900 text-sm">
                  {canEdit || hasUnlocked || user?.role === 'client' ? (
                    <>
                      {request.street}, {request.number} {request.complement && `- ${request.complement}`}
                      <br />
                      {request.neighborhood} - {request.city}
                      <br />
                      CEP: {request.cep}
                    </>
                  ) : (
                    <>{request.neighborhood} - {request.city}</>
                  )}
                </p>
              </div>
            </div>
            
            <p className="text-xs text-slate-400 flex items-center gap-1">
              Publicado {formatDistanceToNow(request.created_at, { addSuffix: true, locale: ptBR })}
            </p>
          </div>
        </div>
      )}
      </div>

      {/* Área do Profissional: Mobile-first Layout */}
      {user?.role === 'professional' && request.status === 'OPEN' && !hasAlreadyProposed && (
        <div className="bg-slate-50 min-h-screen pb-24 fixed inset-0 z-50 overflow-y-auto">
          {/* Header */}
          <div className="bg-white px-4 py-4 flex items-center justify-between sticky top-0 z-40 border-b border-slate-100 shadow-sm">
            <button onClick={() => navigate(-1)} className="p-1 text-slate-700">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-medium">Seus diamantes:</span>
              <div className="flex items-center gap-1 bg-yellow-100/50 px-2 py-1 rounded-full border border-yellow-200/50">
                <span className="text-yellow-500 text-sm">💎</span>
                <span className="font-bold text-slate-800">{user.coinsBalance || 0}</span>
              </div>
            </div>
            <button className="p-1 text-slate-700">
              <MoreVertical className="w-6 h-6" />
            </button>
          </div>

          {/* Map Header */}
          <div className="h-32 bg-slate-200 relative w-full flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>
            <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 shadow-sm border border-white z-10">
              <Map className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">Ver no mapa</span>
            </div>
          </div>

          {/* Quick Info Tabs */}
          <div className="bg-white border-b border-slate-200 flex text-center">
            <div className="flex-1 py-4 border-r border-slate-100 flex flex-col items-center justify-center">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mb-2">
                <MapPin className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-sm font-bold text-slate-800">A {Math.floor(Math.random() * 20) + 5} min</span>
              <span className="text-xs text-slate-500">de você</span>
            </div>
            <div className="flex-1 py-4 border-r border-slate-100 flex flex-col items-center justify-center">
              <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center mb-2">
                <Calendar className="w-5 h-5 text-amber-500" />
              </div>
              <span className="text-sm font-bold text-slate-800">Próximos</span>
              <span className="text-xs text-slate-500">dias</span>
            </div>
            <div className="flex-1 py-4 flex flex-col items-center justify-center">
              <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mb-2">
                <Info className="w-5 h-5 text-emerald-500" />
              </div>
              <span className="text-sm font-bold text-slate-800">Informações</span>
              <span className="text-xs text-slate-500">adicionais</span>
            </div>
          </div>

          {/* Details List */}
          <div className="bg-white mt-4 pt-6 px-4 pb-8">
            <h1 className="text-xl font-extrabold text-slate-900 mb-6">
              {request.category} - {request.subcategory || request.propertyType}
            </h1>

            <div className="space-y-6">
              {/* Location */}
              <div className="flex gap-4">
                <MapPin className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div className="border-b border-slate-100 pb-6 flex-1">
                  <p className="font-bold text-slate-800">{request.neighborhood}, {request.city}</p>
                  <p className="text-sm text-slate-500 mt-1">A {Math.floor(Math.random() * 15) + 1} km de você</p>
                </div>
              </div>

              {/* Questions / Answers */}
              <div className="flex gap-4">
                <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div className="border-b border-slate-100 pb-6 flex-1">
                  <p className="text-sm text-slate-500 mb-1">Para quando você precisa do serviço?</p>
                  <p className="font-bold text-slate-800">{request.urgency}</p>
                </div>
              </div>

              {request.areaSize && (
                <div className="flex gap-4">
                  <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <div className="border-b border-slate-100 pb-6 flex-1">
                    <p className="text-sm text-slate-500 mb-1">Qual o tamanho do local?</p>
                    <p className="font-bold text-slate-800">{request.areaSize} m²</p>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div className="border-b border-slate-100 pb-6 flex-1">
                  <p className="text-sm text-slate-500 mb-2">Informações Adicionais</p>
                  <p className="font-bold text-slate-800 leading-relaxed">
                    {request.description}
                  </p>
                </div>
              </div>

              {/* Client Name & Status */}
              <div className="pt-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full border-2 border-emerald-500 flex items-center justify-center bg-white relative">
                    {hasUnlocked ? (
                      <LockOpen className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <LockOpen className="w-5 h-5 text-slate-800" />
                    )}
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-white">
                      1
                    </div>
                  </div>
                  <span className="text-sm font-medium text-slate-600">
                    {hasUnlocked ? 'Contato Liberado' : 'Você ainda pode liberar este pedido'}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-6">
                  {hasUnlocked 
                    ? clientName || request.clientName || 'Cliente' 
                    : getHiddenName(clientName || request.clientName)}
                </h3>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3 text-slate-600">
                    <Phone className="w-5 h-5" />
                    {hasUnlocked ? (
                      <span className="font-medium text-slate-900">{clientPhone || '(11) 99999-9999'}</span>
                    ) : (
                      <span className="text-slate-400">Telefone oculto</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <Mail className="w-5 h-5" />
                    {hasUnlocked ? (
                      <span className="font-medium text-slate-900">Email liberado no chat</span>
                    ) : (
                      <span className="text-slate-400">Email oculto</span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <Check className="w-3 h-3" />
                    </div>
                    Já fez pedidos no app antes
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <Check className="w-3 h-3" />
                    </div>
                    Número de telefone validado
                  </div>
                </div>
              </div>
              
              {/* After unlock chat actions */}
              {hasUnlocked && (
                <div className="mt-8 space-y-4">
                  {clientPhone && (
                    <button
                      type="button"
                      onClick={() => {
                        const cleanPhone = clientPhone.replace(/\D/g, '');
                        const waNumber = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
                        const text = encodeURIComponent(`Olá, vi seu pedido no Conecta Serviço e gostaria de conversar.`);
                        window.open(`https://wa.me/${waNumber}?text=${text}`, '_blank');
                      }}
                      className="w-full bg-[#25D366] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#128C7E] transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Phone className="w-5 h-5" /> WhatsApp
                    </button>
                  )}
                  <form onSubmit={handleSendProposal} className="space-y-3">
                    <textarea
                      required
                      rows={3}
                      className="w-full p-4 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      placeholder="Enviar mensagem pelo chat do app..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={sendingProposal}
                      className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm"
                    >
                      {sendingProposal ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Enviar Mensagem'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Fixed Action Bar */}
          {!hasUnlocked && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 px-6 flex items-center gap-4 z-50 pb-safe">
              <button 
                onClick={() => navigate(-1)}
                className="w-14 h-14 rounded-full border-2 border-red-200 flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-6 h-6" />
              </button>
              
              <button
                onClick={handleUnlockContact}
                disabled={unlocking || (request.unlockCount || 0) >= 3}
                className="flex-1 bg-[#10b981] hover:bg-[#059669] text-white h-14 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-70"
              >
                {unlocking ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    Liberar Pedido
                    <span className="flex items-center gap-1 bg-black/10 px-2 py-0.5 rounded-full text-sm ml-2">
                      <span className="text-yellow-300">💎</span> {UNLOCK_COST}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Aviso de Proposta Enviada */}
      {user?.role === 'professional' && hasAlreadyProposed && (
        <div className="bg-success/10 border border-success/20 p-6 rounded-2xl mt-8 flex items-center gap-4">
          <div className="bg-success text-white p-2 rounded-full shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-success-800 text-lg">Mensagem enviada!</h4>
            <p className="text-success-700 text-sm">Você já enviou uma mensagem para este serviço. Aguarde o cliente entrar em contato com você pelo chat.</p>
          </div>
        </div>
      )}

      {/* Proposals Section (Apenas o Cliente ou o dono do job vê a lista) */}
      {user?.role === 'client' && (
        <div className="space-y-6 pt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Profissionais Interessados ({proposals.length})</h2>
          </div>

          {proposals.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 border-dashed text-center shadow-sm">
              <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Aguardando Profissionais</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                Seu pedido já está visível para os profissionais da sua região. Assim que eles enviarem propostas, elas aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {proposals.map((p) => (
                <div key={p.id} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row gap-6">
                    
                    {/* Professional Info */}
                    <div className="md:w-1/3">
                      <Link 
                        to={`/user/${p.professionalId}`} 
                        className="flex items-start gap-4 group transition-all"
                      >
                        {p.professionalPhoto ? (
                          <img src={p.professionalPhoto} alt="Profissional" className="w-16 h-16 rounded-full object-cover border-2 border-slate-100 group-hover:border-primary transition-colors" />
                        ) : (
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center border-2 border-slate-200 flex-shrink-0 group-hover:border-primary transition-colors">
                            <Briefcase className="w-8 h-8 text-slate-400 group-hover:text-primary transition-colors" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900 text-lg leading-tight group-hover:text-primary transition-colors">{p.professionalName || `Profissional #${p.professionalId.substring(0, 4)}`}</p>
                          <div className="flex items-center gap-1 text-success text-[11px] font-bold mt-1 bg-success/10 w-fit px-2 py-0.5 rounded-full">
                            <ShieldCheck className="w-3 h-3" /> VERIFICADO
                          </div>
                          {p.professionalRating && (
                            <div className="flex items-center gap-1 mt-2 text-sm font-bold text-slate-700">
                              <span className="text-amber-500">★</span> {p.professionalRating.toFixed(1)}
                            </div>
                          )}
                        </div>
                      </Link>
                    </div>

                    {/* Proposal Content */}
                    <div className="md:w-2/3 space-y-4">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-slate-700 italic">"{p.message}"</p>
                      </div>
                      
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                        <button 
                          onClick={() => navigate(`/chats/${p.requestId}_${p.professionalId}`)}
                          className="w-full sm:w-auto bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                        >
                          <MessageSquare className="w-5 h-5" /> Iniciar Chat
                        </button>
                        
                        {request.status === 'OPEN' && (
                          <button 
                            onClick={() => {
                              setConfirmAction({ proposalId: p.id, professionalId: p.professionalId });
                              setIsConfirmOpen(true);
                            }}
                            disabled={acceptingProposal}
                            className="w-full sm:w-auto bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-hover transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/20 disabled:opacity-70"
                          >
                            {acceptingProposal ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5" /> Aceitar Profissional</>}
                          </button>
                        )}
                        
                        {request.status !== 'OPEN' && p.status === 'accepted' && (
                          <div className="w-full sm:w-auto flex items-center justify-center gap-2 text-success font-bold px-4 py-2 bg-success/10 rounded-xl">
                            <Check className="w-5 h-5" /> Contratado
                          </div>
                        )}
                      </div>
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isClientOwner && request.acceptedProfessionalId && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-xl font-extrabold text-slate-900">Acompanhamento do serviço</h2>

          {request.status === 'NEGOTIATING' && (
            <button
              onClick={() => {
                setConfirmAction({ proposalId: 'start', professionalId: 'start' }); // Hack for confirm
                setIsConfirmOpen(true);
              }}
              disabled={updatingStatus}
              className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-hover transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-md shadow-primary/20"
            >
              {updatingStatus ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Marcar como Em andamento'}
            </button>
          )}

          {request.status === 'IN_PROGRESS' && (
            <button
              onClick={() => {
                setConfirmAction({ proposalId: 'complete', professionalId: 'complete' }); // Hack for confirm
                setIsConfirmOpen(true);
              }}
              disabled={updatingStatus}
              className="w-full bg-success text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {updatingStatus ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Finalizar serviço'}
            </button>
          )}

          {request.status === 'COMPLETED' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="font-bold text-slate-900">Avaliação do profissional</p>
                <p className="text-slate-600 text-sm">Sua avaliação ajuda outros clientes a escolherem com mais confiança.</p>
              </div>

              {existingReview ? (
                <div className="bg-success/10 border border-success/20 p-4 rounded-2xl">
                  <p className="font-bold text-success-800">Avaliação enviada</p>
                  <p className="text-success-700 text-sm mt-1">Nota: {existingReview.rating}/5</p>
                  {existingReview.comment && <p className="text-success-700 text-sm mt-2">"{existingReview.comment}"</p>}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setReviewRating(n)}
                        className={`py-3 rounded-xl font-bold border transition-all ${
                          reviewRating === n ? 'bg-primary text-white border-primary' : 'bg-white text-slate-700 border-slate-200 hover:border-primary/40'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>

                  <label className="flex items-center gap-3 font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reviewWouldHireAgain}
                      onChange={(e) => setReviewWouldHireAgain(e.target.checked)}
                      className="w-5 h-5"
                    />
                    Contrataria novamente
                  </label>

                  <textarea
                    rows={4}
                    className="w-full p-4 border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    placeholder="Conte como foi a experiência (opcional)"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                  />

                  <button
                    type="button"
                    onClick={handleSubmitReview}
                    disabled={submittingReview}
                    className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-hover transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-md shadow-primary/20"
                  >
                    {submittingReview ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Enviar avaliação'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title={
          confirmAction?.proposalId === 'start' ? 'Iniciar Serviço' :
          confirmAction?.proposalId === 'complete' ? 'Finalizar Serviço' :
          'Aceitar Profissional'
        }
        message={
          confirmAction?.proposalId === 'start' ? 'Tem certeza que deseja marcar este serviço como Em Andamento?' :
          confirmAction?.proposalId === 'complete' ? 'Tem certeza que deseja finalizar este serviço?' :
          'Tem certeza que deseja fechar negócio com este profissional? Os outros interessados serão dispensados.'
        }
        onConfirm={handleConfirmAction}
        onCancel={() => {
          setIsConfirmOpen(false);
          setConfirmAction(null);
        }}
      />
    </div>
  );
};

export default RequestDetails;
