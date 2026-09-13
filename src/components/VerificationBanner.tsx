import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import { useVerified } from '@/hooks/useVerified';

/**
 * Faixa fixa para quem está logado mas ainda não confirmou o que a conta dele
 * exige: cliente = e-mail; profissional (conta só telefone) = celular.
 * As ações sensíveis ficam travadas (regras do Firestore + Functions); isto é o aviso.
 */
const VerificationBanner = () => {
  const { isAuthenticated } = useUserStore();
  const { verified, isPhoneAccount } = useVerified();
  const location = useLocation();

  if (!isAuthenticated || verified) return null;
  if (
    location.pathname === '/verify' ||
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname.startsWith('/categoria/')
  ) {
    return null;
  }

  const missing = isPhoneAccount ? 'celular' : 'e-mail';

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="container mx-auto px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 text-amber-800 font-medium">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Confirme seu {missing} para publicar pedidos, enviar propostas e desbloquear contatos.
        </span>
        <Link
          to="/verify"
          className="flex-shrink-0 bg-amber-500 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors"
        >
          Verificar
        </Link>
      </div>
    </div>
  );
};

export default VerificationBanner;
