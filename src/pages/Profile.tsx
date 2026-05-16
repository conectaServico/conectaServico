import { useEffect, useMemo, useState, useRef } from 'react';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/services/firebase';
import { useUserStore } from '@/store/userStore';
import { Loader2, Camera, ShieldCheck, AlertCircle, CheckCircle2, User as UserIcon, Trash2, Upload, Image as ImageIcon, Briefcase, FileText, BookOpen, Users, HelpCircle, FileSignature, LogOut, Link as LinkIcon, MapPin, Star, ChevronRight, ChevronLeft, ListOrdered } from 'lucide-react';
import { maskPhone, maskCEP } from '@/utils/masks';
import { Review } from '@/types';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const Profile = () => {
  const { user, setUser } = useUserStore();
  const [view, setView] = useState<'menu' | 'edit'>('menu');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState(user?.photo_url || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [cep, setCep] = useState(user?.cep || '');
  const [city, setCity] = useState(user?.city || '');
  const [stateUF, setStateUF] = useState(user?.state || '');
  const [neighborhood, setNeighborhood] = useState(user?.neighborhood || '');
  const [radiusKm, setRadiusKm] = useState(user?.radiusKm ? user.radiusKm.toString() : '10');

  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const ratingSummary = useMemo(() => {
    if (!reviews.length) return { count: 0, avg: 0 };
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    return { count: reviews.length, avg: sum / reviews.length };
  }, [reviews]);

  useEffect(() => {
    if (!user?.id || user.role !== 'professional') return;
    const fetchReviews = async () => {
      setReviewsLoading(true);
      try {
        const q = query(collection(db, 'reviews'), where('professionalId', '==', user.id));
        const snap = await getDocs(q);
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Review))
          .sort((a, b) => b.created_at - a.created_at);
        setReviews(data);
      } catch (err) {
        console.error(err);
        setReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    };
    fetchReviews();
  }, [user?.id, user?.role]);

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
        }
    } catch (err) {
      console.error(err);
    } finally {
      setCepLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleRemovePhoto = () => {
    setPhoto(null);
    setPreview('');
    setShowPhotoMenu(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      let photoUrl = user.photo_url;
      
      // Se a imagem anterior existia (photoUrl), mas o usuário removeu (preview === '')
      if (photoUrl && preview === '') {
        photoUrl = '';
      }
      
      if (photo) {
        try {
          const storageRef = ref(storage, `users/${user.id}/profile-${Date.now()}`);
          const snapshot = await uploadBytes(storageRef, photo);
          photoUrl = await getDownloadURL(snapshot.ref);
        } catch (e) {
          console.error("Erro específico no upload da foto do perfil (Storage):", e);
          toast.error("Ocorreu um erro ao salvar a imagem. Verifique as configurações de segurança do Storage.");
          setLoading(false);
          return;
        }
      }

      const updates: any = {
        photo_url: photoUrl,
        phone,
        cep,
        city,
        state: stateUF,
        neighborhood
      };

      if (user.role === 'professional') {
        updates.radiusKm = Number(radiusKm) || 10;
        // Não apagar os serviços (array) já existentes no banco
        if (user.services) {
          updates.services = user.services;
        }
      }

      await updateDoc(doc(db, 'users', user.id), updates);
      
      setUser({ ...user, ...updates });
      setSuccess(true);
      toast.success('Perfil atualizado com sucesso!');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao atualizar perfil. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-12 pt-8 px-4">
      {view === 'menu' && (
        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
          {/* Menu Header for Professionals */}
          {user?.role === 'professional' && (
            <div className="bg-yellow-400 -mx-4 -mt-8 mb-6 px-4 py-6 rounded-b-3xl sm:mx-0 sm:mt-0 sm:rounded-3xl shadow-sm flex items-center gap-4 relative overflow-hidden">
              <div className="relative z-10 w-20 h-20 bg-white rounded-full border-4 border-white shadow-md overflow-hidden flex-shrink-0 flex items-center justify-center">
                {preview || user?.photo_url ? (
                  <img src={preview || user?.photo_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-10 h-10 text-slate-300" />
                )}
              </div>
              <div className="relative z-10">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                  {user?.name}
                  {user?.verified && <ShieldCheck className="w-5 h-5 text-success fill-white" />}
                </h1>
                <p className="text-yellow-900 text-sm font-medium line-clamp-1">
                  {user?.services?.join(' › ') || 'Nenhum serviço cadastrado'}
                </p>
              </div>
              <div className="absolute right-0 top-0 w-32 h-32 bg-yellow-300 rounded-full mix-blend-multiply filter blur-2xl opacity-50 translate-x-1/2 -translate-y-1/2"></div>
            </div>
          )}

          {/* Menu Header for Clients */}
          {user?.role === 'client' && (
            <div className="bg-slate-900 -mx-4 -mt-8 mb-6 px-4 py-6 rounded-b-3xl sm:mx-0 sm:mt-0 sm:rounded-3xl shadow-sm flex items-center gap-4 relative overflow-hidden">
              <div className="relative z-10 w-20 h-20 bg-white rounded-full border-4 border-slate-700 shadow-md overflow-hidden flex-shrink-0 flex items-center justify-center">
                {preview || user?.photo_url ? (
                  <img src={preview || user?.photo_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-10 h-10 text-slate-300" />
                )}
              </div>
              <div className="relative z-10">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
                  {user?.name}
                </h1>
                <p className="text-slate-400 text-sm font-medium">
                  Cliente Conecta
                </p>
              </div>
              <div className="absolute right-0 top-0 w-32 h-32 bg-slate-800 rounded-full mix-blend-multiply filter blur-2xl opacity-50 translate-x-1/2 -translate-y-1/2"></div>
            </div>
          )}

          {/* Menu List for Professionals */}
          {user?.role === 'professional' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8">
              <div className="divide-y divide-slate-100">
                
                <button type="button" onClick={() => setView('edit')} className="w-full text-left p-4 sm:p-5 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors text-slate-500">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Meu perfil</h3>
                      <p className="text-sm text-slate-500">Confira suas informações e serviços</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                </button>

                <Link to="/documents" className="p-4 sm:p-5 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 group-hover:bg-yellow-200 transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Validação de documentos</h3>
                      <p className="text-sm text-slate-500">Torne-se um profissional verificado</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                </Link>
                
                <Link to="/help" className="p-4 sm:p-5 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900">Central de ajuda</h3>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                </Link>
                
                <Link to="/terms" className="p-4 sm:p-5 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 flex items-center justify-center text-slate-400">
                      <FileSignature className="w-5 h-5" />
                    </div>
                    <h3 className="font-medium text-slate-700">Termos de uso</h3>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                </Link>

                <button type="button" className="w-full text-left p-4 sm:p-5 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer group" onClick={() => useUserStore.getState().logout()}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 flex items-center justify-center text-danger">
                      <LogOut className="w-5 h-5" />
                    </div>
                    <h3 className="font-medium text-danger">Sair do aplicativo</h3>
                  </div>
                </button>
                
                <div className="p-4 text-center text-xs text-slate-400 font-medium bg-slate-50">
                  Versão do aplicativo: 1.0.0
                </div>

              </div>
            </div>
          )}

          {/* Menu List for Clients */}
          {user?.role === 'client' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8">
              <div className="divide-y divide-slate-100">
                
                <button type="button" onClick={() => setView('edit')} className="w-full text-left p-4 sm:p-5 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors text-slate-500">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Meus dados</h3>
                      <p className="text-sm text-slate-500">Atualize suas informações</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                </button>

                <Link to="/requests" className="p-4 sm:p-5 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                      <ListOrdered className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Meus pedidos</h3>
                      <p className="text-sm text-slate-500">Acompanhe seus orçamentos</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                </Link>
                
                <Link to="/help" className="p-4 sm:p-5 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900">Central de ajuda</h3>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                </Link>
                
                <Link to="/terms" className="p-4 sm:p-5 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 flex items-center justify-center text-slate-400">
                      <FileSignature className="w-5 h-5" />
                    </div>
                    <h3 className="font-medium text-slate-700">Termos de uso</h3>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                </Link>

                <button type="button" className="w-full text-left p-4 sm:p-5 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer group" onClick={() => useUserStore.getState().logout()}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 flex items-center justify-center text-danger">
                      <LogOut className="w-5 h-5" />
                    </div>
                    <h3 className="font-medium text-danger">Sair da conta</h3>
                  </div>
                </button>
                
                <div className="p-4 text-center text-xs text-slate-400 font-medium bg-slate-50">
                  Versão do aplicativo: 1.0.0
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Profile Form */}
      {view === 'edit' && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
          <button 
            type="button"
            onClick={() => setView('menu')} 
            className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold transition-colors"
          >
            <ChevronLeft className="w-5 h-5" /> Voltar para o menu
          </button>
          
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          {user?.role === 'professional' ? 'Editar informações do perfil' : 'Dados da Conta'}
        </h2>
        
        <div className="flex flex-col items-center mb-8">
          <div className="relative group flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-100 bg-slate-50 flex items-center justify-center">
                {preview ? (
                  <img src={preview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-12 h-12 text-slate-300" />
                )}
              </div>
              
              <button 
                type="button"
                onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                className="absolute bottom-0 right-0 bg-primary text-white p-2.5 rounded-full shadow-lg hover:bg-primary-hover transition-all border-2 border-white z-10"
              >
                <Camera className="w-5 h-5" />
              </button>

              {showPhotoMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowPhotoMenu(false)} />
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 w-48 z-20 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => { fileInputRef.current?.click(); setShowPhotoMenu(false); }}
                      className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                    >
                      <Upload className="w-4 h-4 text-slate-400" />
                      Upload de foto
                    </button>
                    <button
                      type="button"
                      onClick={() => { cameraInputRef.current?.click(); setShowPhotoMenu(false); }}
                      className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                    >
                      <Camera className="w-4 h-4 text-slate-400" />
                      Tirar foto
                    </button>
                    {preview && (
                      <>
                        <div className="h-px bg-slate-100 my-1 mx-4" />
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="w-full text-left px-4 py-3 text-sm font-bold text-danger hover:bg-danger/5 flex items-center gap-3 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remover foto
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}

              <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handlePhotoChange} />
              <input type="file" accept="image/*" capture="user" ref={cameraInputRef} className="hidden" onChange={handlePhotoChange} />
            </div>
          </div>
          <p className="mt-4 text-xl font-extrabold text-slate-900">{user?.name}</p>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{user?.role === 'client' ? 'Cliente' : 'Profissional'}</p>
        </div>

        {user?.role === 'professional' && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Avaliações</p>
                {reviewsLoading ? (
                  <p className="text-slate-600 font-bold mt-1">Carregando…</p>
                ) : ratingSummary.count > 0 ? (
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">
                    {ratingSummary.avg.toFixed(1)}/5 <span className="text-sm font-bold text-slate-500">({ratingSummary.count})</span>
                  </p>
                ) : (
                  <p className="text-slate-600 font-bold mt-1">Sem avaliações ainda</p>
                )}
              </div>
              <div className="text-amber-500 text-3xl font-extrabold">★</div>
            </div>

            {!reviewsLoading && reviews.length > 0 && (
              <div className="mt-4 space-y-3">
                {reviews.slice(0, 3).map((r) => (
                  <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900">{r.rating}/5</p>
                      <p className="text-xs font-bold text-slate-400">{new Date(r.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    {r.comment && <p className="text-slate-700 mt-2">"{r.comment}"</p>}
                    <p className={`text-xs font-bold mt-2 ${r.wouldHireAgain ? 'text-success' : 'text-slate-500'}`}>
                      {r.wouldHireAgain ? 'Contrataria novamente' : 'Não contrataria novamente'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-danger/10 text-danger p-4 rounded-xl text-sm flex items-center gap-2 font-medium">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-success/10 text-success p-4 rounded-xl text-sm flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            Perfil atualizado com sucesso!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">E-mail</label>
              <input
                type="email"
                disabled
                className="w-full p-3.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-400 cursor-not-allowed"
                value={user?.email}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">Telefone / Celular</label>
              <input
                type="text"
                className="w-full p-3.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Endereço Principal</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">CEP</label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full p-3.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
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
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">Cidade</label>
                    <input
                      type="text"
                      className="w-full p-3.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">Estado (UF)</label>
                    <input
                      type="text"
                      maxLength={2}
                      className="w-full p-3.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all uppercase"
                      value={stateUF}
                      onChange={(e) => setStateUF(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Bairro</label>
                  <input
                    type="text"
                    className="w-full p-3.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                  />
                </div>
              </div>

              {user?.role === 'professional' && (
                  <div className="pt-8 mt-8 border-t border-slate-100">
                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-primary" />
                      Seu Negócio
                    </h2>
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <label className="block text-sm font-bold text-slate-700">
                          Raio de Atuação (KM)
                        </label>
                        <span className="bg-primary/10 text-primary font-extrabold px-4 py-1.5 rounded-xl text-lg">
                          {radiusKm} km
                        </span>
                      </div>
                      
                      <div className="relative w-full h-8 flex items-center group cursor-pointer">
                        <input
                          type="range"
                          min="5"
                          max="100"
                          step="1"
                          className="absolute w-full h-2 rounded-full appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 z-10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab active:[&::-webkit-slider-thumb]:cursor-grabbing active:[&::-webkit-slider-thumb]:scale-110 [&::-webkit-slider-thumb]:transition-transform"
                          value={radiusKm}
                          onChange={(e) => setRadiusKm(e.target.value)}
                          style={{
                            background: `linear-gradient(to right, #007bff 0%, #007bff ${((Number(radiusKm) - 5) / 95) * 100}%, #e2e8f0 ${((Number(radiusKm) - 5) / 95) * 100}%, #e2e8f0 100%)`
                          }}
                        />
                      </div>
                      
                      <div className="flex justify-between items-center text-xs font-bold text-slate-400 mt-2">
                        <span>5 km</span>
                        <span>50 km</span>
                        <span>100 km</span>
                      </div>
                      
                      <p className="text-sm text-slate-500 mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        Mostraremos serviços abertos dentro dessa distância a partir do seu endereço principal.
                      </p>
                    </div>
                  </div>
              )}
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-hover transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-md shadow-primary/20"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
      </div>
      )}
    </div>
  );
};

export default Profile;
