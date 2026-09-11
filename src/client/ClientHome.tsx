import { useUserStore } from '@/store/userStore';
import { Hammer, Zap, Droplets, PenTool, Wrench, PlusCircle, ClipboardList, ShieldCheck, MessageSquare, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import BannerCarousel, { type Banner } from '@/components/BannerCarousel';

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
    cta: { label: 'Buscar profissionais', to: '/search' },
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

const ClientHome = () => {
  const { user } = useUserStore();

  const categories = [
    {
      name: 'Pedreiro',
      icon: Hammer,
      label: 'Pedreiros',
      image: 'https://images.unsplash.com/photo-1581141849291-1125c7b692b5?auto=format&fit=crop&w=400&q=70',
    },
    {
      name: 'Eletricista',
      icon: Zap,
      label: 'Eletricistas',
      image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=400&q=70',
    },
    {
      name: 'Encanador',
      icon: Droplets,
      label: 'Encanadores',
      image: 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?auto=format&fit=crop&w=400&q=70',
    },
    {
      name: 'Gesseiro',
      icon: PenTool,
      label: 'Gesseiros',
      image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=400&q=70',
    },
    {
      name: 'Marido de aluguel',
      icon: Wrench,
      label: 'Marido de Aluguel',
      image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=400&q=70',
    },
    {
      name: 'Reformas',
      icon: Wrench,
      label: 'Reformas',
      image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=70',
    },
  ];

  return (
    <div className="pb-24">
      {/* Header Profile */}
      <div className="bg-primary pt-8 pb-6 px-4 rounded-b-3xl shadow-md text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-100 text-sm font-medium">Bem-vindo(a) de volta,</p>
            <h1 className="text-2xl font-bold">{user?.name?.split(' ')[0]}</h1>
          </div>
          <Link to="/profile" className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm overflow-hidden border-2 border-white/30">
            {user?.photo_url ? (
              <img src={user.photo_url} alt="Perfil" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold">{user?.name?.charAt(0)}</span>
            )}
          </Link>
        </div>
      </div>

      <div className="px-4 mt-6 space-y-8">
        <BannerCarousel banners={clientBanners} />

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

        {/* Categories */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Categorias</h2>
            <Link to="/search" className="text-primary text-sm font-semibold">Ver todas</Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {categories.map((cat, idx) => (
              <Link
                to={cat.name === 'Marido de aluguel' ? `/categoria/servicos-gerais?servico=${cat.name}` : cat.name === 'Reformas' ? `/categoria/construcao-e-reformas` : `/categoria/construcao-e-reformas?servico=${cat.name}`}
                key={idx}
                className="group relative rounded-2xl overflow-hidden aspect-square shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5"
              >
                <img
                  src={cat.image}
                  alt={cat.label}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  <cat.icon className="w-4 h-4 text-white mb-1" />
                  <span className="text-white font-bold text-[11px] leading-tight block">{cat.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Banner */}
        <div className="relative rounded-2xl overflow-hidden shadow-lg h-44">
          <img
            src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=75"
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
