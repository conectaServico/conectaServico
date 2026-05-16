import { HelpCircle, ChevronLeft, Search, MessageCircle, FileText, ExternalLink, Smartphone, CheckCircle, MessageSquare, Star, Coins, Unlock, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';

const HelpCenter = () => {
  const navigate = useNavigate();
  const { user } = useUserStore();

  const isClient = user?.role === 'client';

  const clientSteps = [
    {
      title: 'Pesquise ou Escolha o Serviço',
      desc: 'Encontre o serviço que você precisa na tela inicial navegando pelas categorias.',
      icon: Search
    },
    {
      title: 'Descreva sua Necessidade',
      desc: 'Preencha os detalhes como tamanho do local, urgência e fotos para que os profissionais entendam o que precisa ser feito.',
      icon: FileText
    },
    {
      title: 'Aguarde Orçamentos',
      desc: 'Profissionais qualificados da sua região entrarão em contato enviando propostas e mensagens.',
      icon: MessageSquare
    },
    {
      title: 'Negocie e Avalie',
      desc: 'Use o chat para tirar dúvidas, combine o pagamento direto com o profissional e, após a conclusão, avalie o serviço.',
      icon: Star
    }
  ];

  const proSteps = [
    {
      title: 'Mantenha o Perfil Atualizado',
      desc: 'Preencha seus dados, defina seu raio de atuação e valide seus documentos para passar confiança.',
      icon: CheckCircle2
    },
    {
      title: 'Adquira Diamantes',
      desc: 'Compre pacotes de diamantes na sua Carteira. Eles são necessários para desbloquear contatos.',
      icon: Coins
    },
    {
      title: 'Encontre Pedidos',
      desc: 'Acesse a tela inicial para visualizar serviços abertos por clientes na sua região em tempo real.',
      icon: Search
    },
    {
      title: 'Desbloqueie e Negocie',
      desc: 'Utilize seus diamantes para liberar o chat com o cliente, envie sua proposta e feche negócio!',
      icon: Unlock
    }
  ];

  const clientFaqs = [
    {
      q: 'É gratuito fazer um pedido?',
      a: 'Sim! Você não paga absolutamente nada para usar a plataforma, solicitar orçamentos e conversar com os profissionais.'
    },
    {
      q: 'Como sei se o profissional é confiável?',
      a: 'Sempre verifique se o profissional possui o selo de "Verificado" (documentos validados) no perfil e leia atentamente as avaliações e comentários deixados por outros clientes.'
    },
    {
      q: 'Como funciona o pagamento do serviço?',
      a: 'O pagamento é negociado e realizado diretamente entre você e o profissional. A plataforma Conecta Serviço não retém valores e não cobra comissões.'
    }
  ];

  const proFaqs = [
    {
      q: 'O que são Diamantes e como funcionam?',
      a: 'Diamantes são a moeda virtual da plataforma. Você utiliza diamantes para liberar o contato do cliente e enviar seu orçamento. Cada pedido exige uma quantidade específica de diamantes dependendo do tamanho do serviço.'
    },
    {
      q: 'A plataforma cobra comissão sobre o serviço fechado?',
      a: 'Não! Nós não cobramos nenhuma comissão. 100% do valor que você negociar e receber do cliente é inteiramente seu.'
    },
    {
      q: 'Como valido meus documentos?',
      a: 'Acesse o seu Perfil, clique em "Validação de documentos" e siga as instruções para enviar uma foto do seu RG/CNH e uma selfie. A validação aumenta muito suas chances de fechar serviços.'
    }
  ];

  const steps = isClient ? clientSteps : proSteps;
  const faqs = isClient ? clientFaqs : proFaqs;

  return (
    <div className="max-w-4xl mx-auto pb-12 pt-4 px-4">
      <button 
        onClick={() => navigate('/profile')} 
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-6 font-bold"
      >
        <ChevronLeft className="w-5 h-5" />
        Voltar para o menu
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Central de Ajuda</h1>
        <p className="text-slate-500 text-lg">Tudo o que você precisa saber para usar o Conecta Serviço.</p>
      </div>

      <div className="relative mb-12">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm transition-all"
          placeholder="Buscar artigos e dúvidas frequentes..."
        />
      </div>

      {/* Passo a Passo */}
      <div className="mb-12">
        <h2 className="text-2xl font-extrabold text-slate-900 mb-8 flex items-center gap-2">
          <Smartphone className="w-7 h-7 text-primary" />
          Passo a passo: Como funciona
        </h2>
        
        <div className="grid sm:grid-cols-2 gap-6">
          {steps.map((step, index) => (
            <div key={index} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <step.icon className="w-24 h-24 text-primary" />
              </div>
              <div className="relative z-10">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
                  <step.icon className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold">
                    {index + 1}
                  </span>
                  <h3 className="font-extrabold text-lg text-slate-900">{step.title}</h3>
                </div>
                <p className="text-slate-500 leading-relaxed pl-9">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-12">
        <div 
          onClick={() => navigate('/help/contact')}
          className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 sm:p-8 rounded-3xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer group text-white"
        >
          <MessageCircle className="w-10 h-10 text-primary-100 mb-4" />
          <h3 className="font-extrabold text-xl mb-2">Falar com o suporte</h3>
          <p className="text-slate-300 text-sm">Nossa equipe está pronta para ajudar. Respondemos em até 24 horas úteis.</p>
          <div className="mt-6 flex items-center text-primary-100 font-bold text-sm">
            Enviar mensagem <ExternalLink className="w-4 h-4 ml-2" />
          </div>
        </div>
        
        <div 
          onClick={() => navigate('/help/safety')}
          className="bg-primary/10 p-6 sm:p-8 rounded-3xl border border-primary/20 shadow-sm hover:border-primary/40 transition-colors cursor-pointer group"
        >
          <FileText className="w-10 h-10 text-primary mb-4" />
          <h3 className="font-extrabold text-xl text-slate-900 mb-2">Regras de Segurança</h3>
          <p className="text-slate-600 text-sm">Leia nossas dicas e diretrizes para garantir uma experiência segura na plataforma.</p>
          <div className="mt-6 flex items-center text-primary font-bold text-sm">
            Ler manual <ExternalLink className="w-4 h-4 ml-2" />
          </div>
        </div>
      </div>

      {/* Dúvidas Frequentes */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10">
        <h2 className="text-2xl font-extrabold text-slate-900 mb-8 flex items-center gap-2">
          <HelpCircle className="w-7 h-7 text-primary" />
          Dúvidas Frequentes
        </h2>

        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <h3 className="font-bold text-lg text-slate-900 mb-3 flex items-start gap-3">
                <span className="text-primary mt-1">Q.</span>
                {faq.q}
              </h3>
              <p className="text-slate-600 leading-relaxed pl-7">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
        
        <button 
          onClick={() => navigate('/help/faqs')}
          className="w-full mt-8 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
        >
          Ver todas as perguntas na Central Completa
          <ExternalLink className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default HelpCenter;
