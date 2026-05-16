import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { 
  User, 
  MessageSquare, 
  Home, 
  ClipboardList, 
  Bell, 
  Search, 
  MapPin, 
  ChevronDown,
  LogOut,
  Settings,
  Diamond,
  Plus
} from 'lucide-react';
import { auth } from '@/services/firebase';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

const BRAZIL_STATES = [
  { value: '', label: 'Brasil' },
  { value: 'AC', label: 'AC' },
  { value: 'AL', label: 'AL' },
  { value: 'AP', label: 'AP' },
  { value: 'AM', label: 'AM' },
  { value: 'BA', label: 'BA' },
  { value: 'CE', label: 'CE' },
  { value: 'DF', label: 'DF' },
  { value: 'ES', label: 'ES' },
  { value: 'GO', label: 'GO' },
  { value: 'MA', label: 'MA' },
  { value: 'MT', label: 'MT' },
  { value: 'MS', label: 'MS' },
  { value: 'MG', label: 'MG' },
  { value: 'PA', label: 'PA' },
  { value: 'PB', label: 'PB' },
  { value: 'PR', label: 'PR' },
  { value: 'PE', label: 'PE' },
  { value: 'PI', label: 'PI' },
  { value: 'RJ', label: 'RJ' },
  { value: 'RN', label: 'RN' },
  { value: 'RS', label: 'RS' },
  { value: 'RO', label: 'RO' },
  { value: 'RR', label: 'RR' },
  { value: 'SC', label: 'SC' },
  { value: 'SP', label: 'SP' },
  { value: 'SE', label: 'SE' },
  { value: 'TO', label: 'TO' }
];

const Navbar = () => {
  const { user, isAuthenticated, logout } = useUserStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const hasUnread = useUnreadMessages();

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState(user?.state || '');

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() || searchLocation.trim() || searchLocation === '') {
      if (user?.role === 'professional') {
        navigate(`/home?q=${encodeURIComponent(searchQuery)}&city=${encodeURIComponent(searchLocation)}`);
      } else {
        navigate(`/home?q=${encodeURIComponent(searchQuery)}&city=${encodeURIComponent(searchLocation)}`);
      }
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Desktop Navigation - OLX Style */}
      {!isActive('/login') && !isActive('/register') && (
      <nav className="hidden md:block bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-[72px] flex items-center justify-between gap-6">
          
          {/* Logo */}
          <Link to="/home" className="flex items-center gap-2 flex-shrink-0">
            <img
              src="/logo.jpg"
              alt="Conecta Serviço"
              className="h-10 w-auto rounded-lg"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/logo.png';
              }}
            />
          </Link>

          {/* Search Bar (Both Roles) */}
          <form onSubmit={handleSearch} className="flex-1 max-w-3xl flex h-12 bg-slate-100 hover:bg-slate-200/80 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 transition-all rounded-full border border-slate-200 overflow-hidden items-center px-1">
            <input
              type="text"
              placeholder={user?.role === 'client' ? "Buscar serviços..." : "Buscar serviços..."}
              className="flex-1 bg-transparent border-none outline-none px-4 text-slate-800 placeholder-slate-500 h-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="h-6 w-px bg-slate-300 mx-2"></div>

            <div className="flex items-center text-slate-600 px-2 cursor-pointer hover:text-slate-900 h-full max-w-[150px] group">
              <MapPin className="w-5 h-5 mr-1.5 flex-shrink-0 group-hover:text-primary transition-colors" />
              <select 
                className="bg-transparent border-none outline-none w-full text-sm font-medium text-slate-700 cursor-pointer appearance-none group-hover:text-primary transition-colors"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
              >
                <option value="">Brasil</option>
                {BRAZIL_STATES.map((state) => (
                  <option key={state.value} value={state.value}>{state.label}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 ml-1 flex-shrink-0" />
            </div>

            <button type="submit" className="bg-slate-900 text-white p-2.5 rounded-full ml-1 hover:bg-slate-800 transition-colors h-10 w-10 flex items-center justify-center flex-shrink-0">
              <Search className="w-5 h-5" />
            </button>
          </form>

          {/* Action Icons & User Menu */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isAuthenticated ? (
              <>
                {/* Plano Profissional / Carteira */}
                {user?.role === 'professional' && (
                  <Link to="/wallet" className="flex items-center gap-2 text-slate-600 hover:text-primary px-3 py-2 rounded-lg transition-colors group">
                    <Diamond className="w-6 h-6 group-hover:fill-primary/20" />
                    <span className="text-sm font-semibold hidden lg:block">Carteira</span>
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
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-slate-600 hover:text-primary font-bold">Entrar</Link>
                <Link to="/register" className="bg-primary text-white px-5 py-2.5 rounded-full font-bold hover:bg-primary-hover transition-colors shadow-sm">
                  Criar conta
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
      )}

      {/* Mobile Header (Top) */}
      {!isActive('/login') && !isActive('/register') && (
      <nav className="md:hidden bg-white shadow-sm sticky top-0 z-50 border-b border-slate-200">
        <div className="px-4 h-14 flex items-center justify-between">
          <Link to="/home" className="text-xl font-bold text-primary flex items-center gap-2 truncate">
            <img src="/logo.jpg" alt="Logo" className="h-8 w-auto" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/logo.png'; }} />
          </Link>
          
          {isAuthenticated ? (
             <div className="flex items-center gap-3">
               <button onClick={() => navigate('/home')} className="text-slate-600 p-2">
                 <Search className="w-6 h-6" />
               </button>
               {user?.role === 'client' && (
                 <Link to="/request/new" className="bg-orange-500 text-white p-2 rounded-full">
                   <Plus className="w-5 h-5" />
                 </Link>
               )}
             </div>
          ) : (
            <Link to="/login" className="text-sm font-bold text-primary">Entrar</Link>
          )}
        </div>
        
        {/* Mobile Search Bar Below Header */}
        <div className="px-4 pb-3 bg-white">
          <form onSubmit={handleSearch} className="flex bg-slate-100 rounded-full items-center px-3 h-10 border border-slate-200">
            <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
            <input
              type="text"
              placeholder={user?.role === 'client' ? "Buscar serviços..." : "Buscar serviços..."}
              className="bg-transparent border-none outline-none flex-1 text-sm text-slate-800 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="h-4 w-px bg-slate-300 mx-2"></div>

              <div className="flex items-center cursor-pointer group">
                <MapPin className="w-4 h-4 text-slate-400 mr-1 flex-shrink-0 group-hover:text-primary transition-colors" />
                <select 
                  className="bg-transparent border-none outline-none w-16 text-sm font-medium text-slate-700 cursor-pointer appearance-none group-hover:text-primary transition-colors"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                >
                  <option value="">Brasil</option>
                  {BRAZIL_STATES.map((state) => (
                    <option key={state.value} value={state.value}>{state.label}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 ml-0.5 text-slate-400 flex-shrink-0" />
              </div>
            </form>
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