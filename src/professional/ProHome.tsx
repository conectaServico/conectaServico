import { useState, useEffect } from 'react';
import { useUserStore } from '@/store/userStore';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { JobRequest } from '@/types';
import { MapPin, Clock, ArrowRight, Search, Briefcase, Filter, X, ShieldAlert, CheckCircle, Info, User as UserIcon, Maximize, Calendar, Phone, Menu, ChevronRight, Lock } from 'lucide-react';
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

  const getHiddenName = (fullName: string | null | undefined, clientId: string) => {
    if (!fullName) return `Cliente ${clientId.slice(0, 4)}`;
    const parts = fullName.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[1][0]}.`;
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* Mobile-first Header */}
      <div className="bg-white px-4 py-4 flex items-center justify-between sticky top-0 z-40 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button className="text-slate-700 p-1">
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-xl font-medium text-slate-800">Menu</span>
        </div>
        
        <Link to="/wallet" className="flex items-center gap-2 bg-yellow-100/80 hover:bg-yellow-100 px-3 py-1.5 rounded-full transition-colors cursor-pointer border border-yellow-200/50">
          <div className="bg-yellow-400 rounded-full w-6 h-6 flex items-center justify-center shadow-sm">
            <span className="text-yellow-900 text-xs font-bold">💎</span>
          </div>
          <span className="font-bold text-slate-700">{user?.coinsBalance || 0}</span>
          <span className="text-sm font-medium text-slate-600 hidden sm:inline">Diamantes</span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>
      </div>

      {/* Tabs */}
      <div className="bg-white flex w-full border-b border-slate-200">
        <div className="flex-1 flex justify-center py-4 border-b-2 border-yellow-400">
          <span className="text-sm font-bold text-slate-800 tracking-wide uppercase">Disponíveis</span>
        </div>
        <Link to="/proposals" className="flex-1 flex justify-center py-4 text-slate-400 hover:text-slate-600 transition-colors">
          <span className="text-sm font-bold tracking-wide uppercase">Meus Pedidos</span>
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-6 pb-12">
        {/* Modern Banner */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-yellow-300 to-yellow-400 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-xl sm:text-2xl font-extrabold text-yellow-950 mb-1 leading-tight">
                Convide colegas<br />profissionais e<br />ganhe 100 diamantes!
              </h2>
            </div>
            {/* Banner Image Placeholder */}
            <div className="w-32 h-32 bg-yellow-200 rounded-full flex-shrink-0 relative z-10 flex items-center justify-center overflow-hidden border-4 border-yellow-300">
              <div className="flex gap-2">
                <div className="w-8 h-16 bg-blue-600 rounded-lg transform -rotate-12 translate-y-4"></div>
                <div className="w-8 h-16 bg-slate-800 rounded-lg transform rotate-12"></div>
              </div>
            </div>
            
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
          </div>
          
          <div className="flex justify-center gap-1.5 mt-4">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
          </div>
        </div>

        {/* Location Filter */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-slate-600 font-medium">Pedidos próximos ao CEP:</p>
          <button className="text-blue-600 font-bold hover:text-blue-800 transition-colors">Editar</button>
        </div>

        {/* Main Content (Lista de Serviços) */}
        <div className="flex-1">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-yellow-400"></div>
            </div>
          ) : filteredJobs.length > 0 ? (
            <div className="flex flex-col gap-4">
              {filteredJobs.map(job => {
                const unlocks = job.unlockCount || 0;
                const isLocked = unlocks >= 3;
                
                return (
                <Link 
                  key={job.id} 
                  to={isLocked ? '#' : `/requests/${job.id}`}
                  className={`block bg-white rounded-2xl p-5 shadow-sm border-l-4 border-l-transparent hover:border-l-yellow-400 transition-all group relative overflow-hidden ${isLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-600 transition-colors" />
                  </div>

                  <div className="pr-8">
                    <h3 className="text-lg font-medium text-slate-800 mb-4 line-clamp-1">
                      {job.category} - {job.subcategory || job.propertyType}
                    </h3>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm text-slate-600 mb-5">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">{getHiddenName(job.clientName, job.clientId)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">
                          {job.neighborhood ? `A ${Math.floor(Math.random() * 15) + 1} km - ${job.neighborhood}` : 'Serviço online'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Progress Bar Area */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex-1 flex gap-1 mr-4">
                        <div className={`h-1.5 rounded-full flex-1 ${unlocks >= 1 ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                        <div className={`h-1.5 rounded-full flex-1 ${unlocks >= 2 ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                        <div className={`h-1.5 rounded-full flex-1 ${unlocks >= 3 ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                        <Lock className="w-3.5 h-3.5" />
                        <span>{unlocks}/3</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )})}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Nenhum serviço encontrado</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                Não há pedidos abertos na sua região no momento.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProHome;