import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, addDoc, doc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { RecaptchaVerifier, PhoneAuthProvider } from 'firebase/auth';
import { auth, db } from '@/services/firebase';
import { confirmClientPhoneFn, callableErrorMessage } from '@/services/api';
import { buildGeoFields } from '@/utils/geo';
import { buildSearchTokens } from '@/utils/search';
import { uploadImages } from '@/utils/images';
import { useUserStore } from '@/store/userStore';
import { useVerified, toE164BR } from '@/hooks/useVerified';
import { Loader2, MapPin, AlertCircle, ChevronRight, CheckCircle2, ImagePlus, X, Phone } from 'lucide-react';
import { ServiceRequest, Urgency, MaterialOption } from '@/types';
import { maskCEP, maskPhone } from '@/utils/masks';
import OtpInput from '@/components/OtpInput';

import { CATEGORIES_MAP, MAIN_CATEGORIES, serviceTypeOptions, descriptionPlaceholder, WEEKDAYS, DAY_PERIODS } from '@/utils/categories';

const PROPERTY_TYPES = ['Casa', 'Apartamento', 'Comercial', 'Condomínio'];

// Cada tela do Passo 1 mostra UMA pergunta por vez (igual ao fluxo do GetNinjas):
// o cliente escolhe a opção e só então avança, em vez de rolar um formulário
// inteiro com tudo junto.
type Step1Screen = 'category' | 'subcategory' | 'serviceType' | 'areaSize' | 'blueprint' | 'propertyType' | 'availableDays' | 'availablePeriods' | 'urgency';

