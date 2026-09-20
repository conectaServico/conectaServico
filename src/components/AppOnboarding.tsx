import { useRef, useState, type TouchEvent } from 'react';
import {
  BadgeCheck,
  BellRing,
  ClipboardList,
  Coins,
  Handshake,
  MapPin,
  MessagesSquare,
  Star,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Audience } from '@/store/audienceStore';
import { requestPushPermission } from '@/services/push';
import AppLogo from '@/components/AppLogo';

/**
 * Boas-vindas do app (só na primeira abertura): passo a passo em poucas telas, botão
 * "Pular" e, no fim, o pedido de permissão de notificações — o cliente precisa saber
 * das propostas e mensagens, o profissional dos novos pedidos.
 */
type Step = { icon: LucideIcon; title: string; text: string };

const STEPS: Record<Audience, Step[]> = {
  client: [
    {
      icon: ClipboardList,
      title: 'Conte o que você precisa',
      text: 'Descreva o serviço, o local e quando quer. Pedir orçamento é grátis.',
    },
    {
      icon: Users,
      title: 'Receba propostas',
      text: 'Profissionais da sua região entram em contato e mandam orçamento. Compare valores e perfis.',
    },
    {
      icon: MessagesSquare,
      title: 'Converse e escolha',
      text: 'Fale direto com cada profissional pelo chat, confira as avaliações e o selo Verificado e contrate quem preferir.',
    },
    {
      icon: Star,
      title: 'Avalie o serviço',
      text: 'Quando o serviço terminar, avalie o profissional e ajude outras pessoas a escolherem bem.',
    },
  ],
  professional: [
    {
      icon: MapPin,
      title: 'Veja pedidos perto de você',
      text: 'Escolha suas categorias e o raio de atuação e receba os pedidos da sua região.',
    },
    {
      icon: Coins,
      title: 'Invista só no que interessa',
      text: 'Você usa diamantes apenas nos pedidos que quiser atender, para liberar o contato do cliente. Sem mensalidade.',
    },
    {
      icon: Handshake,
      title: 'Feche o serviço',
      text: 'Combine preço e prazo direto com o cliente pelo chat. Sem comissão: o valor combinado é todo seu.',
    },
    {
      icon: BadgeCheck,
      title: 'Destaque seu perfil',
      text: 'Coloque sua foto, valide seu CPF e receba o selo Verificado para ganhar a confiança dos clientes.',
    },
  ],
};

const NOTIFY: Record<Audience, Step> = {
  client: {
    icon: BellRing,
    title: 'Não perca nenhuma resposta',
    text: 'Ative as notificações para saber na hora quando chegar uma proposta ou uma mensagem.',
  },
  professional: {
    icon: BellRing,
    title: 'Seja o primeiro a responder',
    text: 'Ative as notificações para ser avisado assim que surgir um pedido na sua região ou chegar uma mensagem.',
  },
};

const STORAGE_KEY = 'app_onboarding_v1';

export const onboardingSeen = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return true; // sem armazenamento não dá pra lembrar — melhor não repetir a cada abertura
  }
};

export const markOnboardingSeen = (): void => {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* noop */
  }
};

const AppOnboarding = ({ audience, onFinish }: { audience: Audience; onFinish: () => void }) => {
  const isPro = audience === 'professional';
  const steps = [...STEPS[audience], NOTIFY[audience]];
  const last = steps.length - 1;
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const touchX = useRef<number | null>(null);

  const onLast = index === last;
  const tone = isPro ? 'from-orange-400 to-orange-600' : 'from-blue-500 to-blue-800';
  const button = isPro ? 'bg-orange-500 hover:bg-orange-600' : 'bg-primary hover:bg-primary-hover';

  const next = () => setIndex((i) => Math.min(i + 1, last));
  const prev = () => setIndex((i) => Math.max(i - 1, 0));

  const enableNotifications = async () => {
    setBusy(true);
    await requestPushPermission(); // o token é salvo depois do login (precisa do usuário)
    onFinish();
  };

  const onTouchStart = (e: TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (dx < -50) next();
    else if (dx > 50) prev();
  };

  return (
    <div
      role="dialog"
      aria-label="Boas-vindas"
      className="fixed inset-0 z-[70] bg-white flex flex-col pt-[var(--safe-top)] pb-[var(--safe-bottom)]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex items-center justify-between px-5 h-14 flex-shrink-0">
        <AppLogo size="sm" />
        {!onLast && (
          <button type="button" onClick={onFinish} className="px-3 py-2 text-sm font-bold text-slate-500">
            Pular
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="min-w-full h-full flex flex-col items-center justify-center px-8 text-center">
                <div
                  className={`relative w-60 h-60 rounded-[2.5rem] bg-gradient-to-br ${tone} flex items-center justify-center shadow-xl overflow-hidden`}
                >
                  <div className="absolute -top-8 -left-8 w-32 h-32 bg-white/15 rounded-full" />
                  <div className="absolute -bottom-10 -right-6 w-40 h-40 bg-white/10 rounded-full" />
                  <div className="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center">
                    <Icon className="w-14 h-14 text-white" />
                  </div>
                  {i < last && (
                    <span className="absolute top-4 left-4 bg-white/25 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full">
                      Passo {i + 1} de {last}
                    </span>
                  )}
                </div>
                <h2 className="mt-8 text-2xl font-extrabold text-slate-900 leading-tight">{s.title}</h2>
                <p className="mt-3 text-slate-500 leading-relaxed max-w-xs">{s.text}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-6 pb-6 pt-2 flex-shrink-0">
        <div className="flex justify-center gap-1.5 mb-5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? `w-6 ${isPro ? 'bg-orange-500' : 'bg-primary'}` : 'w-1.5 bg-slate-300'
              }`}
            />
          ))}
        </div>

        {onLast ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={enableNotifications}
              disabled={busy}
              className={`w-full ${button} text-white font-extrabold text-lg py-4 rounded-2xl shadow-lg transition-colors disabled:opacity-60`}
            >
              {busy ? 'Ativando…' : 'Ativar notificações'}
            </button>
            <button type="button" onClick={onFinish} disabled={busy} className="w-full py-3 text-sm font-bold text-slate-500">
              Agora não
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={next}
            className={`w-full ${button} text-white font-extrabold text-lg py-4 rounded-2xl shadow-lg transition-colors`}
          >
            Próximo
          </button>
        )}
      </div>
    </div>
  );
};

export default AppOnboarding;
