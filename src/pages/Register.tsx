import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';
import { useUserStore } from '@/store/userStore';
import { Briefcase, Mail, Lock, User as UserIcon, Loader2, Phone, MapPin, Home as HomeIcon, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { User, UserRole } from '@/types';
import { maskCEP, maskPhone } from '@/utils/masks';
import { CATEGORIES_MAP } from '@/utils/categories';

const AVAILABLE_SERVICES = CATEGORIES_MAP['Construção e reformas'];

const Register = () => {
  // Controle de Etapas
  const [step, setStep] = useState(1);
  // Dados do Usuário
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('client');
  
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
  
  // Controle de Estado
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const setUser = useUserStore((state) => state.setUser);

  // Get redirect param if exists
  const searchParams = new URLSearchParams(window.location.search);
  const redirectPath = searchParams.get('redirect') || '/home';

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

  const handleNextStep = () => {
    setError('');
    if (step === 1) {
      if (!name || !email || !password || !phone) {
        setError('Preencha todos os campos pessoais.');
        return;
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
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

  const handleSubmit = async () => {
    if (role === 'professional' && selectedServices.length === 0) {
      setError('Selecione pelo menos um serviço que você presta.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      
      const userData: User = {
        id: uid,
        name,
        email,
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
        coinsBalance: role === 'professional' ? 100 : 0, // Bonus de 100 diamantes iniciais
        services: role === 'professional' ? selectedServices : [],
        bio: role === 'professional' ? bio : '',
        rating: 0,
        reviewCount: 0,
        created_at: Date.now(),
      };

      await setDoc(doc(db, 'users', uid), userData);
      
      // Cria transação inicial se for profissional
      if (role === 'professional') {
        await setDoc(doc(collection(db, 'transactions')), {
          userId: uid,
          amount: 100,
          type: 'BONUS_SIGNUP',
          description: 'Bônus de boas-vindas',
          created_at: Date.now()
        });
      }

      // Verifica se há um redirect escondido no Session Storage
      const pendingRedirect = sessionStorage.getItem('pendingRequestRedirect');
      if (pendingRedirect) {
        sessionStorage.removeItem('pendingRequestRedirect');
        navigate(pendingRedirect);
      } else {
        navigate(redirectPath);
      }
    } catch (err: any) {
      console.error("Erro no cadastro:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Autenticação por e-mail/senha não está habilitada no Firebase Console.');
      } else {
        setError(`Falha no cadastro: ${err.message || 'Tente novamente.'}`);
      }
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

        {/* Tipo de Conta Toggle */}
        <div className="flex p-1 bg-gray-100 rounded-xl mb-8 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setRole('client')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              role === 'client' 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Quero contratar
          </button>
          <button
            type="button"
            onClick={() => setRole('professional')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              role === 'professional' 
                ? 'bg-primary text-white shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Quero trabalhar
          </button>
        </div>

        {/* Etapas Progress Bar */}
        <div className="flex items-center justify-between mb-8 max-w-sm mx-auto">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'}`}>1</div>
            <span className="text-[10px] font-bold text-slate-500 mt-1">Conta</span>
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
              <h3 className="text-xl font-bold text-gray-800 border-b pb-2">Dados Pessoais</h3>
              
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
                      type="password"
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      placeholder="Mín. 8 caracteres e 1 letra"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              disabled={loading || (step === 2 && !city)}
              className="flex-1 bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-hover transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-primary/30"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                step === 3 || (step === 2 && role === 'client') ? 'Concluir Cadastro' : <>Próximo Passo <ChevronRight className="w-5 h-5" /></>
              )}
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-gray-600 font-medium">
          Já tem uma conta?{' '}
          <Link to={`/login?redirect=${encodeURIComponent(redirectPath)}`} className="text-primary font-bold hover:underline">
            Faça login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;