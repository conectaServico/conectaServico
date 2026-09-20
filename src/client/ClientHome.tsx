import { useState, useEffect } from 'react';
import { PlusCircle, ShieldCheck, MessageSquare, Star, ArrowRight, Search, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useUserStore } from '@/store/userStore';
import BannerCarousel, { type Banner } from '@/components/BannerCarousel';
import { CATEGORY_MENUS, imageForService } from '@/utils/categories';
import { normalize } from '@/utils/search';
import PushOptInBanner from '@/components/PushOptInBanner';

// Todos os serviços de todas as categorias, achatados — usado só pela busca
// da home (digitar "eletricista" já sugere direto, sem precisar navegar por
// categoria primeiro).
const ALL_SERVICES = CATEGORY_MENUS.flatMap((cat) => cat.items.map((service) => ({ category: cat.name, service })));

const clientBanners: Banner[] = [
  {
    id: 'free',
    gradient: 'from-primary to-blue-700',
    icon: PlusCircle,
    title: 'Publique seu pedido de graça',
    subtitle: 'Descreva o serviço e receba até 3 profissionais da sua região.',
    cta: { label: 'Fazer um pedido', to: '/request/new' },
  },
  {
    id: 'verified',
    gradient: 'from-emerald-400 to-emerald-600',
    icon: ShieldCheck,
    title: 'Profissionais verificados',
    subtitle: 'Documento conferido e selo de confiança. Você escolhe com segurança.',
  },
  {
    id: 'chat',
    gradient: 'from-fuchsia-500 to-purple-700',
    icon: MessageSquare,
    title: 'Converse antes de fechar',
    subtitle: 'Tire dúvidas pelo chat do app e combine tudo direto com o profissional.',
  },
  {
    id: 'reviews',
    gradient: 'from-amber-400 to-orange-500',
    textClass: 'text-orange-950',
    icon: Star,
    title: 'Avaliações reais',
    subtitle: 'Veja a nota de quem já contratou e avalie ao final do serviço.',
  },
];

// Banner acolhedor logo abaixo do carrossel: convida a fazer o pedido. Quem ainda
// não fez nenhum vê "primeiro pedido"; quem já fez vê uma chamada mais geral.
// Mobile: foto em cima e texto embaixo; desktop: texto à esquerda e foto à direita
// (a foto tem largura limitada pra não estourar o recorte em telas largas).
const HELP_BANNER_PHOTO = 'https://images.unsplash.com/photo-1758876201450-cf77ab8b95bc?auto=format&fit=crop&w=1000&q=75';

const HelpBanner = ({ firstOrder }: { firstOrder: boolean }) => (
  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-blue-700 shadow-sm md:flex md:items-center md:min-h-[240px]">
    <div className="relative h-44 md:h-auto md:absolute md:inset-y-0 md:right-0 md:w-[44%]">
      <img
        src={HELP_BANNER_PHOTO}
        alt="Mulher sorrindo ao telefone"
        loading="lazy"
        className="h-full w-full object-cover"
        style={{ objectPosition: '62% 28%' }}
      />
      <div className="hidden md:block absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-primary to-transparent" />
    </div>
    <div className="relative z-10 p-6 md:p-10 md:w-[58%]">
      <span className="inline-block bg-white/20 text-white text-[11px] font-bold px-2.5 py-1 rounded-full mb-3">
        100% grátis
      </span>
      <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
        {firstOrder ? 'Faça seu primeiro pedido' : 'Precisa de ajuda com outro serviço?'}
      </h2>
      <p className="text-blue-100 text-sm md:text-base mt-2 max-w-md">
        {firstOrder
          ? 'Conte o que você precisa e receba profissionais verificados da sua região. Leva menos de 2 minutos.'
          : 'Conte o que você precisa e receba propostas de profissionais da sua região.'}
      </p>
      <Link
        to="/request/new"
        className="mt-5 inline-flex items-center gap-2 bg-white text-primary font-bold text-sm md:text-base px-5 py-3 rounded-xl hover:bg-blue-50 transition-colors"
      >
        {firstOrder ? 'Fazer meu primeiro pedido' : 'Fazer um pedido'} <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  </div>
);

