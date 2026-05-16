import { ShieldCheck } from 'lucide-react';

const Terms = () => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="flex items-center gap-4 mb-8">
        <ShieldCheck className="w-10 h-10 text-primary" />
        <h1 className="text-4xl font-extrabold text-slate-900">Termos de Uso</h1>
      </div>
      
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 prose prose-slate max-w-none">
        <p className="text-slate-500">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
        
        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">1. Aceitação dos Termos</h2>
        <p className="text-slate-600 mb-4">
          Ao acessar e usar a plataforma Conecta Serviço, você concorda em cumprir e ficar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deverá usar nossos serviços.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">2. Natureza do Serviço</h2>
        <p className="text-slate-600 mb-4">
          O Conecta Serviço atua exclusivamente como intermediador, facilitando o contato entre Usuários (Clientes) e Prestadores de Serviços (Profissionais). Não prestamos serviços de reforma, assistência técnica ou qualquer outra categoria listada na plataforma.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">3. Cadastro e Segurança</h2>
        <p className="text-slate-600 mb-4">
          Para utilizar certas funcionalidades, é necessário criar uma conta. Você é responsável por manter a confidencialidade de sua senha e por todas as atividades que ocorram sob sua conta.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">4. Sistema de Moedas (Diamantes)</h2>
        <p className="text-slate-600 mb-4">
          Profissionais utilizam "Diamantes" (moeda virtual) para desbloquear contatos de clientes. Os Diamantes adquiridos não são reembolsáveis em dinheiro real, exceto nos casos previstos na política de estorno automático (quando a proposta não é aceita pelo cliente).
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">5. Responsabilidades</h2>
        <p className="text-slate-600 mb-4">
          <strong>Para Clientes:</strong> A responsabilidade pela escolha do profissional, negociação de valores e acompanhamento do serviço é exclusivamente do cliente. Recomendamos cautela e análise de avaliações.<br/><br/>
          <strong>Para Profissionais:</strong> O profissional compromete-se a fornecer informações verdadeiras e a executar os serviços combinados com qualidade e ética.
        </p>
      </div>
    </div>
  );
};

export default Terms;