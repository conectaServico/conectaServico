# Publicar os apps na Google Play

Dois apps a partir do mesmo código: **Conecta Serviço Cliente** (`com.conectaservico.app`) e
**Conecta Serviço Profissional** (`com.conectaservico.pro`). Cada um é uma ficha separada na Play Console.

## 1. Gerar os arquivos

```bash
npm run app:client:aab     # dist-app/conecta-servico-cliente-<versão>-b<código>-release.aab
npm run app:pro:aab        # dist-app/conecta-servico-profissional-<versão>-b<código>-release.aab
npm run app:client:apk     # (teste) APK de debug pra instalar direto no celular
```

- Antes de **cada envio novo**, aumente `versionCode` em `android/app/build.gradle` (sempre maior que o último enviado).
- A assinatura vem de `android/keystore.properties` + `android/keystore/conectaservico-upload.jks`
  (**fora do git**). Guarde uma cópia dos dois num lugar seguro (Drive privado/pendrive): sem eles não dá
  pra assinar atualizações. Com o "Play App Signing" (padrão) o Google guarda a chave final e esta é só a
  chave de *upload* — se perder, dá pra pedir troca ao suporte, mas dá trabalho.
- Impressões digitais (SHA) da chave de upload já estão nos dois apps do Firebase. **Depois do 1º envio**, copie
  os SHA-1/SHA-256 da chave que o Google usa em *Play Console → Configuração → Integridade do app →
  Assinatura de apps* e cadastre em *Firebase → Configurações do projeto → seus apps Android → Adicionar
  impressão digital*, nos dois apps. Sem isso, login com Google e SMS não funcionam no app baixado da loja.

## 2. Conta de desenvolvedor

- https://play.google.com/console — taxa única de US$ 25.
- **Conta pessoal** criada depois de nov/2023: precisa de um teste fechado com **12 testadores por 14 dias
  seguidos** antes de liberar a produção (vale para cada app novo). **Conta de empresa** não tem essa
  exigência, mas pede CNPJ e número D-U-N-S. O nome do desenvolvedor aparece na loja.

## 3. Criar o app e enviar

1. Play Console → **Criar app** → nome, idioma (Português – Brasil), tipo *App*, *Grátis*.
2. **Teste e lançamento → Teste interno → Criar versão** → enviar o `.aab` → adicionar seu e-mail como testador.
   Instala em minutos pelo link de teste — bom pra conferir antes de tudo.
3. Preencher **Política do app** (abaixo), a **ficha da loja** e mandar para **Teste fechado** (12 testadores, 14 dias)
   e depois pedir **Acesso à produção**.

## 4. Política do app (todas obrigatórias)

| Item | O que responder |
|---|---|
| Política de privacidade | `https://conectaservicooficial.com.br/privacy` |
| Exclusão de conta | `https://conectaservicooficial.com.br/excluir-conta` (o app também exclui em Perfil → Excluir minha conta) |
| Acesso ao app | Precisa de login. Informe uma conta de teste (ver seção 6) |
| Anúncios | Não tem anúncios |
| Público-alvo | 18 anos ou mais |
| Classificação de conteúdo | Questionário IARC: sem violência/sexo/drogas; **há interação entre usuários (chat)** |
| Categoria | Cliente: *Casa e decoração*. Profissional: *Negócios* |
| Contato | suporte@conectaservicooficial.com.br · (11) 97208-9898 · https://conectaservicooficial.com.br |

### Segurança dos dados (rascunho — confira antes de enviar)

Coleta (todos criptografados em trânsito, exclusão disponível):

- **Informações pessoais:** nome, e-mail, telefone, endereço (CEP/rua/bairro/cidade), IDs de usuário; **CPF** (só profissional, para verificação).
- **Fotos:** foto de perfil, fotos dos pedidos e imagens do chat.
- **Mensagens:** conversas do chat entre cliente e profissional.
- **Histórico de compras / financeiro:** compra de diamantes (só app do profissional). O pagamento em si é feito pela Google Play (no app) ou pelo Mercado Pago (no site); o app não vê cartão nem dados de pagamento.
- **Identificadores do dispositivo:** token de notificações (FCM).
- **Diagnóstico:** registros de erro do app (`errorLogs`), vinculados ao usuário.
- **Não coleta:** localização por GPS (o endereço vem do CEP digitado), contatos, agenda, microfone.
- **Compartilhamento com terceiros:** nenhum para publicidade. Firebase/Google (hospedagem, login, banco) e Mercado Pago (pagamento) atuam como prestadores de serviço.

## 5. Ficha da loja

Ícones de 512×512 e imagens já prontas em `dist-app/store/` (não vão pro git). Textos abaixo.

### Conecta Serviço Cliente

- **Nome:** Conecta Serviço Cliente
- **Descrição curta (até 80):** Peça orçamento grátis e contrate profissionais verificados perto de você.
- **Descrição completa:**

> Precisa de eletricista, pintor, diarista, técnico de celular ou outro profissional? Na Conecta Serviço você descreve o que precisa e recebe propostas de profissionais — pedir orçamento não custa nada.
>
> COMO FUNCIONA
> 1. Conte o que você precisa: descreva o serviço, o local e quando quer.
> 2. Receba propostas: profissionais interessados entram em contato e enviam orçamento.
> 3. Converse e escolha: fale direto pelo chat, confira as avaliações e o selo Verificado e contrate quem preferir.
> 4. Avalie o serviço quando terminar e ajude outras pessoas a escolherem bem.
>
> POR QUE USAR
> • Pedir orçamento é grátis.
> • Profissionais com documentos conferidos pela nossa equipe (selo Verificado).
> • Chat direto com o profissional, sem intermediário.
> • Você combina preço e pagamento diretamente com o profissional — a plataforma não cobra comissão sobre o serviço.
> • Notificações quando chega uma proposta ou mensagem.
>
> CATEGORIAS
> Reformas e reparos, serviços domésticos, assistência técnica, design e tecnologia e serviços gerais.
>
> Dúvidas? suporte@conectaservicooficial.com.br

