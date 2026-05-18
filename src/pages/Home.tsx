import { useUserStore } from '@/store/userStore';
import { Star, Smartphone, Clock, ThumbsUp, Coins, ShieldCheck, Wrench, Zap, Droplets, Hammer, MessageSquare, CheckCircle, ChevronLeft, ChevronRight, MonitorSmartphone, Laptop } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useRef } from 'react';
import ProHome from '@/professional/ProHome';
import ClientHome from '@/client/ClientHome';
import { CATEGORY_MENUS } from '@/utils/categories';

const Home = () => {
  const { isAuthenticated, user } = useUserStore();
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (isAuthenticated && user) {
    if (user.role === 'professional') {
      return <ProHome />;
    } else {
      return <ClientHome />;
    }
  }

  return (
    <div className="space-y-20 pb-10">
      {/* Hero Section */}
      {!q && (
        <section className="relative overflow-hidden mt-4">
          <div className="container mx-auto max-w-7xl px-4 flex flex-col md:flex-row items-center gap-10 py-12 md:py-20">
            <div className="flex-1 text-left z-10">
              <h1 className="text-5xl md:text-6xl font-extrabold text-blue-950 tracking-tight leading-tight mb-6">
                Mais de 500 tipos de serviços<br/>
                <span className="text-orange-500">em um só lugar.</span>
              </h1>
              <p className="text-xl text-slate-600 max-w-2xl mb-10">
                Encontre profissionais e contrate serviços para tudo o que precisar
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link to="/request/new" className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-orange-500/30">
                  Fazer Pedido Grátis
                </Link>
                <Link to="/register" className="bg-white hover:bg-blue-50 text-blue-900 px-8 py-4 rounded-xl font-bold text-lg border border-blue-200 transition-all shadow-sm">
                  Quero trabalhar
                </Link>
              </div>
            </div>
            
            <div className="flex-1 relative hidden md:block">
              <img 
                src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80" 
                alt="Profissional prestando serviço" 
                className="w-full h-auto object-cover rounded-3xl shadow-2xl border-4 border-white"
              />
            </div>
          </div>
        </section>
      )}

      {/* Pedidos mais frequentes */}
      {!q && (
        <section className="bg-slate-50 py-16 -mx-4 px-4">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-extrabold text-blue-950 mb-3">Pedidos mais frequentes</h2>
              <p className="text-slate-500 text-lg">Mais de 10 mil pedidos realizados por dia</p>
            </div>
            
            <div className="flex items-center justify-center gap-4 relative">
              <button 
                onClick={() => scrollCarousel('left')}
                className="hidden md:flex absolute -left-6 z-10 w-12 h-12 bg-white rounded-full items-center justify-center shadow-md border border-slate-100 hover:shadow-lg hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all text-blue-950"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              
              <div 
                ref={carouselRef}
                className="flex overflow-x-auto hide-scrollbar gap-6 pb-4 snap-x w-full px-4 scroll-smooth"
              >
                {/* Card 1 */}
                <Link to="/categoria/construcao-e-reformas?servico=Eletricista" className="min-w-[280px] md:min-w-[320px] bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all snap-center flex-shrink-0 group">
                  <div className="w-14 h-14 bg-yellow-50 rounded-full flex items-center justify-center text-yellow-500 mb-6 group-hover:scale-110 transition-transform">
                    <Zap className="w-7 h-7" />
                  </div>
                  <p className="text-blue-500 font-medium text-sm mb-2">Construção e reformas</p>
                  <h3 className="text-xl font-bold text-blue-950 mb-6 group-hover:text-blue-600 transition-colors">Troca de fiação elétrica</h3>
                  
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500">Avaliação do cliente</p>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-slate-700">4.7</span>
                      <div className="flex text-yellow-400">
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current text-slate-200" />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 pt-2">24 de Maio de 2024</p>
                  </div>
                </Link>

                {/* Card 2 */}
                <Link to="/categoria/limpeza-e-manutencao?servico=Diarista" className="min-w-[280px] md:min-w-[320px] bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all snap-center flex-shrink-0 group">
                  <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
                    <Droplets className="w-7 h-7" />
                  </div>
                  <p className="text-blue-500 font-medium text-sm mb-2">Limpeza e manutenção</p>
                  <h3 className="text-xl font-bold text-blue-950 mb-6 group-hover:text-blue-600 transition-colors">Limpeza diária</h3>
                  
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500">Avaliação do cliente</p>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-slate-700">4.9</span>
                      <div className="flex text-yellow-400">
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 pt-2">Hoje</p>
                  </div>
                </Link>

                {/* Card 3 */}
                <Link to="/categoria/servicos-gerais?servico=Montador%20de%20móveis" className="min-w-[280px] md:min-w-[320px] bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all snap-center flex-shrink-0 group">
                  <div className="w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center text-orange-400 mb-6 group-hover:scale-110 transition-transform">
                    <Hammer className="w-7 h-7" />
                  </div>
                  <p className="text-blue-500 font-medium text-sm mb-2">Serviços gerais</p>
                  <h3 className="text-xl font-bold text-blue-950 mb-6 group-hover:text-blue-600 transition-colors">Montagem de móveis</h3>
                  
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500">Avaliação do cliente</p>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-slate-700">4.8</span>
                      <div className="flex text-yellow-400">
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current text-slate-200" />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 pt-2">Ontem</p>
                  </div>
                </Link>

                {/* Card 4 - Assistência Técnica */}
                <Link to="/categoria/assistencia-tecnica?servico=Celular" className="min-w-[280px] md:min-w-[320px] bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all snap-center flex-shrink-0 group">
                  <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform">
                    <MonitorSmartphone className="w-7 h-7" />
                  </div>
                  <p className="text-blue-500 font-medium text-sm mb-2">Assistência técnica</p>
                  <h3 className="text-xl font-bold text-blue-950 mb-6 group-hover:text-blue-600 transition-colors">Conserto de Celular</h3>
                  
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500">Avaliação do cliente</p>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-slate-700">5.0</span>
                      <div className="flex text-yellow-400">
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 pt-2">Semana passada</p>
                  </div>
                </Link>

                {/* Card 5 - Design e Tecnologia */}
                <Link to="/categoria/design-e-tecnologia?servico=Desenvolvedor%20de%20sites" className="min-w-[280px] md:min-w-[320px] bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all snap-center flex-shrink-0 group">
                  <div className="w-14 h-14 bg-purple-50 rounded-full flex items-center justify-center text-purple-500 mb-6 group-hover:scale-110 transition-transform">
                    <Laptop className="w-7 h-7" />
                  </div>
                  <p className="text-blue-500 font-medium text-sm mb-2">Design e Tecnologia</p>
                  <h3 className="text-xl font-bold text-blue-950 mb-6 group-hover:text-blue-600 transition-colors">Criação de Sites</h3>
                  
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500">Avaliação do cliente</p>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-slate-700">4.9</span>
                      <div className="flex text-yellow-400">
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 pt-2">Há 2 dias</p>
                  </div>
                </Link>
              </div>

              <button 
                onClick={() => scrollCarousel('right')}
                className="hidden md:flex absolute -right-6 z-10 w-12 h-12 bg-white rounded-full items-center justify-center shadow-md border border-slate-100 hover:shadow-lg hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all text-blue-950"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Como funciona para o Cliente */}
      {!q && (
        <section className="text-center max-w-5xl mx-auto mt-20">
          <h2 className="text-3xl font-extrabold text-blue-950 mb-12">Como o Conecta Serviço funciona?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-2">
                <Smartphone className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-blue-950">1. Faça seu pedido</h3>
              <p className="text-slate-500">
                Diga o que você precisa. É rápido e de graça. Detalhe bem o serviço para receber orçamentos precisos.
              </p>
            </div>

            <div className="flex flex-col items-center space-y-4">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 mb-2">
                <Clock className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-blue-950">2. Receba contatos</h3>
              <p className="text-slate-500">
                Até 3 profissionais da sua região entrarão em contato via chat para entender melhor o projeto e passar valores.
              </p>
            </div>

            <div className="flex flex-col items-center space-y-4">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-2">
                <ThumbsUp className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-blue-950">3. Escolha o melhor</h3>
              <p className="text-slate-500">
                Compare orçamentos, avalie o perfil do profissional, leia os comentários de outros clientes e feche negócio.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Como funciona para o Profissional */}
      {!q && (
        <section className="text-center max-w-5xl mx-auto py-16">
          <h2 className="text-3xl font-extrabold text-blue-950 mb-12">Como funciona para o Profissional?</h2>
          
          <div className="grid md:grid-cols-3 gap-10">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 mb-2 border border-orange-100 shadow-sm">
                <Smartphone className="w-10 h-10 relative" />
              </div>
              <h3 className="text-xl font-bold text-blue-950">Pedidos no seu celular</h3>
              <p className="text-slate-500">
                Receba notificações de serviços chegando toda hora na sua região. Veja todos os pedidos de graça.
              </p>
            </div>

            <div className="flex flex-col items-center space-y-4">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-2 border border-blue-100 shadow-sm">
                <Coins className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-blue-950">Compre Diamantes</h3>
              <p className="text-slate-500">
                Invista apenas nos serviços que gostar. Use seus Diamantes para desbloquear o contato do cliente e enviar sua proposta.
              </p>
            </div>

            <div className="flex flex-col items-center space-y-4">
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 mb-2 border border-orange-100 shadow-sm">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-blue-950">100% do valor é seu</h3>
              <p className="text-slate-500">
                Negocie o valor direto com o cliente. Não cobramos comissão sobre o serviço fechado. Sem mensalidade!
              </p>
            </div>
          </div>

          <div className="mt-12">
            <Link to="/register" className="inline-block bg-blue-900 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-blue-950 transition-all shadow-lg shadow-blue-900/30">
              Cadastre-se como Profissional
            </Link>
          </div>
        </section>
      )}

      {/* Por que escolher o Conecta Serviço? */}
      {!q && (
        <section className="py-20 bg-white">
          <div className="container mx-auto max-w-7xl px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-extrabold text-blue-950 mb-4">Por que escolher o Conecta Serviço?</h2>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                Nossa plataforma foi desenhada para oferecer a melhor experiência, conectando quem precisa com quem sabe fazer, de forma segura e eficiente.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 hover:shadow-lg transition-all hover:-translate-y-1">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-blue-950 mb-4">Profissionais Verificados</h3>
                <p className="text-slate-600 leading-relaxed">
                  Todos os profissionais passam por uma análise de documentos e antecedentes. Você também pode conferir as avaliações de outros clientes antes de fechar negócio.
                </p>
              </div>

              <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 hover:shadow-lg transition-all hover:-translate-y-1">
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-500 mb-6">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-blue-950 mb-4">Negociação Direta</h3>
                <p className="text-slate-600 leading-relaxed">
                  Converse diretamente com o profissional através do nosso chat integrado. Combine valores, prazos e tire todas as suas dúvidas sem intermediários e sem taxas ocultas.
                </p>
              </div>

              <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 hover:shadow-lg transition-all hover:-translate-y-1">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-blue-950 mb-4">Suporte Garantido</h3>
                <p className="text-slate-600 leading-relaxed">
                  Nossa equipe de suporte está sempre pronta para ajudar. Se houver algum problema durante o serviço, nós intermediamos a comunicação para garantir que tudo seja resolvido.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Dicas antes de contratar */}
      {!q && (
        <section className="bg-orange-50 rounded-3xl p-8 md:p-12 border border-orange-100">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1 space-y-6">
              <h2 className="text-3xl font-extrabold text-blue-950">Dicas antes de contratar</h2>
              <p className="text-slate-600 text-lg">
                Queremos que sua experiência seja a melhor possível. Siga estas dicas de segurança e sucesso:
              </p>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <Star className="w-6 h-6 text-orange-500 flex-shrink-0" />
                  <span className="text-blue-950/80 font-medium">Analise sempre o perfil do profissional e veja suas avaliações anteriores.</span>
                </li>
                <li className="flex gap-3">
                  <ShieldCheck className="w-6 h-6 text-orange-500 flex-shrink-0" />
                  <span className="text-blue-950/80 font-medium">Evite pagar 100% do valor do serviço antecipadamente. Faça pagamentos por etapas ou na entrega.</span>
                </li>
                <li className="flex gap-3">
                  <Wrench className="w-6 h-6 text-orange-500 flex-shrink-0" />
                  <span className="text-blue-950/80 font-medium">Combine todos os detalhes do serviço (materiais, prazos, custos extras) pelo nosso Chat para ter um registro seguro.</span>
                </li>
              </ul>
            </div>
            <div className="w-full md:w-1/3">
              <img src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=600&q=80" alt="Dicas de segurança" className="rounded-2xl shadow-lg w-full border-4 border-white" />
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;
