import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
  type User as FirebaseUser,
  type ConfirmationResult,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';
import { requestPasswordReset } from '@/utils/passwordReset';
import { useUserStore } from '@/store/userStore';
import { useAudienceStore } from '@/store/audienceStore';
import { LOCKED_AUDIENCE } from '@/config/appTarget';
import { toE164BR } from '@/hooks/useVerified';
import { sendOtp, clearRecaptcha } from '@/utils/phoneAuth';
import { maskPhone } from '@/utils/masks';
import OtpInput from '@/components/OtpInput';
import { Mail, Lock, Loader2, Eye, EyeOff, Phone, MessageSquare, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { User, TERMS_VERSION } from '@/types';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

const RECAPTCHA_ID = 'recaptcha-container-login';
const RESEND_SECONDS = 30;

const Login = () => {
  const { audience } = useAudienceStore();
  const [mode, setMode] = useState<'client' | 'professional'>(audience);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // Login do profissional (celular + SMS)
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [confirmingOtp, setConfirmingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  const navigate = useNavigate();
  const setUser = useUserStore((state) => state.setUser);

  // Contagem regressiva para liberar o "Reenviar código".
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Get redirect param if exists
  const searchParams = new URLSearchParams(window.location.search);
  const redirectPath = searchParams.get('redirect') || '/home';

  const goAfterLogin = () => {
    const pendingRedirect = sessionStorage.getItem('pendingRequestRedirect');
    if (pendingRedirect) {
      sessionStorage.removeItem('pendingRequestRedirect');
      navigate(pendingRedirect);
    } else {
      navigate(redirectPath);
    }
  };

  useEffect(() => () => clearRecaptcha(RECAPTCHA_ID), []);

  const processGoogleUser = async (user: FirebaseUser) => {
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      setUser(userDoc.data() as User);
    } else {
      const newUserData: User = {
        id: user.uid,
        name: user.displayName || 'Usuário',
        email: user.email || '',
        role: 'client',
        phone: '',
        city: '',
        photo_url: user.photoURL || undefined,
        verified: false,
        // Ao entrar com Google o usuário aceita os Termos (aviso ao lado do botão).
        termsAcceptedAt: Date.now(),
        termsVersion: TERMS_VERSION,
        created_at: Date.now(),
      };
      await setDoc(userDocRef, newUserData);
      setUser(newUserData);
    }

    goAfterLogin();
  };

  // Conclui o login com Google quando o navegador voltou de signInWithRedirect
  // (fallback usado quando o popup é bloqueado — comum em mobile / PWA / navegador in-app).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result = await getRedirectResult(auth);
        if (active && result?.user) {
          setGoogleLoading(true);
          await processGoogleUser(result.user);
        }
      } catch (err) {
        console.error('Erro ao concluir login com o Google (redirect):', err);
        if (active) setError('Falha ao concluir login com o Google.');
      } finally {
        if (active) setGoogleLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      const userDoc = await getDoc(doc(db, 'users', uid));

      if (userDoc.exists()) {
        setUser(userDoc.data() as User);
        goAfterLogin();
      } else {
        setError('Usuário não encontrado no banco de dados.');
      }
    } catch (err: any) {
      console.error('Erro no login:', err);
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        setError('E-mail ou senha incorretos.');
      } else {
        setError('Falha ao fazer login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Digite seu e-mail no campo acima para receber o link de redefinição.');
      return;
    }
    try {
      await requestPasswordReset(email.trim());
      setResetSent(true);
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível enviar o e-mail de redefinição.');
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');

    try {
      if (Capacitor.isNativePlatform()) {
        const result = await FirebaseAuthentication.signInWithGoogle();
        if (result.credential?.idToken) {
          const credential = GoogleAuthProvider.credential(result.credential.idToken);
          const userCredential = await signInWithCredential(auth, credential);
          await processGoogleUser(userCredential.user);
        }
      } else {
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        await processGoogleUser(userCredential.user);
      }
    } catch (err: any) {
      console.error('Erro no login com Google:', err);
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError('Falha ao tentar entrar com o Google.');
      }
      setGoogleLoading(false);
    }
  };

  const handleSendLoginOtp = async () => {
    setError('');
    const e164 = toE164BR(phone);
    if (e164.replace(/\D/g, '').length < 12) {
      setError('Digite um celular válido com DDD.');
      return;
    }
    setSendingOtp(true);
    try {
      confirmationRef.current = await sendOtp(e164, RECAPTCHA_ID);
      setOtpSent(true);
      setOtpCode('');
      setResendCooldown(RESEND_SECONDS);
    } catch (err) {
      console.error('Falha ao enviar SMS:', err);
      setError('Não foi possível enviar o SMS. Confira o número e tente de novo.');
    } finally {
      setSendingOtp(false);
    }
  };

  // Reenvia para o mesmo número (só chega aqui com o cooldown zerado).
  const handleResendLoginOtp = () => {
    if (resendCooldown > 0 || sendingOtp) return;
    handleSendLoginOtp();
  };

  const handleConfirmLoginOtp = async (code: string) => {
    if (!confirmationRef.current || code.length < 6 || confirmingOtp) return;
    setConfirmingOtp(true);
    setError('');
    try {
      const cred = await confirmationRef.current.confirm(code);
      const userDoc = await getDoc(doc(db, 'users', cred.user.uid));

      if (!userDoc.exists()) {
        // Número autenticou mas o cadastro nunca foi concluído — termina o cadastro.
        navigate('/register?role=professional');
        return;
      }

      const userData = userDoc.data() as User;
      if (userData.role !== 'professional') {
        await signOut(auth);
        setError('Esse número está ligado a uma conta de cliente. Entre com e-mail e senha.');
        setOtpSent(false);
        setOtpCode('');
        return;
      }

      setUser(userData);
      goAfterLogin();
    } catch (err: any) {
      console.error('Falha ao confirmar código:', err);
      setError(
        err?.code === 'auth/invalid-verification-code'
          ? 'Código incorreto.'
          : 'Não foi possível entrar. Tente de novo.'
      );
      setOtpCode('');
    } finally {
      setConfirmingOtp(false);
    }
  };

  const resetLoginPhone = () => {
    confirmationRef.current = null;
    clearRecaptcha(RECAPTCHA_ID);
    setOtpSent(false);
    setOtpCode('');
    setResendCooldown(0);
    setError('');
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center max-w-md mx-auto px-4 sm:px-6">
      {/* Logo Area */}
      <div className="flex flex-col items-center mb-8">
        <Link to="/">
          <img
            src="/logo.jpg"
            alt="Conecta Serviço Logo"
            className="h-28 w-auto mb-4 drop-shadow-md hover:scale-105 transition-transform"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/logo.png';
            }}
          />
        </Link>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Conecta Serviço</h1>
        <p className="text-slate-500 mt-2 text-center text-lg">
          {LOCKED_AUDIENCE === 'professional'
            ? 'Encontre novos clientes perto de você'
            : 'Encontre o profissional ideal para a sua casa'}
        </p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 w-full">
        {/* Cliente x Profissional — no app nativo cada lado é um app separado, sem seletor */}
        {!LOCKED_AUDIENCE && (
        <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('client');
              setError('');
            }}
            className={`flex-1 min-w-0 px-1 py-2.5 rounded-lg text-xs sm:text-sm font-bold leading-tight transition-all ${
              mode === 'client' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Sou cliente
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('professional');
              setError('');
            }}
            className={`flex-1 min-w-0 px-1 py-2.5 rounded-lg text-xs sm:text-sm font-bold leading-tight transition-all ${
              mode === 'professional' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Sou profissional
          </button>
        </div>
        )}

        {error && (
          <div className="bg-danger/10 text-danger p-4 rounded-xl text-sm mb-6 border border-danger/20 font-medium">
            {error}
          </div>
        )}

        {mode === 'client' ? (
          <>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">E-mail</label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Senha</label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="w-full pl-11 pr-12 py-3.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {resetSent ? (
                <div className="flex items-start gap-3 bg-success/5 border border-success/20 rounded-xl p-3.5">
                  <div className="w-8 h-8 rounded-full bg-success/15 text-success flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4.5 h-4.5" />
                  </div>
                  <div className="text-sm">
                    <p className="font-bold text-slate-800">Link de redefinição enviado!</p>
                    <p className="text-slate-500">
                      Confira a caixa de entrada de <strong>{email.trim()}</strong> (e o spam) e siga o link pra criar uma senha nova.
                    </p>
                    <button
                      type="button"
                      onClick={() => setResetSent(false)}
                      className="mt-1 text-primary font-bold hover:underline"
                    >
                      Usar outro e-mail
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-right -mt-1">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm font-bold text-primary hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-hover transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-md shadow-primary/20 mt-2"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Entrar'}
              </button>
            </form>

            <div className="mt-6 flex items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-sm font-medium">OU</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
              type="button"
              className="mt-6 w-full bg-white border-2 border-slate-200 text-slate-700 py-3.5 rounded-xl font-bold text-base hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
            >
              {googleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Entrar com Google
                </>
              )}
            </button>

            <p className="mt-3 text-center text-xs text-slate-400 leading-relaxed">
              Ao entrar com o Google você aceita os{' '}
              <Link to="/terms" className="underline hover:text-slate-600">Termos de Uso</Link> e a{' '}
              <Link to="/privacy" className="underline hover:text-slate-600">Política de Privacidade</Link>.
            </p>
          </>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Celular</label>
              <div className="relative">
                <Phone className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  disabled={otpSent}
                  className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(maskPhone(e.target.value))}
                />
              </div>
            </div>

            {!otpSent ? (
              <button
                type="button"
                onClick={handleSendLoginOtp}
                disabled={sendingOtp}
                className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-hover transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-md shadow-primary/20"
              >
                {sendingOtp ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <MessageSquare className="w-5 h-5" /> Enviar código por SMS
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  Digite o código de 6 dígitos enviado para <strong>{toE164BR(phone)}</strong>.
                </p>
                <OtpInput
                  value={otpCode}
                  onChange={setOtpCode}
                  onComplete={handleConfirmLoginOtp}
                  active={otpSent}
                  disabled={confirmingOtp}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleConfirmLoginOtp(otpCode)}
                    disabled={confirmingOtp || otpCode.length < 6}
                    className="flex-1 bg-primary text-white py-3.5 rounded-xl font-bold hover:bg-primary-hover transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {confirmingOtp ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar'}
                  </button>
                  <button
                    type="button"
                    onClick={resetLoginPhone}
                    className="px-4 py-3.5 rounded-xl font-bold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    Trocar número
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleResendLoginOtp}
                  disabled={resendCooldown > 0 || sendingOtp}
                  className="w-full text-center text-sm font-bold text-primary hover:underline disabled:no-underline disabled:text-slate-400 disabled:cursor-not-allowed py-1"
                >
                  {sendingOtp
                    ? 'Reenviando…'
                    : resendCooldown > 0
                      ? `Reenviar código em ${resendCooldown}s`
                      : 'Não recebeu? Reenviar código'}
                </button>
              </div>
            )}

            <p className="text-center text-xs text-slate-400 leading-relaxed">
              O profissional entra pelo celular. Cada acesso recebe um novo código por SMS.
            </p>
          </div>
        )}

        <p className="mt-8 text-center text-slate-600 font-medium">
          Ainda não tem conta?{' '}
          <Link
            to={`/register?role=${mode === 'professional' ? 'professional' : 'client'}&redirect=${encodeURIComponent(redirectPath)}`}
            className="text-secondary font-bold hover:underline"
          >
            Cadastre-se
          </Link>
        </p>

        <div id={RECAPTCHA_ID} />
      </div>
    </div>
  );
};

export default Login;
