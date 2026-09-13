import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, onRequest, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import { FieldValue, type DocumentData, type QuerySnapshot } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

admin.initializeApp();
const db = admin.firestore();

// invoker: 'public' — sem isso, o Cloud Run por baixo do Functions v2 pode acabar
// exigindo autenticação na camada de infraestrutura pra invocar a function (antes
// mesmo dela rodar), o que quebra o preflight CORS do navegador com "No
// 'Access-Control-Allow-Origin' header" — a auth de verdade já é feita dentro de
// cada handler via Firebase Auth (assertAuth/assertVerified), então liberar a
// invocação pública aqui é seguro.
setGlobalOptions({ region: 'southamerica-east1', maxInstances: 10, invoker: 'public' });

const UNLOCK_COST = 10;
const SIGNUP_BONUS = 100;
const MAX_UNLOCKS = 3;
const REQUEST_EXPIRY_DAYS = 2; // pedido aberto sem proposta aceita expira depois disso
const DEFAULT_RADIUS_KM = 25;
const MAX_OPEN_REQUESTS_PER_CLIENT = 15;
const REFERRAL_BONUS = 100; // diamantes para quem indicou, quando o indicado verifica a conta
const MAX_REFERRAL_REWARDS = 30; // teto de indicações premiadas por usuário

const DIAMOND_PACKAGES: Record<string, { diamonds: number; price: number }> = {
  pkg_50: { diamonds: 50, price: 9.9 },
  pkg_150: { diamonds: 150, price: 27.9 },
  pkg_300: { diamonds: 300, price: 49.9 },
};

const ADMIN_BOOTSTRAP_SECRET = defineSecret('ADMIN_BOOTSTRAP_SECRET');
const MP_ACCESS_TOKEN = defineSecret('MP_ACCESS_TOKEN');
const MP_WEBHOOK_SECRET = defineSecret('MP_WEBHOOK_SECRET');

const MP_API = 'https://api.mercadopago.com';

function mpWebhookUrl(): string {
  const project = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || '';
  return `https://southamerica-east1-${project}.cloudfunctions.net/mercadoPagoWebhook`;
}

function assertAuth(req: CallableRequest): string {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Faça login para continuar.');
  return req.auth.uid;
}

/** Cria um aviso in-app para um usuário (central de notificações). Best-effort. */
async function notify(
  uid: string,
  n: { type: string; title: string; body: string; link?: string }
): Promise<void> {
  if (!uid) return;
  try {
    await db.collection(`users/${uid}/notifications`).add({
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link || '',
      read: false,
      created_at: Date.now(),
    });
  } catch (e) {
    console.error('notify falhou', uid, e);
  }
}

function assertAdmin(req: CallableRequest): string {
  const uid = assertAuth(req);
  if (req.auth?.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Acesso restrito a administradores.');
  }
  return uid;
}

/**
 * Envolve o handler de toda callable: se estourar um erro que não seja um
 * HttpsError explícito (ex.: índice do Firestore faltando, bug não previsto),
 * o SDK do cliente só recebe o código genérico "internal" sem detalhe algum —
 * o que torna esse tipo de bug quase impossível de diagnosticar a distância.
 * Aqui a mensagem real vai logada (console.error, pro Cloud Logging) e também
 * embutida na HttpsError devolvida ao cliente, então qualquer "internal" que
 * aparecer no app já vem com a causa.
 */
function wrapCallable<Res>(
  handler: (req: CallableRequest) => Res | Promise<Res>
): (req: CallableRequest) => Promise<Res> {
  return async (req) => {
    try {
      return await handler(req);
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      console.error('Erro não tratado numa callable:', err);
      const detail = err instanceof Error ? err.message : String(err);
      throw new HttpsError('internal', `Erro inesperado: ${detail}`);
    }
  };
}

/**
 * Contato verificado. Cliente: só e-mail confirmado (celular é opcional — evita
 * conflito quando a mesma pessoa já usa aquele número como login da conta de
 * profissional). Profissional: conta criada por telefone (SMS) — o próprio
 * login já é a verificação.
 */
function assertVerified(req: CallableRequest): string {
  const uid = assertAuth(req);
  const t = req.auth?.token as Record<string, unknown> | undefined;
  const provider = (t?.firebase as { sign_in_provider?: string } | undefined)?.sign_in_provider;
  if (t?.email_verified !== true && provider !== 'phone') {
    throw new HttpsError(
      'failed-precondition',
      'Confirme seu e-mail (ou entre pelo celular, se for profissional) para usar este recurso.'
    );
  }
  return uid;
}

// ---------------------------------------------------------------------------
// 0. Projeção pública do perfil
// `users/*` passa a ser legível só pelo dono/admin (contém telefone, e-mail, endereço,
// saldo). Tudo que o app mostra de OUTRA pessoa vem de `publicProfiles/*`, aqui.
// ---------------------------------------------------------------------------
const PUBLIC_PROFILE_FIELDS = [
  'name',
  'role',
  'photo_url',
  'city',
  'state',
  'uf',
  'bio',
  'services',
  'serviceCategories',
  'rating',
  'reviewCount',
  'verified',
  'created_at',
] as const;

const SEARCH_STOPWORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'para', 'por', 'com',
  'em', 'no', 'na', 'nos', 'nas', 'um', 'uma', 'que', 'ou', 'the', 'of',
]);

/** Mesmos tokens que `src/utils/search.ts` gera no cliente (palavras + prefixos 3..8). */
function buildSearchTokens(parts: Array<unknown>): string[] {
  const text = parts
    .filter((p) => typeof p === 'string' || Array.isArray(p))
    .map((p) => (Array.isArray(p) ? p.join(' ') : p))
    .join(' ');
  const words = String(text)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !SEARCH_STOPWORDS.has(w));
  const out = new Set<string>(words);
  for (const w of words) {
    for (let n = 3; n < w.length && n <= 8; n++) out.add(w.slice(0, n));
  }
  return Array.from(out).slice(0, 60);
}

function toPublicProfile(uid: string, data: DocumentData): DocumentData {
  const out: DocumentData = { id: uid };
  for (const key of PUBLIC_PROFILE_FIELDS) {
    if (data[key] !== undefined) out[key] = data[key];
  }
  out.searchTokens = buildSearchTokens([
    data.name,
    data.services,
    data.serviceCategories,
    data.city,
    data.uf,
    data.bio,
  ]);
  return out;
}

export const syncPublicProfile = onDocumentWritten('users/{userId}', async (event) => {
  const uid = event.params.userId;
  const after = event.data?.after;
  const pubRef = db.doc(`publicProfiles/${uid}`);

  if (!after || !after.exists) {
    await pubRef.delete().catch(() => undefined);
    return;
  }
  // merge:false -> troca o doc inteiro, para campos removidos sumirem também
  await pubRef.set(toPublicProfile(uid, after.data() as DocumentData));
});

