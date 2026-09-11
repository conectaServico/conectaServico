# Firebase — passo a passo de configuração

Projeto: **conectaservico-1a324**
Console: https://console.firebase.google.com/project/conectaservico-1a324

Tudo já foi **deployado** (regras, índices, Storage, Hosting, 18 Functions). O que falta é
configuração no console. Faça a **Parte 1** agora (o app não funciona direito sem ela).

---

## PARTE 1 — OBRIGATÓRIO AGORA

### 1.1 Ativar login por Telefone

`Authentication` → aba **Sign-in method** (Métodos de login) → **Add new provider** → **Phone** → **Enable** → **Save**.

> O app agora exige e-mail **e** telefone verificados para publicar pedido, enviar proposta,
> conversar, avaliar, desbloquear contato ou comprar diamantes. Sem o provedor Phone ligado,
> a tela `/verify` não consegue mandar o SMS.

### 1.2 Conferir os outros provedores

Mesma tela (**Sign-in method**):
- **Email/Password** → deve estar **Enabled**.
- **Google** → **Enabled**. Se pedir "support email", escolha o seu.

### 1.3 Domínios autorizados

`Authentication` → aba **Settings** (Configurações) → **Authorized domains** → **Add domain**:
- `conectaservico-1a324.web.app`

(`conectaservico-1a324.firebaseapp.com` e `localhost` já vêm por padrão.)
Se um dia usar domínio próprio (ex.: `conectaservico.com.br`), adicione aqui também — o link
do e-mail de verificação e o reCAPTCHA do telefone só funcionam em domínio autorizado.

### 1.4 Proteção contra fraude de SMS  ⚠️ importante

`Authentication` → **Settings** → **SMS region policy** (Política de região de SMS):
- Selecione **Allow** e deixe **somente Brazil (+55)**.

Isso bloqueia "SMS pumping" — ataque que dispara milhares de SMS para números caros no
exterior e cai na sua fatura. Sem essa trava, um abuso pode custar centenas de reais.

### 1.5 Números de teste (recomendado — testar sem gastar SMS)

`Authentication` → **Sign-in method** → **Phone** → **Phone numbers for testing** → adicione:
- Telefone: `+55 11 99999-9999`  ·  Código: `123456`

Na tela `/verify` do app, use esse número + código — não envia SMS de verdade.

### 1.6 E-mail de verificação (opcional, mas deixa mais profissional)

`Authentication` → aba **Templates** → **Email address verification**:
- Ajuste o **From name** (ex.: `Conecta Serviço`).
- Troque o idioma para **Português** no seletor do topo.

### 1.7 Virar administrador

Você precisa de 1 conta admin para aprovar os documentos (KYC) dos profissionais.

1. Console → ⚙️ **Configurações do projeto** → aba **Contas de serviço** →
   **Gerar nova chave privada** → salve o arquivo como `functions/serviceAccountKey.json`
   (já está no `.gitignore`).
2. No terminal, na raiz do projeto:
   ```powershell
   cd functions
   node scripts/set-admin.mjs SEU-EMAIL@gmail.com
   cd ..
   ```
3. Faça **logout e login** no app para o token pegar o acesso de admin.
4. Depois, se precisar de mais admins: logado como admin, o painel `/admin` promove outros.

---

## PARTE 2 — ANTES DE ABRIR PARA O PÚBLICO

### 2.1 Esperar os índices

`Firestore Database` → aba **Indexes** (Índices) → espere todos ficarem **Enabled**
(sem "Building"). Leva alguns minutos. São 11 índices compostos.

### 2.2 Limpar os dados de teste

As regras novas **bloqueiam contas não verificadas** de criar pedido/proposta. Contas e
dados de teste antigos vão dar erro. O mais limpo é zerar:

`Firestore Database` → aba **Data** → apague as coleções:
`serviceRequests`, `proposals`, `messages`, `unlocks`, `transactions`, `reviews`,
`clientReviews`, `payments`, `validations`.

Depois **recadastre** as contas de teste com e-mail e telefone reais (ou use os números de
teste do passo 1.5) e passe pela tela `/verify`.

### 2.3 Backfill dos perfis públicos

Para os usuários que **já existem** aparecerem na busca:
```powershell
cd functions
node scripts/backfill-public-profiles.mjs
cd ..
```
(precisa do `functions/serviceAccountKey.json` do passo 1.7)

### 2.4 Alerta de orçamento  ⚠️ recomendado

