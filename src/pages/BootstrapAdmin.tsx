import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bootstrapAdminFn } from '@/services/api';
import { useUserStore } from '@/store/userStore';

/**
 * Página de uso único pra conceder o 1º admin — de propósito sem nenhum texto
 * (label, título, mensagem de erro/sucesso): quem não já sabe o que esse
 * campo faz não deve conseguir adivinhar pela tela. A segurança de verdade é
 * o ADMIN_BOOTSTRAP_SECRET, validado no servidor — isso aqui é só não dar
 * pista nenhuma de graça pra quem cair na URL sem saber.
 */
const BootstrapAdmin = () => {
  const navigate = useNavigate();
  const logout = useUserStore((s) => s.logout);
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim() || loading) return;
    setLoading(true);
    try {
      await bootstrapAdminFn({ secret: secret.trim() });
      // Claim novo só entra num token emitido depois de um login novo —
      // desloga sozinho pra forçar isso, sem precisar explicar por quê.
      logout();
      navigate('/login');
    } catch {
      setSecret('');
      setShake(true);
      setTimeout(() => setShake(false), 400);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          autoFocus
          disabled={loading}
          autoComplete="off"
          className={`w-56 p-3 border rounded-xl outline-none text-center focus:ring-2 focus:ring-primary/40 transition-colors ${
            shake ? 'border-danger' : 'border-gray-300'
          }`}
        />
      </form>
    </div>
  );
};

export default BootstrapAdmin;
