import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useUserStore } from '@/store/userStore';
import { User, ServiceRequest, Review } from '@/types';
import { Search as SearchIcon, MapPin, Star, User as UserIcon, Loader2, ChevronRight, Filter, X, ShieldCheck, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MAIN_CATEGORIES } from '@/utils/categories';

const Search = () => {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const cityParam = searchParams.get('city') || '';
  const { user } = useUserStore();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<'recent' | 'rating'>('recent');
  
  // Filtros
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    if (user?.role === 'client') {
      navigate('/home');
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        if (!user) return;

        // Cliente busca profissionais
        if (user.role === 'client') {
          const usersRef = collection(db, 'users');
          let qUsers = query(usersRef, where('role', '==', 'professional'));

          const snapshot = await getDocs(qUsers);
          let profs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));

          // Filtro por estado no client-side (MVP) para evitar erro de índice composto no Firestore
          if (cityParam) {
            profs = profs.filter(p => p.state === cityParam);
          }

          // Filtro textual no client-side (MVP)
          if (q) {
            const lowerQ = q.toLowerCase();
            profs = profs.filter(p => 
              p.name.toLowerCase().includes(lowerQ) || 
              (p.services && p.services.some(s => s.toLowerCase().includes(lowerQ))) ||
              (p.bio && p.bio.toLowerCase().includes(lowerQ))
            );
          }

          setResults(profs);
        } 
        // Profissional busca serviços (Fall-back if accessed directly)
        else {
          const reqRef = collection(db, 'serviceRequests');
          let qReqs = query(reqRef, where('status', '==', 'OPEN'));

          const snapshot = await getDocs(qReqs);
          let reqs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ServiceRequest));

          if (cityParam) {
            reqs = reqs.filter(r => r.state === cityParam);
          }

          if (q) {
            const lowerQ = q.toLowerCase();
            reqs = reqs.filter(r => 
              r.category.toLowerCase().includes(lowerQ) || 
              r.propertyType.toLowerCase().includes(lowerQ) ||
              r.description.toLowerCase().includes(lowerQ)
            );
          }

          const reqsWithClientInfo = await Promise.all(reqs.map(async (r) => {
             const clientDoc = await getDoc(doc(db, 'users', r.clientId));
             return {
                ...r,
                clientName: clientDoc.exists() ? (clientDoc.data() as User).name : 'Cliente'
             }
          }));

          setResults(reqsWithClientInfo);
        }

      } catch (error) {
        console.error('Error fetching search results:', error);
        toast.error('Erro ao realizar busca.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [q, cityParam, user]);

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  // Aplicação dos filtros de categoria e ordenação no client-side
  let filteredResults = results.filter(item => {
    if (selectedCategories.length === 0) return true;
    if (user?.role === 'client') {
      // Verifica se o profissional tem alguma das categorias selecionadas nos serviços dele
      // Como não temos um campo 'category' exato no profissional, vamos checar os services ou criar um mapping
      // MVP: checar se algum "service" do profissional contém o texto da categoria principal
      const prof = item as User;
      if (!prof.services) return false;
      return selectedCategories.some(cat => 
        prof.services!.some(s => s.toLowerCase().includes(cat.toLowerCase()) || cat.toLowerCase().includes(s.toLowerCase()))
      );
    } else {
      return selectedCategories.includes(item.category);
    }
  });

  if (sortBy === 'rating' && user?.role === 'client') {
    filteredResults.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else {
    filteredResults.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  }

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 pb-12 pt-8">
      
      {/* Top Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">
            {q ? `Resultados para "${q}"` : 'Todos os resultados'}
          </h1>
          <p className="text-slate-500 mt-2 flex items-center gap-1">
            <MapPin className="w-4 h-4" /> 
            {cityParam ? `Em ${cityParam}` : 'Em todo o Brasil'} 
          </p>
        </div>

        <div className="relative">
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'rating')}
            className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm cursor-pointer"
          >
            <option value="recent">Mais Recentes</option>
            {user.role === 'client' && <option value="rating">Melhor Avaliação</option>}
          </select>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Botão Mobile para Filtros */}
        <button 
          className="lg:hidden w-full flex items-center justify-center gap-2 bg-white border border-slate-200 p-3 rounded-xl shadow-sm text-slate-700 font-bold"
          onClick={() => setShowMobileFilters(true)}
        >
          <Filter className="w-5 h-5" />
          Filtros
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
          </div>
        </div>

        {/* Main Content Direita (Lista de Profissionais/Serviços) */}
        <div className="flex-1">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900">
              {filteredResults.length} {filteredResults.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <SearchIcon className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Nenhum resultado encontrado</h3>
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
          ) : (
            <div className="flex flex-col gap-5">
              {user.role === 'client' 
                ? filteredResults.map((prof: User) => (
                    <div key={prof.id} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all hover:border-primary/50 group">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden flex-shrink-0 cursor-pointer" onClick={() => navigate(`/user/${prof.id}`)}>
                            {prof.photo_url ? (
                              <img src={prof.photo_url} alt={prof.name} className="w-full h-full object-cover" />
                            ) : (
                              <UserIcon className="w-8 h-8 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <Link to={`/user/${prof.id}`} className="block group-hover:text-primary transition-colors">
                              <h3 className="text-xl font-extrabold text-slate-900 mb-1 flex items-center gap-2">
                                {prof.name}
                                {prof.verified && <ShieldCheck className="w-5 h-5 text-success" />}
                              </h3>
                            </Link>
                            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                              <span className="flex items-center gap-1 text-amber-500">
                                <Star className="w-4 h-4 fill-current" />
                                <strong className="text-sm">{prof.rating?.toFixed(1) || '5.0'}</strong>
                                <span className="text-slate-400">({prof.reviewCount || 0} avaliações)</span>
                              </span>
                              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                              <span>Desde {prof.created_at ? new Date(prof.created_at).getFullYear() : '2024'}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-start md:items-end flex-shrink-0">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/new?profId=${prof.id}`);
                            }}
                            className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-primary-hover transition-colors shadow-sm shadow-primary/20 w-full md:w-auto text-center"
                          >
                            Solicitar Orçamento
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-slate-600 mb-5 text-sm leading-relaxed line-clamp-3">
                        {prof.bio || 'Profissional parceiro da Conecta Serviço.'}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mb-6">
                        {prof.services && prof.services.slice(0, 6).map((s, i) => (
                          <span key={i} className="bg-slate-100 text-slate-600 text-[11px] font-bold px-3 py-1.5 rounded-full">
                            {s}
                          </span>
                        ))}
                        {prof.services && prof.services.length > 6 && (
                          <span className="bg-slate-100 text-slate-500 text-[11px] font-bold px-3 py-1.5 rounded-full">
                            +{prof.services.length - 6}
                          </span>
                        )}
                      </div>
                      
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                            <Briefcase className="w-4 h-4 text-slate-400" />
                          </div>
                          <span className="text-sm font-bold text-slate-700">Profissional</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 text-sm font-medium">
                          <MapPin className="w-4 h-4" />
                          <span>{prof.city}, {prof.state || 'Brasil'}</span>
                        </div>
                      </div>
                    </div>
                  ))
                : filteredResults.map((req: any) => (
                    // Fallback for professionals accessing this route directly
                    <div key={req.id} onClick={() => navigate(`/requests/${req.id}`)} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all hover:border-primary/50 group cursor-pointer">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-extrabold text-xl text-slate-900 group-hover:text-primary transition-colors mb-2 line-clamp-2">
                          {req.subcategory || req.category} para {req.propertyType}
                        </h3>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2 mb-4 flex-grow">
                        {req.description}
                      </p>
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                        <div className="flex items-center text-slate-500 text-sm font-medium">
                          <MapPin className="w-4 h-4 mr-1" />
                          {req.city}, {req.state}
                        </div>
                      </div>
                    </div>
                  ))
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Search;