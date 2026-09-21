import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '@/services/firebase';
import { ensurePushIfGranted, onForegroundPush, onPushTap } from '@/services/push';
import { installBackButton } from '@/services/native';
import { useUserStore } from '@/store/userStore';
import { User } from '@/types';

// Components (sempre presentes -> ficam no bundle de entrada)
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import ScrollToTop from '@/components/ScrollToTop';
import RouteFade from '@/components/RouteFade';
import AppLogo from '@/components/AppLogo';
import AppOnboarding, { markOnboardingSeen, onboardingSeen } from '@/components/AppOnboarding';
import toast, { Toaster } from 'react-hot-toast';
import { LOCKED_AUDIENCE } from '@/config/appTarget';

// Pages — carregadas sob demanda (code-splitting por rota)
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const VerifyAccount = lazy(() => import('@/pages/VerifyAccount'));
const Home = lazy(() => import('@/pages/Home'));
const Profile = lazy(() => import('@/pages/Profile'));
const JobDetails = lazy(() => import('@/pages/JobDetails'));
const Chat = lazy(() => import('@/pages/Chat'));
const ChatsList = lazy(() => import('@/pages/ChatsList'));
const Terms = lazy(() => import('@/pages/Terms'));
const Privacy = lazy(() => import('@/pages/Privacy'));
const PublicProfile = lazy(() => import('@/pages/PublicProfile'));
const Search = lazy(() => import('@/pages/Search'));
const HelpCenter = lazy(() => import('@/pages/HelpCenter'));
const ContactSupport = lazy(() => import('@/pages/ContactSupport'));
const SafetyRules = lazy(() => import('@/pages/SafetyRules'));
const AllFaqs = lazy(() => import('@/pages/AllFaqs'));
const CategoryPage = lazy(() => import('@/pages/CategoryPage'));

// Client Pages
const NewJob = lazy(() => import('@/client/NewJob'));
const RequestSuccess = lazy(() => import('@/client/RequestSuccess'));
const RequestsList = lazy(() => import('@/client/RequestsList'));

// Professional Pages
const ProProposals = lazy(() => import('@/professional/ProProposals'));
const Wallet = lazy(() => import('@/professional/Wallet'));
const DocumentValidation = lazy(() => import('@/professional/DocumentValidation'));
const AdminPanel = lazy(() => import('@/admin/AdminPanel'));
const BootstrapAdmin = lazy(() => import('@/pages/BootstrapAdmin'));
const AuthAction = lazy(() => import('@/pages/AuthAction'));
const DeleteAccount = lazy(() => import('@/pages/DeleteAccount'));

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
}

