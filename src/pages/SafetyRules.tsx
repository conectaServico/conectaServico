import { ChevronLeft, ShieldCheck, AlertTriangle, MessageSquare, CreditCard, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SafetyRules = () => {
  const navigate = useNavigate();

  const rules = [
    {
      title: 'Mantenha a conversa na plataforma',
      desc: 'Todo o histórico de mensagens pelo chat do Conecta Serviço serve como garantia do que foi combinado. Evite migrar para WhatsApp antes de fechar negócio e alinhar os termos principais.',
      icon: MessageSquare
    },
    {
      title: 'Cuidado com pagamentos antecipados',
      desc: 'Nunca pague 100% do valor do serviço antes que ele seja concluído. Se o serviço exigir compra de materiais, pague os materiais diretamente na loja ou faça pagamentos por etapas de entrega.',
      icon: CreditCard
    },
    {
      title: 'Verifique a identidade e histórico',
      desc: 'Sempre confira se o profissional possui o selo de perfil verificado. Leia as avaliações de outros clientes no perfil dele antes de tomar uma decisão.',
      icon: UserCheck
    },
    {
      title: 'Desconfie de orçamentos muito baixos',
      desc: 'Preços extremamente abaixo do mercado podem indicar baixa qualidade de materiais ou risco de abandono de obra. Avalie o custo-benefício.',
      icon: AlertTriangle
    }
  ];

  return (
    <div className="max-w-4xl mx-auto pb-12 pt-8 px-4">
      <button 
        onClick={() => navigate('/help')} 
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-6 font-bold"
      >
        <ChevronLeft className="w-5 h-5" />
        Voltar para Central de Ajuda
      </button>

      <div className="bg-primary/10 rounded-3xl p-8 sm:p-12 mb-10 border border-primary/20 text-center relative overflow-hidden">
        <ShieldCheck className="w-20 h-20 text-primary mx-auto mb-6 relative z-10" />
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4 relative z-10">
          Regras de Segurança
        </h1>
        <p className="text-slate-600 text-lg max-w-2xl mx-auto relative z-10">
          Sua segurança é nossa prioridade. Preparamos este manual com dicas essenciais para garantir que sua experiência no Conecta Serviço seja sempre positiva e livre de dores de cabeça.
        </p>
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {rules.map((rule, index) => (
          <div key={index} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-6">
              <rule.icon className="w-7 h-7 text-slate-700" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mb-3">{rule.title}</h2>
            <p className="text-slate-600 leading-relaxed">
              {rule.desc}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 bg-slate-900 text-white p-8 rounded-3xl text-center">
        <h2 className="text-2xl font-bold mb-4">Viu algo suspeito?</h2>
        <p className="text-slate-300 mb-6">
          Se um usuário quebrar essas regras ou apresentar comportamento inadequado, denuncie imediatamente para nossa equipe de suporte.
        </p>
        <button 
          onClick={() => navigate('/help/contact')}
          className="bg-white text-slate-900 px-8 py-3 rounded-xl font-bold hover:bg-slate-100 transition-colors"
        >
          Fazer uma Denúncia
        </button>
      </div>
    </div>
  );
};

export default SafetyRules;
