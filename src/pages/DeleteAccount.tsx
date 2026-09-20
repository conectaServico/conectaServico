import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">{children}</h2>
);
const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-slate-600 mb-3 leading-relaxed">{children}</p>
);

/**
 * Página pública de exclusão de conta — exigida pela Google Play (link na ficha do app)
 * e útil pra LGPD. O que é apagado/mantido espelha a function deleteMyAccount e a
 * Política de Privacidade.
 */
const DeleteAccount = () => {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Trash2 className="w-10 h-10 text-danger" />
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Excluir minha conta</h1>
      </div>
      <P>
        Aqui você vê como apagar sua conta da Conecta Serviço (cliente ou profissional) e o que acontece com os
        seus dados.
      </P>

      <H>1. Pelo aplicativo ou pelo site (imediato)</H>
      <ol className="list-decimal pl-6 space-y-2 text-slate-600 leading-relaxed mb-3">
        <li>Entre na sua conta.</li>
        <li>Abra a aba <strong>Perfil</strong>.</li>
        <li>Role até o fim da tela e toque em <strong>Excluir minha conta</strong>.</li>
        <li>Digite <strong>EXCLUIR</strong> para confirmar. Você será desconectado na hora.</li>
      </ol>

      <H>2. Sem acesso ao aplicativo</H>
      <P>
        Escreva para{' '}
        <a href="mailto:suporte@conectaservicooficial.com.br?subject=Excluir%20minha%20conta" className="text-primary font-bold hover:underline">
          suporte@conectaservicooficial.com.br
        </a>{' '}
        com o assunto “Excluir minha conta”, usando o e-mail (ou informando o celular) cadastrado na conta. Ao
        responder, podemos pedir uma confirmação de identidade para proteger você.
      </P>

      <H>3. O que é apagado</H>
      <ul className="list-disc pl-6 space-y-1 text-slate-600 leading-relaxed mb-3">
        <li>Perfil, foto, telefone, e-mail e endereço;</li>
        <li>Dados de verificação (CPF) e documentos enviados;</li>
        <li>Arquivos enviados (fotos de pedidos, imagens de chat);</li>
        <li>Pedidos e propostas que estavam em aberto;</li>
        <li>O acesso (login) à conta.</li>
      </ul>

      <H>4. O que é mantido</H>
      <P>
        Por obrigação legal e contábil, mantemos os registros financeiros (compras de diamantes e movimentações) sem
        dados que identifiquem você além do necessário. As avaliações que você fez ou recebeu permanecem de forma{' '}
        <strong>anonimizada</strong>.
      </P>

      <P>
        Mais detalhes em{' '}
        <Link to="/privacy" className="text-primary font-bold hover:underline">
          Política de Privacidade
        </Link>
        .
      </P>
    </div>
  );
};

export default DeleteAccount;
