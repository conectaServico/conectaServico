# Deploy / Produção — Conecta Serviço

Projeto Firebase: **conectaservico-1a324** (plano **Blaze** obrigatório para Cloud Functions).

## 1. Variáveis de ambiente

### Web (`.env` na raiz — Vite)

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=conectaservico-1a324.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=conectaservico-1a324
VITE_FIREBASE_STORAGE_BUCKET=conectaservico-1a324.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# Opcional — liga o App Check (reCAPTCHA v3). Sem isso o app roda, mas sem proteção anti-abuso.
VITE_FIREBASE_APPCHECK_RECAPTCHA_KEY=

# Mercado Pago — a PRESENÇA desta chave faz o app usar o checkout real (senão, simulado)
VITE_MP_PUBLIC_KEY=

# Push Web (FCM). Console -> Cloud Messaging -> Certificados push da Web -> Par de chaves.
# A PRESENÇA desta chave liga o push no navegador. O app Android usa google-services.json.
VITE_FIREBASE_VAPID_KEY=

# Dev local com emuladores: "1"
VITE_USE_EMULATORS=
```

### Cloud Functions

Dev local — `functions/.env` (ignorado pelo git):

```
ALLOW_SIMULATED_PAYMENTS=true
```

Produção:

```bash
# segredo do bootstrap do 1º admin
firebase functions:secrets:set ADMIN_BOOTSTRAP_SECRET

# Mercado Pago (Checkout Pro) — ver functions/README.md
# OBRIGATÓRIO antes do 1º "deploy --only functions": as functions declaram esses secrets e o
# deploy FALHA se não existirem ("Cloud Secret Manager has no latest version..."). Se ainda não
# tem conta MP, use o valor PLACEHOLDER e troque depois.
firebase functions:secrets:set MP_ACCESS_TOKEN     # TEST-... / APP_USR-... (ou PLACEHOLDER)
firebase functions:secrets:set MP_WEBHOOK_SECRET   # assinatura secreta do webhook (ou PLACEHOLDER)

# staging: manter a compra simulada enquanto o MP não estiver configurado
firebase functions:secrets:set ALLOW_SIMULATED_PAYMENTS   # valor: true
# produção real: NÃO defina (ou deixe diferente de "true") -> simulatePurchase fica bloqueada
```

> Sem `VITE_MP_PUBLIC_KEY` **e** sem `ALLOW_SIMULATED_PAYMENTS=true`, a tela "Adicionar Diamantes"
> retorna erro proposital. Webhook do MP:
> `https://southamerica-east1-conectaservico-1a324.cloudfunctions.net/mercadoPagoWebhook`

## 1c. Autenticação — verificação de e-mail e telefone (obrigatório)

As regras do Firestore agora **exigem e-mail + telefone verificados** para publicar pedido,
enviar proposta, conversar, avaliar, desbloquear contato ou comprar diamantes. Configure no Console:

1. **Authentication → Métodos de login**: habilite **E-mail/senha** e **Telefone**.
2. **Authentication → Configurações → Domínios autorizados**: inclua o domínio de produção
   (o do Hosting e qualquer domínio próprio). O link do e-mail de verificação e o reCAPTCHA
   do telefone só funcionam em domínio autorizado.
3. **Authentication → Templates**: revise o "Verificação de endereço de e-mail" (nome do
   remetente, idioma). O e-mail é enviado pelo próprio Firebase — sem custo.
4. **Telefone (SMS)** tem custo (~US$0,01–0,06/SMS após cota gratuita pequena). Para testar sem
   gastar, use **Authentication → Phone → Números de teste** (número + código fixos).
5. **App Android**: o Phone Auth nativo precisa do **SHA-256** do app cadastrado no Firebase
   + `google-services.json` + Play Integrity. **No site (Hosting) funciona sem isso** — usa
   reCAPTCHA invisível. A tela `/verify` usa o SDK web em ambos.