### Conecta Serviço Profissional

- **Nome:** Conecta Serviço Profissional
- **Descrição curta (até 80):** Receba pedidos de clientes perto de você. Sem mensalidade e sem comissão.
- **Descrição completa:**

> Encontre novos clientes e feche mais serviços. Na Conecta Serviço Profissional você vê os pedidos da sua região, escolhe quais quer atender e fala direto com o cliente.
>
> COMO FUNCIONA
> 1. Veja pedidos perto de você: escolha suas categorias e o raio de atuação.
> 2. Invista só no que interessa: use diamantes apenas nos pedidos que quiser atender, para liberar o contato do cliente. Sem mensalidade.
> 3. Feche o serviço: combine preço e prazo direto com o cliente pelo chat.
> 4. Destaque seu perfil: coloque sua foto, valide seu CPF e receba o selo Verificado.
>
> VANTAGENS
> • Sem comissão sobre o serviço: o valor combinado com o cliente é todo seu.
> • Você decide em quais pedidos investir.
> • Avisos de novos pedidos na sua região e mensagens de clientes.
> • Cada pedido é enviado para poucos profissionais (até 3).
>
> Dúvidas? suporte@conectaservicooficial.com.br

### Imagens

- Ícone 512×512, imagem de destaque 1024×500 e pelo menos 2 capturas de tela do celular: gerados em `dist-app/store/`.
- Prefira depois trocar por capturas reais das telas logadas (tiradas no celular).

## 6. Conta de teste para a revisão do Google

O revisor precisa entrar no app. Prepare:

- **App Cliente:** crie uma conta por e-mail e senha pelo próprio app e informe e-mail/senha em *Acesso ao app*.
- **App Profissional:** o login é por SMS, que o revisor não recebe. No Firebase → Authentication → Método de login →
  Telefone → **Números de telefone para teste**, cadastre um número fictício com um código fixo, crie a conta de
  profissional com ele e informe número + código no *Acesso ao app*. (Remova o número depois da aprovação, se quiser.)

## 7. Diamantes dentro do app: Google Play Billing (implementado)

O **app Cliente** não vende nada. O **app Profissional** vende diamantes e, por regra da Google, faz isso pelo
**Google Play Billing** (o site continua no Mercado Pago). Como funciona:

- O app abre a janela de compra da Google; o pagamento é da Google. Depois manda o comprovante (token) para a
  function `verifyPlayPurchase`, que **confere com a Google**, credita os diamantes **uma única vez** e "consome"
  a compra (libera pra comprar de novo). O app nunca credita nada sozinho.
- **Preço no app = preço do site + 20%** (cobre a taxa da Google), arredondado pra cima:

| Pacote | Site (Mercado Pago) | App (Google Play) |
|---|---|---|
| 50 diamantes  | R$ 9,90  | **R$ 11,90** |
| 150 diamantes | R$ 27,90 | **R$ 33,90** |
| 300 diamantes | R$ 49,90 | **R$ 59,90** |

  Os preços do app estão em `src/utils/diamondPackages.ts` (`APP_PRICES`) e em `functions/src/index.ts`
  (`PLAY_PRODUCTS`) — e **precisam ser iguais aos da Play Console**.
- Compras que ficaram no meio do caminho (pagamento pendente, app fechado, sem internet) são conferidas de novo ao abrir a Carteira.

### O que configurar (depois que a conta da Play estiver aprovada)

1. **Google Cloud:** ativar a API *Google Play Android Developer API* no projeto `conectaservico-1a324`
   (https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com?project=conectaservico-1a324).
2. **Play Console → Monetização → Produtos → Produtos no app:** criar 3 produtos **gerenciados** com estes IDs
   (exatamente assim): `pkg_50`, `pkg_150`, `pkg_300`, com os preços da tabela acima, status *Ativo*.
   (Antes disso a Play pede o perfil de pagamentos/comerciante: dados da empresa e conta bancária.)
3. **Play Console → Usuários e permissões → Convidar usuários:** convidar a conta de serviço das functions
   (`906333174854-compute@developer.gserviceaccount.com` — confirme em Cloud Run → função → Segurança) com as
   permissões *Ver informações financeiras* e *Gerenciar pedidos e assinaturas*. Sem isso, `verifyPlayPurchase`
   responde "verificação de compras ainda não configurada".
4. **Testadores de licença** (Configurações → Testadores de licença): adicionar o seu Gmail — as compras de teste
   não cobram nada.
5. **Testar:** enviar o `.aab` do Profissional para **Teste interno**, instalar pelo link de teste (compra só funciona
   em app instalado pela Play) e comprar um pacote. Conferir se o saldo sobe e se o extrato mostra "(Google Play)".

**Limitações conhecidas:** um reembolso feito pela Google **não** desconta os diamantes automaticamente (ajustar em
Admin → usuário → ajustar diamantes). O preço dos diamantes é o mesmo em todas as regiões.