const ClientHome = () => {
  const { user } = useUserStore();
  // null = ainda descobrindo (não mostra o banner pra não piscar o texto errado).
  const [hasOrders, setHasOrders] = useState<boolean | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    getDocs(query(collection(db, 'serviceRequests'), where('clientId', '==', user.id), limit(1)))
      .then((snap) => setHasOrders(!snap.empty))
      .catch(() => setHasOrders(true)); // na dúvida, texto genérico (nunca afirma "primeiro pedido" sem ter certeza)
  }, [user?.id]);

  const q = normalize(search.trim());
  const searching = q.length > 0;
  const results = searching ? ALL_SERVICES.filter(({ service }) => normalize(service).includes(q)).slice(0, 8) : [];

  return (
    <div className="pb-24">
      {/* Sem cabeçalho de "bem-vindo"/nome aqui — o Navbar já dá acesso ao perfil
          (dropdown no desktop, aba "Perfil" no rodapé mobile); duplicar só
          ocupava espaço no topo da home à toa. */}
      <div className="px-4 pt-6 space-y-8 max-w-5xl mx-auto">
        {/* Busca — primeira coisa da home, igual à referência. Digitando, some
            o resto (banner/categorias) e mostra só os serviços que baterem,
            de qualquer categoria. */}
        <div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="O que você precisa?"
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3 py-3 text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {searching && (
            <div className="mt-2 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              {results.length === 0 ? (
                <p className="text-sm text-slate-500 text-center px-4 py-4">
                  Nenhum serviço encontrado para &quot;{search}&quot;.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {results.map(({ category, service }) => (
                    <Link
                      key={`${category}-${service}`}
                      to={`/request/new?category=${encodeURIComponent(category)}&subcategory=${encodeURIComponent(service)}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{service}</p>
                        <p className="text-xs text-slate-400">{category}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {searching ? null : (
        <>
        <PushOptInBanner label="Ativar avisos de propostas e mensagens" className="mb-2" />
        <BannerCarousel banners={clientBanners} />

        {/* Convite pro pedido (só depois de saber se é o primeiro; reserva a altura pra não pular). */}
        {hasOrders === null ? <div className="min-h-[240px]" /> : <HelpBanner firstOrder={!hasOrders} />}

        {/* Uma fileira por categoria, com scroll horizontal de fotos por serviço
            específico — cada bloco é a "categoria" (Reformas, Assistência
            técnica, etc.), os cards dentro dela são os serviços individuais. */}
        {CATEGORY_MENUS.map((cat) => (
          <div key={cat.slug}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">{cat.name}</h2>
              <Link to={`/categoria/${cat.slug}`} className="text-primary text-sm font-semibold flex-shrink-0">
                Ver todos
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 snap-x snap-mandatory hide-scrollbar">
              {cat.items.map((service) => (
                <Link
                  key={service}
                  to={`/request/new?category=${encodeURIComponent(cat.name)}&subcategory=${encodeURIComponent(service)}`}
                  className="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all flex-shrink-0 w-32 h-32 snap-start"
                >
                  <img
                    src={imageForService(cat.name, service)}
                    alt={service}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/10 to-transparent" />
                  <span className="absolute bottom-2 left-2 right-2 text-white font-bold text-[11px] leading-tight">
                    {service}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Banner */}
        <div className="relative rounded-2xl overflow-hidden shadow-lg h-44">
          <img
            src="https://images.unsplash.com/photo-1787672357797-f5fa35bb0d18?auto=format&fit=crop&crop=focalpoint&fp-x=0.65&fp-y=0.35&w=800&h=350&q=75"
            alt="Profissional prestando serviço"
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/55 to-transparent" />
          <div className="relative z-10 h-full flex flex-col justify-center px-6 w-2/3">
            <h3 className="font-bold text-lg text-white mb-1">Precisa de ajuda?</h3>
            <p className="text-sm text-slate-200 mb-4">Encontre os melhores profissionais para sua reforma.</p>
            <Link to="/request/new" className="inline-block bg-primary hover:bg-primary-hover text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors w-fit">
              Solicitar agora
            </Link>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
};

export default ClientHome;
