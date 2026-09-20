import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, Coins, MapPin, MessageCircle, ShieldCheck, Zap, type LucideIcon } from 'lucide-react';
import type { Audience } from '@/store/audienceStore';

/**
 * Banners de destaque da primeira tela do app (cliente ou profissional): fotos
 * reais + 1 benefício por slide, passam sozinhos e dá pra arrastar. Só fatos que
 * o produto entrega de verdade (mesmos da home do site). Fotos: Unsplash (licença livre).
 */
type Slide = {
  id: string;
  photo: string;
  position: string;
  icon: LucideIcon;
  chip: string;
  title: string;
  subtitle: string;
};

const photoUrl = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&h=560&q=70`;

const SLIDES: Record<Audience, Slide[]> = {
  client: [
    {
      id: 'c1',
      photo: '1758876201450-cf77ab8b95bc',
      position: '62% 30%',
      icon: Zap,
      chip: 'Rápido',
      title: 'Peça um serviço em minutos',
      subtitle: 'Descreva o que precisa e receba orçamentos de profissionais.',
    },
    {
      id: 'c2',
      photo: '1621905252507-b35492cc74b4',
      position: '50% 25%',
      icon: ShieldCheck,
      chip: 'Mais segurança',
      title: 'Profissionais verificados',
      subtitle: 'Documentos conferidos pela nossa equipe. Procure o selo Verificado no perfil.',
    },
    {
      id: 'c3',
      photo: '1618219908412-a29a1bb7b86e',
      position: '50% 50%',
      icon: MessageCircle,
      chip: 'Sem custo',
      title: 'Converse direto e combine tudo',
      subtitle: 'Pedir orçamento é grátis e o chat é direto com o profissional, sem intermediário.',
    },
  ],
  professional: [
    {
      id: 'p1',
      photo: '1653280679689-078c04c417a1',
      position: '55% 40%',
      icon: MapPin,
      chip: 'Novos clientes',
      title: 'Clientes perto de você',
      subtitle: 'Veja os pedidos da sua região e escolha quais quer atender.',
    },
    {
      id: 'p2',
      photo: '1590635023142-73c3d34f2805',
      position: '30% 50%',
      icon: Coins,
      chip: 'Sem mensalidade',
      title: 'Sem comissão sobre o serviço',
      subtitle: 'Você usa diamantes só nos pedidos que quiser. O valor combinado com o cliente é todo seu.',
    },
    {
      id: 'p3',
      photo: '1581578731548-c64695cc6952',
      position: '70% 30%',
      icon: BadgeCheck,
      chip: 'Mais contatos',
      title: 'Perfil verificado aparece mais',
      subtitle: 'Valide seu CPF e receba o selo Verificado — perfis verificados recebem até 3x mais contatos.',
    },
  ],
};

const AUTO_MS = 4500; // tempo de cada slide
const PAUSE_MS = 8000; // pausa depois que a pessoa mexe

const IntroBanners = ({ audience }: { audience: Audience }) => {
  const slides = SLIDES[audience];
  const scroller = useRef<HTMLDivElement>(null);
  const pausedUntil = useRef(0);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      const el = scroller.current;
      if (!el || Date.now() < pausedUntil.current) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % slides.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    }, AUTO_MS);
    return () => clearInterval(t);
  }, [slides.length]);

  const pause = () => {
    pausedUntil.current = Date.now() + PAUSE_MS;
  };

  const onScroll = () => {
    const el = scroller.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const goTo = (i: number) => {
    pause();
    const el = scroller.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <section
      aria-label="Destaques"
      className="relative rounded-3xl overflow-hidden shadow-lg mb-6 bg-gradient-to-br from-primary to-blue-800"
    >
      <div
        ref={scroller}
        onScroll={onScroll}
        onTouchStart={pause}
        onMouseDown={pause}
        className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar"
      >
        {slides.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.id} className="relative min-w-full h-60 snap-center">
              <img
                src={photoUrl(s.photo)}
                alt=""
                decoding="async"
                draggable={false}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ objectPosition: s.position }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/5" />
              <div className="relative h-full flex flex-col justify-end p-5 pb-9 text-white">
                <span className="inline-flex items-center gap-1.5 self-start bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11px] font-bold mb-2">
                  <Icon className="w-3.5 h-3.5" />
                  {s.chip}
                </span>
                <h2 className="text-2xl font-extrabold leading-tight">{s.title}</h2>
                <p className="text-sm text-white/90 mt-1 leading-snug">{s.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Ir para o destaque ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${index === i ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
          />
        ))}
      </div>
    </section>
  );
};

export default IntroBanners;
