import { ChevronLeft, Send, MessageCircle, Mail, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useUserStore } from '@/store/userStore';
import Select from '@/components/Select';
import toast from 'react-hot-toast';
import { addDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { SupportTicket, SupportCategory } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CATEGORIES: { value: SupportCategory; label: string }[] = [
  { value: 'fake_lead', label: 'Pedido falso / quero reembolso de diamantes' },
  { value: 'no_show', label: 'Profissional/cliente não compareceu' },
  { value: 'abusive', label: 'Comportamento abusivo de um usuário' },
  { value: 'payment', label: 'Problema com pagamento / diamantes' },
  { value: 'app_error', label: 'Erro no aplicativo' },
  { value: 'other', label: 'Outro assunto' },
];

const STATUS_LABEL: Record<string, string> = {
  open: 'Aberto',
  in_review: 'Em análise',
  resolved: 'Resolvido',
  rejected: 'Recusado',
};
const STATUS_STYLE: Record<string, string> = {
  open: 'bg-amber-100 text-amber-700',
  in_review: 'bg-blue-100 text-blue-700',
  resolved: 'bg-success/10 text-success',
  rejected: 'bg-danger/10 text-danger',
};

const ContactSupport = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useUserStore();

  const [category, setCategory] = useState<SupportCategory>(
    (params.get('category') as SupportCategory) || 'other'
  );
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const requestId = params.get('requestId') || '';

  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    const q = query(
      collection(db, 'supportTickets'),
      where('userId', '==', user.id),
      orderBy('created_at', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => setTickets(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SupportTicket))),
      () => undefined
    );
    return () => unsub();
  }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error('Faça login para abrir um chamado.');
      return;
    }
    if (message.trim().length < 10) {
      toast.error('Descreva o problema com mais detalhes (mín. 10 caracteres).');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'supportTickets'), {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        category,
        subject: subject.trim().slice(0, 200) || CATEGORIES.find((c) => c.value === category)!.label,
        message: message.trim(),
        ...(requestId ? { requestId } : {}),
        status: 'open',
        created_at: Date.now(),
      });
      toast.success('Chamado aberto! Acompanhe o status aqui embaixo.');
      setSubject('');
      setMessage('');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao abrir o chamado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-12 pt-8 px-4">
      <button
        onClick={() => navigate('/help')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-6 font-bold"
      >
        <ChevronLeft className="w-5 h-5" />
        Voltar para Central de Ajuda
      </button>

      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageCircle className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Suporte e Disputas</h1>
        <p className="text-slate-500">Abra um chamado e acompanhe a resposta da nossa equipe.</p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm mb-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {requestId && (
            <div className="text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-600">
              Referente ao pedido <strong>#{requestId.slice(0, 6)}</strong>
            </div>
          )}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Tipo do problema</label>
            <Select
              value={category}
              onChange={(v) => setCategory(v as SupportCategory)}
              options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
              ariaLabel="Tipo do problema"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Resumo (opcional)</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              placeholder="Ex: Cliente marcou serviço e sumiu"
              className="w-full p-3.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">O que aconteceu?</label>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descreva com o máximo de detalhes. Se for reembolso, diga qual pedido e por quê."
              className="w-full p-4 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-hover transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/20 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Abrir chamado <Send className="w-5 h-5" /></>}
          </button>
        </form>
      </div>

      {tickets.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Meus chamados</h2>
          <div className="space-y-3">
            {tickets.map((t) => (
              <div key={t.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="font-bold text-slate-900 text-sm">{t.subject}</p>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[t.status]}`}>
                    {STATUS_LABEL[t.status] || t.status}
                  </span>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2">{t.message}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {formatDistanceToNow(t.created_at, { addSuffix: true, locale: ptBR })}
                </p>
                {t.resolution && (
                  <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700">
                    <span className="font-bold flex items-center gap-1 text-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-success" /> Resposta do suporte
                    </span>
                    {t.resolution}
                    {typeof t.refundedDiamonds === 'number' && t.refundedDiamonds > 0 && (
                      <p className="font-bold text-success mt-1">+{t.refundedDiamonds} 💎 reembolsados</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-sm text-slate-600 flex flex-wrap gap-x-8 gap-y-2">
        <span className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> suporte@conectaservico.com</span>
        <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Seg a Sex, 9h–18h</span>
      </div>
    </div>
  );
};

export default ContactSupport;
