import { useEffect, useState } from 'react';
import { collection, query, where, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useUserStore } from '@/store/userStore';
import { MessageSquare, User as UserIcon } from 'lucide-react';
import { RowsSkeleton } from '@/components/Skeleton';
import { Link, Outlet, useParams } from 'react-router-dom';
import { Proposal, ServiceRequest, PublicProfile, Message } from '@/types';

interface ChatPreview {
  chatId: string;
  otherUserName: string;
  otherUserPhoto: string;
  requestTitle: string;
  updatedAt: number;
}

const ChatsList = () => {
  const { user } = useUserStore();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [lastMessages, setLastMessages] = useState<Record<string, { text: string, time: number, unread: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const { chatId } = useParams<{ chatId: string }>();

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const isClient = user.role === 'client';

    // Consulta simétrica: cada lado filtra as propostas pelo próprio id.
    // (o campo clientId é desnormalizado na proposta na criação)
    const propQuery = query(
      collection(db, 'proposals'),
      where(isClient ? 'clientId' : 'professionalId', '==', user.id)
    );

    const unsubscribe = onSnapshot(
      propQuery,
      async (propSnap) => {
        const reqCache = new Map<string, ServiceRequest | null>();
        const userCache = new Map<string, PublicProfile | null>();

        const getRequest = async (reqId: string) => {
          if (!reqCache.has(reqId)) {
            const snap = await getDoc(doc(db, 'serviceRequests', reqId));
            reqCache.set(reqId, snap.exists() ? ({ id: snap.id, ...snap.data() } as ServiceRequest) : null);
          }
          return reqCache.get(reqId) ?? null;
        };
        const getUser = async (userId: string) => {
          if (!userId) return null;
          if (!userCache.has(userId)) {
            const snap = await getDoc(doc(db, 'publicProfiles', userId));
            userCache.set(userId, snap.exists() ? (snap.data() as PublicProfile) : null);
          }
          return userCache.get(userId) ?? null;
        };

        const activeChats: ChatPreview[] = [];
        for (const docSnap of propSnap.docs) {
          const prop = docSnap.data() as Proposal;
          const reqData = await getRequest(prop.requestId);
          if (!reqData) continue;

          const otherId = isClient ? prop.professionalId : reqData.clientId;
          const otherUser = await getUser(otherId);

          activeChats.push({
            chatId: `${prop.requestId}_${prop.professionalId}`,
            otherUserName:
              otherUser?.name || (isClient ? prop.professionalName || 'Profissional' : 'Cliente'),
            otherUserPhoto:
              otherUser?.photo_url || (isClient ? prop.professionalPhoto || '' : ''),
            requestTitle: `${reqData.subcategory || reqData.category} para ${reqData.propertyType}`,
            updatedAt: prop.created_at,
          });
        }
        setChats(activeChats.sort((a, b) => b.updatedAt - a.updatedAt));
        setLoading(false);
      },
      (err) => {
        console.error('Erro ao carregar conversas:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (chats.length === 0) return;

    const unsubscribes = chats.map(chat => {
      const q = query(collection(db, 'messages'), where('chatId', '==', chat.chatId));
      return onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(d => d.data() as Message);
        if (msgs.length > 0) {
          msgs.sort((a, b) => a.created_at - b.created_at);
          const lastMsg = msgs[msgs.length - 1];
          // For MVP, we'll consider it unread if the last message is from the other user and is marked as unread (!read)
          const isUnread = lastMsg.senderId !== user?.id && lastMsg.read === false;
          
          const preview = lastMsg.type === 'image' && !lastMsg.text ? '📷 Imagem' : lastMsg.text;
          setLastMessages(prev => ({
            ...prev,
            [chat.chatId]: { text: preview, time: lastMsg.created_at, unread: isUnread }
          }));
        }
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [chats, user?.id, chatId]);

  if (loading) return <div className="max-w-7xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden" aria-busy="true"><RowsSkeleton count={6} /></div>;

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-140px-var(--safe-top)-var(--safe-bottom))] md:h-[calc(100vh-100px)] flex bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* Lista de Chats (Esquerda) */}
      <div className={`w-full md:w-1/3 lg:w-96 flex flex-col border-r border-slate-200 ${chatId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-primary" />
            Mensagens
          </h1>
        </div>

        <div className="flex-grow overflow-y-auto">
          {chats.length === 0 ? (
            <div className="p-8 text-center">
              <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm">
                Nenhuma conversa ainda.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {chats.map(chat => {
                const lastMsg = lastMessages[chat.chatId];
                return (
                  <Link 
                    key={chat.chatId} 
                    to={`/chats/${chat.chatId}`}
                    className={`flex items-center p-4 hover:bg-slate-50 transition-colors group ${chatId === chat.chatId ? 'bg-primary/5 border-l-4 border-primary' : 'border-l-4 border-transparent'}`}
                  >
                    <div className="relative mr-3">
                      <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0 overflow-hidden">
                        {chat.otherUserPhoto ? (
                          <img src={chat.otherUserPhoto} alt={chat.otherUserName} className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      {lastMsg?.unread && (
                        <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-danger rounded-full border-2 border-white"></span>
                      )}
                    </div>
                    
                    <div className="flex-grow min-w-0 pr-2">
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className={`font-bold text-base truncate ${lastMsg?.unread ? 'text-slate-900' : 'text-slate-700'}`}>
                          {chat.otherUserName}
                        </h3>
                        {lastMsg && (
                          <span className={`text-[10px] whitespace-nowrap ml-2 ${lastMsg.unread ? 'text-primary font-bold' : 'text-slate-400'}`}>
                            {new Date(lastMsg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs truncate ${lastMsg?.unread ? 'font-bold text-slate-800' : 'font-medium text-slate-500'}`}>
                        {lastMsg ? lastMsg.text : chat.requestTitle}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Área do Chat (Direita) */}
      <div className={`w-full md:w-2/3 lg:flex-1 bg-slate-50/30 flex flex-col ${!chatId ? 'hidden md:flex' : 'flex'}`}>
        {chatId ? (
          <Outlet context={{ chats }} />
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-slate-400">
            <MessageSquare className="w-16 h-16 mb-4 text-slate-200" />
            <p className="text-lg font-medium text-slate-500">Selecione uma conversa para começar</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default ChatsList;