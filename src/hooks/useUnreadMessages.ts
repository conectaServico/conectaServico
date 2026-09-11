import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useUserStore } from '@/store/userStore';
import { Proposal } from '@/types';
import { useLocation } from 'react-router-dom';

export const useUnreadMessages = () => {
  const { user } = useUserStore();
  const [hasUnread, setHasUnread] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!user) {
      setHasUnread(false);
      return;
    }

    let unsubscribes: (() => void)[] = [];
    let unreadMap: Record<string, boolean> = {};

    const setupMessageListeners = (chatIds: string[]) => {
      // Clean up previous listeners
      unsubscribes.forEach(unsub => unsub());
      unsubscribes = [];
      unreadMap = {};

      if (chatIds.length === 0) {
        setHasUnread(false);
        return;
      }

      unsubscribes = chatIds.map(chatId => {
        const q = query(collection(db, 'messages'), where('chatId', '==', chatId));
        return onSnapshot(q, (snapshot) => {
          const msgs = snapshot.docs.map(d => d.data());
          if (msgs.length > 0) {
            msgs.sort((a, b) => a.created_at - b.created_at);
            const lastMsg = msgs[msgs.length - 1];

            const isUnread = lastMsg.senderId !== user.id && lastMsg.read === false;   
            const isViewingChat = location.pathname.startsWith(`/chats/${chatId}`);   

            unreadMap[chatId] = isUnread && !isViewingChat;
            setHasUnread(Object.values(unreadMap).some(Boolean));
          } else {
             unreadMap[chatId] = false;
             setHasUnread(Object.values(unreadMap).some(Boolean));
          }
        });
      });
    };

    // Um único listener nas propostas do usuário (clientId é desnormalizado na proposta),
    // simétrico para cliente e profissional — sem varrer a coleção inteira.
    const isClient = user.role === 'client';
    const propQuery = query(
      collection(db, 'proposals'),
      where(isClient ? 'clientId' : 'professionalId', '==', user.id)
    );
    const propUnsub = onSnapshot(propQuery, (propSnap) => {
      const chatIds = propSnap.docs.map(d => {
        const p = d.data() as Proposal;
        return `${p.requestId}_${p.professionalId}`;
      });
      setupMessageListeners(chatIds);
    });

    return () => {
      propUnsub();
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user, location.pathname]);

  return hasUnread;
};
