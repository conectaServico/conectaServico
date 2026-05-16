import { Lock } from 'lucide-react';

const Privacy = () => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="flex items-center gap-4 mb-8">
        <Lock className="w-10 h-10 text-primary" />
        <h1 className="text-4xl font-extrabold text-slate-900">Política de Privacidade</h1>
      </div>
      
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 prose prose-slate max-w-none">
        <p className="text-slate-500">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
        
        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">1. Coleta de Informações</h2>
        <p className="text-slate-600 mb-4">
          Coletamos informações pessoais que você nos fornece diretamente, como nome, e-mail, telefone, endereço (CEP, Cidade, Bairro) e, no caso de profissionais, documentos para verificação de identidade.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">2. Uso das Informações</h2>
        <p className="text-slate-600 mb-4">
          Utilizamos suas informações para:
        </p>
        <ul className="list-disc pl-6 text-slate-600 mb-4 space-y-2">
          <li>Criar e gerenciar sua conta;</li>
          <li>Conectar clientes a profissionais na mesma região;</li>
          <li>Processar transações (compra e uso de Diamantes);</li>
          <li>Melhorar a segurança e prevenir fraudes;</li>
          <li>Enviar atualizações importantes sobre seus pedidos.</li>
        </ul>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">3. Compartilhamento de Dados</h2>
        <p className="text-slate-600 mb-4">
          Para que a plataforma funcione, algumas informações precisam ser compartilhadas. O endereço completo (Rua, Número) e o telefone do cliente <strong>só são revelados</strong> aos profissionais que utilizam seus Diamantes para desbloquear o contato específico. Não vendemos dados pessoais para terceiros.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">4. Segurança</h2>
        <p className="text-slate-600 mb-4">
          Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações pessoais contra acesso não autorizado, alteração ou destruição, utilizando os padrões de segurança do Firebase (Google).
        </p>

        <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">5. Seus Direitos</h2>
        <p className="text-slate-600 mb-4">
          Você tem o direito de solicitar acesso, correção ou exclusão dos seus dados pessoais a qualquer momento através das configurações da sua conta ou entrando em contato com nosso suporte.
        </p>
      </div>
    </div>
  );
};

export default Privacy;