import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, updateDoc, writeBatch, getDocs, increment } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { ServiceRequest, Proposal, Review, Unlock, User } from '@/types';
import { useUserStore } from '@/store/userStore';
import { MapPin, Clock, Briefcase, AlertCircle, ShieldCheck, ChevronLeft, Loader2, MessageSquare, Calendar, Hammer, Image as ImageIcon, Send, Edit2, X, Check, LockOpen, Maximize, FileText } from 'lucide-react';
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

    // Verificar se o profissional já desbloqueou
    if (user.role === 'professional') {
      const checkUnlock = async () => {
        try {
          const q = query(collection(db, 'unlocks'), where('requestId', '==', id), where('professionalId', '==', user.id));
          const snap = await getDocs(q);
          if (!snap.empty) {
            setHasUnlocked(true);
            if (request?.clientId) {
              const clientDoc = await getDoc(doc(db, 'users', request.clientId));
              if (clientDoc.exists()) setClientPhone((clientDoc.data() as User).phone);
            }
          }
        } catch (e) {
          console.error(e);
        }
      };
      checkUnlock();
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
        setClientPhone((clientDoc.data() as User).phone);
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

      {/* Área do Profissional: Desbloquear e Enviar Proposta */}
      {user?.role === 'professional' && request.status === 'OPEN' && !hasAlreadyProposed && (
        <div className="bg-primary/5 border border-primary/20 p-6 sm:p-8 rounded-3xl mt-8">
          
          {!hasUnlocked ? (
            <div className="text-center py-6">
              <div className="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <LockOpen className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Desbloquear Contato</h3>
              <p className="text-slate-600 max-w-md mx-auto mb-6">
                Para enviar um orçamento e negociar com este cliente, você precisa liberar o contato.
              </p>
              
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={handleUnlockContact}
                  disabled={unlocking || (request.unlockCount || 0) >= 3}
                  className="bg-primary text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-primary-hover transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/30 disabled:opacity-70 w-full max-w-sm"
                >
                  {unlocking ? <Loader2 className="w-6 h-6 animate-spin" /> : `Liberar por ${UNLOCK_COST} Diamantes`}
                </button>
                
                <p className="text-sm font-medium text-slate-500">
                  Seu saldo: <strong className="text-primary">{user.coinsBalance || 0} diamantes</strong>
                </p>
                
                <div className="mt-4 inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 text-sm font-bold text-slate-600">
                  Profissionais concorrentes: 
                  <span className={(request.unlockCount || 0) >= 3 ? 'text-danger' : 'text-primary'}>
                    {request.unlockCount || 0} / 3
                  </span>
                </div>
                
                {(request.unlockCount || 0) >= 3 && (
                  <p className="text-danger text-sm font-bold mt-2">Este pedido já atingiu o limite máximo de profissionais.</p>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary text-white p-2.5 rounded-xl">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">Iniciar Conversa</h3>
                  <p className="text-sm text-slate-600">Contato liberado! Você já pode chamar o cliente no WhatsApp ou enviar uma mensagem por aqui.</p>
                </div>
              </div>

              {clientPhone && (
                <button
                  type="button"
                  onClick={() => {
                    const cleanPhone = clientPhone.replace(/\D/g, '');
                    const waNumber = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
                    const text = encodeURIComponent(`Olá, sou o(a) ${user?.name}, vi seu pedido de ${request?.subcategory || request?.category} no Conecta Serviço e gostaria de conversar sobre o serviço.`);
                    window.open(`https://wa.me/${waNumber}?text=${text}`, '_blank');
                  }}
                  className="w-full mb-6 bg-[#25D366] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#128C7E] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/30"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                  Chamar no WhatsApp
                </button>
              )}

              <div className="flex items-center gap-4 mb-6">
                <div className="h-px bg-slate-200 flex-1"></div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">OU ENVIE MENSAGEM AQUI</span>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>

              <form onSubmit={handleSendProposal} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Mensagem para o cliente</label>
                  <textarea
                    required
                    rows={4}
                    className="w-full p-4 border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    placeholder="Apresente-se brevemente, informe como você trabalha e peça mais detalhes ou sugira uma visita técnica..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingProposal}
                  className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-hover transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-primary/30"
                >
                  {sendingProposal ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Enviar Mensagem'}
                </button>
              </form>
            </>
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