// ---------------------------------------------------------------------------
// 1. Bônus de cadastro do profissional
// ---------------------------------------------------------------------------
export const onUserCreated = onDocumentCreated('users/{userId}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  const user = snap.data();
  if (user.role !== 'professional') return;
  if ((user.coinsBalance ?? 0) > 0) return;

  const now = Date.now();
  await db.runTransaction(async (tx) => {
    const fresh = await tx.get(snap.ref);
    if (!fresh.exists) return;
    if ((fresh.data()?.coinsBalance ?? 0) > 0) return;

    tx.update(snap.ref, { coinsBalance: SIGNUP_BONUS });
    tx.set(db.collection('transactions').doc(), {
      userId: snap.id,
      amount: SIGNUP_BONUS,
      type: 'BONUS_SIGNUP',
      description: 'Bônus de boas-vindas',
      created_at: now,
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Desbloquear contato do cliente (débito de diamantes atômico)
// ---------------------------------------------------------------------------
export const unlockContact = onCall(wrapCallable(async (req) => {
  const uid = assertVerified(req);
  const requestId = String(req.data?.requestId || '').trim();
  if (!requestId) throw new HttpsError('invalid-argument', 'requestId é obrigatório.');

  const proRef = db.doc(`users/${uid}`);
  const reqRef = db.doc(`serviceRequests/${requestId}`);

  return db.runTransaction(async (tx) => {
    // --- todas as leituras primeiro ---
    const proSnap = await tx.get(proRef);
    const reqSnap = await tx.get(reqRef);
    if (!proSnap.exists) throw new HttpsError('not-found', 'Perfil não encontrado.');
    if (!reqSnap.exists) throw new HttpsError('not-found', 'Pedido não encontrado.');

    const pro = proSnap.data() as Record<string, unknown>;
    const reqData = reqSnap.data() as Record<string, unknown>;

    const clientSnap = await tx.get(db.doc(`users/${String(reqData.clientId)}`));
    const existing = await tx.get(
      db
        .collection('unlocks')
        .where('requestId', '==', requestId)
        .where('professionalId', '==', uid)
        .limit(1)
    );

    const contact = () => {
      const c = (clientSnap.data() || {}) as Record<string, unknown>;
      return {
        clientName: (c.name as string) || (reqData.clientName as string) || 'Cliente',
        clientPhone: (c.phone as string) || (reqData.clientPhone as string) || '',
        clientEmail: (c.email as string) || '',
      };
    };

    // já desbloqueado: idempotente, devolve o contato sem cobrar de novo
    if (!existing.empty) {
      return { alreadyUnlocked: true, ...contact() };
    }

    if (pro.role !== 'professional') {
      throw new HttpsError('permission-denied', 'Apenas profissionais desbloqueiam contatos.');
    }
    if (!pro.photo_url) {
      throw new HttpsError('failed-precondition', 'Adicione uma foto de perfil antes de desbloquear contatos.');
    }
    if (!Array.isArray(pro.services) || pro.services.length === 0) {
      throw new HttpsError('failed-precondition', 'Cadastre os serviços que você presta no seu perfil.');
    }
    if (typeof pro.lat !== 'number' && !pro.uf && !pro.city) {
      throw new HttpsError('failed-precondition', 'Cadastre sua região (CEP) no seu perfil.');
    }
    if (reqData.status !== 'OPEN') {
      throw new HttpsError('failed-precondition', 'Este pedido não está mais aberto.');
    }
    if (((reqData.unlockCount as number) ?? 0) >= MAX_UNLOCKS) {
      throw new HttpsError('resource-exhausted', 'Este pedido já atingiu o limite de profissionais.');
    }
    if (((pro.coinsBalance as number) ?? 0) < UNLOCK_COST) {
      throw new HttpsError('failed-precondition', 'Saldo de diamantes insuficiente.');
    }

    // --- escritas ---
    const now = Date.now();
    tx.update(proRef, { coinsBalance: FieldValue.increment(-UNLOCK_COST) });
    tx.update(reqRef, { unlockCount: FieldValue.increment(1) });
    tx.set(db.collection('unlocks').doc(), {
      requestId,
      professionalId: uid,
      cost: UNLOCK_COST,
      created_at: now,
    });
    tx.set(db.collection('transactions').doc(), {
      userId: uid,
      amount: -UNLOCK_COST,
      type: 'UNLOCK_CONTACT',
      description: `Desbloqueio do pedido #${requestId.substring(0, 5)}`,
      created_at: now,
    });

    return {
      alreadyUnlocked: false,
      newBalance: ((pro.coinsBalance as number) ?? 0) - UNLOCK_COST,
      ...contact(),
    };
  });
}));

// ---------------------------------------------------------------------------
// 3. Aceitar proposta (fecha o pedido e rejeita as demais)
// Sem reembolso: quem gastou diamante no lead e não foi escolhido não recebe de volta.
// ---------------------------------------------------------------------------
export const acceptProposal = onCall(wrapCallable(async (req) => {
  const uid = assertAuth(req);
  const requestId = String(req.data?.requestId || '').trim();
  const proposalId = String(req.data?.proposalId || '').trim();
  if (!requestId || !proposalId) throw new HttpsError('invalid-argument', 'Dados incompletos.');

  const reqRef = db.doc(`serviceRequests/${requestId}`);
  const propRef = db.doc(`proposals/${proposalId}`);

  await db.runTransaction(async (tx) => {
    const reqSnap = await tx.get(reqRef);
    if (!reqSnap.exists) throw new HttpsError('not-found', 'Pedido não encontrado.');
    const reqData = reqSnap.data() as Record<string, unknown>;
    if (reqData.clientId !== uid) {
      throw new HttpsError('permission-denied', 'Você não é o dono deste pedido.');
    }
    if (reqData.status !== 'OPEN') {
      throw new HttpsError('failed-precondition', 'Este pedido não está mais aberto para escolha.');
    }

    const propSnap = await tx.get(propRef);
    if (!propSnap.exists) throw new HttpsError('not-found', 'Proposta não encontrada.');
    const prop = propSnap.data() as Record<string, unknown>;
    if (prop.requestId !== requestId) {
      throw new HttpsError('invalid-argument', 'Proposta não pertence a este pedido.');
    }

    const allProps = await tx.get(db.collection('proposals').where('requestId', '==', requestId));

    const now = Date.now();
    const chosenProId = String(prop.professionalId);

    tx.update(reqRef, {
      status: 'NEGOTIATING',
      acceptedProfessionalId: chosenProId,
      acceptedProposalId: proposalId,
      updated_at: now,
    });
    tx.update(propRef, { status: 'accepted', accepted_at: now, updated_at: now });

    allProps.docs.forEach((d) => {
      if (d.id !== proposalId) tx.update(d.ref, { status: 'rejected', updated_at: now });
    });
  });

  return { ok: true };
}));

// ---------------------------------------------------------------------------
// 3b. Cancelar / reabrir pedido (cliente)
// Sem reembolso: quem já desbloqueou o pedido não recebe os diamantes de volta.
// ---------------------------------------------------------------------------
export const cancelRequest = onCall(wrapCallable(async (req) => {
  const uid = assertAuth(req);
  const requestId = String(req.data?.requestId || '').trim();
  if (!requestId) throw new HttpsError('invalid-argument', 'requestId é obrigatório.');

  const reqRef = db.doc(`serviceRequests/${requestId}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(reqRef);
    if (!snap.exists) throw new HttpsError('not-found', 'Pedido não encontrado.');
    const r = snap.data() as Record<string, unknown>;
    if (r.clientId !== uid) throw new HttpsError('permission-denied', 'Você não é o dono deste pedido.');
    if (!['OPEN', 'NEGOTIATING'].includes(String(r.status))) {
      throw new HttpsError('failed-precondition', 'Este pedido não pode mais ser cancelado.');
    }

    const props = await tx.get(db.collection('proposals').where('requestId', '==', requestId));

    const now = Date.now();
    props.docs.forEach((d) => {
      if (d.data().status === 'pending') tx.update(d.ref, { status: 'rejected', updated_at: now });
    });

    tx.update(reqRef, {
      status: 'CANCELED',
      canceled_at: now,
      updated_at: now,
      acceptedProfessionalId: FieldValue.delete(),
      acceptedProposalId: FieldValue.delete(),
    });
  });

  return { ok: true };
}));

export const reopenRequest = onCall(wrapCallable(async (req) => {
  const uid = assertVerified(req);
  const requestId = String(req.data?.requestId || '').trim();
  if (!requestId) throw new HttpsError('invalid-argument', 'requestId é obrigatório.');

  const reqRef = db.doc(`serviceRequests/${requestId}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(reqRef);
    if (!snap.exists) throw new HttpsError('not-found', 'Pedido não encontrado.');
    const r = snap.data() as Record<string, unknown>;
    if (r.clientId !== uid) throw new HttpsError('permission-denied', 'Você não é o dono deste pedido.');
    if (!['CANCELED', 'EXPIRED'].includes(String(r.status))) {
      throw new HttpsError('failed-precondition', 'Só dá para reabrir um pedido cancelado ou expirado.');
    }
    // Mantém unlockCount e os unlocks: quem já pagou continua com o contato.
    tx.update(reqRef, {
      status: 'OPEN',
      updated_at: Date.now(),
      canceled_at: FieldValue.delete(),
    });
  });

  return { ok: true };
}));

// ---------------------------------------------------------------------------
// 3c. Excluir pedido (cliente) — some de vez, junto com propostas/unlocks/mensagens.
// Permitido só em OPEN, CANCELED ou EXPIRED. Sem reembolso.
// ---------------------------------------------------------------------------
export const deleteRequest = onCall(wrapCallable(async (req) => {
  const uid = assertAuth(req);
  const requestId = String(req.data?.requestId || '').trim();
  if (!requestId) throw new HttpsError('invalid-argument', 'requestId é obrigatório.');

  const reqRef = db.doc(`serviceRequests/${requestId}`);
  const snap = await reqRef.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Pedido não encontrado.');
  const r = snap.data() as Record<string, unknown>;
  if (r.clientId !== uid) throw new HttpsError('permission-denied', 'Você não é o dono deste pedido.');
  if (!['OPEN', 'CANCELED', 'EXPIRED'].includes(String(r.status))) {
    throw new HttpsError('failed-precondition', 'Só dá para excluir um pedido aberto, cancelado ou expirado.');
  }

  const [props, unlocks, msgs] = await Promise.all([
    db.collection('proposals').where('requestId', '==', requestId).get(),
    db.collection('unlocks').where('requestId', '==', requestId).get(),
    db
      .collection('messages')
      .where('chatId', '>=', `${requestId}_`)
      .where('chatId', '<=', `${requestId}_`)
      .get(),
  ]);

  const writer = db.bulkWriter();
  props.docs.forEach((d) => writer.delete(d.ref));
  unlocks.docs.forEach((d) => writer.delete(d.ref));
  msgs.docs.forEach((d) => writer.delete(d.ref));
  writer.delete(reqRef);
  await writer.close();

  return { ok: true };
}));

// ---------------------------------------------------------------------------
// 3c-bis. Expira pedidos abertos há mais de REQUEST_EXPIRY_DAYS sem proposta
// aceita — evita pedido "morto" acumulando no feed dos profissionais pra
// sempre. Roda de hora em hora; cliente pode reabrir depois (reopenRequest).
// ---------------------------------------------------------------------------
export const expireOldRequests = onSchedule('every 1 hours', async () => {
  const cutoff = Date.now() - REQUEST_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  const snap = await db
    .collection('serviceRequests')
    .where('status', '==', 'OPEN')
    .where('created_at', '<', cutoff)
    .get();
  if (snap.empty) return;

  const now = Date.now();
  const writer = db.bulkWriter();
  for (const doc of snap.docs) {
    writer.update(doc.ref, { status: 'EXPIRED', updated_at: now });
  }
  await writer.close();

  await Promise.all(
    snap.docs.map((doc) => {
      const r = doc.data() as Record<string, unknown>;
      const clientId = String(r.clientId || '');
      if (!clientId) return Promise.resolve();
      return notify(clientId, {
        type: 'request_expired',
        title: 'Pedido expirado',
        body: `Seu pedido de ${(r.subcategory as string) || (r.category as string) || 'serviço'} expirou após ${REQUEST_EXPIRY_DAYS} dias sem ninguém escolhido. Você pode reabrir quando quiser.`,
        link: `/requests/${doc.id}`,
      });
    })
  );
});

// ---------------------------------------------------------------------------
// 3d. Acompanhamento do serviço (cliente): iniciar / concluir.
// Só via Function para a transição de status ser confiável (evita marcar
// "concluído" antes da hora só pra liberar a avaliação).
// ---------------------------------------------------------------------------
async function advanceRequestStatus(
  req: CallableRequest,
  from: string,
  to: string,
  stampField: string
): Promise<{ ok: true }> {
  const uid = assertAuth(req);
  const requestId = String(req.data?.requestId || '').trim();
  if (!requestId) throw new HttpsError('invalid-argument', 'requestId é obrigatório.');

  const reqRef = db.doc(`serviceRequests/${requestId}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(reqRef);
    if (!snap.exists) throw new HttpsError('not-found', 'Pedido não encontrado.');
    const r = snap.data() as Record<string, unknown>;
    if (r.clientId !== uid) throw new HttpsError('permission-denied', 'Você não é o dono deste pedido.');
    if (!r.acceptedProfessionalId) {
      throw new HttpsError('failed-precondition', 'Nenhum profissional foi contratado ainda.');
    }
    if (r.status !== from) {
      throw new HttpsError('failed-precondition', `O pedido precisa estar em "${from}".`);
    }
    tx.update(reqRef, { status: to, [stampField]: Date.now(), updated_at: Date.now() });
  });
  return { ok: true };
}

export const startWork = onCall(wrapCallable((req) => advanceRequestStatus(req, 'NEGOTIATING', 'IN_PROGRESS', 'started_at')));
export const completeWork = onCall(wrapCallable((req) => advanceRequestStatus(req, 'IN_PROGRESS', 'COMPLETED', 'completed_at')));

// ---------------------------------------------------------------------------
// 4. Orçamento direto pelo perfil do profissional
// ---------------------------------------------------------------------------
export const attachProfessionalToRequest = onCall(wrapCallable(async (req) => {
  const uid = assertVerified(req);
  const requestId = String(req.data?.requestId || '').trim();
  const professionalId = String(req.data?.professionalId || '').trim();
  const firstMessage = String(req.data?.message || '').slice(0, 2000);
  if (!requestId || !professionalId) throw new HttpsError('invalid-argument', 'Dados incompletos.');

  const reqRef = db.doc(`serviceRequests/${requestId}`);
  const [reqSnap, proSnap, existingProp] = await Promise.all([
    reqRef.get(),
    db.doc(`users/${professionalId}`).get(),
    db
      .collection('proposals')
      .where('requestId', '==', requestId)
      .where('professionalId', '==', professionalId)
      .limit(1)
      .get(),
  ]);

  if (!reqSnap.exists) throw new HttpsError('not-found', 'Pedido não encontrado.');
  const reqData = reqSnap.data() as Record<string, unknown>;
  if (reqData.clientId !== uid) {
    throw new HttpsError('permission-denied', 'Você não é o dono deste pedido.');
  }
  if (!proSnap.exists || proSnap.data()?.role !== 'professional') {
    throw new HttpsError('not-found', 'Profissional não encontrado.');
  }
  if (!existingProp.empty) {
    throw new HttpsError('already-exists', 'Você já iniciou uma conversa com este profissional para este pedido.');
  }

  const now = Date.now();
  const pro = proSnap.data() as Record<string, unknown>;
  const chatId = `${requestId}_${professionalId}`;
  const propRef = db.collection('proposals').doc();
  const batch = db.batch();

  batch.set(propRef, {
    requestId,
    professionalId,
    clientId: uid,
    professionalName: (pro.name as string) || '',
    professionalPhoto: (pro.photo_url as string) || '',
    professionalRating: (pro.rating as number) || 0,
    professionalVerified: (pro.verified as boolean) || false,
    estimatedPrice: 0,
    estimatedDays: 'A combinar',
    message: 'Solicitação de orçamento direto.',
    status: 'accepted',
    created_at: now,
    updated_at: now,
  });
  batch.update(reqRef, {
    status: 'NEGOTIATING',
    acceptedProfessionalId: professionalId,
    acceptedProposalId: propRef.id,
    updated_at: now,
  });
  batch.set(db.collection('messages').doc(), {
    chatId,
    senderId: uid,
    text:
      firstMessage ||
      `Olá! Solicitei um orçamento pelo seu perfil para "${
        (reqData.subcategory as string) || (reqData.category as string) || 'um serviço'
      }". Aguardo seu retorno!`,
    created_at: now,
    read: false,
  });

  await batch.commit();
  return { ok: true, chatId };
}));

