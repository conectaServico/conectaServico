# Conecta Serviço

Marketplace que conecta clientes a prestadores de serviço. O app é web (Vite + React)
e também empacotado para Android via Capacitor.

## Stack

- **React 19** + **TypeScript** + **Vite 6**
- **Tailwind CSS v4** para estilo
- **Firebase** (autenticação e Firestore)
- **Capacitor** para o build Android
- **Zustand** (estado), **React Router v7** (rotas), **react-hot-toast** (avisos)

## Pré-requisitos

- Node.js 18+ e npm
- Um projeto Firebase (chaves de configuração)

## Configuração

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie o arquivo de exemplo de variáveis de ambiente e preencha com as chaves do
   seu projeto Firebase:

   ```bash
   cp .env.example .env
   ```

   Variáveis usadas (prefixo `VITE_`):

   | Variável | Descrição |
   | --- | --- |
   | `VITE_FIREBASE_API_KEY` | API key do Firebase |
   | `VITE_FIREBASE_AUTH_DOMAIN` | Domínio de autenticação |
   | `VITE_FIREBASE_PROJECT_ID` | ID do projeto |
   | `VITE_FIREBASE_STORAGE_BUCKET` | Bucket de storage |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID de mensagens |
   | `VITE_FIREBASE_APP_ID` | App ID |

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe o servidor de desenvolvimento do Vite |
| `npm run build` | Checa tipos (`tsc`) e gera o build de produção |
| `npm run lint` | Roda o ESLint |
| `npm run preview` | Serve localmente o build de produção |

## Estrutura do projeto

```
src/
  admin/         Painel administrativo
  client/        Telas do cliente
  professional/  Telas do prestador
  pages/         Páginas compartilhadas (login, perfil, chat, etc.)
  components/    Componentes reutilizáveis
  hooks/         Hooks customizados
  services/      Integração com Firebase e APIs
  store/         Stores Zustand
  types/         Tipos TypeScript
  utils/         Funções utilitárias
```

O alias `@` aponta para `src/` (configurado em `vite.config.ts`).
