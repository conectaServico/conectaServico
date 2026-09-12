import { Lock, AlertTriangle } from 'lucide-react';

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">{children}</h2>
);
const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-slate-600 mb-3 leading-relaxed">{children}</p>
);

const Privacy = () => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Lock className="w-10 h-10 text-primary" />
        <h1 className="text-4xl font-extrabold text-slate-900">Política de Privacidade</h1>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex gap-3 text-sm text-amber-900">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span>
          <strong>Rascunho.</strong> Descreve o tratamento de dados que o app realiza hoje, incluindo
          <strong> CPF</strong> dos profissionais. Deve ser revisado por advogado e ter os campos entre
          colchetes preenchidos (empresa, encarregado/DPO) antes do lançamento.
        </span>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200">
        <p className="text-slate-500 text-sm">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

        <H>1. Quem é o controlador</H>
        <P>
          O tratamento dos seus dados é feito por [RAZÃO SOCIAL], CNPJ [CNPJ], [ENDEREÇO]
          ("Conecta Serviço"). Encarregado pelo Tratamento de Dados (DPO): [NOME] —
          [E-MAIL DO ENCARREGADO].
        </P>

        <H>2. Dados que coletamos</H>
        <P>
          <strong>Cadastro:</strong> nome, e-mail, telefone, CEP e endereço, tipo de conta
          (cliente/profissional) e, para profissionais, serviços prestados e bio.
          <br />
          <strong>Verificação de identidade (KYC — só profissionais):</strong> <strong>CPF</strong>,
          submetido a análise humana para conceder o selo de verificado. A foto de perfil do
          profissional passa por uma checagem automática de "há um rosto nítido nesta imagem" no
          momento do upload, só para recusar fotos sem rosto (paisagem, objeto, logo) — nada dessa
          análise é armazenado.
          <br />
          <strong>Uso do app:</strong> pedidos de serviço e seu conteúdo (descrição, fotos, endereço do
          serviço), mensagens do chat, propostas, avaliações, histórico de diamantes e desbloqueios,
          e uma <strong>localização aproximada</strong> (coordenadas derivadas do CEP/endereço) para a
          busca por raio.
          <br />
          <strong>Técnicos:</strong> identificadores do dispositivo, tokens de notificação (push),
          registros de acesso e de erros.
          <br />
          <strong>Pagamento:</strong> a compra de diamantes é processada pelo <strong>Mercado Pago</strong>;
          os dados do cartão/PIX são fornecidos diretamente a ele — não recebemos nem armazenamos dados
          de pagamento, apenas o status da transação.
        </P>

        <H>3. Para que usamos e com qual base legal</H>
        <P>
          <strong>Executar o contrato / prestar o serviço</strong> (art. 7º, V): criar e manter a conta,
          conectar cliente e profissional, processar diamantes, chat, avaliações.
          <br />
          <strong>Cumprimento de obrigação legal/regulatória</strong> (art. 7º, II): guarda de registros
          de acesso (Marco Civil) e de dados fiscais/financeiros das transações.
          <br />
          <strong>Legítimo interesse</strong> (art. 7º, IX): segurança, prevenção a fraude e abuso,
          melhoria do produto — sempre com avaliação de impacto e sem prejuízo aos seus direitos.
        </P>

        <H>4. Com quem compartilhamos</H>
        <P>
          <strong>Com o outro usuário do pedido:</strong> seu nome, telefone e e-mail são revelados ao
          profissional <strong>somente após ele desbloquear</strong> o seu pedido. Antes disso, ele vê
          apenas seu primeiro nome e a região aproximada.
          <br />
          <strong>Provedores de infraestrutura:</strong> Google Firebase (banco de dados, autenticação,
          armazenamento de arquivos, notificações e funções em nuvem).
          <br />
          <strong>Pagamento:</strong> Mercado Pago, para processar a compra de diamantes.
          <br />
          <strong>Autoridades:</strong> quando exigido por lei, ordem judicial ou para proteção de
          direitos.
          <br />
          Não vendemos seus dados nem os usamos para publicidade de terceiros.
        </P>

        <H>5. Transferência internacional</H>
        <P>
          Os serviços do Google Firebase podem processar e armazenar dados em servidores fora do Brasil.
          Essas transferências se apoiam nas hipóteses e salvaguardas do art. 33 da LGPD (cláusulas
          contratuais e compromissos de proteção adequada do fornecedor).
        </P>

        <H>6. Por quanto tempo guardamos</H>
        <P>
          Enquanto sua conta existir e pelos prazos legais aplicáveis após o encerramento (por exemplo,
          registros de acesso por 6 meses; dados fiscais/financeiros pelo prazo da legislação
          tributária). Ao excluir a conta, apagamos perfil, dados de verificação, arquivos e
          anúncios em aberto; registros financeiros são mantidos e avaliações são <strong>anonimizadas</strong>.
        </P>

        <H>7. Seus direitos (LGPD, art. 18)</H>
        <P>
          Você pode solicitar: confirmação e acesso aos seus dados; correção; anonimização, bloqueio ou
          eliminação de dados desnecessários ou tratados em desconformidade; portabilidade; informação
          sobre compartilhamentos; e revogação do consentimento. Para exercer, use o canal de suporte do
          app ou escreva ao encarregado ([E-MAIL DO ENCARREGADO]). Responderemos nos prazos da LGPD.
        </P>

        <H>8. Segurança</H>
        <P>
          Usamos regras de acesso por usuário no banco de dados, tráfego criptografado (HTTPS),
          verificação de e-mail e telefone, e restrição de acesso a dados sensíveis apenas
          ao titular e à administração. Nenhum sistema é 100% imune; em caso de incidente relevante,
          comunicaremos os titulares e a ANPD conforme a lei.
        </P>

        <H>9. Cookies e armazenamento local</H>
        <P>
          Usamos armazenamento local do navegador para manter sua sessão e preferências. Não usamos
          cookies de rastreamento publicitário.
        </P>

        <H>10. Crianças e adolescentes</H>
        <P>O serviço é destinado a maiores de 18 anos. Não coletamos intencionalmente dados de menores.</P>

        <H>11. Alterações</H>
        <P>
          Podemos atualizar esta Política. Mudanças relevantes serão avisadas no app, com nova data de
          atualização no topo.
        </P>

        <H>12. Contato</H>
        <P>Encarregado (DPO): [NOME] — [E-MAIL DO ENCARREGADO]. Suporte: suporte@conectaservico.com.</P>
      </div>
    </div>
  );
};

export default Privacy;
