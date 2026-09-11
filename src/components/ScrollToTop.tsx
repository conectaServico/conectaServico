import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Sempre que a rota muda, devolve o scroll para o topo — assim o usuário nunca
 * "cai" no meio ou no fim de uma tela nova ao navegar.
 * Exceção: o chat controla o próprio scroll (rola para a última mensagem).
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname.startsWith('/chats')) return;
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
