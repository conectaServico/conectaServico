import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { Message } from '@/types';
import { useUserStore } from '@/store/userStore';
import { Send, Loader2, User as UserIcon, ShieldCheck, ChevronLeft, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';

const Chat = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { user } = useUserStore();
  const { chats } = useOutletContext<{ chats: any[] }>();
  const currentChat = chats.find(c => c.chatId === chatId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatId || !user) return;

    // Fetch messages
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Message));
      
      // Sort manually by time
      msgs.sort((a, b) => a.created_at - b.created_at);
      
      // Mark unread messages as read
      const unreadMsgs = msgs.filter(m => m.senderId !== user.id && m.read === false);
      unreadMsgs.forEach(m => {
        updateDoc(doc(db, 'messages', m.id), { read: true }).catch(console.error);
      });
      
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (error) => {
      console.error("Erro ao carregar mensagens:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !chatId) return;

    try {
      await addDoc(collection(db, 'messages'), {
        chatId: chatId,
        senderId: user.id,
        text: newMessage.trim(),
        created_at: Date.now(),
        read: false,
      });
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  if (loading) return <div className="flex justify-center py-20 flex-grow"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>;

  return (
    <div className="flex-grow flex flex-col h-full bg-white overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/chats')} className="md:hidden p-2 -ml-2 text-slate-500 hover:text-primary">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="w-12 h-12 bg-white rounded-full border-2 border-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {currentChat?.otherUserPhoto ? (
              <img src={currentChat.otherUserPhoto} alt={currentChat.otherUserName} className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-6 h-6 text-slate-400" />
            )}
          </div>
          <div>
            <p className="font-bold text-slate-900 text-lg leading-tight">{currentChat?.otherUserName || 'Profissional'}</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50">
        <div className="text-center">
          <span className="bg-slate-200 text-slate-600 text-xs font-bold px-3 py-1 rounded-full">
            Início da conversa
          </span>
        </div>
        
        {messages.length === 0 ? (
          <div className="text-center py-10 text-slate-400 flex flex-col items-center justify-center h-full">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
              <MessageSquare className="w-8 h-8 text-slate-300" />
            </div>
            <p className="font-medium text-slate-600">Nenhuma mensagem ainda</p>
            <p className="text-sm">Envie a primeira mensagem para começar a negociar.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === user?.id;
            const showAvatar = index === 0 || messages[index - 1].senderId !== msg.senderId;

            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
                {!isMe && showAvatar && (
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex-shrink-0 overflow-hidden hidden sm:block mt-auto">
                    {currentChat?.otherUserPhoto ? (
                      <img src={currentChat.otherUserPhoto} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-full h-full p-1.5 text-slate-400" />
                    )}
                  </div>
                )}
                {!isMe && !showAvatar && <div className="w-8 hidden sm:block"></div>}
                
                <div className={`max-w-[75%] p-3.5 rounded-2xl text-[15px] shadow-sm ${
                  isMe 
                    ? 'bg-primary text-white rounded-br-sm' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                }`}>
                  <p className="leading-relaxed">{msg.text}</p>
                  <p className={`text-[10px] mt-1.5 font-medium ${isMe ? 'text-primary-100 text-right' : 'text-slate-400 text-left'}`}>
                    {format(msg.created_at, 'HH:mm')}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white flex gap-3 items-end">
        <button type="button" className="p-3 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-xl transition-colors">
          <ImageIcon className="w-6 h-6" />
        </button>
        <textarea
          rows={1}
          className="flex-grow p-3.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-slate-50 text-slate-900 resize-none max-h-32"
          placeholder="Digite sua mensagem..."
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e);
            }
          }}
        />
        <button
          type="submit"
          className="bg-primary text-white p-3.5 rounded-xl hover:bg-primary-hover transition-all disabled:opacity-50 disabled:hover:bg-primary shadow-sm shadow-primary/20"
          disabled={!newMessage.trim()}
        >
          <Send className="w-6 h-6" />
        </button>
      </form>
    </div>
  );
};

// Helper component for MessageSquare
const MessageSquare = ({ className, ...props }: any) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export default Chat;