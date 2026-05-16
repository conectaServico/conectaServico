import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useUserStore } from '@/store/userStore';
import { Loader2, MapPin, AlertCircle, ChevronRight, CheckCircle2 } from 'lucide-react';
import { ServiceRequest, Urgency, MaterialOption } from '@/types';
import { maskCEP } from '@/utils/masks';

import { CATEGORIES_MAP, MAIN_CATEGORIES } from '@/utils/categories';

const PROPERTY_TYPES = ['Casa', 'Apartamento', 'Comercial', 'Condomínio'];

const NewJob = () => {
  const { user } = useUserStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const profId = searchParams.get('profId');
  const defaultCategory = searchParams.get('category');
  const defaultSubcategory = searchParams.get('subcategory');
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1
  const [category, setCategory] = useState(defaultCategory || MAIN_CATEGORIES[0]);
  const [subcategory, setSubcategory] = useState(defaultSubcategory || '');
  const [propertyType, setPropertyType] = useState('');
  const [urgency, setUrgency] = useState<Urgency>('Média (Próximas semanas)');
  const [areaSize, setAreaSize] = useState('');
  const [hasBlueprint, setHasBlueprint] = useState<boolean | null>(null);

  // Step 2
  const [description, setDescription] = useState('');
  const [materialOption, setMaterialOption] = useState<MaterialOption>('A combinar');
  const [preferredDate, setPreferredDate] = useState('');

  // Step 3
  const [cep, setCep] = useState(user?.cep || '');
  const [city, setCity] = useState(user?.city || '');
  const [stateUF, setStateUF] = useState(user?.state || '');
  const [neighborhood, setNeighborhood] = useState(user?.neighborhood || '');
  const [street, setStreet] = useState(user?.street || '');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [cepLoading, setCepLoading] = useState(false);

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

  const nextStep = () => {
    setError('');
    if (step === 1) {
      if (!subcategory) {
        setError('Por favor, selecione o serviço específico.');
        return;
      }
      if (!areaSize || Number(areaSize) <= 0) {
        setError('Por favor, informe uma estimativa válida do tamanho do espaço (m²).');
        return;
      }
      if (hasBlueprint === null) {
        setError('Por favor, informe se você possui a planta do projeto.');
        return;
      }
      if (!propertyType) {
        setError('Por favor, selecione o tipo de imóvel.');
        return;
      }
    }
    if (step === 2 && description.length < 20) {
      setError('A descrição deve ter pelo menos 20 caracteres.');
      return;
    }
    if (step === 3 && (!city || !neighborhood || !street || !number)) {
      setError('Preencha todos os dados obrigatórios do local.');
      return;
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    setError('');

    try {
      // Save to Firestore
      const requestData: Omit<ServiceRequest, 'id'> = {
        clientId: user.id,
        category,
        subcategory,
        propertyType,
        areaSize,
        hasBlueprint: hasBlueprint ?? undefined,
        preferredDate: preferredDate || undefined,
        description,
        city,
        state: stateUF,
        neighborhood,
        street,
        number,
        complement,
        cep,
        urgency,
        materialOption,
        status: profId ? 'NEGOTIATING' : 'OPEN', // Se for direto, já começa negociando
        created_at: Date.now(),
      };

      const docRef = await addDoc(collection(db, 'serviceRequests'), requestData);

      if (profId) {
        // Se for um pedido direto para um profissional, cria uma proposta automática para abrir o chat
        await addDoc(collection(db, 'proposals'), {
          requestId: docRef.id,
          professionalId: profId,
          estimatedPrice: 0,
          estimatedDays: 'A combinar',
          message: 'Solicitação de orçamento direto.',
          status: 'accepted', // accepted para liberar o chat
          created_at: Date.now(),
          updated_at: Date.now()
        });

        // Cria a primeira mensagem do chat
        await addDoc(collection(db, 'messages'), {
          chatId: `${docRef.id}_${profId}`,
          senderId: user.id,
          text: `Olá! Solicitei um orçamento direto pelo seu perfil para o serviço de ${subcategory || category}. A descrição é: "${description}". Aguardo seu retorno!`,
          created_at: Date.now(),
          read: false,
        });

        navigate(`/chats/${docRef.id}_${profId}`);
        return;
      }

      navigate('/request/success');
    } catch (err: any) {
      console.error(err);
      setError('Erro ao enviar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

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
            style={{ width: `${(step / 3) * 100}%` }}
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

        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            
            {category && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-base font-bold text-slate-800 mb-3">Qual serviço você precisa?</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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

            <div>
              <label className="block text-base font-bold text-slate-800 mb-3">Tamanho do espaço (m²)</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  className="w-full p-3.5 pr-12 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="Ex: 50"
                  value={areaSize}
                  onChange={(e) => setAreaSize(e.target.value)}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold bg-slate-50 pl-2 pointer-events-none">m²</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Estimativa do tamanho do local ou da área do serviço.</p>
            </div>

            {category === 'Reformas e Reparos' && (
              <div>
                <label className="block text-base font-bold text-slate-800 mb-2">Você possui a planta do projeto?</label>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all ${hasBlueprint === true ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    <input 
                      type="radio" 
                      name="blueprint" 
                      className="hidden"
                      checked={hasBlueprint === true}
                      onChange={() => setHasBlueprint(true)}
                    />
                    Sim
                  </label>
                  <label className={`flex-1 flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all ${hasBlueprint === false ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
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

            <div>
              <label className="block text-base font-bold text-slate-800 mb-2">Qual o tipo de imóvel?</label>
              <div className="grid grid-cols-2 gap-3">
                {PROPERTY_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPropertyType(type)}
                    className={`p-3 rounded-xl border-2 text-sm font-bold transition-all cursor-pointer ${
                      propertyType === type ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-base font-bold text-slate-800 mb-3">Qual a urgência?</label>
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
                placeholder="Ex: Preciso pintar 3 cômodos do apartamento (sala e 2 quartos). As paredes não têm infiltração, mas precisam de massa corrida em alguns pontos..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <span className={`text-xs font-medium mt-1 inline-block ${description.length < 20 ? 'text-danger' : 'text-success'}`}>
                {description.length}/20 caracteres mínimos
              </span>
            </div>

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
              <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                Resumo do Pedido
              </h4>
              <div className="space-y-2 text-sm">
                <p><span className="text-slate-500">Categoria:</span> <strong className="text-slate-800">{category} &gt; {subcategory}</strong></p>
                <p><span className="text-slate-500">Local:</span> <strong className="text-slate-800">{neighborhood}, {city}</strong></p>
                <p><span className="text-slate-500">Urgência:</span> <strong className="text-slate-800">{urgency}</strong></p>
                <p><span className="text-slate-500">Material:</span> <strong className="text-slate-800">{materialOption}</strong></p>
                {areaSize && <p><span className="text-slate-500">Tamanho:</span> <strong className="text-slate-800">{areaSize} m²</strong></p>}
                {preferredDate && <p><span className="text-slate-500">Data Desejada:</span> <strong className="text-slate-800">{new Date(preferredDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</strong></p>}
              </div>
            </div>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex gap-4 pt-8 mt-8 border-t border-slate-100">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="px-6 py-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center"
              disabled={loading}
            >
              Voltar
            </button>
          )}
          
          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex-1 bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-hover transition-all flex items-center justify-center shadow-md shadow-primary/20"
            >
              Próximo Passo
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-success text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-md shadow-success/20"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Enviar Pedido'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewJob;