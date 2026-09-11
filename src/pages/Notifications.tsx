import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, CheckCheck, Loader2, MessageSquare, Star, ShieldCheck, Briefcase, Sparkles } from 'lucide-react';
import { useNotifications, type AppNotification } from '@/hooks/useNotifications';

function iconFor(type: string) {
  switch (type) {
    case 'proposal_new':
    case 'proposal_accepted':
    case 'proposal_rejected':
      return <Briefcase className="w-5 h-5" />;
    case 'review_received':
      return <Star className="w-5 h-5" />;
    case 'kyc':
      return <ShieldCheck className="w-5 h-5" />;
    case 'new_lead':
      return <Sparkles className="w-5 h-5" />;
    case 'message':
      return <MessageSquare className="w-5 h-5" />;
    default:
      return <Bell className="w-5 h-5" />;
  }
}

const Notifications = () => {
  const navigate = useNavigate();
  const { items, unreadCount, loading, markRead, markAllRead } = useNotifications();

  const open = (n: AppNotification) => {
    if (!n.read) markRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8 pb-16">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <Bell className="w-6 h-6" /> Avisos
          {unreadCount > 0 && (
            <span className="text-xs font-bold bg-primary text-white rounded-full px-2 py-0.5">{unreadCount}</span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
          >
            <CheckCheck className="w-4 h-4" /> Marcar tudo como lido
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-slate-300" />
          </div>
          <p className="font-bold text-slate-800">Nenhum aviso ainda</p>
          <p className="text-slate-500 text-sm mt-1">Propostas, avaliações e novidades aparecem aqui.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => open(n)}
              className={`w-full flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${
                n.read ? 'border-slate-200 bg-white' : 'border-primary/30 bg-primary/5'
              } hover:border-primary/40`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  n.read ? 'bg-slate-100 text-slate-500' : 'bg-primary/10 text-primary'
                }`}
              >
                {iconFor(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900">{n.title}</p>
                <p className="text-sm text-slate-600">{n.body}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {formatDistanceToNow(n.created_at, { addSuffix: true, locale: ptBR })}
                </p>
              </div>
              {!n.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