// ---------------------------------------------------------------------------
// 5. Agregado de avaliação do profissional
// ---------------------------------------------------------------------------
export const onReviewCreated = onDocumentCreated('reviews/{reviewId}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  const review = snap.data();
  const proId = String(review.professionalId || '');
  const rating = Number(review.rating) || 0;
  if (!proId || rating <= 0) return;

  const proRef = db.doc(`users/${proId}`);
  await db.runTransaction(async (tx) => {
    const [proSnap, revSnap] = await Promise.all([tx.get(proRef), tx.get(snap.ref)]);
    if (!proSnap.exists || !revSnap.exists) return;
    if (revSnap.data()?.aggregated === true) return; // idempotência (trigger é at-least-once)

    const data = proSnap.data() as Record<string, unknown>;
    const sum = (Number(data.ratingSum) || 0) + rating;
    const count = (Number(data.reviewCount) || 0) + 1;

    tx.update(proRef, {
      ratingSum: sum,
      reviewCount: count,
      rating: Math.round((sum / count) * 10) / 10,
    });
    tx.update(snap.ref, { aggregated: true });
  });

  await notify(proId, {
    type: 'review_received',
    title: 'Você recebeu uma avaliação',
    body: `Nota ${rating}/5 de um cliente.`,
    link: '/profile',
  });
});

