import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { CATEGORY_MENUS } from '@/utils/categories';
import { ArrowLeft, Search, ChevronRight } from 'lucide-react';
import { useUserStore } from '@/store/userStore';

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const CategoryPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useUserStore();

  const category = CATEGORY_MENUS.find(c => c.slug === slug);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  // Se o usuário clicar em um serviço ou se vier do mega-menu com um serviço pré-selecionado
  useEffect(() => {
    const servicoQuery = searchParams.get('servico');
    if (servicoQuery && category) {
      const serviceExists = category.items.find(i => i.toLowerCase() === servicoQuery.toLowerCase());
      if (serviceExists) {
        // Delay slightly to ensure component is mounted and state is stable
        setTimeout(() => {
          handleServiceClick(serviceExists);
        }, 0);
      } else {
        // If the service is not in this category, we just clear the query param and stay on the page
        navigate(`/categoria/${slug}`, { replace: true });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, category, navigate, slug]);

  const handleServiceClick = (service: string) => {
    if (!category) return;
    const url = `/request/new?category=${encodeURIComponent(category.name)}&subcategory=${encodeURIComponent(service)}`;
    if (isAuthenticated) {
      navigate(url);
    } else {
      // Usando sessionStorage (ou localStorage) para esconder a URL suja do redirect param
      sessionStorage.setItem('pendingRequestRedirect', url);
      navigate('/login');
    }
  };

  const baseItems = category?.groups ? (category.groups[activeTab]?.items || []) : (category?.items || []);
  const visibleItems = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return baseItems;
    // Com busca ativa, procura em todos os serviços da categoria, não só na aba atual.
    const pool = category?.groups ? category.items : baseItems;
    return pool.filter(item => normalize(item).includes(q));
  }, [baseItems, query, category]);

  if (!category) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Categoria não encontrada</h1>
        <Link to="/" className="text-primary hover:underline">Voltar para a página inicial</Link>
      </div>
    );
  }

  const Icon = category.icon;
  const searching = normalize(query.trim()).length > 0;

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200/60 transition-colors text-slate-700 flex-shrink-0"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-extrabold text-slate-900 text-center flex-1 px-2">{category.name}</h1>
          <div className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-primary flex-shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        </div>

        {/* Busca */}
        <div className="relative mb-5">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="O que você precisa?"
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-100 text-slate-900 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>

        {/* Abas (só quando a categoria tem grupos, ex.: Serviços domésticos) */}
        {category.groups && !searching && (
          <div className="flex border-b border-slate-200 mb-1">
            {category.groups.map((group, idx) => (
              <button
                key={group.label}
                type="button"
                onClick={() => setActiveTab(idx)}
                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wide transition-colors border-b-2 -mb-px ${
                  activeTab === idx
                    ? 'text-primary border-primary'
                    : 'text-slate-500 border-transparent hover:text-slate-700'
                }`}
              >
                {group.label}
              </button>
            ))}
          </div>
        )}

        {/* Lista */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mt-4 overflow-hidden">
          {!searching && (
            <h2 className="text-lg font-bold text-slate-900 px-5 pt-5 pb-1">
              {category.groups ? category.groups[activeTab]?.label : category.name}
            </h2>
          )}
          {visibleItems.length === 0 ? (
            <p className="text-sm text-slate-500 px-5 py-8 text-center">Nenhum serviço encontrado para "{query}".</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {visibleItems.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleServiceClick(item)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="text-slate-700 font-medium">{item}</span>
                  <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryPage;
