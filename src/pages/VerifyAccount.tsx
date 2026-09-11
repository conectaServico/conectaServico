import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  sendEmailVerification,
  reload,
  RecaptchaVerifier,
  PhoneAuthProvider,
  linkWithCredential,
  updatePhoneNumber,
} from 'firebase/auth';
import { auth } from '@/services/firebase';
import { markVerifiedFn } from '@/services/api';
import { useUserStore } from '@/store/userStore';
import { toE164BR } from '@/hooks/useVerified';
import { maskPhone } from '@/utils/masks';
import OtpInput from '@/components/OtpInput';
import { Mail, Phone, CheckCircle2, Loader2, ShieldCheck, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const RESEND_SECONDS = 30;

/**
 * Linha de status (e-mail / celular). Fica FORA do componente de página de
 * propósito: quando estava declarada dentro de `VerifyAccount`, cada tecla
 * digitada recriava o componente e o React remontava o <input>, fechando o
 * teclado do celular a cada dígito.
 */
const Row = ({
  icon,
  title,
  done,
  pendingLabel = 'Pendente',
  children,
}: {
  icon: React.ReactNode;
  title: string;
  done: boolean;
  pendingLabel?: string;
  children?: React.ReactNode;
}) => (
  <div className={`rounded-2xl border p-5 ${done ? 'border-success/30 bg-success/5' : 'border-slate-200 bg-white'}`}>
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${done ? 'bg-success text-white' : 'bg-slate-100 text-slate-500'}`}>
        {done ? <CheckCircle2 className="w-5 h-5" /> : icon}
      </div>
      <div>
        <p className="font-bold text-slate-900">{title}</p>
        <p className={`text-sm ${done ? 'text-success' : 'text-slate-500'}`}>
          {done ? 'Verificado' : pendingLabel}
        </p>
      </div>
    </div>
    {!done && children}
  </div>
);

const VerifyAccount = () => {
  const navigate = useNavigate();
  const { user, emailVerified, phoneVerified, signInProvider, setVerification } = useUserStore();

  const [checkingEmail, setCheckingEmail] = useState(false);
  const [resending, setResending] = useState(false);

  const [phone, setPhone] = useState(user?.phone || '');
  const [code, setCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [confirmingCode, setConfirmingCode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  // Contagem regressiva para liberar o "Reenviar código".
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Conta de profissional (só telefone): o SMS já foi a verificação — nada a fazer aqui.
  useEffect(() => {
    if (signInProvider === 'phone') {
      navigate('/home', { replace: true });
    }
  }, [signInProvider, navigate]);

  useEffect(() => {
    if (!auth?.currentUser) {
      navigate('/login');
      return;
    }
    // sincroniza o estado logo ao abrir a tela
    reload(auth.currentUser)
      .then(() =>
        setVerification({
          emailVerified: !!auth.currentUser?.emailVerified,
          phoneVerified: !!auth.currentUser?.phoneNumber,
        })
      )
      .catch(() => undefined);
    return () => {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Cliente só precisa do e-mail — celular é opcional (evita o conflito de
    // quando a mesma pessoa já usa esse número como login da conta de profissional).
    if (emailVerified) {
      const dest = sessionStorage.getItem('postVerifyRedirect') || '/home';
      sessionStorage.removeItem('postVerifyRedirect');
      // Marca a conta como verificada no servidor e libera o bônus de indicação (se houver).
      auth.currentUser
        ?.getIdToken(true)
        .then(() => markVerifiedFn({}))
        .catch(() => undefined);
      toast.success('Conta verificada!');
      navigate(dest);
    }
  }, [emailVerified, navigate]);

  const refreshEmailStatus = async () => {
    if (!auth.currentUser) return;
    setCheckingEmail(true);
    try {
      await reload(auth.currentUser);
      const ok = !!auth.currentUser.emailVerified;
      setVerification({ emailVerified: ok, phoneVerified: !!auth.currentUser.phoneNumber });
      toast[ok ? 'success' : 'error'](ok ? 'E-mail confirmado!' : 'Ainda não confirmado. Abra o link do e-mail.');
    } finally {
      setCheckingEmail(false);
    }
  };

  const resendEmail = async () => {
    if (!auth.currentUser) return;
    setResending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      toast.success('E-mail de verificação reenviado.');
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível reenviar agora. Tente em alguns minutos.');
    } finally {
      setResending(false);
    }
  };

  const ensureRecaptcha = () => {
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
    }
    return recaptchaRef.current;
  };

  const sendCode = async () => {
    const e164 = toE164BR(phone);
    if (e164.replace(/\D/g, '').length < 12) {
      toast.error('Informe um celular válido com DDD.');
      return;
    }
    setSendingCode(true);
    try {
      const provider = new PhoneAuthProvider(auth);
      const id = await provider.verifyPhoneNumber(e164, ensureRecaptcha());
      setVerificationId(id);
      setResendCooldown(RESEND_SECONDS);
      toast.success('Código enviado por SMS.');
    } catch (e) {
      console.error(e);
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
      toast.error('Falha ao enviar o SMS. Confira o número e tente de novo.');
    } finally {
      setSendingCode(false);
    }
  };

  // Reenvia para o mesmo número (só chega aqui com o cooldown zerado).
  const resendCode = () => {
    if (resendCooldown > 0 || sendingCode) return;
    sendCode();
  };

  const confirmCode = async () => {
    if (!auth.currentUser || !verificationId || code.trim().length < 6) return;
    setConfirmingCode(true);
    try {
      const cred = PhoneAuthProvider.credential(verificationId, code.trim());
      try {
        await linkWithCredential(auth.currentUser, cred);
      } catch (err) {
        // já existe telefone vinculado nesta conta -> atualiza
        if ((err as { code?: string })?.code === 'auth/provider-already-linked') {
          await updatePhoneNumber(auth.currentUser, cred);
        } else {
          throw err;
        }
      }
      await auth.currentUser.getIdToken(true);
      await reload(auth.currentUser);
      setVerification({
        emailVerified: !!auth.currentUser.emailVerified,
        phoneVerified: !!auth.currentUser.phoneNumber,
      });
      toast.success('Telefone verificado!');
    } catch (e) {
      const code = (e as { code?: string })?.code;
      console.error(e);
      if (code === 'auth/invalid-verification-code') toast.error('Código incorreto.');
      else if (code === 'auth/credential-already-in-use')
        toast.error('Este número já é usado em outra conta (ex.: sua conta de profissional). Como o celular é opcional, você pode pular esta etapa.');
      else toast.error('Não foi possível verificar o telefone.');
    } finally {
      setConfirmingCode(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto pt-8 pb-16 px-4">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Verifique sua conta</h1>
        <p className="text-slate-500 mt-1">
          Para publicar pedidos, enviar propostas, desbloquear contatos ou comprar diamantes,
          confirme seu e-mail. O celular é opcional.
        </p>
      </div>

      <div className="space-y-4">
        <Row icon={<Mail className="w-5 h-5" />} title={`E-mail: ${user?.email || ''}`} done={emailVerified}>
          <p className="text-sm text-slate-600 mb-3">
            Enviamos um link de confirmação. Abra o e-mail e depois toque em "Já confirmei".
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={refreshEmailStatus}
              disabled={checkingEmail}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors disabled:opacity-60"
            >
              {checkingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Já confirmei
            </button>
            <button
              onClick={resendEmail}
              disabled={resending}
              className="px-4 py-2.5 rounded-xl font-bold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-60"
            >
              {resending ? 'Enviando…' : 'Reenviar e-mail'}
            </button>
          </div>
        </Row>

        <Row icon={<Phone className="w-5 h-5" />} title="Celular (opcional)" done={phoneVerified} pendingLabel="Opcional">
          {!verificationId ? (
            <>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                className="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-primary focus:border-transparent mb-3"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
              />
              <button
                onClick={sendCode}
                disabled={sendingCode}
                className="w-full bg-primary text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {sendingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar código por SMS'}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600 mb-3">
                Digite o código de 6 dígitos enviado para <strong>{toE164BR(phone)}</strong>.
              </p>
              <OtpInput
                value={code}
                onChange={setCode}
                onComplete={confirmCode}
                active={!!verificationId}
                disabled={confirmingCode}
                className="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-primary focus:border-transparent mb-3 tracking-[0.5em] text-center font-bold text-lg"
              />
              <div className="flex gap-2">
                <button
                  onClick={confirmCode}
                  disabled={confirmingCode || code.length < 6}
                  className="flex-1 bg-primary text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {confirmingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
                </button>
                <button
                  onClick={() => {
                    setVerificationId('');
                    setCode('');
                    setResendCooldown(0);
                  }}
                  className="px-4 py-3 rounded-xl font-bold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Trocar número
                </button>
              </div>
              <button
                onClick={resendCode}
                disabled={resendCooldown > 0 || sendingCode}
                className="w-full mt-2 text-center text-sm font-bold text-primary hover:underline disabled:no-underline disabled:text-slate-400 disabled:cursor-not-allowed py-1"
              >
                {sendingCode
                  ? 'Reenviando…'
                  : resendCooldown > 0
                    ? `Reenviar código em ${resendCooldown}s`
                    : 'Não recebeu? Reenviar código'}
              </button>
            </>
          )}
        </Row>
      </div>

      <button
        onClick={() => navigate('/home')}
        className="mt-6 w-full text-center text-slate-500 font-medium hover:text-slate-700 transition-colors text-sm"
      >
        Fazer isso depois
      </button>

      <div id="recaptcha-container" />
    </div>
  );
};

export default VerifyAccount;
