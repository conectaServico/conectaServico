import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { Check, CheckCircle2, Eye, EyeOff, Loader2, Lock, MailCheck, TriangleAlert } from 'lucide-react';
import { auth } from '@/services/firebase';

/**
 * Página que recebe os links dos e-mails de conta (redefinir senha, confirmar
 * e-mail) — no lugar da tela genérica do Firebase. Serve tanto pros links do
 * nosso e-mail bonito (/auth/action?mode=resetPassword&oobCode=...) quanto pros
 * e-mails padrão do Firebase, se a "URL de ação" do modelo apontar pra cá.
 */
type Phase = 'loading' | 'ready' | 'saving' | 'success' | 'invalid';

const RULES = [
  { id: 'len', label: 'Pelo menos 8 caracteres', test: (p: string) => p.length >= 8 },
  { id: 'letter', label: 'Letras maiúsculas e minúsculas', test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { id: 'num', label: 'Pelo menos um número', test: (p: string) => /\d/.test(p) },
];

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
    <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
      <div className="flex items-center justify-center gap-2 mb-6">
        <img src="/logo.jpg" alt="" className="h-9 w-9 rounded-lg" />
        <span className="text-xl font-extrabold text-blue-950">Conecta Serviço</span>
      </div>
      {children}
    </div>
  </div>
);

const InvalidLink = ({ reset }: { reset: boolean }) => (
  <div className="text-center">
    <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
      <TriangleAlert className="w-7 h-7" />
    </div>
    <h1 className="text-xl font-extrabold text-slate-900 mb-2">Este link não vale mais</h1>
    <p className="text-sm text-slate-500 mb-6">
      Ele pode ter expirado (dura 1 hora) ou já ter sido usado.{' '}
      {reset ? 'Peça um novo link de redefinição e tente de novo.' : 'Entre na sua conta e peça outro e-mail de confirmação.'}
    </p>
    <Link
      to="/login"
      className="inline-flex w-full justify-center bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-xl transition-colors"
    >
      Ir para o login
    </Link>
  </div>
);

const AuthAction = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mode = params.get('mode') || '';
  const oobCode = params.get('oobCode') || '';

  const [phase, setPhase] = useState<Phase>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!oobCode || !['resetPassword', 'verifyEmail', 'recoverEmail'].includes(mode)) {
      navigate('/', { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        if (mode === 'resetPassword') {
          const e = await verifyPasswordResetCode(auth, oobCode);
          if (!cancelled) { setEmail(e); setPhase('ready'); }
        } else {
          await applyActionCode(auth, oobCode);
          try { await auth.currentUser?.reload(); } catch { /* sem sessão, tudo bem */ }
          if (!cancelled) setPhase('success');
        }
      } catch {
        if (!cancelled) setPhase('invalid');
      }
    })();
    return () => { cancelled = true; };
  }, [mode, oobCode, navigate]);

  const passed = useMemo(() => RULES.map((r) => r.test(password)), [password]);
  const score = passed.filter(Boolean).length;
  const strong = score === RULES.length;
  const matches = password.length > 0 && password === confirm;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!strong || !matches) return;
    setPhase('saving');
    setError('');
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setPhase('success');
    } catch (err) {
      const code = (err as { code?: string }).code || '';
      if (code.includes('expired') || code.includes('invalid-action-code')) {
        setPhase('invalid');
      } else if (code.includes('weak-password')) {
        setError('Essa senha é considerada fraca. Escolha outra, mais longa.');
        setPhase('ready');
      } else {
        setError('Não foi possível salvar a nova senha. Tente de novo.');
        setPhase('ready');
      }
    }
  };

  if (phase === 'loading') {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-8 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Conferindo o seu link…</p>
        </div>
      </Shell>
    );
  }

  if (phase === 'invalid') {
    return (
      <Shell>
        <InvalidLink reset={mode === 'resetPassword'} />
      </Shell>
    );
  }

  if (phase === 'success') {
    const isReset = mode === 'resetPassword';
    return (
      <Shell>
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto mb-4">
            {isReset ? <CheckCircle2 className="w-8 h-8" /> : <MailCheck className="w-8 h-8" />}
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 mb-2">
            {isReset ? 'Senha alterada!' : mode === 'verifyEmail' ? 'E-mail confirmado!' : 'E-mail restaurado!'}
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            {isReset
              ? 'Pronto! Agora é só entrar com a sua nova senha.'
              : mode === 'verifyEmail'
                ? 'Tudo certo com o seu e-mail. Você já pode continuar usando a Conecta Serviço.'
                : 'O e-mail da sua conta foi restaurado.'}
          </p>
          <Link
            to={isReset ? '/login' : '/home'}
            className="inline-flex w-full justify-center bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-xl transition-colors"
          >
            {isReset ? 'Entrar na minha conta' : 'Continuar'}
          </Link>
        </div>
      </Shell>
    );
  }

  // resetPassword: formulário
  return (
    <Shell>
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900 mb-1">Crie uma nova senha</h1>
        <p className="text-sm text-slate-500">
          Conta: <strong className="text-slate-700 break-all">{email}</strong>
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Nova senha</label>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
              className="w-full p-3 pr-11 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex gap-1.5 mt-3" aria-hidden="true">
            {RULES.map((r, i) => (
              <span
                key={r.id}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < score ? (score === 3 ? 'bg-success' : score === 2 ? 'bg-amber-400' : 'bg-danger') : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <ul className="mt-2 space-y-1">
            {RULES.map((r, i) => (
              <li key={r.id} className={`flex items-center gap-2 text-xs ${passed[i] ? 'text-success' : 'text-slate-400'}`}>
                <Check className="w-3.5 h-3.5" /> {r.label}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Repita a nova senha</label>
          <input
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-primary"
          />
          {confirm.length > 0 && !matches && <p className="text-xs text-danger mt-1">As senhas não são iguais.</p>}
        </div>

        {error && <p className="text-sm text-danger font-medium">{error}</p>}

        <button
          type="submit"
          disabled={!strong || !matches || phase === 'saving'}
          className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {phase === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
          Salvar nova senha
        </button>
      </form>
    </Shell>
  );
};

export default AuthAction;