// Avisos in-app para propostas: nova proposta -> cliente; aceita/recusada -> profissional.
export const onProposalWritten = onDocumentWritten('proposals/{proposalId}', async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!after) return;

  const reqShort = String(after.requestId || '').substring(0, 5);

  // Criada agora como "pending" -> avisa o cliente
  if (!before && after.status === 'pending' && after.clientId) {
    await notify(String(after.clientId), {
      type: 'proposal_new',
      title: 'Nova proposta recebida',
      body: `${after.professionalName || 'Um profissional'} enviou uma proposta para o seu pedido #${reqShort}.`,
      link: `/requests/${after.requestId}`,
    });
    return;
  }

  // Mudança de status -> avisa o profissional
  if (before && before.status !== after.status && after.professionalId) {
    if (after.status === 'accepted') {
      await notify(String(after.professionalId), {
        type: 'proposal_accepted',
        title: 'Sua proposta foi aceita! 🎉',
        body: `O cliente fechou negócio com você no pedido #${reqShort}.`,
        link: `/chats/${after.requestId}_${after.professionalId}`,
      });
    } else if (after.status === 'rejected' && before.status === 'pending') {
      await notify(String(after.professionalId), {
        type: 'proposal_rejected',
        title: 'Proposta não escolhida',
        body: `O cliente escolheu outro profissional para o pedido #${reqShort}.`,
        link: `/requests/${after.requestId}`,
      });
    }
  }
});

// Agregado da avaliação do CLIENTE (feita pelo profissional).
export const onClientReviewCreated = onDocumentCreated('clientReviews/{reviewId}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  const review = snap.data();
  const clientId = String(review.clientId || '');
  const rating = Number(review.rating) || 0;
  if (!clientId || rating <= 0) return;

  const clientRef = db.doc(`users/${clientId}`);
  await db.runTransaction(async (tx) => {
    const [clientSnap, revSnap] = await Promise.all([tx.get(clientRef), tx.get(snap.ref)]);
    if (!clientSnap.exists || !revSnap.exists) return;
    if (revSnap.data()?.aggregated === true) return;

    const data = clientSnap.data() as Record<string, unknown>;
    const sum = (Number(data.clientRatingSum) || 0) + rating;
    const count = (Number(data.clientReviewCount) || 0) + 1;

    tx.update(clientRef, {
      clientRatingSum: sum,
      clientReviewCount: count,
      clientRating: Math.round((sum / count) * 10) / 10,
    });
    tx.update(snap.ref, { aggregated: true });
  });

  await notify(clientId, {
    type: 'review_received',
    title: 'Um profissional avaliou você',
    body: `Nota ${rating}/5.`,
    link: '/profile',
  });
});

// ---------------------------------------------------------------------------
// 6. Revisão de KYC (admin)
// ---------------------------------------------------------------------------
export const reviewValidation = onCall(wrapCallable(async (req) => {
  const adminUid = assertAdmin(req);
  const userId = String(req.data?.userId || '').trim();
  const decision = String(req.data?.decision || '');
  if (!userId || !['approved', 'rejected'].includes(decision)) {
    throw new HttpsError('invalid-argument', 'Dados inválidos.');
  }

  const now = Date.now();
  const batch = db.batch();
  batch.set(
    db.doc(`validations/${userId}`),
    { status: decision, reviewed_at: now, reviewed_by: adminUid },
    { merge: true }
  );
  batch.update(db.doc(`users/${userId}`), { verified: decision === 'approved' });
  await batch.commit();

  await notify(userId, {
    type: 'kyc',
    title: decision === 'approved' ? 'Conta verificada ✅' : 'Documentos recusados',
    body:
      decision === 'approved'
        ? 'Seu selo de profissional verificado já está ativo.'
        : 'Reveja as fotos do documento e envie novamente.',
    link: '/documents',
  });
  return { ok: true };
}));

