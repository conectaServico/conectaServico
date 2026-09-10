import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { CATEGORY_MENUS } from '@/utils/categories';
import { Star, CheckCircle, HelpCircle } from 'lucide-react';
import { useUserStore } from '@/store/userStore';

const CategoryPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useUserStore();
  
  const category = CATEGORY_MENUS.find(c => c.slug === slug);

  // Redireciona usuários logados diretamente para a tela de novo pedido
  // caso eles acessem a página da categoria sem um serviço específico selecionado.
  useEffect(() => {
    const servicoQuery = searchParams.get('servico');
    if (isAuthenticated && category && !servicoQuery) {
      navigate(`/request/new?category=${encodeURIComponent(category.name)}`, { replace: true });
    }
  }, [isAuthenticated, category, navigate, searchParams]);

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

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* Breadcrumb */}
      <div className="container mx-auto max-w-7xl px-4 py-4">
        <div className="text-sm text-slate-500">
          <Link to="/" className="hover:text-primary">Conecta Serviço</Link>
          <span className="mx-2">›</span>
          <span className="text-slate-900 font-medium">{category.name}</span>
        </div>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto max-w-7xl px-4">
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 flex flex-col md:flex-row">
          
          {/* Text Content */}
          <div className="flex-1 p-8 md:p-12 lg:p-16 flex flex-col justify-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
              Contrate os melhores Profissionais em <span className="text-primary">{category.name}</span>
            </h1>
            <p className="text-lg text-slate-600 mb-8">
              Receba orçamentos de profissionais verificados. É rápido, seguro e gratuito!
            </p>

            <ul className="space-y-4 mb-10">
              <li className="flex items-center gap-3 text-slate-700 font-medium">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                Até 4 orçamentos grátis e seguros
              </li>
              <li className="flex items-center gap-3 text-slate-700 font-medium">
                <Star className="w-5 h-5 text-yellow-400 fill-current flex-shrink-0" />
                Profissionais avaliados
              </li>
              <li className="flex items-center gap-3 text-slate-700 font-medium">
                <HelpCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                Como funciona o Conecta Serviço?
              </li>
            </ul>

            {/* Select Service Box */}
            <div className="bg-yellow-400 p-6 md:p-8 rounded-2xl shadow-lg relative">
              <h3 className="text-2xl font-bold text-slate-900 mb-6 text-center">
                Qual serviço de {category.name} está precisando?
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {category.items.map(item => (
                    <button
                      key={item}
                      onClick={() => handleServiceClick(item)}
                      className="bg-white hover:bg-slate-50 text-slate-800 font-semibold py-3 px-4 rounded-xl text-center shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all border border-slate-100 truncate w-full"
                    >
                      {item}
                    </button>
                  ))}
                </div>
            </div>
          </div>

          {/* Image Content */}
          <div className="hidden md:block w-2/5 relative min-h-[500px]">
            <img 
              src={category.image} 
              alt={`Profissional de ${category.name}`} 
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Stats Badge */}
            <div className="absolute bottom-8 right-8 bg-white p-5 rounded-2xl shadow-xl border border-slate-100 text-center">
              <div className="text-3xl font-extrabold text-slate-900 flex items-center justify-center gap-2 mb-1">
                4.8 <span className="text-lg text-slate-400 font-normal">/5</span>
              </div>
              <div className="flex justify-center text-yellow-400 mb-2">
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
              </div>
              <p className="text-sm text-slate-500 font-medium">
                Mais de 4.000 clientes avaliados
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CategoryPage;