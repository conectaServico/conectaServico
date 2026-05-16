import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '@/services/firebase';
import { useUserStore } from '@/store/userStore';
import { User } from '@/types';

// Components
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';

// Pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Home from '@/pages/Home';
import Profile from '@/pages/Profile';
import JobDetails from '@/pages/JobDetails';
import Chat from '@/pages/Chat';
import ChatsList from '@/pages/ChatsList';
import Terms from '@/pages/Terms';
import Privacy from '@/pages/Privacy';
import PublicProfile from '@/pages/PublicProfile';
import Search from '@/pages/Search';
import HelpCenter from '@/pages/HelpCenter';
import ContactSupport from '@/pages/ContactSupport';
import SafetyRules from '@/pages/SafetyRules';
import AllFaqs from '@/pages/AllFaqs';

// Client Pages
import NewJob from '@/client/NewJob';
import RequestSuccess from '@/client/RequestSuccess';
import RequestsList from '@/client/RequestsList';
// Professional Pages
import ProHome from '@/professional/ProHome';
import ProProposals from '@/professional/ProProposals';
import Wallet from '@/professional/Wallet';
import DocumentValidation from '@/professional/DocumentValidation';
import AdminPanel from '@/admin/AdminPanel';
import { Toaster } from 'react-hot-toast';

function App() {
  const setUser = useUserStore((state) => state.setUser);
  const [initializing, setInitializing] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setInitializing(false);
      setUser(null);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data() as User);
        }
      } else {
        setUser(null);
      }
      setInitializing(false);
    });

    return () => unsubscribe();
  }, [setUser]);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
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
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/home" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          
          {/* Common Protected Routes */}
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
            path="/help" 
            element={
              <ProtectedRoute>
                <HelpCenter />
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
          <Route 
            path="/help/safety" 
            element={
              <ProtectedRoute>
                <SafetyRules />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/help/faqs" 
            element={
              <ProtectedRoute>
                <AllFaqs />
              </ProtectedRoute>
            } 
          />

          {/* Admin Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            } 
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
