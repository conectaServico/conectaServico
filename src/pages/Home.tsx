import { useUserStore } from '@/store/userStore';
import { ShieldCheck, Clock, PenTool, Droplets, Zap, Wrench, Smartphone, Coins, ThumbsUp, ChevronRight, Star, Search, Hammer } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import ProHome from '@/professional/ProHome';
import { useState } from 'react';

const popularServices = [
  { 
    name: 'Pedreiros', 
    category: 'Reformas e Reparos',
    desc: 'Construção, alvenaria e acabamentos.', 
    icon: Hammer, 
    img: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80' 
  },
  { 
    name: 'Eletricistas', 
    category: 'Reformas e Reparos',
    desc: 'Instalações e reparos elétricos.', 
    icon: Zap, 
    img: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=800&q=80' 
  },
  { 
    name: 'Encanadores', 
    category: 'Reformas e Reparos',
    desc: 'Vazamentos e instalações hidráulicas.', 
    icon: Droplets, 
    img: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=800&q=80' 
  },
  { 
    name: 'Gesseiros', 
    category: 'Reformas e Reparos',
    desc: 'Sancas, rebaixamentos e drywall.', 
    icon: PenTool, 
    img: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80' 
  },
  { 
    name: 'Marido de Aluguel', 
    category: 'Reformas e Reparos',
    desc: 'Pequenos reparos e instalações diversas.', 
    icon: Wrench, 
    img: 'https://images.unsplash.com/photo-1581141849291-1125c7b692b5?auto=format&fit=crop&w=800&q=80' 
  },
  { 
    name: 'Reformas em geral', 
    category: 'Reformas e Reparos',
    desc: 'Reformas completas residenciais e comerciais.', 
    icon: Wrench, 
    img: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80' 
  }
];