6. Se ligar **App Check enforce**, confirme que o fluxo de telefone continua passando (o
   reCAPTCHA do Phone Auth é independente do App Check, mas vale testar).

> Usuários de teste já existentes que não verificaram **não conseguem** criar pedido/proposta
> depois deste deploy — é o esperado. Recadastre ou verifique cada um pela tela `/verify`.

## 1d. Cliente entra por e-mail, profissional entra por celular (SMS)

Desde esta leva, **cliente** cadastra/entra com e-mail + senha (como antes) e **profissional**
cadastra/entra **só com o celular + código SMS** (Firebase Phone Auth puro, sem senha). Assim a
mesma pessoa pode ter uma conta de cliente (chave = e-mail) e uma de profissional (chave =
telefone) sem o erro de "e-mail já em uso". O e-mail do profissional é **opcional** (recuperação
de acesso + recibo do Mercado Pago) e nunca é usado para login.

- Depende do provedor **Telefone** habilitado + domínios autorizados (passos 1 e 2 acima).
- `firestore.rules` `isVerified()` e `functions` `assertVerified()` foram ajustados: conta cujo
  `sign_in_provider == 'phone'` conta como contato verificado (o SMS já é a verificação). **Faça
  deploy de `firestore:rules` e `functions` junto** — sem isso o profissional novo fica travado
  para propor/desbloquear/comprar.
- **SMS a cada login** do profissional: tem custo por mensagem e cota diária do Firebase.
  Proteção = reCAPTCHA invisível (`RecaptchaVerifier`) + App Check enforce (quando ligar).
  Para testar sem gastar, use os **Números de teste** do Console.
- **Limitação:** um número de telefone = uma conta Firebase. Se o cliente já confirmou aquele
  número na conta de e-mail dele, o login/cadastro de profissional com o mesmo número entra na
  conta de cliente — o app detecta o `role` e mostra aviso pedindo para entrar por e-mail. Quem
  quiser as duas contas usa um número diferente na de profissional.
- **Limitação:** o e-mail opcional do profissional é só um contato guardado + recibo; não dá
  reset de senha self-service (a conta não tem senha). Recuperação real = suporte.

## 2. Instalar e buildar

```bash
npm install
npm run build                 # front-end -> dist/
cd functions && npm install && npm run build && cd ..
```

