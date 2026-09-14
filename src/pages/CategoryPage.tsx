import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { CATEGORY_MENUS } from '@/utils/categories';
import { normalize } from '@/utils/search';
import { ArrowLeft, ChevronRight, Search } from 'lucide-react';
import { useUserStore } from '@/store/userStore';

const CategoryPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useUserStore();

  const category = CATEGORY_MENUS.find(c => c.slug === slug);
  // Abre direto na aba pedida (ex.: veio do card "Scooter Elétrica" da home)
  // quando a URL traz ?aba=<nome do grupo>.
  const [activeTab, setActiveTab] = useState(() => {
    const abaQuery = searchParams.get('aba');
    if (!abaQuery || !category?.groups) return 0;
    const idx = category.groups.findIndex(g => g.label.toLowerCase() === abaQuery.toLowerCase());
    return idx >= 0 ? idx : 0;
  });
  const [search, setSearch] = useState('');

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

  const q = normalize(search.trim());
  const searching = q.length > 0;
  // Buscando, ignora a aba ativa e varre a categoria inteira — senão o cliente
  // não acha um serviço que está em outra aba.
  const visibleItems = searching
    ? category.items.filter((item) => normalize(item).includes(q))
    : category.groups
      ? (category.groups[activeTab]?.items || [])
      : category.items;

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* Barra de busca com voltar — largura cheia, igual à referência */}
      <div className="bg-white px-4 pt-4 pb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-700 -ml-2"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="O que você precisa?"
            className="w-full bg-slate-100 rounded-xl pl-10 pr-3 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Foto de capa da categoria, com o nome sobreposto — quadrada, sem
            arredondar e ocupando a largura toda (igual à referência), some
            enquanto o cliente está buscando. */}
        {!searching && (
          <div className="relative h-44 mb-4">
            <img
              src={category.image}
              alt={category.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/20 to-transparent" />
            <h1 className="absolute bottom-4 left-4 right-4 text-2xl font-extrabold text-white">{category.name}</h1>
          </div>
        )}

        <div className="px-4">
          {/* Abas (só quando a categoria tem grupos, ex.: Reformas e Reparos) —
              carrossel horizontal, sem quebrar palavra, igual à referência. */}
          {category.groups && !searching && (
            <div className="flex overflow-x-auto hide-scrollbar gap-6 border-b border-slate-200 mb-1">
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
              {searching ? 'Resultados da busca' : category.groups ? category.groups[activeTab]?.label : category.name}
            </h2>
            {visibleItems.length === 0 ? (
              <p className="text-sm text-slate-500 text-center px-5 py-6">
                Nenhum serviço encontrado para &quot;{search}&quot;.
              </p>
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
    </div>
  );
};

export default CategoryPage;
