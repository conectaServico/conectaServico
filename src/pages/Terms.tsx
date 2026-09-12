import { ShieldCheck, AlertTriangle } from 'lucide-react';

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">{children}</h2>
);
const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-slate-600 mb-3 leading-relaxed">{children}</p>
);

const Terms = () => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="flex items-center gap-4 mb-6">
        <ShieldCheck className="w-10 h-10 text-primary" />
        <h1 className="text-4xl font-extrabold text-slate-900">Termos de Uso</h1>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex gap-3 text-sm text-amber-900">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span>
          <strong>Rascunho.</strong> Este texto reflete o funcionamento atual do aplicativo e serve de base,
          mas <strong>precisa ser revisado por um advogado</strong> e complementado com a identificação
          jurídica da empresa (razão social, CNPJ, endereço) antes da abertura ao público.
        </span>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200">
        <p className="text-slate-500 text-sm">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

        <H>1. Definições</H>
        <P>
          <strong>Plataforma / Conecta Serviço:</strong> o aplicativo e o site operados por
          [RAZÃO SOCIAL], CNPJ [CNPJ], com sede em [ENDEREÇO]. <strong>Cliente:</strong> usuário que
          publica um pedido de serviço. <strong>Profissional:</strong> usuário que oferece serviços e
          utiliza diamantes para desbloquear o contato de clientes. <strong>Diamantes:</strong> créditos
          virtuais, sem valor monetário e não conversíveis em dinheiro.
        </P>

        <H>2. Natureza do serviço</H>
        <P>
          A Conecta Serviço é uma plataforma de <strong>intermediação de contatos</strong>. Ela
          <strong> não presta</strong> os serviços anunciados, não participa da negociação, da execução
          ou do pagamento do serviço contratado entre Cliente e Profissional, e <strong>não cobra
          comissão</strong> sobre o valor do serviço. A relação de prestação de serviço é
          exclusivamente entre Cliente e Profissional.
        </P>

        <H>3. Cadastro, verificação e veracidade</H>
        <P>
          Para usar as funções principais é necessário criar uma conta e <strong>confirmar e-mail e
          telefone</strong>. Profissionais devem ainda informar seu <strong>CPF</strong>, que é
          submetido a análise humana para conceder o <strong>selo de verificado</strong>. O
          tratamento do CPF está detalhado na Política de Privacidade. Você declara que todas as
          informações fornecidas são verdadeiras e se compromete a mantê-las atualizadas. É proibido
          criar conta em nome de terceiro ou usar identidade falsa.
        </P>

        <H>4. Regras para o Cliente</H>
        <P>
          Publicar um pedido é <strong>gratuito</strong>. Cada pedido pode ser desbloqueado por até
          <strong> 3 profissionais</strong>. A escolha do profissional, a checagem de referências, a
          negociação de preço e prazo e o acompanhamento do serviço são de <strong>responsabilidade
          exclusiva do Cliente</strong>. O Cliente pode editar, cancelar ou excluir seu pedido enquanto
          ele estiver aberto ou cancelado. É vedado publicar pedidos falsos, duplicados ou fora do
          escopo da plataforma.
        </P>

        <H>5. Regras para o Profissional — Diamantes</H>
        <P>
          O Profissional adquire diamantes e os gasta para <strong>desbloquear o contato</strong> de um
          Cliente (custo fixo por desbloqueio, informado no app). O desbloqueio dá acesso ao contato e
          entrada no chat do pedido; <strong>não garante a contratação</strong>. Os diamantes gastos
          <strong> não são reembolsados</strong> caso o Cliente escolha outro profissional, não responda,
          desista ou cancele o pedido. Reembolso só ocorre, a critério exclusivo da plataforma, quando
          um chamado de suporte comprovar pedido falso, fraude ou violação destes Termos pelo Cliente.
        </P>

        <H>6. Compra de diamantes</H>
        <P>
          A compra de diamantes é processada por gateway de pagamento terceirizado (Mercado Pago). Os
          diamantes são creditados após confirmação do pagamento. <strong>Diamantes não são
          reembolsáveis em dinheiro</strong> e não podem ser transferidos entre contas, salvo
          determinação legal ou decisão da plataforma. Preços e pacotes podem mudar; a alteração não
          afeta diamantes já adquiridos. O direito de arrependimento previsto no art. 49 do CDC, quando
          aplicável, deve ser exercido em até 7 dias da compra e desde que os diamantes não tenham sido
          utilizados.
        </P>

        <H>7. Avaliações</H>
        <P>
          Após um serviço concluído, Cliente e Profissional podem se avaliar mutuamente. As avaliações
          devem ser verdadeiras e de boa-fé. A plataforma pode remover avaliações com ofensa, dado
          pessoal de terceiro, spam ou conteúdo manifestamente falso.
        </P>

        <H>8. Condutas proibidas</H>
        <P>
          É vedado: fraudar o sistema de diamantes ou de indicações; publicar pedidos ou perfis falsos;
          assediar, ameaçar ou discriminar outro usuário; usar a plataforma para fins ilícitos; extrair
          dados de terceiros; burlar a verificação de identidade; e utilizar automações não autorizadas.
          O descumprimento pode levar a advertência, suspensão ou encerramento da conta, sem reembolso
          de diamantes.
        </P>

        <H>9. Suporte e disputas</H>
        <P>
          Reclamações (pedido falso, não comparecimento, abuso, problema de pagamento) devem ser abertas
          pelo canal de suporte do app. A plataforma analisará o caso e poderá, quando cabível,
          reembolsar diamantes, advertir ou suspender o usuário responsável. A plataforma não arbitra
          disputas sobre o valor, a qualidade ou a execução do serviço em si, que devem ser resolvidas
          entre as partes e, se necessário, pelas vias legais.
        </P>

        <H>10. Limitação de responsabilidade</H>
        <P>
          A plataforma não garante a contratação, a qualidade, a segurança ou a legalidade dos serviços
          oferecidos pelos Profissionais, nem a veracidade das informações prestadas pelos usuários. Não
          nos responsabilizamos por danos decorrentes da relação entre Cliente e Profissional,
          indisponibilidades temporárias do serviço ou uso indevido da conta pelo próprio usuário. Nada
          nestes Termos exclui responsabilidades que não possam ser afastadas pela legislação aplicável.
        </P>

        <H>11. Encerramento da conta</H>
        <P>
          Você pode excluir sua conta a qualquer momento pelo próprio app. A plataforma pode suspender
          ou encerrar contas que violem estes Termos. Diamantes não utilizados não são reembolsados no
          encerramento por violação. Alguns registros (financeiros, avaliações anonimizadas) são
          mantidos conforme a Política de Privacidade e obrigações legais.
        </P>

        <H>12. Alterações destes Termos</H>
        <P>
          Podemos alterar estes Termos. Mudanças relevantes serão comunicadas no app. O uso após a
          vigência da nova versão significa concordância.
        </P>

        <H>13. Lei aplicável e foro</H>
        <P>
          Estes Termos são regidos pela lei brasileira. Fica eleito o foro da comarca de [CIDADE/UF],
          salvo competência legal diversa (por exemplo, foro do domicílio do consumidor).
        </P>

        <H>14. Contato</H>
        <P>Dúvidas: suporte@conectaservico.com. Encarregado de dados (LGPD): [E-MAIL DO ENCARREGADO].</P>
      </div>
    </div>
  );
};

export default Terms;