// ---------------------------------------------------------------------------
// 7 / 8. Concessão de admin
// ---------------------------------------------------------------------------
export const bootstrapAdmin = onCall({ secrets: [ADMIN_BOOTSTRAP_SECRET] }, wrapCallable(async (req) => {
  const uid = assertAuth(req);
  const provided = String(req.data?.secret || '');
  const expected = ADMIN_BOOTSTRAP_SECRET.value();
  if (!expected || provided !== expected) {
    throw new HttpsError('permission-denied', 'Segredo inválido.');
  }
  await admin.auth().setCustomUserClaims(uid, { admin: true });
  await db.doc(`users/${uid}`).set({ isAdmin: true }, { merge: true });
  return { ok: true, note: 'Faça logout e login novamente para o token atualizar.' };
}));

export const grantAdmin = onCall(wrapCallable(async (req) => {
  assertAdmin(req);
  const email = String(req.data?.email || '').trim().toLowerCase();
  if (!email) throw new HttpsError('invalid-argument', 'Informe o e-mail.');

  const target = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(target.uid, { admin: true });
  await db.doc(`users/${target.uid}`).set({ isAdmin: true }, { merge: true });
  return { ok: true };
}));

// ---------------------------------------------------------------------------
// 9. Compra simulada de diamantes (ponte até a Fase 2 / gateway real)
// ---------------------------------------------------------------------------
export const simulatePurchase = onCall(wrapCallable(async (req) => {
  const uid = assertVerified(req);
  if (process.env.ALLOW_SIMULATED_PAYMENTS !== 'true') {
    throw new HttpsError(
      'failed-precondition',
      'Pagamentos simulados estão desativados. Configure um provedor de pagamento real.'
    );
  }
  const packageId = String(req.data?.packageId || '');
  const method = req.data?.method === 'pix' ? 'PIX' : 'Cartão de Crédito';
  const pkg = DIAMOND_PACKAGES[packageId];
  if (!pkg) throw new HttpsError('invalid-argument', 'Pacote inválido.');

  const now = Date.now();
  await db.runTransaction(async (tx) => {
    const ref = db.doc(`users/${uid}`);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'Usuário não encontrado.');
    tx.update(ref, { coinsBalance: FieldValue.increment(pkg.diamonds) });
    tx.set(db.collection('transactions').doc(), {
      userId: uid,
      amount: pkg.diamonds,
      type: 'PURCHASE',
      description: `Compra de Pacote: ${pkg.diamonds} Diamantes via ${method} (simulado)`,
      created_at: now,
    });
  });
  return { ok: true, diamonds: pkg.diamonds };
}));

// ---------------------------------------------------------------------------
// 10. Pagamento real — Mercado Pago (Checkout Pro + webhook)
// O saldo só é creditado quando o webhook confirma o pagamento como "approved".
// ---------------------------------------------------------------------------
export const createPaymentPreference = onCall({ secrets: [MP_ACCESS_TOKEN] }, wrapCallable(async (req) => {
  const uid = assertVerified(req);
  const token = MP_ACCESS_TOKEN.value();
  if (!token) {
    throw new HttpsError('failed-precondition', 'Pagamento não configurado (MP_ACCESS_TOKEN ausente).');
  }

  const packageId = String(req.data?.packageId || '');
  const pkg = DIAMOND_PACKAGES[packageId];
  if (!pkg) throw new HttpsError('invalid-argument', 'Pacote inválido.');

  const origin = String(req.data?.origin || '').replace(/\/+$/, '');
  if (!/^https?:\/\//.test(origin)) throw new HttpsError('invalid-argument', 'origin inválido.');

  const userSnap = await db.doc(`users/${uid}`).get();
  const payerEmail = (userSnap.data()?.email as string) || undefined;

  const now = Date.now();
  const payRef = db.collection('payments').doc();
  await payRef.set({
    userId: uid,
    packageId,
    diamonds: pkg.diamonds,
    amount: pkg.price,
    currency: 'BRL',
    provider: 'mercadopago',
    status: 'pending',
    created_at: now,
    updated_at: now,
  });

  const body = {
    items: [
      {
        id: packageId,
        title: `${pkg.diamonds} Diamantes - Conecta Serviço`,
        quantity: 1,
        unit_price: pkg.price,
        currency_id: 'BRL',
      },
    ],
    external_reference: payRef.id,
    notification_url: mpWebhookUrl(),
    back_urls: {
      success: `${origin}/wallet?payment=success`,
      failure: `${origin}/wallet?payment=failure`,
      pending: `${origin}/wallet?payment=pending`,
    },
    auto_return: 'approved',
    statement_descriptor: 'CONECTASERVICO',
    ...(payerEmail ? { payer: { email: payerEmail } } : {}),
  };

  const resp = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    console.error('MP preference error', resp.status, await resp.text());
    await payRef.update({ status: 'error', updated_at: Date.now() });
    throw new HttpsError('internal', 'Falha ao iniciar o pagamento.');
  }

  const pref = (await resp.json()) as { id: string; init_point?: string; sandbox_init_point?: string };
  await payRef.update({ mpPreferenceId: pref.id, updated_at: Date.now() });

  return {
    paymentId: payRef.id,
    initPoint: pref.init_point || pref.sandbox_init_point || '',
  };
}));

export const mercadoPagoWebhook = onRequest(
  { secrets: [MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET], invoker: 'public' },
  async (request, response) => {
    try {
      const type = String(
        request.query.type || request.query.topic || request.body?.type || ''
      );
      const dataId = String(
        request.query['data.id'] || request.body?.data?.id || request.query.id || ''
      );

      if (type !== 'payment' || !dataId) {
        response.status(200).send('ignored');
        return;
      }

      // Valida x-signature quando o secret estiver configurado.
      const secret = MP_WEBHOOK_SECRET.value();
      if (secret) {
        const sig = String(request.header('x-signature') || '');
        const reqId = String(request.header('x-request-id') || '');
        const parts: Record<string, string> = {};
        for (const kv of sig.split(',')) {
          const [k, v] = kv.split('=').map((s) => s.trim());
          if (k && v) parts[k] = v;
        }
        const manifest = `id:${dataId};request-id:${reqId};ts:${parts['ts']};`;
        const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
        const got = parts['v1'] || '';
        const ok =
          got.length === expected.length &&
          crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
        if (!ok) {
          console.warn('MP webhook: assinatura inválida');
          response.status(401).send('bad signature');
          return;
        }
      }

      // Nunca confia no corpo: busca o pagamento real na API do MP.
      const mpResp = await fetch(`${MP_API}/v1/payments/${dataId}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN.value()}` },
      });
      if (!mpResp.ok) {
        console.error('MP payment fetch failed', mpResp.status);
        response.status(200).send('retry-on-next-notification');
        return;
      }
      const payment = (await mpResp.json()) as {
        status: string;
        external_reference?: string;
      };

      const paymentId = payment.external_reference;
      if (!paymentId) {
        response.status(200).send('no-ref');
        return;
      }

      const payRef = db.doc(`payments/${paymentId}`);
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(payRef);
        if (!snap.exists) return;
        const p = snap.data() as Record<string, unknown>;
        if (p.status === 'approved') return; // idempotência

        tx.update(payRef, {
          status: payment.status === 'approved' ? 'approved' : payment.status,
          mpPaymentId: dataId,
          updated_at: Date.now(),
        });

        if (payment.status === 'approved') {
          const diamonds = Number(p.diamonds) || 0;
          tx.update(db.doc(`users/${String(p.userId)}`), {
            coinsBalance: FieldValue.increment(diamonds),
          });
          tx.set(db.collection('transactions').doc(), {
            userId: p.userId,
            amount: diamonds,
            type: 'PURCHASE',
            description: `Compra de ${diamonds} Diamantes (Mercado Pago)`,
            created_at: Date.now(),
          });
        }
      });

      response.status(200).send('ok');
    } catch (err) {
      console.error('MP webhook error', err);
      response.status(200).send('error-logged');
    }
  }
);

