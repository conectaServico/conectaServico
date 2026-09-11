import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  type ConfirmationResult,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';
import { Mail, Lock, User as UserIcon, Loader2, Phone, MapPin, Home as HomeIcon, Check, ChevronRight, ChevronLeft, Eye, EyeOff, MessageSquare } from 'lucide-react';
import { User, UserRole, TERMS_VERSION } from '@/types';
import { maskCEP, maskPhone } from '@/utils/masks';
import { buildGeoFields } from '@/utils/geo';
import { CATEGORIES_MAP } from '@/utils/categories';
import { toE164BR } from '@/hooks/useVerified';
import { sendOtp, clearRecaptcha } from '@/utils/phoneAuth';
import { markVerifiedFn } from '@/services/api';
import { useUserStore } from '@/store/userStore';
import OtpInput from '@/components/OtpInput';

const RECAPTCHA_ID = 'recaptcha-container-register';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECONDS = 30;

const AVAILABLE_SERVICES = CATEGORIES_MAP['Construção e reformas'];

const Register = () => {
  // Controle de Etapas
  const [step, setStep] = useState(1);
  // Dados do Usuário
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  // Tipo de conta: pode vir pré-selecionado pela home (/register?role=professional).
  const [role, setRole] = useState<UserRole>(
    new URLSearchParams(window.location.search).get('role') === 'professional' ? 'professional' : 'client'
  );
  
  // Endereço
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [stateUF, setStateUF] = useState('');
  
  // Dados do Profissional
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [bio, setBio] = useState('');

  // Aceite dos Termos / Política de Privacidade (LGPD)
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Controle de Estado
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [error, setError] = useState('');

  // Fluxo de telefone do profissional (sem e-mail/senha — o SMS é a identidade)
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [phoneConfirmed, setPhoneConfirmed] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [confirmingOtp, setConfirmingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  const navigate = useNavigate();
  const setUser = useUserStore((s) => s.setUser);

  // Contagem regressiva para liberar o "Reenviar código".
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Ao trocar de etapa, volta o scroll para o topo — a etapa nova começa do começo.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  // Se o profissional chegou aqui já autenticado por telefone (veio do "Entrar"),
  // retoma o cadastro direto no endereço.
  useEffect(() => {
    const cu = auth?.currentUser;
    if (cu?.phoneNumber && !cu.email) {
      setRole('professional');
      setPhone(maskPhone(cu.phoneNumber.replace(/^\+55/, '')));
      setPhoneConfirmed(true);
      setStep((s) => (s < 2 ? 2 : s));
    }
    return () => clearRecaptcha(RECAPTCHA_ID);
  }, []);

  // Get redirect param if exists
  const searchParams = new URLSearchParams(window.location.search);
  const redirectPath = searchParams.get('redirect') || '/home';
  const referredBy = (searchParams.get('ref') || '').trim().slice(0, 40);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(maskPhone(e.target.value));
  };

  const fetchCepData = async (currentCep: string) => {
    const cleanCep = currentCep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        setError('CEP não encontrado.');
        setStreet('');
        setNeighborhood('');
        setCity('');
        setStateUF('');
      } else {
        setError('');
        setStreet(data.logradouro || '');
        setNeighborhood(data.bairro || '');
        setCity(data.localidade || '');
        setStateUF(data.uf || '');
      }
    } catch (err) {
      console.error('Erro ao buscar CEP:', err);
      setError('Erro ao buscar informações do CEP.');
    } finally {
      setCepLoading(false);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskCEP(e.target.value);
    setCep(masked);
    
    if (masked.length === 9) { // 12345-678
      fetchCepData(masked);
    }
  };

  const toggleService = (service: string) => {
    setSelectedServices(prev => 
      prev.includes(service) 
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };

  // --- Fluxo de telefone do profissional -----------------------------------
  const handleSendProOtp = async () => {
    setError('');
    if (!name.trim()) {
      setError('Informe seu nome completo.');
      return;
    }
    if (email.trim() && !EMAIL_RE.test(email.trim())) {
      setError('Digite um e-mail válido ou deixe o campo em branco.');
      return;
    }
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
  const handleResendProOtp = () => {
    if (resendCooldown > 0 || sendingOtp) return;
    handleSendProOtp();
  };

  const handleConfirmProOtp = async (code: string) => {
    if (!confirmationRef.current || code.length < 6 || confirmingOtp) return;
    setConfirmingOtp(true);
    setError('');
    try {
      await confirmationRef.current.confirm(code);
      setPhoneConfirmed(true);
      setStep(2);
    } catch (err) {
      console.error('Código inválido:', err);
      setError('Código incorreto. Confira o SMS e tente de novo.');
      setOtpCode('');
    } finally {
      setConfirmingOtp(false);
    }
  };

  const resetProPhone = () => {
    confirmationRef.current = null;
    clearRecaptcha(RECAPTCHA_ID);
    setOtpSent(false);
    setOtpCode('');
    setResendCooldown(0);
    setError('');
  };

  const handleNextStep = () => {
    setError('');
    if (step === 1) {
      if (role === 'professional') {
        if (!phoneConfirmed) {
          setError('Confirme seu celular pelo código enviado por SMS.');
          return;
        }
        setStep(2);
        return;
      }
      if (!name || !email || !password || !phone) {
        setError('Preencha todos os campos pessoais.');
        return;
      }
      if (!EMAIL_RE.test(email)) {
        setError('Por favor, digite um e-mail válido.');
        return;
      }
      if (phone.length < 14) {
        setError('Por favor, digite um número de celular válido com DDD.');
        return;
      }
      if (password.length < 8 || !/[a-zA-Z]/.test(password)) {
        setError('A senha deve ter pelo menos 8 caracteres e conter pelo menos uma letra para sua segurança.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!cep || !street || !number || !neighborhood || !city) {
        setError('Preencha todos os campos de endereço.');
        return;
      }
      if (role === 'professional') {
        setStep(3);
      } else {
        handleSubmit();
      }
    }
  };

  const buildUserData = (uid: string, userEmail: string): User => ({
    id: uid,
    name,
    email: userEmail,
    role,
    phone,
    city,
    state: stateUF,
    cep,
    street,
    number,
    complement,
    neighborhood,
    verified: false,
    coinsBalance: 0, // o bônus de boas-vindas do profissional é creditado pela Cloud Function onUserCreated
    services: role === 'professional' ? selectedServices : [],
    bio: role === 'professional' ? bio : '',
    rating: 0,
    reviewCount: 0,
    termsAcceptedAt: Date.now(),
    termsVersion: TERMS_VERSION,
    created_at: Date.now(),
  });

  const submitProfessional = async () => {
    const cu = auth?.currentUser;
    if (!cu) {
      setError('Sua sessão expirou. Volte e confirme o celular novamente.');
      setStep(1);
      setPhoneConfirmed(false);
      setOtpSent(false);
      return;
    }
    const uid = cu.uid;
    const userData = buildUserData(uid, email.trim().toLowerCase());
    const geo = await buildGeoFields({ cep, uf: stateUF, city, street });
    const extra: Record<string, string> = {};
    if (referredBy && referredBy !== uid) extra.referredBy = referredBy;

    await setDoc(doc(db, 'users', uid), { ...userData, ...geo, ...extra });
    setUser({ ...userData, ...geo } as User);

    // Telefone já verificado pelo SMS — marca no servidor (libera bônus de indicação).
    cu.getIdToken(true)
      .then(() => markVerifiedFn({}))
      .catch(() => undefined);

    navigate('/home');
  };

  const submitClient = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Dispara o e-mail de verificação (a conta só libera ações sensíveis depois de confirmar).
      sendEmailVerification(userCredential.user).catch((e) =>
        console.error('Falha ao enviar e-mail de verificação:', e)
      );

      const userData = buildUserData(uid, email);
      const geo = await buildGeoFields({ cep, uf: stateUF, city, street });
      const extra: Record<string, string> = {};
      if (referredBy && referredBy !== uid) extra.referredBy = referredBy;

      await setDoc(doc(db, 'users', uid), { ...userData, ...geo, ...extra });

      // Guarda o destino para depois da verificação e leva para o hub de verificação.
      const pendingRedirect = sessionStorage.getItem('pendingRequestRedirect') || redirectPath;
      sessionStorage.setItem('postVerifyRedirect', pendingRedirect);
      sessionStorage.removeItem('pendingRequestRedirect');
      navigate('/verify');
    } catch (err: any) {
      console.error('Erro no cadastro:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso. Faça login ou use "Esqueci minha senha".');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Autenticação por e-mail/senha não está habilitada no Firebase Console.');
      } else {
        setError(`Falha no cadastro: ${err.message || 'Tente novamente.'}`);
      }
    }
  };

  const handleSubmit = async () => {
    if (role === 'professional' && selectedServices.length === 0) {
      setError('Selecione pelo menos um serviço que você presta.');
      return;
    }
    if (!acceptedTerms) {
      setError('Você precisa aceitar os Termos de Uso e a Política de Privacidade.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (role === 'professional') {
        await submitProfessional();
      } else {
        await submitClient();
      }
    } catch (err) {
      console.error('Erro no cadastro:', err);
      setError('Falha no cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-2xl border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <Link to="/">
            <img
              src="/logo.jpg"
              alt="Conecta Serviço Logo"
              className="h-16 w-auto rounded-xl mb-4 shadow-sm hover:scale-105 transition-transform"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/logo.png';
              }}
            />
          </Link>
          <h1 className="text-3xl font-extrabold text-gray-900">Crie sua conta</h1>
          <p className="text-gray-500 text-center mt-2">Preencha seus dados para encontrar os melhores profissionais ou oferecer seus serviços.</p>
        </div>

        {/* Tipo de Conta Toggle — travado depois que o cadastro começa */}
        <div className="flex p-1 bg-gray-100 rounded-xl mb-3 max-w-md mx-auto">
          <button
            type="button"
            disabled={otpSent || step > 1}
            onClick={() => setRole('client')}
            className={`flex-1 min-w-0 px-1 py-2.5 rounded-lg text-xs sm:text-sm font-bold leading-tight transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
              role === 'client'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Quero ser cliente
          </button>
          <button
            type="button"
            disabled={otpSent || step > 1}
            onClick={() => setRole('professional')}
            className={`flex-1 min-w-0 px-1 py-2.5 rounded-lg text-xs sm:text-sm font-bold leading-tight transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
              role === 'professional'
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Quero ser profissional
          </button>
        </div>
        <p className="text-center text-xs text-gray-500 mb-8">
          {role === 'client'
            ? 'Cliente entra com e-mail e senha.'
            : 'Profissional entra pelo celular — enviamos um código por SMS.'}
        </p>

        {/* Etapas Progress Bar */}
        <div className="flex items-center justify-between mb-8 max-w-sm mx-auto">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'}`}>1</div>
            <span className="text-[10px] font-bold text-slate-500 mt-1">{role === 'professional' ? 'Celular' : 'Conta'}</span>
          </div>
          <div className={`flex-1 h-1 mx-2 rounded ${step >= 2 ? 'bg-primary' : 'bg-slate-200'}`}></div>
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'}`}>2</div>
            <span className="text-[10px] font-bold text-slate-500 mt-1">Endereço</span>
          </div>
          {role === 'professional' && (
            <>
              <div className={`flex-1 h-1 mx-2 rounded ${step >= 3 ? 'bg-primary' : 'bg-slate-200'}`}></div>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 3 ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'}`}>3</div>
                <span className="text-[10px] font-bold text-slate-500 mt-1">Serviços</span>
              </div>
            </>
          )}
        </div>

        {error && (
          <div className="bg-danger/10 text-danger p-4 rounded-xl text-sm mb-6 border border-danger/20 font-medium">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-bold text-gray-800 border-b pb-2">
                {role === 'professional' ? 'Seu acesso' : 'Dados Pessoais'}
              </h3>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nome Completo</label>
                <div className="relative">
                  <UserIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    placeholder="João Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              {role === 'client' ? (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">E-mail</label>
                    <div className="relative">
                      <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        placeholder="exemplo@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Celular</label>
                      <div className="relative">
                        <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          required
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                          placeholder="(11) 99999-9999"
                          value={phone}
                          onChange={handlePhoneChange}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Senha</label>
                      <div className="relative">
                        <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          className="w-full pl-10 pr-11 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                          placeholder="Mín. 8 caracteres e 1 letra"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Celular</label>
                    <div className="relative">
                      <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        required
                        disabled={otpSent || phoneConfirmed}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="(11) 99999-9999"
                        value={phone}
                        onChange={handlePhoneChange}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Você vai entrar sempre com esse número + um código enviado por SMS.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      E-mail <span className="font-normal text-gray-400">(opcional)</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        placeholder="Para recuperar acesso e recibo de pagamento"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  {!phoneConfirmed && !otpSent && (
                    <button
                      type="button"
                      onClick={handleSendProOtp}
                      disabled={sendingOtp}
                      className="w-full bg-primary text-white py-3.5 rounded-xl font-bold hover:bg-primary-hover transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-primary/30"
                    >
                      {sendingOtp ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <MessageSquare className="w-5 h-5" /> Enviar código por SMS
                        </>
                      )}
                    </button>
                  )}

                  {!phoneConfirmed && otpSent && (
                    <div className="space-y-3 bg-primary/5 border border-primary/20 rounded-xl p-4">
                      <p className="text-sm text-gray-600">
                        Digite o código de 6 dígitos enviado para <strong>{toE164BR(phone)}</strong>.
                      </p>
                      <OtpInput
                        value={otpCode}
                        onChange={setOtpCode}
                        onComplete={handleConfirmProOtp}
                        active={otpSent}
                        disabled={confirmingOtp}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleConfirmProOtp(otpCode)}
                          disabled={confirmingOtp || otpCode.length < 6}
                          className="flex-1 bg-primary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                          {confirmingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar código'}
                        </button>
                        <button
                          type="button"
                          onClick={resetProPhone}
                          className="px-4 py-3 rounded-xl font-bold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                        >
                          Trocar número
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleResendProOtp}
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

                  {phoneConfirmed && (
                    <p className="flex items-center gap-2 text-sm font-bold text-success bg-success/5 border border-success/20 rounded-xl p-3">
                      <Check className="w-4 h-4" /> Celular confirmado
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-bold text-gray-800 border-b pb-2">Endereço</h3>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">CEP</label>
                <div className="relative">
                  <MapPin className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    placeholder="00000-000"
                    value={cep}
                    onChange={handleCepChange}
                  />
                  {cepLoading && (
                    <Loader2 className="w-5 h-5 text-primary animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-900 outline-none cursor-not-allowed opacity-90"
                    placeholder="Cidade"
                    value={city}
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">UF</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-900 outline-none cursor-not-allowed opacity-90"
                    placeholder="SP"
                    value={stateUF}
                    readOnly
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Bairro</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-900 outline-none cursor-not-allowed opacity-90"
                  placeholder="Bairro"
                  value={neighborhood}
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Rua / Logradouro</label>
                <div className="relative">
                  <HomeIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    placeholder="Sua rua"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Número</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    placeholder="123"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Complemento</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    placeholder="Apto 45 (Opcional)"
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && role === 'professional' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-bold text-gray-800 border-b pb-2">Perfil Profissional</h3>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Quais serviços você presta? (Selecione 1 ou mais)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1 -mr-1">
                  {AVAILABLE_SERVICES.map(service => {
                    const isSelected = selectedServices.includes(service);
                    return (
                      <button
                        key={service}
                        type="button"
                        onClick={() => toggleService(service)}
                        className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5 text-primary font-bold shadow-sm'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-primary/50'
                        }`}
                      >
                        <span className="text-sm">{service}</span>
                        {isSelected && <Check className="w-4 h-4" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Fale um pouco sobre sua experiência (Opcional)</label>
                <textarea
                  className="w-full p-4 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                  rows={4}
                  placeholder="Ex: Tenho 10 anos de experiência em reformas gerais. Prezo pela limpeza e pontualidade..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>
            </div>
          )}

          {(step === 3 || (step === 2 && role === 'client')) && (
            <label className="flex items-start gap-3 pt-6 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary flex-shrink-0"
              />
              <span className="text-sm text-slate-600 leading-relaxed">
                Li e aceito os{' '}
                <Link to="/terms" target="_blank" className="text-primary font-bold hover:underline">
                  Termos de Uso
                </Link>{' '}
                e a{' '}
                <Link to="/privacy" target="_blank" className="text-primary font-bold hover:underline">
                  Política de Privacidade
                </Link>
                , e autorizo o tratamento dos meus dados conforme a LGPD.
              </span>
            </label>
          )}

          {/* Na etapa 1 do profissional quem avança é o fluxo de SMS acima. */}
          {!(step === 1 && role === 'professional' && !phoneConfirmed) && (
            <div className="pt-6 flex gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="w-1/3 bg-slate-100 text-slate-700 py-4 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center"
                >
                  <ChevronLeft className="w-5 h-5 mr-1" /> Voltar
                </button>
              )}

              <button
                type="button"
                onClick={step === 3 || (step === 2 && role === 'client') ? handleSubmit : handleNextStep}
                disabled={
                  loading ||
                  (step === 2 && !city) ||
                  ((step === 3 || (step === 2 && role === 'client')) && !acceptedTerms)
                }
                className="flex-1 bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-hover transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-primary/30"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  step === 3 || (step === 2 && role === 'client') ? 'Concluir Cadastro' : <>Próximo Passo <ChevronRight className="w-5 h-5" /></>
                )}
              </button>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-gray-600 font-medium">
          Já tem uma conta?{' '}
          <Link to={`/login?redirect=${encodeURIComponent(redirectPath)}`} className="text-primary font-bold hover:underline">
            Faça login
          </Link>
        </p>

        <div id={RECAPTCHA_ID} />
      </div>
    </div>
  );
};

export default Register;