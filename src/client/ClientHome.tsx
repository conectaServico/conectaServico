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
    { name: 'Pedreiro', icon: Hammer, color: 'bg-orange-100 text-orange-600', label: 'Pedreiros' },
    { name: 'Eletricista', icon: Zap, color: 'bg-yellow-100 text-yellow-600', label: 'Eletricistas' },
    { name: 'Encanador', icon: Droplets, color: 'bg-blue-100 text-blue-600', label: 'Encanadores' },
    { name: 'Gesseiro', icon: PenTool, color: 'bg-indigo-100 text-indigo-600', label: 'Gesseiros' },
    { name: 'Marido de aluguel', icon: Wrench, color: 'bg-emerald-100 text-emerald-600', label: 'Marido de Aluguel' },
    { name: 'Reformas', icon: Wrench, color: 'bg-rose-100 text-rose-600', label: 'Reformas' }
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
          <div className="grid grid-cols-3 gap-4">
            {categories.map((cat, idx) => (
              <Link to={cat.name === 'Marido de aluguel' ? `/categoria/servicos-gerais?servico=${cat.name}` : cat.name === 'Reformas' ? `/categoria/construcao-e-reformas` : `/categoria/construcao-e-reformas?servico=${cat.name}`} key={idx} className="flex flex-col items-center gap-2">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm ${cat.color}`}>
                  <cat.icon className="w-7 h-7" />
                </div>
                <span className="text-xs text-center font-medium text-slate-600 leading-tight">{cat.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10 w-2/3">
            <h3 className="font-bold text-lg mb-1">Precisa de ajuda?</h3>
            <p className="text-sm text-slate-300 mb-4">Encontre os melhores profissionais para sua reforma.</p>
            <Link to="/request/new" className="inline-block bg-primary hover:bg-primary-hover text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors">
              Solicitar agora
            </Link>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-20">
            <Hammer className="w-40 h-40 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientHome;
