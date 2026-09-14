import { PlusCircle, ClipboardList, ShieldCheck, MessageSquare, Star, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import BannerCarousel, { type Banner } from '@/components/BannerCarousel';
import { CATEGORY_MENUS, imageForService } from '@/utils/categories';

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

interface FeaturedServiceCardProps {
  title: string;
  description: string;
  image: string;
  to: string;
}

// Card de destaque de um serviço específico — foto grande em cima, card branco
// embaixo com a frase e a seta de "ver detalhes" (mesmo padrão do card de
// "Diarista" da referência do GetNinjas).
const FeaturedServiceCard = ({ title, description, image, to }: FeaturedServiceCardProps) => (
  <Link to={to} className="block bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
    <div className="h-44">
      <img src={image} alt={title} loading="lazy" className="w-full h-full object-cover" />
    </div>
    <div className="p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h3 className="font-bold text-slate-900 text-base mb-0.5">{title}</h3>
        <p className="text-sm text-slate-500 truncate">{description}</p>
      </div>
      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
        <ArrowRight className="w-5 h-5 text-white" />
      </div>
    </div>
  </Link>
);

const ClientHome = () => {
  return (
    <div className="pb-24">
      {/* Sem cabeçalho de "bem-vindo"/nome aqui — o Navbar já dá acesso ao perfil
          (dropdown no desktop, aba "Perfil" no rodapé mobile); duplicar só
          ocupava espaço no topo da home à toa. */}
      <div className="px-4 pt-6 space-y-8">
        <BannerCarousel banners={clientBanners} />

        {/* Mobilidade elétrica está em alta — logo abaixo do banner, igual à
            referência (card da "Diarista"): foto grande + card branco com a
            frase e a seta que leva pra lista de serviços daquela categoria. */}
        <FeaturedServiceCard
          title="Scooter Elétrica"
          description="Troca de bateria, freios, pneus e mais"
          image="https://images.unsplash.com/photo-1624243519828-52a0f2c88af3?auto=format&fit=crop&w=900&q=75"
          to={`/categoria/assistencia-tecnica?aba=${encodeURIComponent('Scooter Elétrica')}`}
        />

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link to="/request/new" className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-3 hover:bg-slate-50 transition-colors">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <PlusCircle className="w-6 h-6" />
            </div>
            <span className="font-semibold text-slate-700 text-sm">Novo Pedido</span>
          </Link>
          <Link to="/requests" className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-3 hover:bg-slate-50 transition-colors">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <ClipboardList className="w-6 h-6" />
            </div>
            <span className="font-semibold text-slate-700 text-sm">Meus Pedidos</span>
          </Link>
        </div>

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
      </div>
    </div>
  );
};

export default ClientHome;
