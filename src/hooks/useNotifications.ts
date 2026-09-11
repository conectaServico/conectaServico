import { useEffect, useState } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useUserStore } from '@/store/userStore';

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  created_at: number;
};

/** Central de avisos in-app. Escuta `users/{uid}/notifications` (escrito só por Functions). */
export function useNotifications() {
  const userId = useUserStore((s) => s.user?.id);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'users', userId, 'notifications'),
      orderBy('created_at', 'desc'),
      limit(40)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification)));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [userId]);

  const unreadCount = items.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    if (!userId) return;
    try {
      await updateDoc(doc(db, 'users', userId, 'notifications', id), { read: true });
    } catch (e) {
      console.error(e);
    }
  };

  const markAllRead = async () => {
    if (!userId) return;
    const unread = items.filter((n) => !n.read);
    if (!unread.length) return;
    try {
      const batch = writeBatch(db);
      unread.forEach((n) => batch.update(doc(db, 'users', userId, 'notifications', n.id), { read: true }));
      await batch.commit();
    } catch (e) {
      console.error(e);
    }
  };

  return { items, unreadCount, loading, markRead, markAllRead };
}