// ---------------------------------------------------------------------------
// 11. Push (FCM) de novo pedido para os profissionais compatíveis
// Dispara quando um serviceRequest é criado. Casa por categoria/subcategoria,
// filtra por raio de atuação (ou UF quando não há coordenadas) e limpa tokens mortos.
// ---------------------------------------------------------------------------
function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export const notifyProfessionalsOnNewRequest = onDocumentCreated(
  'serviceRequests/{requestId}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const req = snap.data() as Record<string, unknown>;
    if (req.status !== 'OPEN') return;

    const requestId = event.params.requestId;
    const category = String(req.category || '');
    const subcategory = String(req.subcategory || '');
    const clientId = String(req.clientId || '');

    // Anti-spam / anti-duplicação: olha os outros pedidos OPEN do mesmo cliente.
    if (clientId) {
      const others = await db
        .collection('serviceRequests')
        .where('clientId', '==', clientId)
        .where('status', '==', 'OPEN')
        .get();

      const openCount = others.size; // inclui o recém-criado
      const isDuplicate = others.docs.some(
        (d) =>
          d.id !== snap.id &&
          d.data().category === category &&
          (d.data().subcategory || '') === subcategory
      );

      if (isDuplicate) {
        await snap.ref
          .update({ status: 'CANCELED', canceled_at: Date.now(), cancelReason: 'pedido duplicado' })
          .catch(() => undefined);
        await notify(clientId, {
          type: 'system',
          title: 'Pedido duplicado',
          body: 'Você já tem um pedido em aberto para esse mesmo serviço.',
        });
        return;
      }

      if (openCount > MAX_OPEN_REQUESTS_PER_CLIENT) {
        await snap.ref
          .update({ status: 'CANCELED', canceled_at: Date.now(), cancelReason: 'limite de pedidos abertos' })
          .catch(() => undefined);
        await notify(clientId, {
          type: 'system',
          title: 'Pedido não publicado',
          body: `Você atingiu o limite de ${MAX_OPEN_REQUESTS_PER_CLIENT} pedidos em aberto. Feche ou cancele alguns antes de criar outro.`,
        });
        return;
      }
    }
    const reqLat = typeof req.lat === 'number' ? (req.lat as number) : null;
    const reqLng = typeof req.lng === 'number' ? (req.lng as number) : null;
    const reqUf = String(req.uf || '').toUpperCase();
    const reqCity = String(req.city || '');

    // --- candidatos: perfil casa com a categoria OU a subcategoria do pedido ---
    const queries: Promise<QuerySnapshot>[] = [];
    if (category) {
      queries.push(
        db
          .collection('users')
          .where('role', '==', 'professional')
          .where('serviceCategories', 'array-contains', category)
          .get()
      );
    }
    if (subcategory) {
      queries.push(
        db
          .collection('users')
          .where('role', '==', 'professional')
          .where('services', 'array-contains', subcategory)
          .get()
      );
    }
    if (!queries.length) return;

    const proMap = new Map<string, DocumentData>();
    for (const qs of await Promise.all(queries)) {
      qs.forEach((d) => {
        if (d.id !== clientId) proMap.set(d.id, d.data());
      });
    }
    if (!proMap.size) return;

    // --- filtra por raio (ou UF); junta tokens de push e a lista de quem avisar in-app ---
    const tokens: string[] = [];
    const tokenOwner = new Map<string, string>();
    const inRangePros: string[] = [];
    const proDistanceKm = new Map<string, number>();
    for (const [uid, pro] of proMap) {
      const proLat = typeof pro.lat === 'number' ? (pro.lat as number) : null;
      const proLng = typeof pro.lng === 'number' ? (pro.lng as number) : null;
      const radiusKm =
        typeof pro.radiusKm === 'number' && pro.radiusKm > 0 ? pro.radiusKm : DEFAULT_RADIUS_KM;

      let inRange = true;
      let distanceKm: number | null = null;
      if (reqLat != null && reqLng != null && proLat != null && proLng != null) {
        distanceKm = haversineKm({ lat: reqLat, lng: reqLng }, { lat: proLat, lng: proLng });
        inRange = distanceKm <= radiusKm + 1;
      } else if (reqUf && pro.uf) {
        inRange = String(pro.uf).toUpperCase() === reqUf;
      }
      if (!inRange) continue;
      inRangePros.push(uid);
      if (distanceKm != null) proDistanceKm.set(uid, distanceKm);

      const list: string[] = Array.isArray(pro.fcmTokens) ? pro.fcmTokens : [];
      for (const t of list) {
        if (!tokenOwner.has(t)) {
          tokenOwner.set(t, uid);
          tokens.push(t);
        }
      }
    }

    const title = 'Novo pedido perto de você';
    const serviceLabel = subcategory || category || 'Serviço';
    // Com coordenadas dos dois lados dá pra dizer a distância exata pra cada
    // profissional; no fallback por UF (sem coordenadas) usa a cidade.
    const bodyFor = (uid: string) => {
      const km = proDistanceKm.get(uid);
      if (km != null) {
        const distanceLabel = km < 1 ? 'menos de 1 km' : `${Math.round(km)} km`;
        return `${serviceLabel} · a ${distanceLabel} de você`;
      }
      return `${serviceLabel}${reqCity ? ` · ${reqCity}` : ''}`;
    };

    // Aviso in-app para todo profissional compatível (independe de ter push ligado).
    await Promise.all(
      inRangePros.map((uid) =>
        notify(uid, { type: 'new_lead', title, body: bodyFor(uid), link: `/requests/${requestId}` })
      )
    );

    if (!tokens.length) return;

    const dead: Array<{ uid: string; token: string }> = [];
    for (let i = 0; i < tokens.length; i += 500) {
      const batch = tokens.slice(i, i + 500);
      // sendEach (não sendEachForMulticast) porque cada token tem uma distância
      // diferente pra mostrar na notificação.
      const resp = await getMessaging().sendEach(
        batch.map((token) => ({
          token,
          notification: { title, body: bodyFor(tokenOwner.get(token) || '') },
          data: { type: 'new_lead', requestId, category, subcategory },
          android: { priority: 'high' as const },
          webpush: { fcmOptions: { link: `/requests/${requestId}` } },
        }))
      );
      resp.responses.forEach((r, idx) => {
        if (r.success) return;
        const code = r.error?.code || '';
        if (
          code.includes('registration-token-not-registered') ||
          code.includes('invalid-registration-token') ||
          code.includes('invalid-argument')
        ) {
          const token = batch[idx];
          const owner = tokenOwner.get(token);
          if (owner) dead.push({ uid: owner, token });
        }
      });
    }

    if (dead.length) {
      const byUser = new Map<string, string[]>();
      for (const { uid, token } of dead) {
        byUser.set(uid, [...(byUser.get(uid) || []), token]);
      }
      await Promise.all(
        [...byUser].map(([uid, toks]) =>
          db
            .doc(`users/${uid}`)
            .update({ fcmTokens: FieldValue.arrayRemove(...toks) })
            .catch(() => undefined)
        )
      );
    }
  }
);

