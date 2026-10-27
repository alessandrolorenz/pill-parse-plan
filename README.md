# Pills Planner (DoseCerta)

App que lê fotos de receitas médicas com IA (OpenAI Vision), gera um plano de tratamento revisável e agenda as doses na Web e no celular (iOS / Android).

## 📐 Arquitetura do Sistema e Diagramas

A documentação detalhada da arquitetura do projeto — incluindo diagramas C4 (Contexto, Contêineres e Componentes), fluxos sequenciais ponta a ponta, modelo de entidades (ERD), arquitetura de tokens do Figma e governança de qualidade com IA — está disponível em:

👉 **[Consulte a Arquitetura Completa (ARCHITECTURE.md)](./ARCHITECTURE.md)**

---

## Estrutura do repositório

Monorepo com pnpm workspaces:

| Pasta | Conteúdo |
|---|---|
| raiz (`src/`) | App Web: React 18 + Vite + Tailwind + shadcn/ui |
| `apps/mobile` | App Mobile: Expo SDK 56 + React Native 0.85 + NativeWind |
| `packages/core` | Tipos de domínio e o motor de agendamento (`expandPlanToEvents`), compartilhados entre Web e Mobile |
| `supabase/` | Migrations e Edge Functions (`analyze-prescription`, `openai-status`) |
| `server.js` + `api/` | Servidor Express legado (proxy OpenAI, Web Push e cron de notificações) |

## ⚠️ Configuração

### 1. Chave da OpenAI (Supabase Edge Function)

A análise de receitas roda na Edge Function `analyze-prescription`. A chave da OpenAI fica como secret do Supabase e nunca vai para o cliente:

```sh
supabase secrets set OPENAI_API_KEY=sk-sua-chave-aqui
```

Obtenha a chave em [platform.openai.com/api-keys](https://platform.openai.com/api-keys).

### 2. Variáveis de ambiente locais

```sh
cp .env.example .env
```

- Web: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- Mobile: `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Servidor Express (opcional, só para Web Push): `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `PORT` (padrão 3001)

Sem as variáveis, os clientes Web e Mobile usam como fallback o projeto Supabase fixo no código (`ekqygszihajwzeztdbqq`). Atenção: `supabase/config.toml` aponta para outro projeto (`qryiaiuwcqaoyjlbywfn`).

### 3. Executar

```sh
pnpm install

pnpm dev            # App Web em http://localhost:8080
pnpm mobile:start   # App Mobile (Expo)
```

O servidor Express (`pnpm server`, ou `pnpm dev:full` para Web + servidor) só é necessário para Web Push. As dependências dele (`express`, `cors`, `dotenv`, `web-push`) **não estão declaradas no `package.json`** e precisam ser instaladas antes: `pnpm add express cors dotenv web-push`.

### 4. Testes e qualidade

```sh
pnpm test                             # Vitest (src/ e packages/core)
pnpm lint
pnpm exec tsc --noEmit -p tsconfig.app.json
pnpm build
```

## Builds Mobile

```sh
pnpm mobile:build:android   # EAS build (perfil preview)
```

## Lovable

Projeto original: https://lovable.dev/projects/7d524653-ac03-442c-ad32-403b69e82e98

Alterações enviadas a este repositório também aparecem no Lovable. Para publicar a versão Web pelo Lovable, use Share -> Publish. Para conectar um domínio próprio, use Project > Settings > Domains ([guia](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)).

## Segurança

- A chave da OpenAI nunca é exposta ao cliente: as chamadas passam pela Edge Function (ou pelo servidor Express legado).
- Dados isolados por usuário com RLS no Postgres; imagens de receitas em bucket privado (`prescriptions`).
