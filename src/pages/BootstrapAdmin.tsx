import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';
import { bootstrapAdminFn, callableErrorMessage } from '@/services/api';
import { useUserStore } from '@/store/userStore';

/**
 * Página de uso único: dá o claim de admin pra própria conta logada, a partir
 * do segredo ADMIN_BOOTSTRAP_SECRET (definido no Secret Manager, nunca no
 * bundle do app — o campo abaixo é digitado na hora, não vem preenchido).
 * Depois do primeiro admin, promover os demais é feito pelo próprio painel
 * (`grantAdminFn`) — essa página não precisa mais ser usada.
 */
const BootstrapAdmin = () => {
  const { user } = useUserStore();
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) return;
    setLoading(true);
    setError('');
    try {
      await bootstrapAdminFn({ secret: secret.trim() });
      setDone(true);
    } catch (err) {
      setError(callableErrorMessage(err, 'Não foi possível conceder o acesso.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 text-center">
        <ShieldCheck className="w-10 h-10 text-primary mx-auto mb-4" />
        <h1 className="text-xl font-extrabold text-slate-900 mb-1">Tornar-se administrador</h1>
        <p className="text-sm text-slate-500 mb-6">
          Conta logada: <span className="font-bold">{user?.email}</span>
        </p>

        {done ? (
          <div className="space-y-4">
            <CheckCircle2 className="w-10 h-10 text-success mx-auto" />
            <p className="text-sm font-bold text-slate-800">
              Acesso de administrador concedido!
            </p>
            <p className="text-sm text-slate-500">
              Saia da conta e entre de novo para o acesso valer, depois vá em{' '}
              <Link to="/admin" className="text-primary font-bold hover:underline">/admin</Link>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Segredo de bootstrap (ADMIN_BOOTSTRAP_SECRET)
              </label>
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Cole o segredo aqui"
                autoFocus
                className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            {error && <p className="text-sm text-danger font-medium">{error}</p>}
            <button
              type="submit"
              disabled={loading || !secret.trim()}
              className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Conceder acesso de administrador
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default BootstrapAdmin;
