import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
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

    let mainUnsubscribe: (() => void) | undefined;

    if (user.role === 'client') {
      const reqQuery = query(collection(db, 'serviceRequests'), where('clientId', '==', user.id));
      mainUnsubscribe = onSnapshot(reqQuery, async (reqSnap) => {
        const requestIds = reqSnap.docs.map(d => d.id);
        if (requestIds.length > 0) {
          // For clients, we also need to listen to proposals
          const propUnsubscribe = onSnapshot(collection(db, 'proposals'), (propSnap) => {
            const clientProposals = propSnap.docs
              .map(d => d.data() as Proposal)
              .filter(p => requestIds.includes(p.requestId));

            const chatIds = clientProposals.map(p => `${p.requestId}_${p.professionalId}`);
            setupMessageListeners(chatIds);
          });
          unsubscribes.push(propUnsubscribe);
        } else {
           setupMessageListeners([]);
        }
      });
    } else {
      const propQuery = query(collection(db, 'proposals'), where('professionalId', '==', user.id));
      mainUnsubscribe = onSnapshot(propQuery, (propSnap) => {
        const chatIds = propSnap.docs.map(d => `${(d.data() as Proposal).requestId}_${user.id}`);
        setupMessageListeners(chatIds);
      });
    }

    return () => {
      if (mainUnsubscribe) mainUnsubscribe();
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user, location.pathname]);

  return hasUnread;
};
