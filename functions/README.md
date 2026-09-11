# Cloud Functions — Conecta Serviço

Backend autoritativo. O cliente **nunca** grava saldo, nota, verificação, `unlockCount`,
status de proposta `accepted`, transações ou unlocks — tudo isso passa por aqui.

## Funções

| Função | Tipo | O que faz |
|---|---|---|
| `onUserCreated` | trigger `users/{uid}` | Dá 100 diamantes + transação `BONUS_SIGNUP` para profissional novo |
| `unlockContact` | callable | Débito atômico de 10 💎, cria `unlocks` + `transactions`, incrementa `unlockCount`, devolve o contato do cliente |
| `acceptProposal` | callable | Fecha o pedido, aceita 1 proposta, rejeita as outras, reembolsa quem desbloqueou e não foi escolhido |
| `attachProfessionalToRequest` | callable | "Solicitar orçamento" direto pelo perfil: cria proposta aceita + 1ª mensagem |
| `onReviewCreated` | trigger `reviews/{id}` | Recalcula `ratingSum` / `reviewCount` / `rating` do profissional (idempotente) |
| `reviewValidation` | callable (admin) | Aprova/recusa KYC e seta `users.verified` |
| `bootstrapAdmin` | callable | Concede claim `admin` ao chamador se o segredo bater (1ª vez) |
| `grantAdmin` | callable (admin) | Concede claim `admin` a outro usuário por e-mail |
| `syncPublicProfile` | trigger `users/{uid}` | Espelha os campos públicos do perfil em `publicProfiles/{uid}` e gera `searchTokens` (busca textual) |
| `createPaymentPreference` | callable | Cria a preferência de Checkout Pro do Mercado Pago e devolve a URL de pagamento |
| `mercadoPagoWebhook` | HTTP público | Recebe a notificação do MP, confere o pagamento na API e credita o saldo (idempotente, valida `x-signature`) |
| `notifyProfessionalsOnNewRequest` | trigger `serviceRequests/{id}` | Push (FCM) de novo pedido para profissionais compatíveis: casa por categoria/subcategoria, filtra por raio (ou UF), envia em lotes e limpa tokens mortos |
| `deleteMyAccount` | callable | Exclusão da própria conta (LGPD): apaga perfil, `publicProfiles`, KYC, arquivos do Storage, pedidos/propostas em aberto; anonimiza avaliações; mantém `transactions`/`payments`; remove do Auth |
| `simulatePurchase` | callable | Compra simulada (sem gateway). Só roda se `ALLOW_SIMULATED_PAYMENTS=true` |

## Setup

```bash
cd functions
npm install
npm run build
```

### Variáveis

Dev local (`functions/.env`, ignorado pelo git):

```
ALLOW_SIMULATED_PAYMENTS=true
```

Produção:

```bash
firebase functions:secrets:set ADMIN_BOOTSTRAP_SECRET

# Mercado Pago (Checkout Pro)
firebase functions:secrets:set MP_ACCESS_TOKEN     # TEST-... (sandbox) ou APP_USR-... (produção)
firebase functions:secrets:set MP_WEBHOOK_SECRET   # "Assinatura secreta" do webhook no painel do MP

# defina ALLOW_SIMULATED_PAYMENTS só se quiser manter a compra simulada em staging
```

### Mercado Pago — configuração

1. https://www.mercadopago.com.br/developers → sua aplicação → **Credenciais**.
   - `MP_ACCESS_TOKEN` = Access Token (use o de teste primeiro).
   - No front, `.env` da raiz: `VITE_MP_PUBLIC_KEY=<Public Key>` — só a presença dessa chave
     faz o app usar o checkout real em vez do simulado.
2. Painel → **Webhooks** → nova configuração:
   - URL: `https://southamerica-east1-conectaservico-1a324.cloudfunctions.net/mercadoPagoWebhook`
   - Evento: **Pagamentos**.
   - Copie a **Assinatura secreta** → `MP_WEBHOOK_SECRET`.
3. `auto_return` do Checkout Pro exige `back_urls` https válidas — teste com a URL do Hosting
   (localhost não retorna automaticamente).

### Push (FCM) — configuração

`notifyProfessionalsOnNewRequest` usa o Admin SDK (`getMessaging`) — **não precisa de secret**.
O que precisa existir para a mensagem chegar no aparelho:

- **Web** (site do Hosting): `.env` da raiz com `VITE_FIREBASE_VAPID_KEY` (Console → *Configurações
  do projeto* → *Cloud Messaging* → *Certificados push da Web* → *Par de chaves*). O
  `public/firebase-messaging-sw.js` já está no repo; recebe a config pela querystring do registro.
- **Android** (APK): `android/app/google-services.json` (Console → app Android `com.conectaservico.app`)
  e `npx cap sync android`. O Gradle já aplica o plugin `google-services` quando o arquivo existe.
- Índices compostos em `users` (`role` + `serviceCategories`, `role` + `services`) — já em
  `firestore.indexes.json`, sobem no `deploy --only firestore:indexes`.

Sem `VITE_FIREBASE_VAPID_KEY` e sem `google-services.json` a Function roda e não faz nada
(nenhum token cadastrado) — não quebra nada.

## Deploy

```bash
firebase deploy --only functions,firestore:rules,firestore:indexes,storage
```

## Primeiro admin

1. Faça login no app com a conta que será admin.
2. No console do navegador (ou numa tela temporária), chame `bootstrapAdmin({ secret: "<valor>" })`.
3. Logout/login para o token atualizar. Depois use `grantAdmin({ email })` para os demais.

## Região

`southamerica-east1` (São Paulo). O cliente precisa usar a mesma região em `getFunctions(app, 'southamerica-east1')`.