const NewJob = () => {
  const { user, setUser } = useUserStore();
  const { verified } = useVerified();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultCategory = searchParams.get('category');
  const defaultSubcategory = searchParams.get('subcategory');

  const [step, setStep] = useState(1);
  const [microIndex, setMicroIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1
  const [category, setCategory] = useState(defaultCategory || MAIN_CATEGORIES[0]);
  const [subcategory, setSubcategory] = useState(defaultSubcategory || '');

  // Reset category if accessed directly without category in URL
  useEffect(() => {
    if (!defaultCategory) {
      setCategory('');
    }
  }, [defaultCategory]);

  // Ao trocar de etapa/pergunta, volta o scroll para o topo do formulário.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step, microIndex]);
  const [propertyType, setPropertyType] = useState('');
  const [urgency, setUrgency] = useState<Urgency>('Média (Próximas semanas)');
  const [areaSize, setAreaSize] = useState('');
  const [hasBlueprint, setHasBlueprint] = useState<boolean | null>(null);
  const [serviceType, setServiceType] = useState('');
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);

  // Toda vez que troca de serviço, o "tipo de serviço" do serviço anterior
  // não faz mais sentido (as opções são outras).
  useEffect(() => {
    setServiceType('');
  }, [subcategory]);

  const toggleInList = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  // Step 2
  const [description, setDescription] = useState('');
  const [materialOption, setMaterialOption] = useState<MaterialOption>('A combinar');
  const [preferredDate, setPreferredDate] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const MAX_PHOTOS = 6;

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const picked = Array.from(files).filter((f) => f.type.startsWith('image/'));
    setPhotos((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS));
  };
  const removePhoto = (idx: number) => setPhotos((prev) => prev.filter((_, i) => i !== idx));

  // Step 3
  const [cep, setCep] = useState(user?.cep || '');
  const [city, setCity] = useState(user?.city || '');
  const [stateUF, setStateUF] = useState(user?.state || '');
  const [neighborhood, setNeighborhood] = useState(user?.neighborhood || '');
  const [street, setStreet] = useState(user?.street || '');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [cepLoading, setCepLoading] = useState(false);

  // Confirmação de celular por SMS — obrigatória antes de publicar, pra garantir
  // que o profissional consiga contatar o cliente pelo número certo.
  const [phone, setPhone] = useState(user?.phone || '');
  const [phoneConfirmed, setPhoneConfirmed] = useState(!!user?.phoneConfirmed);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [confirmingOtp, setConfirmingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const verificationIdRef = useRef('');
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  useEffect(() => {
    return () => {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    };
  }, []);

  const ensureRecaptcha = () => {
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, 'newjob-recaptcha-container', { size: 'invisible' });
    }
    return recaptchaRef.current;
  };

  const sendPhoneCode = async () => {
    const e164 = toE164BR(phone);
    if (e164.replace(/\D/g, '').length < 12) {
      setError('Informe um celular válido com DDD.');
      return;
    }
    setError('');
    setSendingOtp(true);
    try {
      const provider = new PhoneAuthProvider(auth);
      const id = await provider.verifyPhoneNumber(e164, ensureRecaptcha());
      verificationIdRef.current = id;
      setOtpSent(true);
      setOtpCode('');
      setResendCooldown(30);
    } catch (err) {
      console.error('Falha ao enviar SMS:', err);
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
      setError('Não foi possível enviar o SMS. Confira o número e tente de novo.');
    } finally {
      setSendingOtp(false);
    }
  };

  const resendPhoneCode = () => {
    if (resendCooldown > 0 || sendingOtp) return;
    sendPhoneCode();
  };

  const confirmPhoneCode = async (code: string) => {
    if (!verificationIdRef.current || code.length < 6 || confirmingOtp) return;
    setConfirmingOtp(true);
    setError('');
    try {
      await confirmClientPhoneFn({ verificationId: verificationIdRef.current, code: code.trim() });
      if (user && phone !== user.phone) {
        await updateDoc(doc(db, 'users', user.id), { phone });
      }
      setPhoneConfirmed(true);
      if (user) setUser({ ...user, phone, phoneConfirmed: true, phoneConfirmedAt: Date.now() });
    } catch (err) {
      console.error(err);
      setError(callableErrorMessage(err, 'Código incorreto. Confira o SMS e tente de novo.'));
      setOtpCode('');
    } finally {
      setConfirmingOtp(false);
    }
  };

  const fetchCepData = async (currentCep: string) => {
    const cleanCep = currentCep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
        if (!data.erro) {
          setNeighborhood(data.bairro || '');
          setCity(data.localidade || '');
          setStateUF(data.uf || '');
          setStreet(data.logradouro || '');
        }
    } catch (err) {
      console.error(err);
    } finally {
      setCepLoading(false);
    }
  };

  const needsAreaSize = ['Reformas e Reparos', 'Serviços domésticos'].includes(category);
  const needsPropertyType = ['Reformas e Reparos', 'Serviços domésticos'].includes(category);
  const needsBlueprint = category === 'Reformas e Reparos';
  // Só faz sentido perguntar quem fornece material (tinta, cano, cimento...) em
  // serviços físicos de obra — não em Design e Tecnologia, Assistência técnica etc.
  const needsMaterials = category === 'Reformas e Reparos';
  // Serviços que dependem de agenda (diarista, marido de aluguel, frete...)
  // perguntam quando o cliente pode receber o profissional.
  const needsAvailability = ['Reformas e Reparos', 'Serviços domésticos', 'Serviços Gerais'].includes(category);

  // Se o cliente já veio com um serviço específico escolhido (ex.: clicou
  // numa subcategoria na Home ou na página da categoria), a tela de "qual
  // serviço você precisa" já foi respondida — pula direto pra próxima
  // pergunta em vez de pedir de novo.
  const hasValidDefaultSubcategory = !!defaultSubcategory && !!CATEGORIES_MAP[category]?.includes(defaultSubcategory);

  // Lista ordenada das telas do Passo 1, uma pergunta por tela — GetNinjas mostra
  // exatamente uma decisão por página em vez de um formulário longo.
  const step1Screens = useMemo<Step1Screen[]>(() => {
    const screens: Step1Screen[] = [];
    if (!defaultCategory) screens.push('category');
    if (!hasValidDefaultSubcategory) screens.push('subcategory');
    screens.push('serviceType');
    if (needsAreaSize) screens.push('areaSize');
    if (needsBlueprint) screens.push('blueprint');
    if (needsPropertyType) screens.push('propertyType');
    if (needsAvailability) screens.push('availableDays');
    if (needsAvailability) screens.push('availablePeriods');
    screens.push('urgency');
    return screens;
  }, [defaultCategory, hasValidDefaultSubcategory, needsAreaSize, needsBlueprint, needsPropertyType, needsAvailability]);

  const currentScreen = step1Screens[Math.min(microIndex, step1Screens.length - 1)];

  const handleNextMicro = () => {
    setError('');
    if (currentScreen === 'category' && !category) {
      setError('Por favor, selecione a categoria do serviço.');
      return;
    }
    if (currentScreen === 'subcategory' && !subcategory) {
      setError('Por favor, selecione o serviço específico.');
      return;
    }
    if (currentScreen === 'serviceType' && !serviceType) {
      setError('Por favor, selecione o tipo de serviço.');
      return;
    }
    if (currentScreen === 'areaSize' && (!areaSize || Number(areaSize) <= 0)) {
      setError('Por favor, informe uma estimativa válida do tamanho do espaço (m²).');
      return;
    }
    if (currentScreen === 'blueprint' && hasBlueprint === null) {
      setError('Por favor, informe se você possui a planta do projeto.');
      return;
    }
    if (currentScreen === 'propertyType' && !propertyType) {
      setError('Por favor, selecione o tipo de imóvel.');
      return;
    }
    if (currentScreen === 'availableDays' && availableDays.length === 0) {
      setError('Por favor, selecione ao menos um dia disponível.');
      return;
    }
    if (currentScreen === 'availablePeriods' && availablePeriods.length === 0) {
      setError('Por favor, selecione ao menos um período disponível.');
      return;
    }

    if (microIndex + 1 < step1Screens.length) {
      setMicroIndex((i) => i + 1);
    } else {
      setStep(2);
    }
  };

  const handleNext = () => {
    setError('');
    if (step === 1) {
      handleNextMicro();
      return;
    }
    if (step === 2 && description.length < 20) {
      setError('A descrição deve ter pelo menos 20 caracteres.');
      return;
    }
    if (step === 2) {
      setStep(3);
      return;
    }
  };

  const handleBack = () => {
    setError('');
    if (step === 1) {
      if (microIndex > 0) setMicroIndex((i) => i - 1);
      return;
    }
    if (step === 2) {
      setStep(1);
      setMicroIndex(step1Screens.length - 1);
      return;
    }
    if (step === 3) {
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!verified) {
      setError('Confirme seu e-mail para publicar um pedido.');
      navigate('/verify');
      return;
    }
    if (!phoneConfirmed) {
      setError('Confirme seu celular por SMS antes de publicar o pedido.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // Evita pedido duplicado: já tem um em aberto/negociação para o mesmo serviço?
      const dupSnap = await getDocs(
        query(
          collection(db, 'serviceRequests'),
          where('clientId', '==', user.id),
          where('status', 'in', ['OPEN', 'NEGOTIATING'])
        )
      );
      const dup = dupSnap.docs.find((d) => {
        const r = d.data();
        return r.category === category && (r.subcategory || '') === (subcategory || '');
      });
      if (dup) {
        setLoading(false);
        setError('Você já tem um pedido aberto para esse serviço. Acompanhe ou cancele o atual antes de criar outro.');
        return;
      }

      // Localização normalizada (uf/cityKey/lat/lng/geohash) para a busca por raio
      // do profissional. Nunca bloqueia o envio: se o geocode falhar, volta {}.
      const geo = await buildGeoFields({ cep, uf: stateUF, city, street });

      // Save to Firestore
      const requestData: Omit<ServiceRequest, 'id'> = {
        clientId: user.id,
        clientName: user.name,
        clientRating: user.clientRating || 0,
        clientReviewCount: user.clientReviewCount || 0,
        category,
        subcategory,
        propertyType,
        areaSize,
        hasBlueprint: hasBlueprint ?? undefined,
        serviceType: serviceType || undefined,
        availableDays: needsAvailability ? availableDays : undefined,
        availablePeriods: needsAvailability ? availablePeriods : undefined,
        preferredDate: preferredDate || undefined,
        description,
        searchTokens: buildSearchTokens([category, subcategory, description, city, neighborhood]),
        city,
        state: stateUF,
        neighborhood,
        street,
        number,
        complement,
        cep,
        urgency,
        materialOption,
        status: 'OPEN',
        created_at: Date.now(),
        ...geo,
      };

      const docRef = await addDoc(collection(db, 'serviceRequests'), requestData);

      // Fotos: sobem depois do create (precisam do id) e não bloqueiam o pedido.
      if (photos.length) {
        try {
          const urls = await uploadImages(photos, `requestPhotos/${user.id}/${docRef.id}`);
          if (urls.length) await updateDoc(doc(db, 'serviceRequests', docRef.id), { photos: urls });
        } catch (upErr) {
          console.error('Falha ao subir fotos do pedido:', upErr);
        }
      }

      navigate('/request/success');
    } catch (err) {
      console.error(err);
      setError(callableErrorMessage(err, 'Erro ao enviar pedido. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  const showBack = step > 1 || (step === 1 && microIndex > 0);
  // Barra de progresso geral: 3 macro-etapas (Serviço / Detalhes / Local), com o
  // avanço dentro do Passo 1 proporcional a cada pergunta respondida.
  const overallPercent = step === 1
    ? ((microIndex + 1) / step1Screens.length) * (100 / 3)
    : step === 2
      ? 100 / 3 + 100 / 6
      : 100;

  return (
    <div className="max-w-2xl mx-auto pb-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Descreva o que precisa</h1>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <span className={step >= 1 ? 'text-primary' : ''}>Serviço</span>
          <ChevronRight className="w-4 h-4" />
          <span className={step >= 2 ? 'text-primary' : ''}>Detalhes</span>
          <ChevronRight className="w-4 h-4" />
          <span className={step >= 3 ? 'text-primary' : ''}>Local e Confirmação</span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-200 h-2 rounded-full mt-4 overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-500 ease-in-out"
            style={{ width: `${overallPercent}%` }}
          />
        </div>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200">
        {error && (
          <div className="bg-danger/10 text-danger p-4 rounded-xl text-sm flex items-center gap-2 mb-6 font-medium">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* STEP 1 — uma pergunta por página */}
        {step === 1 && (
          <div key={microIndex} className="animate-in fade-in slide-in-from-right-4 duration-300">
            <p className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wide">
              Pergunta {microIndex + 1} de {step1Screens.length}
            </p>

            {currentScreen === 'category' && (
              <div>
                <label className="block text-xl font-bold text-slate-800 mb-4">Qual a categoria do serviço?</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {MAIN_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`p-4 rounded-xl border-2 text-sm font-bold transition-all cursor-pointer text-left ${
                        category === cat
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentScreen === 'subcategory' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-xl font-bold text-slate-800">
                    {!defaultCategory ? `Qual serviço de ${category} você precisa?` : 'Qual serviço você precisa?'}
                  </label>
                  {!defaultCategory && (
                    <button
                      type="button"
                      onClick={() => {
                        setCategory('');
                        setSubcategory('');
                        setMicroIndex(0);
                      }}
                      className="text-xs font-bold text-primary hover:underline whitespace-nowrap ml-2"
                    >
                      Trocar categoria
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[28rem] overflow-y-auto pr-1 -mr-1">
                  {CATEGORIES_MAP[category]?.map(sub => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setSubcategory(sub)}
                      className={`p-3 rounded-xl border-2 text-sm font-bold transition-all cursor-pointer flex items-center justify-center text-center min-h-[64px] ${
                        subcategory === sub
                          ? 'border-primary bg-primary text-white shadow-md scale-[1.02]'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-primary/50 hover:bg-slate-50'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentScreen === 'serviceType' && (
              <div>
                <label className="block text-xl font-bold text-slate-800 mb-4">Qual tipo de serviço você procura?</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {serviceTypeOptions(subcategory).map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setServiceType(opt)}
                      className={`p-3 rounded-xl border-2 text-sm font-bold transition-all cursor-pointer text-center min-h-[56px] flex items-center justify-center ${
                        serviceType === opt
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentScreen === 'areaSize' && (
              <div>
                <label className="block text-xl font-bold text-slate-800 mb-4">Qual o tamanho do espaço?</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    autoFocus
                    className="w-full p-3.5 pr-12 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="Ex: 50"
                    value={areaSize}
                    onChange={(e) => setAreaSize(e.target.value)}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold bg-slate-50 pl-2 pointer-events-none">m²</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">Estimativa do tamanho do local ou da área do serviço, em metros quadrados (m²).</p>
              </div>
            )}

            {currentScreen === 'blueprint' && (
              <div>
                <label className="block text-xl font-bold text-slate-800 mb-4">Você possui a planta do projeto?</label>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${hasBlueprint === true ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    <input
                      type="radio"
                      name="blueprint"
                      className="hidden"
                      checked={hasBlueprint === true}
                      onChange={() => setHasBlueprint(true)}
                    />
                    Sim
                  </label>
                  <label className={`flex-1 flex items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all ${hasBlueprint === false ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    <input
                      type="radio"
                      name="blueprint"
                      className="hidden"
                      checked={hasBlueprint === false}
                      onChange={() => setHasBlueprint(false)}
                    />
                    Não
                  </label>
                </div>
              </div>
            )}

            {currentScreen === 'propertyType' && (
              <div>
                <label className="block text-xl font-bold text-slate-800 mb-4">Qual o tipo de imóvel?</label>
                <div className="grid grid-cols-2 gap-3">
                  {PROPERTY_TYPES.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPropertyType(type)}
                      className={`p-4 rounded-xl border-2 text-sm font-bold transition-all cursor-pointer ${
                        propertyType === type ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentScreen === 'availableDays' && (
              <div>
                <label className="block text-xl font-bold text-slate-800 mb-4">Quando você pode receber o profissional?</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {WEEKDAYS.map(day => (
                    <label key={day} className={`flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer transition-all text-sm font-bold ${availableDays.includes(day) ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={availableDays.includes(day)}
                        onChange={() => toggleInList(availableDays, setAvailableDays, day)}
                      />
                      {day}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-3">Selecione um ou mais dias.</p>
              </div>
            )}

            {currentScreen === 'availablePeriods' && (
              <div>
                <label className="block text-xl font-bold text-slate-800 mb-4">Marque os horários que você pode receber o profissional</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {DAY_PERIODS.map(period => (
                    <label key={period} className={`flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer transition-all text-sm font-bold ${availablePeriods.includes(period) ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={availablePeriods.includes(period)}
                        onChange={() => toggleInList(availablePeriods, setAvailablePeriods, period)}
                      />
                      {period}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-3">Selecione um ou mais períodos.</p>
              </div>
            )}

            {currentScreen === 'urgency' && (
              <div>
                <label className="block text-xl font-bold text-slate-800 mb-4">Qual a urgência?</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['Baixa (Pode esperar)', 'Média (Próximas semanas)', 'Alta (O quanto antes)', 'Emergência (Imediato)'] as const).map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setUrgency(opt as Urgency)}
                      className={`p-3.5 rounded-xl border-2 text-sm font-bold transition-all cursor-pointer text-left ${
                        urgency === opt
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label className="block text-base font-bold text-slate-800 mb-2">Descreva o que precisa ser feito</label>
              <p className="text-sm text-slate-500 mb-3">Seja o mais detalhista possível. Informe medidas, problemas exatos e o que você espera do resultado final.</p>
              <textarea
                rows={6}
                className="w-full p-4 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder={descriptionPlaceholder(category)}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <span className={`text-xs font-medium mt-1 inline-block ${description.length < 20 ? 'text-danger' : 'text-success'}`}>
                {description.length}/20 caracteres mínimos
              </span>
            </div>

            {needsMaterials && (
              <div>
                <label className="block text-base font-bold text-slate-800 mb-2">Sobre os materiais (tintas, canos, cimento, etc)</label>
                <div className="space-y-3">
                  {(['O profissional fornece', 'Eu fornecerei', 'A combinar'] as const).map(opt => (
                    <label key={opt} className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${materialOption === opt ? 'border-primary bg-primary/5' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <input
                        type="radio"
                        name="material"
                        value={opt}
                        checked={materialOption === opt}
                        onChange={(e) => setMaterialOption(e.target.value as MaterialOption)}
                        className="w-5 h-5 text-primary border-slate-300 focus:ring-primary"
                      />
                      <span className={`ml-3 font-medium ${materialOption === opt ? 'text-primary' : 'text-slate-700'}`}>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-base font-bold text-slate-800 mb-2">Para quando você precisa do serviço?</label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-3.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all cursor-pointer"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">Isso ajuda o profissional a se programar (Opcional).</p>
            </div>

            <div>
              <label className="block text-base font-bold text-slate-800 mb-2">
                Fotos do local ou do problema <span className="font-medium text-slate-500">(opcional)</span>
              </label>
              <p className="text-sm text-slate-500 mb-3">
                Profissionais com fotos entendem melhor o serviço e mandam orçamentos mais precisos. Até {MAX_PHOTOS}.
              </p>
              <div className="flex flex-wrap gap-3">
                {photos.map((file, idx) => (
                  <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 group">
                    <img src={URL.createObjectURL(file)} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
                      aria-label="Remover foto"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <label className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-primary hover:text-primary transition-colors cursor-pointer">
                    <ImagePlus className="w-6 h-6" />
                    <span className="text-[11px] font-bold">Adicionar</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        addPhotos(e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label className="block text-base font-bold text-slate-800 mb-2">CEP do local do serviço</label>
              <div className="relative">
                <MapPin className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  className="w-full pl-11 pr-4 py-3.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="00000-000"
                  value={cep}
                  onChange={(e) => {
                    const val = maskCEP(e.target.value);
                    setCep(val);
                    if(val.length === 9) fetchCepData(val);
                  }}
                />
                {cepLoading && <Loader2 className="w-5 h-5 text-primary animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Cidade</label>
                    <input
                      type="text"
                      className="w-full p-3 border border-slate-300 rounded-xl bg-slate-100 text-slate-900 outline-none"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Cidade"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">UF</label>
                    <input
                      type="text"
                      maxLength={2}
                      className="w-full p-3 border border-slate-300 rounded-xl bg-slate-100 text-slate-900 outline-none uppercase"
                      value={stateUF}
                      onChange={(e) => setStateUF(e.target.value.toUpperCase())}
                      placeholder="SP"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Bairro</label>
                  <input
                    type="text"
                    className="w-full p-3 border border-slate-300 rounded-xl bg-slate-100 text-slate-900 outline-none"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Bairro"
                  />
                </div>
              </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Rua / Logradouro</label>
              <input
                type="text"
                className="w-full p-3 border border-slate-300 rounded-xl bg-slate-100 text-slate-900 outline-none"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Rua, Avenida, etc."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Número</label>
                <input
                  type="text"
                  className="w-full p-3 border border-slate-300 rounded-xl bg-slate-100 text-slate-900 outline-none"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="123"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Complemento</label>
                <input
                  type="text"
                  className="w-full p-3 border border-slate-300 rounded-xl bg-slate-100 text-slate-900 outline-none"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  placeholder="Apto 45 (Opcional)"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mt-8">
              <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" />
                Confirme seu celular
              </h4>
              <p className="text-sm text-slate-500 mb-4">
                É o número que o profissional vai usar pra falar com você. Confirme por SMS antes de publicar.
              </p>

              {phoneConfirmed ? (
                <div className="flex items-center gap-2 text-success font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" /> Celular confirmado: {phone}
                </div>
              ) : !otpSent ? (
                <>
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-900 outline-none focus:ring-2 focus:ring-primary focus:border-transparent mb-3"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(maskPhone(e.target.value))}
                  />
                  <button
                    type="button"
                    onClick={sendPhoneCode}
                    disabled={sendingOtp}
                    className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {sendingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar código por SMS'}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-600 mb-3">
                    Digite o código de 6 dígitos enviado para <strong>{toE164BR(phone)}</strong>.
                  </p>
                  <OtpInput
                    value={otpCode}
                    onChange={setOtpCode}
                    onComplete={confirmPhoneCode}
                    active={otpSent}
                    disabled={confirmingOtp}
                    className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-900 outline-none focus:ring-2 focus:ring-primary focus:border-transparent mb-3 tracking-[0.5em] text-center font-bold text-lg"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => confirmPhoneCode(otpCode)}
                      disabled={confirmingOtp || otpCode.length < 6}
                      className="flex-1 bg-primary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary-hover transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {confirmingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setOtpSent(false); setOtpCode(''); setResendCooldown(0); }}
                      className="px-4 py-3 rounded-xl font-bold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      Trocar número
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={resendPhoneCode}
                    disabled={resendCooldown > 0 || sendingOtp}
                    className="w-full mt-2 text-center text-sm font-bold text-primary hover:underline disabled:no-underline disabled:text-slate-400 disabled:cursor-not-allowed py-1"
                  >
                    {sendingOtp
                      ? 'Reenviando…'
                      : resendCooldown > 0
                        ? `Reenviar código em ${resendCooldown}s`
                        : 'Não recebeu? Reenviar código'}
                  </button>
                </>
              )}
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mt-8">
              <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                Resumo do Pedido
              </h4>
              <div className="space-y-2 text-sm">
                <p><span className="text-slate-500">Categoria:</span> <strong className="text-slate-800">{category} &gt; {subcategory}</strong></p>
                {serviceType && <p><span className="text-slate-500">Tipo de serviço:</span> <strong className="text-slate-800">{serviceType}</strong></p>}
                <p><span className="text-slate-500">Local:</span> <strong className="text-slate-800">{neighborhood}, {city}</strong></p>
                <p><span className="text-slate-500">Urgência:</span> <strong className="text-slate-800">{urgency}</strong></p>
                {needsMaterials && <p><span className="text-slate-500">Material:</span> <strong className="text-slate-800">{materialOption}</strong></p>}
                {areaSize && <p><span className="text-slate-500">Tamanho:</span> <strong className="text-slate-800">{areaSize} m²</strong></p>}
                {needsAvailability && availableDays.length > 0 && (
                  <p><span className="text-slate-500">Dias disponíveis:</span> <strong className="text-slate-800">{availableDays.join(', ')}</strong></p>
                )}
                {needsAvailability && availablePeriods.length > 0 && (
                  <p><span className="text-slate-500">Horários:</span> <strong className="text-slate-800">{availablePeriods.join(', ')}</strong></p>
                )}
                {preferredDate && <p><span className="text-slate-500">Data Desejada:</span> <strong className="text-slate-800">{new Date(preferredDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</strong></p>}
              </div>
            </div>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex gap-4 pt-8 mt-8 border-t border-slate-100">
          {showBack && (
            <button
              type="button"
              onClick={handleBack}
              className="px-6 py-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center"
              disabled={loading}
            >
              Voltar
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-hover transition-all flex items-center justify-center shadow-md shadow-primary/20"
            >
              Avançar
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !phoneConfirmed}
              title={!phoneConfirmed ? 'Confirme seu celular por SMS antes de publicar' : undefined}
              className="flex-1 bg-success text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-md shadow-success/20"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Enviar Pedido'}
            </button>
          )}
        </div>
      </div>
      <div id="newjob-recaptcha-container" />
    </div>
  );
};

export default NewJob;
