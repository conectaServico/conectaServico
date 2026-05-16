import { useState, useEffect } from 'react';
import { useUserStore } from '@/store/userStore';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { JobRequest } from '@/types';
import { MapPin, Clock, ArrowRight, Search, Briefcase, Filter, X, ShieldAlert, CheckCircle, Info, User as UserIcon, Maximize, Calendar } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { MAIN_CATEGORIES } from '@/utils/categories';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ProHome = () => {
  const { user } = useUserStore();
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const cityParam = searchParams.get('city') || '';

  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    const fetchAvailableJobs = async () => {
      try {
        const q = query(
          collection(db, 'serviceRequests'),
          where('status', '==', 'OPEN')
        );
        
        const snapshot = await getDocs(q);
        const fetchedJobs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as JobRequest[];
        
        fetchedJobs.sort((a, b) => b.created_at - a.created_at);
        setJobs(fetchedJobs);
      } catch (err) {
        console.error("Erro ao buscar jobs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableJobs();
  }, []);

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  // Aplicação dos filtros no client-side
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      q === '' || 
      job.description.toLowerCase().includes(q.toLowerCase()) ||
      job.category.toLowerCase().includes(q.toLowerCase()) ||
      (job.subcategory && job.subcategory.toLowerCase().includes(q.toLowerCase()));

    const matchesCity = 
      cityParam === '' || 
      job.state === cityParam;

    const matchesCategory = 
      selectedCategories.length === 0 || 
      selectedCategories.includes(job.category);

    return matchesSearch && matchesCategory && matchesCity;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 pb-12 pt-8">
      {/* Top Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">
            {q ? `Resultados para "${q}"` : 'Disponíveis'}
          </h1>
          <p className="text-slate-500 mt-2 flex items-center gap-1">
            <MapPin className="w-4 h-4" /> 
            {cityParam ? `Em ${cityParam}` : 'Em todo o Brasil'} 
          </p>
        </div>
      </div>

      {/* Banners & Alerts Section (GetNinjas Style) */}
      {!q && !cityParam && (
        <div className="mb-8 space-y-4">
          {/* Banner Principal */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="relative z-10 max-w-lg text-center sm:text-left">
              <h2 className="text-2xl font-extrabold mb-2">O que são os selos nos pedidos?</h2>
              <p className="text-blue-100 font-medium mb-6 text-sm sm:text-base">
                Entenda o que eles significam e aumente suas chances de fechar negócio e faturar mais!
              </p>
              <button className="bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-extrabold px-6 py-3 rounded-full text-sm transition-colors uppercase tracking-wide">
                Descubra Agora
              </button>
            </div>
            {/* Elemento Decorativo */}
            <div className="relative z-10 hidden sm:flex items-center justify-center w-32 h-32 bg-white/10 rounded-full backdrop-blur-sm border border-white/20">
              <CheckCircle className="w-16 h-16 text-white" />
            </div>
            {/* Background decorations */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
          </div>

          {/* Alerta de Validação */}
          {!user?.verified && (
            <Link to="/profile" className="flex items-center justify-between bg-purple-50 hover:bg-purple-100 border border-purple-200 p-4 sm:p-5 rounded-2xl transition-colors group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full border-2 border-slate-300 flex items-center justify-center bg-white flex-shrink-0">
                  <ShieldAlert className="w-5 h-5 text-slate-500" />
                </div>
                <span className="text-slate-700 font-medium text-sm sm:text-base">Valide agora seus documentos!</span>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </Link>
          )}

          {/* Abas (Tabs) Visuais */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-full sm:w-fit">
            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-slate-800 px-6 py-3 rounded-lg font-bold text-sm shadow-sm">
              <Briefcase className="w-4 h-4 text-yellow-500" />
              Disponíveis
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Botão Mobile para Filtros */}
        <button 
          className="lg:hidden w-full flex items-center justify-center gap-2 bg-white border border-slate-200 p-3 rounded-xl shadow-sm text-slate-700 font-bold"
          onClick={() => setShowMobileFilters(true)}
        >
          <Filter className="w-5 h-5" />
          Filtros de Busca
        </button>

        {/* Sidebar Esquerda (Filtros) */}
        <div className={`
          fixed inset-0 z-50 bg-white p-6 overflow-y-auto transition-transform transform lg:relative lg:translate-x-0 lg:w-80 lg:bg-transparent lg:p-0 lg:z-0 lg:overflow-visible lg:block
          ${showMobileFilters ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex justify-between items-center lg:hidden mb-6">
            <h2 className="text-xl font-bold text-slate-900">Filtros</h2>
            <button onClick={() => setShowMobileFilters(false)} className="p-2 bg-slate-100 rounded-full text-slate-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-24">
            <h3 className="font-bold text-slate-900 mb-4 text-lg">Categoria de projeto</h3>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={selectedCategories.length === 0}
                  onChange={() => setSelectedCategories([])}
                  className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span className={`text-sm font-medium transition-colors ${selectedCategories.length === 0 ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'}`}>
                  Todas as categorias
                </span>
              </label>

              {MAIN_CATEGORIES.map(cat => (
                <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={selectedCategories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                    className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span className={`text-sm font-medium transition-colors ${selectedCategories.includes(cat) ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'}`}>
                    {cat}
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <h3 className="font-bold text-slate-900 mb-4">Localização</h3>
              <p className="text-sm text-slate-500 mb-2">Sua região de atendimento:</p>
              <div className="bg-slate-50 p-3 rounded-xl flex items-center gap-2 border border-slate-100">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-slate-700">{user?.city} - {user?.state}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Direita (Lista de Serviços) */}
        <div className="flex-1">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900">
              {filteredJobs.length} {filteredJobs.length === 1 ? 'serviço encontrado' : 'serviços encontrados'}
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredJobs.length > 0 ? (
            <div className="flex flex-col gap-5">
              {filteredJobs.map(job => (
                <div key={job.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all hover:border-primary/50 group overflow-hidden">
                  
                  {/* Top Bar with Tags (Like GetNinjas) */}
                  <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center gap-2">
                    <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-3 py-1 rounded flex items-center gap-1">
                      <Briefcase className="w-3 h-3" /> Pedido novo
                    </span>
                    {job.urgency.includes('Emergência') || job.urgency.includes('Alta') ? (
                      <span className="bg-red-100 text-red-800 text-[11px] font-bold px-3 py-1 rounded flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> Urgente
                      </span>
                    ) : null}
                  </div>

                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
                      <div className="flex-1">
                        <Link to={`/requests/${job.id}`} className="block group-hover:text-primary transition-colors">
                          <h3 className="text-xl font-extrabold text-slate-900 mb-4 line-clamp-2">
                            {job.subcategory || job.category} - {job.propertyType}
                          </h3>
                        </Link>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <div className="w-6 flex justify-center"><MapPin className="w-4 h-4 text-slate-400" /></div>
                            <span>A {Math.floor(Math.random() * 15) + 1} km - {job.neighborhood}</span>
                          </div>
                          {job.areaSize && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <div className="w-6 flex justify-center"><Maximize className="w-4 h-4 text-slate-400" /></div>
                              <span>{job.areaSize} m²</span>
                            </div>
                          )}
                          {job.preferredDate && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <div className="w-6 flex justify-center"><Calendar className="w-4 h-4 text-slate-400" /></div>
                              <span>Data desejada: {new Date(job.preferredDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
                            <div className="w-6 flex justify-center"><ShieldAlert className="w-4 h-4 text-red-500" /></div>
                            <span>Serviço {job.urgency.split(' ')[0].toLowerCase()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Botão de Ação Inferior (Like GetNinjas) */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <Link 
                        to={`/requests/${job.id}`}
                        className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm text-center flex items-center justify-center gap-2"
                      >
                        Este pedido pode ser seu
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Nenhum serviço encontrado</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                Tente ajustar os filtros ou os termos da busca para encontrar o que procura.
              </p>
              <button 
                onClick={() => setSelectedCategories([])}
                className="mt-6 text-primary font-bold hover:underline"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ProHome;