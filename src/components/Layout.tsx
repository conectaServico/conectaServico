import { ReactNode } from 'react';
import Navbar from './Navbar';
import { Link, useLocation } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Linkedin } from 'lucide-react';
import { useUserStore } from '@/store/userStore';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { isAuthenticated } = useUserStore();
  const location = useLocation();

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col ${isAuthenticated ? 'pb-16 md:pb-0' : ''}`}>
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>
      
      {/* Footer Profissional - Oculto para usuários logados e nas páginas de auth */}
      {!isAuthenticated && !isAuthPage && (
        <footer className="bg-slate-900 pt-16 pb-8 border-t border-slate-800">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="space-y-4">
              <Link to="/home" className="text-2xl font-bold text-white flex items-center gap-2">
                <img
                  src="/logo.jpg"
                  alt="Conecta Serviço Logo"
                  className="h-10 w-auto rounded-md"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/logo.png';
                  }}
                />
                Conecta Serviço
              </Link>
              <p className="text-slate-400 text-sm leading-relaxed">
                A plataforma que conecta clientes aos melhores profissionais da região. Simples, rápido e seguro.
              </p>
            </div>
            
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Para Clientes</h3>
              <ul className="space-y-3">
                <li><Link to="/request/new" className="text-slate-400 hover:text-primary-100 transition-colors text-sm">Fazer um pedido</Link></li>
                <li><Link to="/help" className="text-slate-400 hover:text-primary-100 transition-colors text-sm">Como funciona</Link></li>
                <li><Link to="/help/safety" className="text-slate-400 hover:text-primary-100 transition-colors text-sm">Dicas de segurança</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-bold text-lg mb-4">Para Profissionais</h3>
              <ul className="space-y-3">
                <li><Link to="/register" className="text-slate-400 hover:text-primary-100 transition-colors text-sm">Cadastre-se</Link></li>
                <li><Link to="/help" className="text-slate-400 hover:text-primary-100 transition-colors text-sm">Vantagens</Link></li>
                <li><Link to="/wallet" className="text-slate-400 hover:text-primary-100 transition-colors text-sm">Comprar Diamantes</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-bold text-lg mb-4">Institucional</h3>
              <ul className="space-y-3">
                <li><Link to="/terms" className="text-slate-400 hover:text-primary-100 transition-colors text-sm">Termos de Uso</Link></li>
                <li><Link to="/privacy" className="text-slate-400 hover:text-primary-100 transition-colors text-sm">Política de Privacidade</Link></li>
                <li><Link to="/help/contact" className="text-slate-400 hover:text-primary-100 transition-colors text-sm">Fale Conosco</Link></li>
              </ul>
              
              <div className="flex gap-4 mt-6">
                <a href="#" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-primary hover:text-white transition-all"><Facebook className="w-4 h-4" /></a>
                <a href="#" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-primary hover:text-white transition-all"><Instagram className="w-4 h-4" /></a>
                <a href="#" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-primary hover:text-white transition-all"><Twitter className="w-4 h-4" /></a>
                <a href="#" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-primary hover:text-white transition-all"><Linkedin className="w-4 h-4" /></a>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-800 text-center md:flex md:justify-between md:items-center">
            <p className="text-slate-500 text-sm">
              &copy; {new Date().getFullYear()} Conecta Serviço. Todos os direitos reservados.
            </p>
            <p className="text-slate-500 text-sm mt-2 md:mt-0">
              Feito com dedicação para conectar pessoas.
            </p>
          </div>
        </div>
      </footer>
      )}
    </div>
  );
};

export default Layout;
