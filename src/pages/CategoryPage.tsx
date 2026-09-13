import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { CATEGORY_MENUS } from '@/utils/categories';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useUserStore } from '@/store/userStore';

const CategoryPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useUserStore();

  const category = CATEGORY_MENUS.find(c => c.slug === slug);
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

  if (!category) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Categoria não encontrada</h1>
        <Link to="/" className="text-primary hover:underline">Voltar para a página inicial</Link>
      </div>
    );
  }

  const visibleItems = category.groups ? (category.groups[activeTab]?.items || []) : category.items;

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <div className="max-w-2xl mx-auto px-4 pt-4">
        {/* Voltar */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200/60 transition-colors text-slate-700 mb-3 -ml-2"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        {/* Foto de capa da categoria, com o nome sobreposto — igual à referência */}
        <div className="relative -mx-4 sm:mx-0 sm:rounded-3xl overflow-hidden h-44 mb-4">
          <img
            src={category.image}
            alt={category.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/20 to-transparent" />
          <h1 className="absolute bottom-4 left-4 right-4 text-2xl font-extrabold text-white">{category.name}</h1>
        </div>

        {/* Abas (só quando a categoria tem grupos, ex.: Reformas e Reparos) —
            carrossel horizontal, sem quebrar palavra, igual à referência. */}
        {category.groups && (
          <div className="flex overflow-x-auto hide-scrollbar gap-6 border-b border-slate-200 mb-1 -mx-4 px-4">
            {category.groups.map((group, idx) => (
              <button
                key={group.label}
                type="button"
                onClick={() => setActiveTab(idx)}
                className={`flex-shrink-0 whitespace-nowrap pb-3 text-xs font-bold uppercase tracking-wide transition-colors border-b-2 -mb-px ${
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
          <h2 className="text-lg font-bold text-slate-900 px-5 pt-5 pb-1">
            {category.groups ? category.groups[activeTab]?.label : category.name}
          </h2>
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
        </div>
      </div>
    </div>
  );
};

export default CategoryPage;