## 3. Deploy

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage,functions,hosting
```

O deploy compila as regras no servidor — se houver erro de sintaxe em `firestore.rules`
ou `storage.rules`, ele falha antes de aplicar.

## 4. Primeiro administrador

Baixe a chave de serviço (Console → *Configurações do projeto* → *Contas de serviço* →
*Gerar nova chave privada*) e salve como `functions/serviceAccountKey.json` (já no `.gitignore`).

```powershell
cd functions
node scripts/set-admin.mjs seu-email@gmail.com
cd ..
```

Depois **logout e login** no app para o token pegar o claim `admin`.
Os demais admins você promove pelo próprio app com `grantAdminFn({ email })`, já logado como admin
(ou rodando o script de novo).

> Alternativa sem chave de serviço: chamar `bootstrapAdminFn({ secret: '<ADMIN_BOOTSTRAP_SECRET>' })`
> a partir de uma tela logada / `firebase functions:shell`.

## 5. Migração de dados (antes de abrir para usuários reais)

Campos novos que precisam de backfill:

1. **`publicProfiles/*`** — projeção pública dos `users` (a Function `syncPublicProfile` cuida
   dos novos daqui pra frente; para os que já existem, rode uma vez):
   ```powershell
   cd functions
   node scripts/backfill-public-profiles.mjs
   cd ..
   ```
2. **`proposals/*.clientId`** — propostas antigas não têm. Sem ele o cliente não vê a conversa.
3. **`lat`/`lng`/`geohash`/`uf`/`cityKey` (Fase 4)** — `users` e `serviceRequests` antigos não têm.
   O profissional passa a gravar ao salvar o perfil; o pedido, ao ser criado. Sem `geohash` o
   pedido **não aparece na busca por raio** (só no fallback "pedidos recentes"). Backfill:
   recadastro/re-save do perfil, ou um script que percorra as coleções chamando `buildGeoFields`.
4. **`searchTokens` (Fase 5)** — a busca textual usa esse array. Para `publicProfiles` o
   `backfill-public-profiles.mjs` já gera os tokens; para `serviceRequests` antigos, só os
   novos pedidos entram na busca por texto (o pro segue vendo tudo pelo raio/recentes).
5. **`photos` (Fase 5)** — só pedidos criados a partir de agora têm fotos; nada a migrar.

**Recomendado em pré-produção:** em vez de migrar, limpe as coleções de teste
(`proposals`, `messages`, `unlocks`, `transactions`, `reviews`, `serviceRequests`) — ver Passo 6 do chat.
Ao recadastrar, `syncPublicProfile` gera os `publicProfiles` e o geohash entra automaticamente.

## 5b. Push de novo pedido (Fase 4) — opcional, liga quando quiser

- **Web:** defina `VITE_FIREBASE_VAPID_KEY` no `.env`, rebuild, `deploy --only hosting`.
  O `public/firebase-messaging-sw.js` já vai junto. O profissional vê o botão
  "Ativar avisos de novos pedidos" no feed.
- **Android (APK):** baixe `google-services.json` (Console → app `com.conectaservico.app`) para
  `android/app/google-services.json`, rode `npm install` (traz `@capacitor/push-notifications`),
  `npx cap sync android` e rebuilde. O Gradle já aplica o `google-services` quando o JSON existe.
- A Function `notifyProfessionalsOnNewRequest` sobe no `deploy --only functions` e fica inerte
  enquanto não houver tokens cadastrados. Índices de `users` sobem no `deploy --only firestore:indexes`.

## 6. O que ainda falta para produção (próximas fases)

| Fase | Item |
|---|---|
| ~~1~~ | ✅ Backend (Cloud Functions) + regras de segurança |
| ~~2~~ | ✅ Pagamento real Mercado Pago (Checkout Pro + `mercadoPagoWebhook` credita o saldo). Ativa com `VITE_MP_PUBLIC_KEY` + secrets `MP_ACCESS_TOKEN`/`MP_WEBHOOK_SECRET`. `simulatePurchase` fica como fallback de staging. |
| ~~3~~ | ✅ Gating de contato: `users` só é legível pelo dono/admin; o app usa `publicProfiles`; `unlockContact` entrega o telefone só depois do pagamento |
| ~~4~~ | ✅ `geohash` na escrita (`src/utils/geo.ts` via BrasilAPI + centroide de UF) + busca por raio no feed do profissional + match por categoria; paginação (`limit` + "carregar mais") em ProHome/RequestsList/Search + índices; push (FCM) de novo lead (`notifyProfessionalsOnNewRequest` + `src/services/push.ts` + SW); code-splitting (rotas lazy, `face-api.js` sob demanda, chunks `react`/`firebase`/`faceapi` — bundle de entrada ~63 KB). Push e raio preciso são opt-in (ver 5b e `VITE_FIREBASE_VAPID_KEY`). |
| ~~5~~ | ✅ Fotos no pedido (`requestPhotos/` no Storage, até 6, comprimidas no cliente por `src/utils/images.ts`, exibidas em JobDetails/ProHome); imagens no chat (`chatImages/`, `Message.type='image'`); busca textual por `searchTokens` no Firestore (`src/utils/search.ts` + `syncPublicProfile`, `array-contains-any`, ranqueada no cliente) — Algolia fica como upgrade futuro. **Sem planos de assinatura**: a monetização é só compra de diamantes para desbloquear contato. |
| 6 | **Endurecimento para produção** (em andamento). ✅ Bloco 1: verificação de e-mail (`sendEmailVerification`) + telefone (Firebase Phone Auth, tela `/verify`, `RecaptchaVerifier` invisível) — sem verificar, o app **trava publicar pedido / propor / conversar / avaliar / desbloquear / comprar** (faixa de aviso + `isVerified()` nas regras + `assertVerified()` nas Functions `unlockContact`/`attach…`/`simulate…`/`createPaymentPreference`); "Esqueci minha senha" no login; foto de perfil do profissional agora **falha fechada** (`src/utils/faceCheck.ts`); raio do feed não mostra mais o Brasil inteiro (fallback por UF/cidade) + 2º geocoder (Nominatim). ✅ Bloco 2: **onboarding obrigatório do profissional** (`useProOnboarding` + `ProOnboarding` — feed bloqueado até foto+serviços+região+documento; `unlockContact` também checa serviços+região no servidor); **aceite de Termos/LGPD** no cadastro (checkbox obrigatório + aviso no login Google; `termsAcceptedAt is number` exigido nas regras de `users` create); **excluir conta** (`deleteMyAccount` callable + tela em Profile com "digite EXCLUIR"); "Sair" agora faz `signOut` do Firebase de verdade. ✅ Bloco 3: **face-match selfie × documento** — `public/models/` ganhou `face_landmark_68` + `face_recognition` (~6,8 MB, versionar e subir no `deploy --only hosting`); ao trocar a foto o pro gera um descritor facial (128 nº em `users.faceDescriptor`, doc privado); no envio do KYC (`DocumentValidation`) o rosto da frente do documento precisa bater com esse descritor (limiar 0.58) — senão bloqueia; trocar a foto depois também é checado contra o rosto do documento. Sem rosto detectável no documento → bloqueia. ✅ Bloco 4: **recusar lead** (`users/{uid}/dismissedLeads`, X no card + lixeira no JobDetails); **avaliação mútua** (`clientReviews` + `onClientReviewCreated` agrega `users.clientRating`; form no JobDetails do pro contratado; reputação do cliente desnormalizada no pedido); **central de avisos in-app** (`users/{uid}/notifications` escrito só por Functions — nova proposta, aceita/recusada, avaliação, KYC, novo lead; `useNotifications` + página `/notifications` + sino no Navbar com badge); **cancelar/reabrir pedido** (`cancelRequest` reembolsa quem desbloqueou + rejeita propostas; `reopenRequest`; botões no JobDetails). ✅ Bloco 5: **CPF com dígito verificador** (`src/utils/cpf.ts`, obrigatório no KYC, salvo em `validations/{uid}.cpf`); **caps anti-spam nas regras** (description 20–5000, message/comment ≤3000) + **limite de 15 pedidos OPEN por cliente** (checado no trigger `notifyProfessionalsOnNewRequest`, cancela o excedente); **App Check** — debug token liberado em dev com emuladores (falta ligar *enforce* no console). |

## 7. Checklist de segurança pós-deploy

- [ ] `firestore.rules` e `storage.rules` publicados (não as regras de teste padrão).
- [ ] `publicProfiles` backfillado; `users` NÃO é mais legível por terceiros (teste: logado como profissional, tente `getDoc(users/<id de um cliente>)` no console → deve dar `permission-denied`).
- [ ] App Check em modo **enforce** para Firestore, Functions e Storage (depois de validar que o tráfego legítimo passa).
- [ ] `ADMIN_BOOTSTRAP_SECRET` definido e forte; rotacionar depois de criar o 1º admin.
- [ ] `ALLOW_SIMULATED_PAYMENTS` **não** habilitado em produção real.
- [ ] Provedor de e-mail/senha, **Telefone** e Google habilitados no Firebase Auth; domínios autorizados incluem o de produção (ver 1c).
- [ ] Regras de Storage: bucket é `...firebasestorage.app` (confirmar em `storage.rules` / console).
- [ ] `public/models/` com os 5 arquivos (`ssd_mobilenetv1`, `face_landmark_68`, `face_recognition`) versionados e no Hosting.
- [ ] Índices do Firestore construídos (aba *Indexes* sem "Building").