// ---------------------------------------------------------------------------
// 12. Excluir a própria conta (LGPD + exigência das lojas de apps)
// Best-effort: apaga identidade, perfil, KYC, arquivos e anúncios ativos.
// Mantém registros financeiros (transactions/payments — só têm o uid) e avaliações
// (anonimizadas), por obrigação contábil/legal. Depois remove a conta do Auth.
// ---------------------------------------------------------------------------
export const deleteMyAccount = onCall(wrapCallable(async (req) => {
  const uid = assertAuth(req);

  // 1. Arquivos no Storage
  try {
    const bucket = admin.storage().bucket();
    await Promise.all(
      [`users/${uid}/`, `validations/${uid}/`, `requestPhotos/${uid}/`, `chatImages/${uid}/`].map(
        (prefix) => bucket.deleteFiles({ prefix }).catch(() => undefined)
      )
    );
  } catch (e) {
    console.error('deleteMyAccount: falha ao apagar Storage', e);
  }

  const writer = db.bulkWriter();
  writer.onWriteError((err) => {
    console.error('deleteMyAccount bulkWriter', err.message);
    return err.failedAttempts < 3;
  });

  // 2. Documentos de identidade / perfil
  writer.delete(db.doc(`users/${uid}`));
  writer.delete(db.doc(`publicProfiles/${uid}`));
  writer.delete(db.doc(`validations/${uid}`));

  // 3. Pedidos do cliente: apaga os que ninguém pagou; cancela o resto
  const myRequests = await db.collection('serviceRequests').where('clientId', '==', uid).get();
  myRequests.forEach((d) => {
    const data = d.data();
    if ((data.unlockCount ?? 0) === 0 && data.status === 'OPEN') {
      writer.delete(d.ref);
    } else {
      writer.update(d.ref, { status: 'CANCELED', canceled_at: Date.now() });
    }
  });

  // 4. Propostas do profissional
  const myProposals = await db.collection('proposals').where('professionalId', '==', uid).get();
  myProposals.forEach((d) => writer.delete(d.ref));

  // 5. Avaliações escritas pelo usuário: anonimiza (a nota do profissional é mantida)
  const myReviews = await db.collection('reviews').where('clientId', '==', uid).get();
  myReviews.forEach((d) => writer.update(d.ref, { clientId: 'deleted', comment: '' }));

  await writer.close();

  // 6. Remove a conta do Firebase Auth
  await admin.auth().deleteUser(uid).catch((e) => {
    console.error('deleteMyAccount: auth().deleteUser falhou', e);
  });

  return { ok: true };
}));

