import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUserStore } from '@/store/userStore';
import { getPushPermission, pushSupported, registerForPush, type PushPermission } from '@/services/push';

/**
 * Convite pra ligar as notificações (cliente e profissional). Só aparece se o aparelho
 * suporta e a pessoa ainda não decidiu — no app, quem já respondeu na tela de boas-vindas
 * não vê isso de novo.
 */
const PushOptInBanner = ({ label, className = '' }: { label: string; className?: string }) => {
  const { user } = useUserStore();
  const [state, setState] = useState<PushPermission>('unsupported');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    getPushPermission().then((p) => alive && setState(p));
    return () => {
      alive = false;
    };
  }, []);

  if (!pushSupported() || state !== 'default' || !user?.id) return null;

  const enable = async () => {
    setBusy(true);
    try {
      const token = await registerForPush(user.id);
      setState(await getPushPermission());
      toast[token ? 'success' : 'error'](
        token ? 'Notificações ativadas!' : 'Não foi possível ativar as notificações agora.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={enable}
      disabled={busy}
      className={`w-full flex items-center justify-center gap-2 rounded-xl bg-primary/10 text-primary border border-primary/20 px-4 py-3 font-bold hover:bg-primary/15 transition-colors disabled:opacity-60 ${className}`}
    >
      <BellRing className="w-4 h-4" />
      {busy ? 'Ativando…' : label}
    </button>
  );
};

export default PushOptInBanner;
