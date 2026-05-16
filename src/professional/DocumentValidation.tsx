import { ShieldCheck, Upload, AlertCircle, CheckCircle2, ChevronLeft, Loader2 } from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { storage, db } from '@/services/firebase';
import toast from 'react-hot-toast';

const DocumentValidation = () => {
  const { user } = useUserStore();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'pending' | 'review' | 'approved'>('pending');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [docFront, setDocFront] = useState<File | null>(null);
  const [docBack, setDocBack] = useState<File | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.verified) {
      setStatus('approved');
      setLoading(false);
      return;
    }
    
    // Check if there is a pending validation
    const checkValidationStatus = async () => {
      try {
        const docRef = doc(db, 'validations', user.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.status === 'pending') {
            setStatus('review');
          } else if (data.status === 'approved') {
            setStatus('approved');
          } else if (data.status === 'rejected') {
            setStatus('pending');
            toast.error('Seus documentos foram recusados. Por favor, envie novamente.');
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    checkValidationStatus();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFront || !docBack) {
      toast.error('Por favor, selecione todas as imagens necessárias.');
      return;
    }
    if (!user) return;

    setSubmitting(true);
    try {
      // Upload images
      const uploadImage = async (file: File, path: string) => {
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        return await getDownloadURL(snapshot.ref);
      };

      const docFrontUrl = await uploadImage(docFront, `validations/${user.id}/doc_front`);
      const docBackUrl = await uploadImage(docBack, `validations/${user.id}/doc_back`);

      // Save to firestore
      await setDoc(doc(db, 'validations', user.id), {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        docFrontUrl,
        docBackUrl,
        status: 'pending',
        created_at: Date.now()
      });

      setStatus('review');
      toast.success('Documentos enviados com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar documentos. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-12 pt-4 px-4">
      <button 
        onClick={() => navigate('/profile')} 
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-6 font-medium"
      >
        <ChevronLeft className="w-5 h-5" />
        Voltar para o perfil
      </button>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Validação de documentos</h1>
            <p className="text-slate-500">Aumente sua credibilidade na plataforma</p>
          </div>
        </div>

        {status === 'approved' && (
          <div className="bg-success/10 text-success p-6 rounded-2xl flex flex-col items-center text-center gap-3">
            <CheckCircle2 className="w-12 h-12" />
            <h2 className="text-xl font-bold">Documentos validados!</h2>
            <p className="font-medium text-success/80">
              Sua conta já está verificada e você possui o selo de confiança no seu perfil.
            </p>
          </div>
        )}

        {status === 'review' && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-6 rounded-2xl flex flex-col items-center text-center gap-3">
            <AlertCircle className="w-12 h-12 text-amber-500" />
            <h2 className="text-xl font-bold">Em análise</h2>
            <p className="font-medium">
              Recebemos seus documentos e nossa equipe está analisando. Esse processo pode levar até 2 dias úteis.
            </p>
          </div>
        )}

        {status === 'pending' && (
          <>
            <div className="bg-slate-50 p-4 rounded-2xl mb-8">
              <h3 className="font-bold text-slate-900 mb-2">Por que validar?</h3>
              <ul className="text-sm text-slate-600 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                  Ganha um selo de confiança visível para todos os clientes.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                  Recebe até 3x mais contatos para orçamentos.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                  Maior segurança para você e para os clientes.
                </li>
              </ul>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Documento de Identidade (RG ou CNH) - Frente</label>
                <div className="relative border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer group">
                  <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => setDocFront(e.target.files?.[0] || null)} />
                  {docFront ? (
                    <div className="flex flex-col items-center">
                      <CheckCircle2 className="w-8 h-8 text-success mb-2" />
                      <p className="text-sm font-bold text-success">{docFront.name}</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3 group-hover:text-primary transition-colors" />
                      <p className="text-sm font-bold text-slate-700">Clique para enviar a frente</p>
                      <p className="text-xs text-slate-500 mt-1">JPG ou PNG (Max. 5MB)</p>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Documento de Identidade - Verso</label>
                <div className="relative border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer group">
                  <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => setDocBack(e.target.files?.[0] || null)} />
                  {docBack ? (
                    <div className="flex flex-col items-center">
                      <CheckCircle2 className="w-8 h-8 text-success mb-2" />
                      <p className="text-sm font-bold text-success">{docBack.name}</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3 group-hover:text-primary transition-colors" />
                      <p className="text-sm font-bold text-slate-700">Clique para enviar o verso</p>
                      <p className="text-xs text-slate-500 mt-1">JPG ou PNG (Max. 5MB)</p>
                    </>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-hover transition-all flex items-center justify-center shadow-md disabled:opacity-70"
              >
                {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Enviar documentos'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default DocumentValidation;