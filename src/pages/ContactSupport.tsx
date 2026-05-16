import { ChevronLeft, Send, MessageCircle, Mail, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useUserStore } from '@/store/userStore';
import toast from 'react-hot-toast';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/services/firebase';

const ContactSupport = () => {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) {
      toast.error('Preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'supportTickets'), {
        userId: user?.id || 'anonymous',
        userEmail: user?.email || 'N/A',
        userRole: user?.role || 'N/A',
        subject,
        message,
        status: 'open',
        created_at: Date.now()
      });
      toast.success('Mensagem enviada com sucesso! Nossa equipe responderá em breve.');
      setSubject('');
      setMessage('');
      navigate('/help');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao enviar mensagem. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-12 pt-8 px-4">
      <button 
        onClick={() => navigate('/help')} 
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-6 font-bold"
      >
        <ChevronLeft className="w-5 h-5" />
        Voltar para Central de Ajuda
      </button>

      <div className="mb-10 text-center">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageCircle className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Falar com o Suporte</h1>
        <p className="text-slate-500">Envie sua dúvida ou problema e nossa equipe ajudará o mais rápido possível.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-4 text-lg">Canais de Atendimento</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-bold text-slate-800 text-sm">E-mail</p>
                  <p className="text-sm text-slate-500">suporte@conectaservico.com</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-bold text-slate-800 text-sm">Horário</p>
                  <p className="text-sm text-slate-500">Seg a Sex das 09h às 18h</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Assunto do contato</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-4 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                >
                  <option value="">Selecione o assunto...</option>
                  <option value="Dúvida sobre pagamentos/diamantes">Dúvida sobre pagamentos/diamantes</option>
                  <option value="Problema com um usuário">Problema com um usuário</option>
                  <option value="Erro no aplicativo">Erro no aplicativo</option>
                  <option value="Validação de documentos">Validação de documentos</option>
                  <option value="Outro assunto">Outro assunto</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Sua mensagem</label>
                <textarea
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Descreva detalhadamente como podemos ajudar..."
                  className="w-full p-4 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-hover transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/20 disabled:opacity-70"
              >
                {loading ? 'Enviando...' : (
                  <>
                    Enviar Mensagem <Send className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactSupport;
