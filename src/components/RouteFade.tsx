import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Entrada suave (fade + subida curtinha) a cada troca de tela. Só a rota-base entra na chave
 * (`/chats` e `/chats/:id` são a mesma tela) pra não piscar dentro de listas com painel lateral.
 * `prefers-reduced-motion` desliga a animação (ver index.css).
 */
const RouteFade = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const base = '/' + (pathname.split('/')[1] || '');
  return (
    <div key={base} className="route-fade">
      {children}
    </div>
  );
};

export default RouteFade;
