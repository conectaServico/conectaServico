import { verifyPlayPurchaseFn } from '@/services/api';

/**
 * Compra de diamantes pelo Google Play Billing (só no app Android do profissional).
 * O app faz a compra, manda o token pro servidor (`verifyPlayPurchase`), que confere com a
 * Google, credita uma vez só e consome. Nada é creditado por aqui — só o servidor credita.
 */

/** Mesmo cálculo do servidor (playAccountId): liga a compra à conta, sem expor o uid. */
async function accountIdFor(uid: string): Promise<string> {
  const bytes = new TextEncoder().encode(uid);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

async function plugin() {
  return import('@capgo/native-purchases');
}

/** O aparelho tem Google Play com cobrança disponível? */
export async function playBillingAvailable(): Promise<boolean> {
  try {
    const { NativePurchases } = await plugin();
    return (await NativePurchases.isBillingSupported()).isBillingSupported;
  } catch {
    return false;
  }
}

/** Compra um pacote. Devolve quantos diamantes foram creditados. Lança erro com mensagem amigável. */
export async function buyDiamondsWithPlay(productId: string, uid: string): Promise<number> {
  const { NativePurchases, PURCHASE_TYPE } = await plugin();

  let purchaseToken: string | undefined;
  try {
    const tx = await NativePurchases.purchaseProduct({
      productIdentifier: productId,
      productType: PURCHASE_TYPE.INAPP,
      appAccountToken: await accountIdFor(uid),
      // Quem confirma e "consome" é o fluxo abaixo (depois do servidor conferir).
      autoAcknowledgePurchases: false,
      isConsumable: false,
    });
    purchaseToken = tx.purchaseToken;
  } catch (err) {
    const msg = String((err as { message?: string })?.message || err).toLowerCase();
    if (msg.includes('cancel') || msg.includes('user')) throw new Error('Compra cancelada.');
    throw new Error('Não foi possível abrir a compra do Google Play. Tente de novo.');
  }
  if (!purchaseToken) throw new Error('A compra não retornou um comprovante. Tente de novo.');

  const { data } = await verifyPlayPurchaseFn({ productId, purchaseToken });
  try {
    await NativePurchases.consumePurchase({ purchaseToken });
  } catch {
    /* o servidor também consome; se falhar aqui, a próxima abertura da carteira resolve */
  }
  return data.diamonds;
}

/**
 * Compras que ficaram pra trás (pagamento que estava pendente, app fechado no meio,
 * falha de rede): confere de novo com o servidor e credita. Idempotente. Devolve quantos
 * diamantes entraram agora.
 */
export async function recoverPendingPlayPurchases(productIds: string[]): Promise<number> {
  let credited = 0;
  try {
    const { NativePurchases, PURCHASE_TYPE } = await plugin();
    const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP });
    for (const p of purchases) {
      if (!p.purchaseToken || !productIds.includes(p.productIdentifier)) continue;
      // Pendente (ainda não pago) é ignorado — volta na próxima vez.
      if (p.purchaseState && !['1', 'purchased', 'PURCHASED'].includes(String(p.purchaseState))) continue;
      try {
        const { data } = await verifyPlayPurchaseFn({ productId: p.productIdentifier, purchaseToken: p.purchaseToken });
        if (!data.alreadyCredited) credited += data.diamonds;
        await NativePurchases.consumePurchase({ purchaseToken: p.purchaseToken }).catch(() => undefined);
      } catch {
        /* segue pras próximas; o erro aparece se a pessoa tentar comprar de novo */
      }
    }
  } catch {
    /* sem Google Play / sem rede: nada a recuperar agora */
  }
  return credited;
}
