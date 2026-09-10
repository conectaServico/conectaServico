import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { 
  User, 
  MessageSquare, 
  Home, 
  ClipboardList, 
  Bell, 
  ChevronDown,
  Diamond,
  Plus
} from 'lucide-react';
import { auth } from '@/services/firebase';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { CATEGORY_MENUS } from '@/utils/categories';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useUserStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const hasUnread = useUnreadMessages();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  const categoryMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target as Node)) {
        setActiveCategory(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    logout();
    setShowUserMenu(false);
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Desktop Navigation - OLX Style */}
      {!isActive('/login') && !isActive('/register') && (
      <nav className="hidden md:block bg-white border-b border-slate-200 sticky top-0 z-50">
        {/* Main Header */}
        <div className="flex items-center justify-between h-20 px-4 max-w-7xl mx-auto">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 flex-shrink-0">
            <img
              src="/logo.jpg"
              alt="Conecta Serviço Logo"
              className="h-10 w-auto rounded-lg"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/logo.png';
              }}
            />
            <span className="text-2xl font-extrabold text-blue-950 tracking-tight hidden sm:block">
              Conecta Serviço
            </span>
          </Link>

          <div className="flex-1 max-w-3xl"></div>

          {/* Action Icons & User Menu */}
          <div className="flex items-center gap-6 flex-shrink-0">
            {isAuthenticated ? (
              <>
                {/* Plano Profissional / Carteira (Diamantes) */}
                {user?.role === 'professional' && (
                  <Link to="/wallet" className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors cursor-pointer border border-blue-100 shadow-sm mr-2">
                    <div className="bg-blue-500 rounded-full w-6 h-6 flex items-center justify-center shadow-sm">
                      <span className="text-white text-xs font-bold">💎</span>
                    </div>
                    <span className="font-bold text-slate-700">{user?.coinsBalance || 0}</span>
                  </Link>
                )}

                {/* Meus Anúncios / Pedidos */}
                <Link to={user?.role === 'professional' ? '/proposals' : '/requests'} className="flex items-center gap-2 text-slate-600 hover:text-primary px-3 py-2 rounded-lg transition-colors group">
                  <ClipboardList className="w-6 h-6 group-hover:bg-slate-100 rounded" />
                  <span className="text-sm font-semibold hidden lg:block">
                    {user?.role === 'professional' ? 'Propostas' : 'Pedidos'}
                  </span>
                </Link>

                {/* Chat */}
                <Link to="/chats" className="relative flex items-center gap-2 text-slate-600 hover:text-primary px-3 py-2 rounded-lg transition-colors group">
                  <div className="relative">
                    <MessageSquare className="w-6 h-6 group-hover:fill-slate-100 rounded" />
                    {hasUnread && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-danger text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                        !
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-semibold hidden lg:block">Chat</span>
                </Link>

                {/* Notificações */}
                <div className="relative" ref={notifMenuRef}>
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative flex items-center gap-2 text-slate-600 hover:text-primary px-3 py-2 rounded-lg transition-colors group"
                  >
                    <div className="relative">
                      <Bell className="w-6 h-6 group-hover:fill-slate-100 rounded" />
                      {hasUnread && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-danger rounded-full border-2 border-white"></span>
                      )}
                    </div>
                    <span className="text-sm font-semibold hidden lg:block">Notificações</span>
                  </button>

                  {/* Dropdown Notificações */}
                  {showNotifications && (
                    <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 overflow-hidden">
                      <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-extrabold text-slate-800">Notificações</h3>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {hasUnread && (
                          <Link to="/chats" onClick={() => setShowNotifications(false)} className="block px-4 py-3 hover:bg-slate-50 border-b border-slate-50 relative bg-primary/5">
                            <p className="text-sm font-bold text-slate-800">Nova mensagem recebida! 💬</p>
                            <p className="text-xs text-slate-500 mt-1">Acesse o chat para continuar negociando.</p>
                          </Link>
                        )}
                        <div className="px-4 py-3 hover:bg-slate-50">
                          <p className="text-sm font-bold text-slate-800">Bem-vindo(a)! 🎉</p>
                          <p className="text-xs text-slate-500 mt-1">Complete seu perfil para começar.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* User Menu Dropdown */}
                <div className="relative ml-2" ref={userMenuRef}>
                  <button 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 hover:bg-slate-100 px-3 py-1.5 rounded-full transition-colors border border-transparent hover:border-slate-200"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-300">
                      {user?.photo_url ? (
                        <img src={user.photo_url} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <div className="hidden lg:flex flex-col items-start">
                      <span className="text-sm font-bold text-slate-800 leading-none">{user?.name?.split(' ')[0]}</span>
                      <span className="text-[10px] text-slate-500 font-medium">Meu Perfil</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* Dropdown User Menu (OLX Style) */}
                  {showUserMenu && (
                    <div className="absolute top-full right-0 mt-2 w-72 bg-white shadow-2xl border border-slate-200 z-50 rounded-lg overflow-hidden">
                      {/* Header Dropdown */}
                      <div className="px-4 py-4 border-b border-slate-100 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-300 flex-shrink-0">
                          {user?.photo_url ? (
                            <img src={user.photo_url} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-6 h-6 text-slate-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm leading-tight">{user?.name}</p>
                          <Link to="/profile" onClick={() => setShowUserMenu(false)} className="text-xs text-primary hover:underline font-bold mt-1 inline-block">
                            Meu perfil
                          </Link>
                        </div>
                      </div>

                      {/* Sections based on role */}
                      <div className="max-h-[60vh] overflow-y-auto pb-2">
                        {user?.role === 'professional' && (
                          <div className="py-2 border-b border-slate-100">
                            <p className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Prestar Serviços
                            </p>
                            <Link to="/proposals" onClick={() => setShowUserMenu(false)} className="block px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors">
                              Minhas Propostas
                            </Link>
                            <Link to="/home" onClick={() => setShowUserMenu(false)} className="block px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors">
                              Buscar Novos Pedidos
                            </Link>
                          </div>
                        )}

                        {user?.role === 'client' && (
                          <div className="py-2 border-b border-slate-100">
                            <p className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Contratar Serviços
                            </p>
                            <Link to="/requests" onClick={() => setShowUserMenu(false)} className="block px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors">
                              Meus Pedidos
                            </Link>
                            <Link to="/home" onClick={() => setShowUserMenu(false)} className="block px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors">
                              Buscar Serviços
                            </Link>
                          </div>
                        )}

                        {/* Pagamentos / Carteira */}
                        <div className="py-2 border-b border-slate-100">
                          <p className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Pagamentos
                          </p>
                          {user?.role === 'professional' ? (
                            <Link to="/wallet" onClick={() => setShowUserMenu(false)} className="block px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors">
                              Carteira (Diamantes)
                            </Link>
                          ) : (
                            <Link to="/profile" onClick={() => setShowUserMenu(false)} className="block px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors">
                              Gerenciar Pagamentos
                            </Link>
                          )}
                        </div>

                        {/* Conta */}
                        <div className="py-2">
                          <p className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Conta
                          </p>
                          <Link to="/profile" onClick={() => setShowUserMenu(false)} className="block px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors">
                            Configurações
                          </Link>
                          <button onClick={handleLogout} className="w-full text-left block px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-danger transition-colors">
                            Sair
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Anunciar CTA Button */}
                {user?.role === 'client' && (
                  <Link 
                    to="/request/new" 
                    className="ml-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-full font-bold transition-colors shadow-sm flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Novo Pedido
                  </Link>
                )}
              </>
            ) : (
              <div className="flex items-center gap-6">
                <Link to="/register" className="text-slate-600 hover:text-primary font-bold text-sm">Seja um profissional</Link>
                <Link to="/help" className="text-slate-600 hover:text-primary font-bold text-sm">Como funciona?</Link>
                <Link to="/help/safety" className="text-slate-600 hover:text-primary font-bold text-sm">Segurança</Link>
                <div className="w-px h-6 bg-slate-200"></div>
                <Link to="/login" className="flex items-center gap-2 text-primary font-bold hover:bg-primary/5 px-4 py-2 rounded-full transition-colors">
                  <User className="w-5 h-5" />
                  Entrar
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Categories Menu - OLX / GetNinjas Style */}
        {(!user || user.type === 'client') && (
          <div className="border-t border-slate-100 bg-white" ref={categoryMenuRef}>
            <div className="container mx-auto max-w-5xl px-4 relative">
              <div className="flex justify-between items-center overflow-x-auto hide-scrollbar">
                {CATEGORY_MENUS.map((cat) => (
                  <Link
                    key={cat.name}
                    to={`/categoria/${cat.slug}`}
                    className={`flex flex-col items-center gap-2 py-4 px-4 min-w-[100px] border-b-2 transition-all ${
                      activeCategory === cat.name 
                        ? 'border-primary text-primary bg-primary/5' 
                        : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                    onMouseEnter={() => setActiveCategory(cat.name)}
                  >
                    <cat.icon className={`w-6 h-6 ${activeCategory === cat.name ? 'text-primary' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold text-center leading-tight">{cat.name}</span>
                  </Link>
                ))}
              </div>

              {/* Mega Menu Dropdown */}
              {activeCategory && (
                <div 
                  className="absolute left-0 right-0 top-full bg-white shadow-xl border-x border-b border-slate-200 rounded-b-2xl p-8 z-50 animate-in fade-in slide-in-from-top-2"
                  onMouseLeave={() => setActiveCategory(null)}
                >
                  <div className="grid grid-cols-4 gap-8">
                    {CATEGORY_MENUS.find(c => c.name === activeCategory)?.items.map((item) => {
                      const category = CATEGORY_MENUS.find(c => c.name === activeCategory);
                      return (
                        <Link
                          key={item}
                          to={`/categoria/${category?.slug}?servico=${encodeURIComponent(item)}`}
                          className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors"
                          onClick={() => setActiveCategory(null)}
                        >
                          <ChevronDown className="w-3 h-3 -rotate-90 text-slate-300" />
                          {item}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
      )}

      {/* Mobile Header (Top) */}
      {!isActive('/login') && !isActive('/register') && (
      <nav className="md:hidden bg-white shadow-sm sticky top-0 z-50 border-b border-slate-200">
        <div className="px-4 h-14 flex items-center justify-between">
          <Link to="/" className="text-lg font-extrabold text-blue-950 flex items-center gap-2 truncate">
            <img src="/logo.jpg" alt="Logo" className="h-8 w-auto rounded-md" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/logo.png'; }} />
            Conecta Serviço
          </Link>
          
          {isAuthenticated ? (
             <div className="flex items-center gap-3">
               {user?.role === 'client' && (
                 <Link to="/request/new" className="bg-orange-500 text-white p-2 rounded-full">
                   <Plus className="w-5 h-5" />
                 </Link>
               )}
               {user?.role === 'professional' && (
                 <Link to="/wallet" className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors cursor-pointer border border-blue-100 shadow-sm">
                   <div className="bg-blue-500 rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                     <span className="text-white text-[10px] font-bold">💎</span>
                   </div>
                   <span className="font-bold text-slate-700">{user?.coinsBalance || 0}</span>
                 </Link>
               )}
             </div>
          ) : (
            <Link to="/login" className="text-sm font-bold text-primary">Entrar</Link>
          )}
        </div>
      </nav>
      )}

      {/* Mobile Bottom Navigation */}
      {isAuthenticated && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 pb-safe">
          <div className="flex justify-around items-center h-16">
            <Link to="/home" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/home') ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}>
              <Home className="w-6 h-6" />
              <span className="text-[10px] font-bold">Início</span>
            </Link>
            
            <Link to={user?.role === 'professional' ? '/proposals' : '/requests'} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive(user?.role === 'professional' ? '/proposals' : '/requests') ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}>
              <ClipboardList className="w-6 h-6" />
              <span className="text-[10px] font-bold">{user?.role === 'professional' ? 'Propostas' : 'Pedidos'}</span>
            </Link>
            
            <Link to="/chats" className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/chats') ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}>
              <div className="relative">
                <MessageSquare className="w-6 h-6" />
                {hasUnread && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-danger rounded-full border-2 border-white"></span>
                )}
              </div>
              <span className="text-[10px] font-bold">Chat</span>
            </Link>
            
            <Link to="/profile" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/profile') ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}>
              <User className="w-6 h-6" />
              <span className="text-[10px] font-bold">Perfil</span>
            </Link>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;