// ---------------------------------------------------------------------------
// 13. Conta verificada -> premia quem indicou (programa "convide colegas")
// Chamada pela tela /verify quando o e-mail (cliente) ou o celular
// (profissional, via login) já está confirmado.
// ---------------------------------------------------------------------------
export const markVerified = onCall(wrapCallable(async (req) => {
  const uid = assertVerified(req);

  const userRef = db.doc(`users/${uid}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) return;
    const u = snap.data() as Record<string, unknown>;

    tx.update(userRef, { contactsVerified: true });

    const referrerId = String(u.referredBy || '');
    if (!referrerId || u.referralRewarded === true || referrerId === uid) return;

    const refSnap = await tx.get(db.doc(`users/${referrerId}`));
    if (!refSnap.exists) {
      tx.update(userRef, { referralRewarded: true });
      return;
    }
    const referrer = refSnap.data() as Record<string, unknown>;
    const already = Number(referrer.referralCount) || 0;

    tx.update(userRef, { referralRewarded: true });

    if (already < MAX_REFERRAL_REWARDS) {
      tx.update(refSnap.ref, {
        coinsBalance: FieldValue.increment(REFERRAL_BONUS),
        referralCount: already + 1,
      });
      tx.set(db.collection('transactions').doc(), {
        userId: referrerId,
        amount: REFERRAL_BONUS,
        type: 'ADJUSTMENT',
        description: 'Bônus por indicação de um novo profissional',
        created_at: Date.now(),
      });
    }
  });

  // notificação fora da transação
  const fresh = (await userRef.get()).data() as Record<string, unknown>;
  const referrerId = String(fresh?.referredBy || '');
  if (referrerId && fresh?.referralRewarded === true) {
    await notify(referrerId, {
      type: 'referral',
      title: 'Você ganhou 100 diamantes! 💎',
      body: 'Um profissional que você indicou verificou a conta.',
      link: '/wallet',
    }).catch(() => undefined);
  }

  return { ok: true };
}));

// ---------------------------------------------------------------------------
// 14. Confirma o celular do CLIENTE por SMS sem virar credencial de login.
// Evita o conflito de "número já em uso" quando a mesma pessoa já usa esse
// número como login da conta de profissional: em vez de linkWithCredential/
// updatePhoneNumber (que exigem o número livre no projeto inteiro), valida o
// código direto na Identity Toolkit REST API — a mesma verificação que o SDK
// faria — e só grava um selo em Firestore. O número nunca fica "reservado"
// para esta conta, então pode coexistir com o login por telefone do
// profissional.
// ---------------------------------------------------------------------------
// Chave pública do Firebase Web (a mesma do firebaseConfig do front-end — não
// é segredo: já vem embutida em todo app Firebase, identifica o projeto e não
// autentica nada sozinha; a segurança está nas regras/Functions).
const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || 'AIzaSyAMeLbuHPJS6CCtr0kPdEJRqEC4gVN2wMU';

export const confirmClientPhone = onCall(wrapCallable(async (req) => {
  const uid = assertAuth(req);
  const sessionInfo = String(req.data?.verificationId || '').trim();
  const code = String(req.data?.code || '').trim();
  if (!sessionInfo || !code) throw new HttpsError('invalid-argument', 'Dados incompletos.');

  const userRef = db.doc(`users/${uid}`);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new HttpsError('not-found', 'Perfil não encontrado.');
  if (userSnap.data()?.role !== 'client') {
    throw new HttpsError('permission-denied', 'Esse recurso é só para contas de cliente.');
  }

  let resp: Response;
  try {
    resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${FIREBASE_WEB_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionInfo, code }),
      }
    );
  } catch (e) {
    console.error('confirmClientPhone: falha de rede na Identity Toolkit', e);
    throw new HttpsError('unavailable', 'Não foi possível confirmar agora. Tente de novo.');
  }

  const data = (await resp.json().catch(() => ({}))) as {
    phoneNumber?: string;
    error?: { message?: string };
  };

  if (!resp.ok) {
    const msg = data?.error?.message || '';
    if (msg.includes('INVALID_CODE')) throw new HttpsError('invalid-argument', 'Código incorreto.');
    if (msg.includes('INVALID_SESSION_INFO') || msg.includes('SESSION_EXPIRED')) {
      throw new HttpsError('deadline-exceeded', 'Código expirado. Peça um novo.');
    }
    console.error('confirmClientPhone: Identity Toolkit recusou', msg);
    throw new HttpsError('internal', 'Não foi possível confirmar o código. Tente de novo.');
  }

  await userRef.update({ phoneConfirmed: true, phoneConfirmedAt: Date.now() });

  return { ok: true, phoneNumber: data.phoneNumber || '' };
}));

// ---------------------------------------------------------------------------
// 15. Libera um número de celular para cadastro de PROFISSIONAL quando ele
// está "ocupado" no Firebase Auth por uma conta sem perfil de profissional.
// Cliente e profissional são identidades diferentes e podem compartilhar o
// mesmo número; só duas contas de PROFISSIONAL é que não podem (é o próprio
// login). Isso cobre tanto o número "órfão" que o signInWithPhoneNumber da
// Identity Toolkit cria por baixo dos panos no confirmClientPhone acima
// (nunca teve perfil) quanto uma conta de cliente antiga (de antes desse
// confirmClientPhone existir) que chegou a vincular o número de fato via
// linkWithCredential. Chamada pelo cadastro de profissional ANTES de enviar o
// SMS — nunca pelo login, que deve continuar entrando na própria conta.
// ---------------------------------------------------------------------------
export const prepareProfessionalPhone = onCall(wrapCallable(async (req) => {
  const e164 = String(req.data?.phone || '').trim();
  if (!/^\+[1-9]\d{7,14}$/.test(e164)) {
    throw new HttpsError('invalid-argument', 'Número inválido.');
  }

  let existing: admin.auth.UserRecord;
  try {
    existing = await admin.auth().getUserByPhoneNumber(e164);
  } catch (e) {
    if ((e as { code?: string })?.code === 'auth/user-not-found') return { ok: true };
    console.error('prepareProfessionalPhone: falha ao consultar o número', e);
    throw new HttpsError('unavailable', 'Não foi possível validar o número agora. Tente de novo.');
  }

  const userSnap = await db.doc(`users/${existing.uid}`).get();
  const role = userSnap.exists ? (userSnap.data() as Record<string, unknown>).role : undefined;

  if (role === 'professional') {
    throw new HttpsError(
      'already-exists',
      'Já existe uma conta de profissional com esse número. Faça login em vez de cadastrar.'
    );
  }

  // Sem perfil (número órfão) ou perfil de CLIENTE: libera o número para que o
  // cadastro de profissional gere (ou reaproveite) uma conta própria, sem
  // colidir com dados de outra pessoa.
  await admin.auth().updateUser(existing.uid, { phoneNumber: null });
  return { ok: true };
}));

// ---------------------------------------------------------------------------
// 16. Envia o CPF para validação (KYC) — auto-aprova na hora: o único critério
// é o CPF ter dígito verificador correto e não estar em uso por OUTRA conta de
// profissional (sem revisão humana). As regras do Firestore não fazem checagem
// atômica entre documentos diferentes, então essa unicidade só dá pra garantir
// aqui: cpfIndex/{cpf} -> uid é lido e escrito na mesma transação que grava
// validations/{uid} e users/{uid}.verified, e a escrita direta do cliente
// nessas coleções está bloqueada nas regras (só Function/admin escrevem).
// ---------------------------------------------------------------------------
function isValidCPF(input: string): boolean {
  const cpf = input.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos os dígitos iguais

  const calcDigit = (len: number): number => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return calcDigit(9) === Number(cpf[9]) && calcDigit(10) === Number(cpf[10]);
}

export const submitCpfValidation = onCall(wrapCallable(async (req) => {
  const uid = assertAuth(req);
  const cpf = String(req.data?.cpf || '').replace(/\D/g, '');
  if (!isValidCPF(cpf)) throw new HttpsError('invalid-argument', 'CPF inválido.');

  const userSnap = await db.doc(`users/${uid}`).get();
  if (!userSnap.exists || userSnap.data()?.role !== 'professional') {
    throw new HttpsError('permission-denied', 'Esse recurso é só para contas de profissional.');
  }
  const user = userSnap.data() as Record<string, unknown>;

  const validationRef = db.doc(`validations/${uid}`);
  await db.runTransaction(async (tx) => {
    const indexRef = db.doc(`cpfIndex/${cpf}`);
    const [indexSnap, prevValidationSnap] = await Promise.all([tx.get(indexRef), tx.get(validationRef)]);
    if (indexSnap.exists && indexSnap.data()?.uid !== uid) {
      throw new HttpsError('already-exists', 'Esse CPF já está cadastrado em outra conta.');
    }

    // Corrigiu um CPF digitado errado antes: libera o índice antigo.
    const prevCpf = prevValidationSnap.exists ? (prevValidationSnap.data()?.cpf as string) : undefined;
    if (prevCpf && prevCpf !== cpf) {
      tx.delete(db.doc(`cpfIndex/${prevCpf}`));
    }

    const now = Date.now();
    tx.set(indexRef, { uid, updated_at: now });
    tx.set(validationRef, {
      userId: uid,
      userName: (user.name as string) || '',
      userEmail: (user.email as string) || '',
      cpf,
      status: 'approved',
      reviewed_at: now,
      reviewed_by: 'auto',
      created_at: now,
    });
    tx.update(userSnap.ref, { verified: true });
  });

  await notify(uid, {
    type: 'kyc',
    title: 'Conta verificada ✅',
    body: 'Seu selo de profissional verificado já está ativo.',
    link: '/documents',
  }).catch(() => undefined);

  return { ok: true };
}));

// ---------------------------------------------------------------------------
// 17. Suporte / disputa — admin resolve, opcionalmente reembolsa diamantes
// ---------------------------------------------------------------------------
export const resolveSupportTicket = onCall(wrapCallable(async (req) => {
  const adminUid = assertAdmin(req);
  const ticketId = String(req.data?.ticketId || '').trim();
  const decision = String(req.data?.decision || '');
  const note = String(req.data?.note || '').slice(0, 3000);
  const refundDiamonds = Math.max(0, Math.min(1000, Math.floor(Number(req.data?.refundDiamonds) || 0)));
  if (!ticketId || !['resolved', 'rejected', 'in_review'].includes(decision)) {
    throw new HttpsError('invalid-argument', 'Dados inválidos.');
  }

  const ticketRef = db.doc(`supportTickets/${ticketId}`);
  const now = Date.now();
  let targetUserId = '';

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ticketRef);
    if (!snap.exists) throw new HttpsError('not-found', 'Chamado não encontrado.');
    const t = snap.data() as Record<string, unknown>;
    targetUserId = String(t.userId || '');

    if (decision === 'resolved' && refundDiamonds > 0 && targetUserId) {
      tx.update(db.doc(`users/${targetUserId}`), {
        coinsBalance: FieldValue.increment(refundDiamonds),
      });
      tx.set(db.collection('transactions').doc(), {
        userId: targetUserId,
        amount: refundDiamonds,
        type: 'ADJUSTMENT',
        description: `Reembolso via suporte (chamado #${ticketId.substring(0, 5)})`,
        created_at: now,
      });
    }

    tx.update(ticketRef, {
      status: decision,
      resolution: note,
      refundedDiamonds: decision === 'resolved' ? refundDiamonds : 0,
      reviewed_by: adminUid,
      updated_at: now,
    });
  });

  if (targetUserId && decision !== 'in_review') {
    await notify(targetUserId, {
      type: 'support',
      title: decision === 'resolved' ? 'Seu chamado foi resolvido' : 'Resposta do suporte',
      body: note || 'Nossa equipe analisou seu chamado.',
      link: '/help/contact',
    }).catch(() => undefined);
  }

  return { ok: true };
}));