function App() {
  const setUser = useUserStore((state) => state.setUser);
  const setVerification = useUserStore((state) => state.setVerification);
  const currentUser = useUserStore((state) => state.user);
  const [initializing, setInitializing] = useState(isFirebaseConfigured);
  // Boas-vindas do app (só nos apps cliente/profissional, só na 1ª abertura).
  const [showIntro, setShowIntro] = useState(() => !!LOCKED_AUDIENCE && !onboardingSeen());

  // Cliente ou profissional logado e com permissão de notificação concedida: reconfirma
  // o token de push a cada sessão (o token do FCM pode rotacionar). Sem permissão, não
  // faz nada aqui — a tela de boas-vindas do app e o botão "Ativar avisos" cuidam do opt-in.
  useEffect(() => {
    if (currentUser?.id) {
      ensurePushIfGranted(currentUser.id);
    }
  }, [currentUser?.id]);

  // Aviso com o app aberto vira um toast; toque numa notificação do sistema abre a tela do aviso.
  useEffect(() => {
    if (!currentUser?.id) return;
    let alive = true;
    let offForeground: () => void = () => undefined;
    let offTap: () => void = () => undefined;

    onForegroundPush((m) => {
      const text = m.title ? `${m.title}${m.body ? ` — ${m.body}` : ''}` : m.body || 'Você tem um novo aviso';
      toast(text, { icon: '🔔', duration: 6000 });
    }).then((off) => (alive ? (offForeground = off) : off()));

    onPushTap((data) => {
      const link = typeof data.link === 'string' ? data.link : '';
      if (link.startsWith('/')) {
        window.history.pushState({}, '', link);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }).then((off) => (alive ? (offTap = off) : off()));

    return () => {
      alive = false;
      offForeground();
      offTap();
    };
  }, [currentUser?.id]);

  // Botão voltar do Android: volta uma tela; no início, duplo toque pra sair.
  useEffect(() => {
    let off: () => void = () => undefined;
    let alive = true;
    installBackButton({
      isRoot: (path) => ['/', '/login', '/home', '/requests', '/proposals', '/chats', '/profile', '/wallet'].includes(path),
      onExitHint: () => toast('Toque em voltar de novo para sair', { icon: '👋', duration: 2000 }),
      goHome: () => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      },
    }).then((remove) => (alive ? (off = remove) : remove()));
    return () => {
      alive = false;
      off();
    };
  }, []);

  // Quem já está logado não precisa das boas-vindas.
  useEffect(() => {
    if (currentUser && showIntro) {
      markOnboardingSeen();
      setShowIntro(false);
    }
  }, [currentUser, showIntro]);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setInitializing(false);
      setUser(null);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const provider =
          firebaseUser.providerData[0]?.providerId ||
          (firebaseUser.phoneNumber && !firebaseUser.email ? 'phone' : null);
        setVerification({
          emailVerified: firebaseUser.emailVerified,
          phoneVerified: !!firebaseUser.phoneNumber,
          signInProvider: provider,
        });
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        // Sessão sem doc = cadastro (por telefone) ainda não finalizado — o app
        // trata como deslogado; os fluxos de Login/Register retomam o wizard.
        const profile = userDoc.exists() ? (userDoc.data() as User) : null;

        // App nativo é um por lado (cliente / profissional): conta do outro lado não fica logada.
        if (profile && LOCKED_AUDIENCE && profile.role !== LOCKED_AUDIENCE) {
          toast.error(
            profile.role === 'professional'
              ? 'Essa conta é de profissional. Use o app Conecta Serviço Profissional.'
              : 'Essa conta é de cliente. Use o app Conecta Serviço Cliente.',
            { duration: 6000 }
          );
          await signOut(auth); // dispara este callback de novo, já deslogado
          return;
        }

        setUser(profile);
      } else {
        setUser(null);
        setVerification({ emailVerified: false, phoneVerified: false, signInProvider: null });
      }
      setInitializing(false);
    });

    return () => unsubscribe();
  }, [setUser, setVerification]);

  if (initializing) {
    // App nativo: continua a tela de abertura (mesmo degradê, logo e nome) até o login ser conferido —
    // sem piscar branco entre a abertura do sistema e o app. Tela cheia (cobre até a barra de status).
    if (LOCKED_AUDIENCE) {
      const pro = LOCKED_AUDIENCE === 'professional';
      return (
        <div
          className={`fixed inset-0 z-[70] flex flex-col items-center justify-center gap-5 text-white bg-gradient-to-br ${
            pro ? 'from-[#9A3412] via-[#EA580C] to-[#FB923C]' : 'from-[#1E3A8A] via-[#2563EB] to-[#3B82F6]'
          }`}
          role="status"
          aria-label="Carregando"
        >
          <div className="w-44 h-44 rounded-[2.6rem] bg-white shadow-2xl flex items-center justify-center animate-pulse">
            <img src="/logo.jpg" alt="" className="h-36 w-auto" />
          </div>
          <div className="text-3xl font-extrabold tracking-tight">Conecta Serviço</div>
          <span className={`bg-white font-black tracking-[0.2em] text-sm px-6 py-2 rounded-full ${pro ? 'text-orange-600' : 'text-primary'}`}>
            {pro ? 'PROFISSIONAL' : 'CLIENTE'}
          </span>
        </div>
      );
    }
    // Carregamento inicial com a marca (em vez de um círculo girando no vazio).
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-white pt-[var(--safe-top)]" role="status" aria-label="Carregando">
        <div className="animate-pulse">
          {LOCKED_AUDIENCE ? (
            <AppLogo />
          ) : (
            <img src="/logo.jpg" alt="Conecta Serviço" className="h-20 w-auto rounded-2xl" />
          )}
        </div>
        <div className="h-1 w-28 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full w-1/2 rounded-full bg-primary animate-pulse" />
        </div>
      </div>
    );
  }

  if (showIntro && LOCKED_AUDIENCE && !currentUser) {
    return (
      <AppOnboarding
        audience={LOCKED_AUDIENCE}
        onFinish={() => {
          markOnboardingSeen();
          setShowIntro(false);
        }}
      />
    );
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#334155',
            color: '#fff',
            borderRadius: '12px',
            fontWeight: 'bold',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Layout>
        {!isFirebaseConfigured && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Firebase ainda nao foi configurado. Crie um arquivo `.env.local` com as chaves `VITE_FIREBASE_*`
            para habilitar login, cadastro, pedidos e chat.
          </div>
        )}
        <Suspense fallback={<PageFallback />}>
          <RouteFade>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/action" element={<AuthAction />} />
            <Route path="/excluir-conta" element={<DeleteAccount />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/categoria/:slug" element={<CategoryPage />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/help/safety" element={<SafetyRules />} />
            <Route path="/help/faqs" element={<AllFaqs />} />

            {/* Common Protected Routes */}
            <Route
              path="/verify"
              element={
                <ProtectedRoute>
                  <VerifyAccount />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/:id"
              element={
                <ProtectedRoute>
                  <PublicProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/search"
              element={
                <ProtectedRoute>
                  <Search />
                </ProtectedRoute>
              }
            />
            <Route
              path="/requests"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <RequestsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/requests/:id"
              element={
                <ProtectedRoute>
                  <JobDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chats"
              element={
                <ProtectedRoute>
                  <ChatsList />
                </ProtectedRoute>
              }
            >
              <Route path=":chatId" element={<Chat />} />
            </Route>

            {/* Client Routes */}
            <Route
              path="/request/new"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <NewJob />
                </ProtectedRoute>
              }
            />
            <Route
              path="/request/success"
              element={
                <ProtectedRoute allowedRoles={['client']}>
                  <RequestSuccess />
                </ProtectedRoute>
              }
            />

            {/* Professional Routes */}
            <Route
              path="/proposals"
              element={
                <ProtectedRoute allowedRoles={['professional']}>
                  <ProProposals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wallet"
              element={
                <ProtectedRoute allowedRoles={['professional']}>
                  <Wallet />
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedRoute allowedRoles={['professional']}>
                  <DocumentValidation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/help/contact"
              element={
                <ProtectedRoute>
                  <ContactSupport />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPanel />
                </ProtectedRoute>
              }
            />
            {/* Uso único pra conceder o 1º admin — a própria function exige o
                ADMIN_BOOTSTRAP_SECRET, então só precisa estar logado pra acessar a tela. */}
            <Route
              path="/bootstrap-admin"
              element={
                <ProtectedRoute>
                  <BootstrapAdmin />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </RouteFade>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