const Home = () => {
  const { isAuthenticated, user } = useUserStore();
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';

  if (isAuthenticated) {
    if (user?.role === 'professional') {
      return <ProHome />;
    }
  }

  return (
    <div className="space-y-20 pb-10">
      {/* Hero Section */}
      {!q && (
        <section className="relative rounded-3xl overflow-hidden shadow-2xl mt-4">
          <div className="absolute inset-0">
            <img 
              src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80" 
              alt="Profissionais trabalhando" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-transparent"></div>
          </div>
          
          <div className="relative py-24 px-8 md:px-16 text-left max-w-3xl">
            {isAuthenticated && user ? (
              <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-6">
                Olá, <span className="text-primary-100">{user.name.split(' ')[0]}</span>!
                <br/>Do que você precisa hoje?
              </h1>
            ) : (
              <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight mb-6">
                Contrate os melhores <span className="text-primary-100">profissionais</span> para qualquer serviço
              </h1>
            )}
            <p className="text-xl text-slate-200 max-w-2xl mb-10">
              Mais de 100 tipos de serviços disponíveis. Faça seu pedido gratuitamente e receba orçamentos rápidos.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Link to="/request/new" className="bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-primary/25">
                Fazer Pedido Grátis
              </Link>
              {!isAuthenticated && (
                <Link to="/register" className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-bold text-lg border border-white/20 transition-all">
                  Quero trabalhar
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Como funciona para o Cliente */}
      {!q && (
        <section className="text-center max-w-5xl mx-auto">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-12">Como o Conecta Serviço funciona?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
                <Smartphone className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">1. Faça seu pedido</h3>
              <p className="text-slate-500">
                Diga o que você precisa. É rápido e de graça. Detalhe bem o serviço para receber orçamentos precisos.
              </p>
            </div>

            <div className="flex flex-col items-center space-y-4">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
                <Clock className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">2. Receba contatos</h3>
              <p className="text-slate-500">
                Até 3 profissionais da sua região entrarão em contato via chat para entender melhor o projeto e passar valores.
              </p>
            </div>

            <div className="flex flex-col items-center space-y-4">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
                <ThumbsUp className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">3. Escolha o melhor</h3>
              <p className="text-slate-500">
                Compare orçamentos, avalie o perfil do profissional, leia os comentários de outros clientes e feche negócio.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Categories */}
      <section className={`bg-slate-50 -mx-4 px-4 py-16 ${q ? 'mt-4 rounded-3xl' : ''}`}>
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-extrabold text-slate-900">
              {q ? `Resultados para "${q}"` : 'Principais Serviços'}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularServices.map((service) => {
              // Filter logic
              if (q && !service.name.toLowerCase().includes(q.toLowerCase()) && !service.desc.toLowerCase().includes(q.toLowerCase())) {
                return null;
              }

              return (
                <Link to={`/request/new?category=${encodeURIComponent(service.category)}&subcategory=${encodeURIComponent(service.name)}`} key={service.name} className="group cursor-pointer bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 flex flex-col">
                  <div className="relative w-full h-40 overflow-hidden">
                    <img src={service.img} alt={service.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 text-white flex items-center gap-3">
                      <service.icon className="w-6 h-6 text-primary-100" />
                      <h3 className="font-bold text-lg leading-tight">{service.name}</h3>
                    </div>
                  </div>
                  <div className="p-5 flex-grow flex flex-col justify-between">
                    <p className="text-slate-500 text-sm mb-4">{service.desc}</p>
                    <span className="text-primary font-bold text-sm hover:underline">
                      Solicitar orçamento
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Como funciona para o Profissional */}
      {!q && (
        <section className="text-center max-w-5xl mx-auto py-8">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-12">Como funciona para o Profissional?</h2>
          
          <div className="grid md:grid-cols-3 gap-10">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 mb-2 border-2 border-slate-200">
                <Smartphone className="w-10 h-10 relative" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Pedidos no seu celular</h3>
              <p className="text-slate-500">
                Receba notificações de serviços chegando toda hora na sua região. Veja todos os pedidos de graça.
              </p>
            </div>

            <div className="flex flex-col items-center space-y-4">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 mb-2 border-2 border-slate-200">
                <Coins className="w-10 h-10 text-yellow-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Compre Diamantes</h3>
              <p className="text-slate-500">
                Invista apenas nos serviços que gostar. Use seus Diamantes para desbloquear o contato do cliente e enviar sua proposta.
              </p>
            </div>

            <div className="flex flex-col items-center space-y-4">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 mb-2 border-2 border-slate-200">
                <ShieldCheck className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">100% do valor é seu</h3>
              <p className="text-slate-500">
                Negocie o valor direto com o cliente. Não cobramos comissão sobre o serviço fechado. Sem mensalidade!
              </p>
            </div>
          </div>

          {!isAuthenticated && (
            <div className="mt-12">
              <Link to="/register" className="inline-block bg-slate-900 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all shadow-lg">
                Cadastre-se como Profissional
              </Link>
            </div>
          )}
        </section>
      )}

      {/* Dicas antes de contratar */}
      {!q && (
        <section className="bg-primary/5 rounded-3xl p-8 md:p-12 border border-primary/10">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1 space-y-6">
              <h2 className="text-3xl font-extrabold text-slate-900">Dicas antes de contratar</h2>
              <p className="text-slate-600 text-lg">
                Queremos que sua experiência seja a melhor possível. Siga estas dicas de segurança e sucesso:
              </p>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <Star className="w-6 h-6 text-primary flex-shrink-0" />
                  <span className="text-slate-700">Analise sempre o perfil do profissional e veja suas avaliações anteriores.</span>
                </li>
                <li className="flex gap-3">
                  <ShieldCheck className="w-6 h-6 text-primary flex-shrink-0" />
                  <span className="text-slate-700">Evite pagar 100% do valor do serviço antecipadamente. Faça pagamentos por etapas ou na entrega.</span>
                </li>
                <li className="flex gap-3">
                  <Wrench className="w-6 h-6 text-primary flex-shrink-0" />
                  <span className="text-slate-700">Combine todos os detalhes do serviço (materiais, prazos, custos extras) pelo nosso Chat para ter um registro seguro.</span>
                </li>
              </ul>
            </div>
            <div className="w-full md:w-1/3">
              <img src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=600&q=80" alt="Dicas de segurança" className="rounded-2xl shadow-lg w-full" />
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;