O plano Blaze cobra por uso (SMS, Functions, etc.). Configure um teto:

Google Cloud Console → **Billing** → **Budgets & alerts** → **Create budget**:
- Defina um valor (ex.: R$ 50/mês) e alertas em 50% / 90% / 100%.
- https://console.cloud.google.com/billing

### 2.5 Compra simulada de diamantes (enquanto o Mercado Pago não está pronto)

Hoje a tela "Adicionar Diamantes" dá **erro proposital** (sem MP e sem modo simulado).
Para liberar a compra simulada em testes:

1. Crie o arquivo `functions/.env` (não versionado) com:
   ```
   ALLOW_SIMULATED_PAYMENTS=true
   ```
2. `npx firebase deploy --only functions`

> **Nunca** deixe isso ligado em produção real — some com o arquivo e redeploy quando
> o Mercado Pago entrar (Parte 3.4).

---

## PARTE 3 — QUANDO TIVER AS CHAVES (pode deixar para depois)

### 3.1 App Check (proteção anti-bot)

1. Console → **App Check** → aba **Apps** → seu app **Web** → **Register**.
2. Escolha **reCAPTCHA v3** → ele gera uma **site key**.
3. No `.env` da raiz: `VITE_FIREBASE_APPCHECK_RECAPTCHA_KEY=<site key>`
4. `npm run build` e `npx firebase deploy --only hosting`.
5. Use o app normalmente por 1–2 dias e olhe **App Check → Metrics** (tráfego "verified").
6. **Só depois** que o tráfego legítimo estiver passando: App Check → aba **APIs** →
   **Enforce** para **Cloud Firestore**, **Cloud Functions** e **Cloud Storage**.

### 3.2 Push no navegador (Web)

1. Console → ⚙️ **Configurações do projeto** → aba **Cloud Messaging** →
   **Web Push certificates** → **Generate key pair**.
2. Copie a chave → `.env`: `VITE_FIREBASE_VAPID_KEY=<chave>`
3. `npm run build` e `npx firebase deploy --only hosting`.
4. No app, o profissional passa a ver **"Ativar avisos de novos pedidos"** no feed.

### 3.3 Push no app Android

1. Console → ⚙️ **Configurações do projeto** → **Seus apps** → app **Android**.
   - Se não existir: **Adicionar app** → Android → pacote `com.conectaservico.app`.
   - Adicione o **SHA-256** do seu keystore (necessário também para o Phone Auth nativo):
     ```
     keytool -list -v -keystore CAMINHO/DO/keystore.jks -alias SEU_ALIAS
     ```
2. Baixe o **`google-services.json`** → coloque em `android/app/google-services.json`.
3. `npm install` → `npx cap sync android` → rebuild do APK.

### 3.4 Mercado Pago (pagamento real)

Hoje os secrets `MP_ACCESS_TOKEN` / `MP_WEBHOOK_SECRET` estão como `PLACEHOLDER`
(a compra usa o modo simulado). Quando tiver a conta:

1. https://www.mercadopago.com.br/developers → sua aplicação → **Credenciais**.
2. `npx firebase functions:secrets:set MP_ACCESS_TOKEN` → cole o **Access Token**.
3. `.env` da raiz: `VITE_MP_PUBLIC_KEY=<Public Key>`
4. Painel MP → **Webhooks** → URL:
   `https://southamerica-east1-conectaservico-1a324.cloudfunctions.net/mercadoPagoWebhook`
   → evento **Pagamentos** → copie a **Assinatura secreta**.
5. `npx firebase functions:secrets:set MP_WEBHOOK_SECRET` → cole a assinatura.
6. Remova `functions/.env` (o `ALLOW_SIMULATED_PAYMENTS`), depois:
   `npm run build` e `npx firebase deploy --only functions,hosting`.

---

## Checklist rápido

- [ ] 1.1 Phone provider ligado
- [ ] 1.3 `conectaservico-1a324.web.app` nos domínios autorizados
- [ ] 1.4 SMS region policy = só Brasil
- [ ] 1.7 Você é admin (logout/login feito)
- [ ] 2.1 Índices "Enabled"
- [ ] 2.2 Coleções de teste limpas
- [ ] 2.3 `backfill-public-profiles.mjs` rodado
- [ ] 2.4 Alerta de orçamento no Google Cloud
- [ ] 3.x App Check / Push / Mercado Pago — quando quiser
