# Migração `pill-parse-plan`: Web (Vite) → React Native (Expo) via SDD assistido por IA

## Context

`C:\Users\alessandro.lorenz\Documents\github-projects\PROJECTS\pill-parse-plan` é uma SPA Vite + React 18 gerada pelo Lovable ("Tratamento por Receita", PT-BR): o usuário fotografa uma receita → GPT-4.1 vision extrai um `TreatmentPlan` JSON → o app expande em eventos de dose → salva no Supabase → agenda lembretes e marca doses como tomadas.

O objetivo é ter um app **React Native nativo** reaproveitando toda a lógica de negócio, as variáveis de ambiente e a conexão com o Supabase — sem matar a aplicação web. **É perfeitamente possível**: só ~900 das ~9.000 linhas de `src/` são lógica pura (que porta sem alteração); o resto é apresentação e cola de API de browser.

O ponto crítico, e a razão de o plano começar por estabilização em vez de por Expo: **o app tem três defeitos ativos hoje**, dois deles com impacto clínico direto. Migrar por cima deles significa portar bugs para um app que dispara notificações de medicação — onde um erro de 3 horas ou uma dose faltante não é cosmético. Confirmados no código:

1. **Timezone quebrado (ativo em produção).** [scheduler.ts:86](Documents/github-projects/PROJECTS/pill-parse-plan/src/lib/scheduler.ts#L86) emite `dateTime.toISOString()` (UTC). [useSupabaseTreatments.ts:89-90](Documents/github-projects/PROJECTS/pill-parse-plan/src/hooks/useSupabaseTreatments.ts#L89-L90) grava `startISO.split('T')[0]` / `[1]` nas colunas `date DATE` / `time TIME` — ou seja, **wall-clock UTC em colunas sem timezone**. A leitura em [SupabaseScheduleView.tsx:279](Documents/github-projects/PROJECTS/pill-parse-plan/src/components/SupabaseScheduleView.tsx#L279) usa `parseISO(\`${event.date}T${event.time}\`)`, que interpreta como hora local. Em BRT (UTC−3), uma dose às 22:00 do dia 01 é gravada como `02 / 01:00:00` e exibida como 01:00 do dia 02. **Toda dose após as 21:00 aparece no dia errado, deslocada 3h.** Hoje isso é um erro de exibição; com notificações locais, vira alarme no horário errado.
   *O backfill é lossless:* o valor gravado é exatamente o wall-clock UTC do instante correto, então `(date || ' ' || time)::timestamp AT TIME ZONE 'UTC'` recupera o instante real.

2. **Doses silenciosamente perdidas.** [scheduler.ts:47](Documents/github-projects/PROJECTS/pill-parse-plan/src/lib/scheduler.ts#L47) faz `item.preferredTimes.slice(0, timesPerDay)`. Se a IA devolver `timesPerDay: 3` com `preferredTimes: ["08:00"]`, o paciente recebe **1 dose/dia em vez de 3**, sem nenhum aviso. Clinicamente é o pior dos três.

3. **Imagem da receita inacessível.** [useSupabaseTreatments.ts:167-173](Documents/github-projects/PROJECTS/pill-parse-plan/src/hooks/useSupabaseTreatments.ts#L167-L173) chama `getPublicUrl` num bucket criado com `public: false` ([migration:100](Documents/github-projects/PROJECTS/pill-parse-plan/supabase/migrations/20250906002006_4eeaf452-2d53-4dfa-9520-2b143cca9de4.sql#L100)). A URL não resolve. Precisa ser `createSignedUrl(path, ttl)`.

Resultado esperado: monorepo com `packages/core` (lógica única, testada), `apps/web` (Vite atual, vivo) e `apps/mobile` (Expo, iOS + Android), com specs versionadas servindo de contrato de aceite para o código gerado por IA.

---

## Decisões travadas (do usuário)

| Eixo | Decisão |
|---|---|
| Repo | Monorepo pnpm workspaces + Turborepo — `packages/core`, `apps/web`, `apps/mobile` |
| Toolchain | Expo managed + EAS Build, `expo-router` |
| UI | NativeWind v4 + primitivas próprias espelhando a API dos ~20 shadcn usados (incl. variantes `medical`/`accent`/`warning`) |
| Notificações | `expo-notifications` locais — elimina `server.js`, VAPID, janela de 48h e cron |
| SDD | `.specs/` versionado + subagentes em `.claude/agents/` — sem CLI externo |
| Escopo v1 | Paridade + ganhos nativos (câmera, lembretes locais, `expo-calendar`) |
| Auth | Google OAuth via `expo-auth-session` + deep link `pillparse://` |

---

## A. Fundação SDD

A ideia central da modernização com IA aqui: **a IA escreve o código; a spec, convertida em testes, é o portão.** Nunca aceitar código gerado sem um critério de aceite executável.

### `.specs/constitution.md` — regras inegociáveis

Este arquivo é lido por todo subagente antes de gerar código. Conteúdo:

- **Segurança clínica:** nunca inventar ou inferir dose, via ou duração ausente na receita — campos faltantes ficam `undefined` e a UI pede confirmação. O disclaimer médico ("NÃO substitui orientação médica") é obrigatório e visível em toda tela que exibe um plano.
- **Fonte única da verdade:** `packages/core/src/scheduler.ts` é a única implementação de expansão de plano→eventos. Nenhum app pode reimplementar cálculo de horário.
- **Tempo:** todo instante trafega e persiste como UTC inequívoco (`timestamptz`); conversão para hora local só na borda de apresentação, com timezone explícito. Proibido `Date` sem timezone atravessando camadas.
- **Segredos:** zero chaves no cliente além da anon key do Supabase, e essa vem de env, não hardcoded. `OPENAI_API_KEY` só existe em Edge Function.
- **Dados:** RLS obrigatória em toda tabela nova; bucket privado exige `createSignedUrl`.
- **Testes:** toda regra de negócio em `packages/core` tem teste. Mudança no scheduler que altere saída exige atualizar o golden master **explicitamente**, num commit isolado.
- **Paridade:** durante a migração, divergência web↔mobile é bug até que a spec diga o contrário.

### Specs numeradas (ordem de execução)

```
.specs/
├── constitution.md
├── 000-scheduler-golden-master/   ← caracterização + correção dos 3 bugs
├── 001-monorepo-core-extraction/
├── 002-mobile-shell-ui-kit/
├── 003-auth-mobile/
├── 004-screen-home-upload/
├── 005-screen-review-schedule/
├── 006-native-notifications/
├── 007-native-calendar-export/
├── 008-profile-paywall/
└── 009-ci-eas-release/
```

Cada pasta contém três arquivos com papéis distintos — a separação é o que impede o agente de pular para código:

- **`spec.md`** — *o quê*, sem solução técnica. Seções: Contexto · Comportamento esperado (user stories) · **Critérios de aceite** (numerados, verificáveis, cada um mapeável a um teste) · Fora de escopo · Perguntas em aberto.
- **`plan.md`** — *como*. Arquivos a criar/alterar (caminhos reais), contratos de função (assinaturas), dependências npm com justificativa, riscos.
- **`tasks.md`** — checklist executável, cada item com o critério de aceite que o cobre: `- [ ] T3 — implementar X → cobre AC-2, AC-5 · teste: core/scheduler.test.ts`.

### Subagentes em `.claude/agents/`

| Agente | Papel |
|---|---|
| `spec-writer` | Lê o código-fonte relevante + constitution e redige `spec.md` com critérios de aceite verificáveis. **Não escreve código.** |
| `spec-verifier` | Adversarial: recebe spec + diff e responde se cada AC está de fato coberto por teste. Rejeita AC não-testável ("deve ser rápido"). |
| `rn-porter` | Porta um componente web → RN seguindo o mapa de primitivas. Recebe o arquivo origem e a spec da tela. |
| `parity-auditor` | Compara tela web vs mobile campo a campo, ação a ação; produz lista de divergências. |

Fluxo por feature: `spec-writer` → revisão humana da spec → implementação (agente ou você) → testes → `spec-verifier` → merge.

---

## B. Fase 0 — Estabilizar antes de migrar (spec `000`)

**Por que primeiro:** o scheduler é o coração clínico do app e não tem um único teste. Caracterizá-lo antes é o passo mais importante da migração inteira — sem um golden master, você não tem como provar que a extração para `packages/core` e o port para RN não mudaram silenciosamente o cálculo de doses. Depois de extraído e portado, qualquer divergência vira uma caça a bug em três lugares ao mesmo tempo.

**Ordem obrigatória: caracterizar → corrigir → migrar.** Primeiro congele o comportamento *atual* (bugs inclusos) em testes; só então corrija cada bug num commit isolado que atualiza o snapshot com justificativa. Assim a diferença entre "corrigi de propósito" e "quebrei sem perceber" fica visível no diff.

Trabalho:

1. **Limpeza.** Deletar código morto: `src/components/ScheduleView.tsx`, `ConfigModal.tsx`, `TreatmentCard.tsx` (importado em `Index.tsx:18`, nunca renderizado), `src/hooks/useTreatments.ts`, `src/App.css`, `api/openai/*` (superseded pelas Edge Functions), `server.js` + `public/sw.js` (as deps `express`/`cors`/`dotenv`/`web-push` nem estão no `package.json` — `npm run server` não roda hoje), e os ~28 arquivos não usados de `src/components/ui/`. Manter um lockfile só (`pnpm-lock.yaml`); apagar `bun.lockb` e `package-lock.json`.
2. **Segredos.** Mover URL e anon key de [client.ts](Documents/github-projects/PROJECTS/pill-parse-plan/src/integrations/supabase/client.ts) para `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Atualizar `.env.example` (hoje só documenta `OPENAI_API_KEY` e `PORT`). Como o `.env` versionado localmente contém uma `OPENAI_API_KEY` real e a `SUPABASE_SERVICE_ROLE_KEY`, **rotacionar ambas** — confirmar antes de executar.
3. **Vitest + golden master.** Adicionar `vitest`. Criar `src/lib/scheduler.test.ts` com casos representativos (q8h por 7 dias; 3x/dia com 3 `preferredTimes`; 3x/dia com 1 `preferredTime`; 3x/dia sem `preferredTimes`; virada de dia; múltiplos itens) usando `toMatchSnapshot()` e `vi.setSystemTime()` para determinismo. Testar em ao menos dois TZs (`TZ=America/Sao_Paulo` e `TZ=UTC`) — é isso que expõe o bug 1.
4. **Correções, um commit cada:**
   - *Timezone:* migração que adiciona `events.scheduled_at timestamptz`, backfill `(date || ' ' || time)::timestamp AT TIME ZONE 'UTC'`, e passa escrita/leitura a usar a coluna nova. `date`/`time` viram colunas geradas ou são removidas depois.
   - *`preferredTimes`:* quando `preferredTimes.length < timesPerDay`, completar os horários restantes por distribuição em vez de truncar; sinalizar `confidence` baixa para revisão do usuário.
   - *Off-by-one:* `while (currentDateTime <= endDate)` em [scheduler.ts:33](Documents/github-projects/PROJECTS/pill-parse-plan/src/lib/scheduler.ts#L33) gera uma dose extra no limite — decidir e fixar em teste.
   - *Storage:* `getPublicUrl` → `createSignedUrl(path, 3600)`.
   - *SQL inválido:* `supabase/migrations/20251202000000_notifications.sql:55` tem `CREATE POLICY ... FOR INSERT, UPDATE, DELETE` (sintaxe Postgres inválida — uma ação por policy). A versão correta já existe em `supabase/combined_migration_for_dashboard.sql:259-270`.
5. **TS gradual.** Ligar `strictNullChecks` e `noImplicitAny` primeiro só em `src/lib/` (o que vira o core), via `tsconfig` do futuro pacote.

**Portão de saída:** `pnpm test` verde nos dois TZs; app web funcionando igual; nenhum segredo em código.

---

## C. Fase 1 — Extrair o core (spec `001`)

```
pill-parse-plan/
├── pnpm-workspace.yaml        # packages: ['apps/*', 'packages/*']
├── turbo.json                 # pipeline: build, test, lint, typecheck
├── tsconfig.base.json         # paths: @core/* → packages/core/src/*
├── packages/core/
│   └── src/{types.ts, schemas.ts, scheduler.ts, ics.ts, supabase/{client.ts,types.ts}, api/analyze.ts, domain/plan.ts}
├── apps/web/                  # o Vite atual, movido
├── apps/mobile/               # Fase 2
└── supabase/                  # migrations + edge functions (raiz)
```

Vai para o core: `lib/types.ts`, `lib/scheduler.ts` (+ testes), `lib/openai.ts`, a metade *string-building* de `lib/ics.ts`, `integrations/supabase/types.ts`, e a lógica de `PlanContext` e `useSupabaseTreatments` sem as bordas de plataforma.

Três desacoplamentos definem o desenho:

**(a) Cliente Supabase por injeção de storage** — hoje [client.ts:13](Documents/github-projects/PROJECTS/pill-parse-plan/src/integrations/supabase/client.ts#L13) fixa `localStorage`:

```ts
// packages/core/src/supabase/client.ts
export interface SupabaseClientConfig {
  url: string;
  anonKey: string;
  storage: { getItem(k:string): Promise<string|null>|string|null;
             setItem(k:string,v:string): Promise<void>|void;
             removeItem(k:string): Promise<void>|void };
  detectSessionInUrl: boolean;   // true no web, false no mobile
}
export function createSupabaseClient(cfg: SupabaseClientConfig): SupabaseClient<Database>
```
Web injeta `localStorage` + `detectSessionInUrl: true`; mobile injeta `AsyncStorage` + `false`.

**(b) Zod como contrato da Edge Function** — `zod` já é dependência com zero imports. Hoje a validação da resposta da IA é um `if` frouxo em `lib/openai.ts`. Criar `packages/core/src/schemas.ts` com `TreatmentItemSchema` / `TreatmentPlanSchema` e derivar os tipos (`z.infer`). O mesmo schema valida na Edge Function (Deno importa zod por URL) e no cliente — se o GPT devolver algo fora do contrato, falha no ponto de entrada com mensagem útil, não três telas adiante.

**(c) Upload como abstração de plataforma** — `uploadPrescriptionImage(file: File)` não existe em RN:
```ts
// packages/core
export interface ImageUploader { upload(userId: string, bytes: Uint8Array, ext: string): Promise<string> }
```
Web implementa com `File`/`Blob`; mobile com `ArrayBuffer` a partir do base64 do `expo-image-picker` (`base64-js` no lugar de `atob`). Isso resolve de uma vez o bloco `atob` → `Uint8Array` → `Blob` → `File` de [Index.tsx:78-91](Documents/github-projects/PROJECTS/pill-parse-plan/src/pages/Index.tsx#L78-L91).

Aproveitar a passagem para corrigir `useCloud = true` hardcoded em `useManagedTreatments.ts` e o acoplamento por string `error.message.includes('limite')` em [Index.tsx:146](Documents/github-projects/PROJECTS/pill-parse-plan/src/pages/Index.tsx#L146) → erro tipado (`PlanLimitError`).

**Portão de saída:** golden master passa idêntico a partir de `packages/core`; `apps/web` roda sem mudança de comportamento.

---

## D. Fase 2 — Shell do app Expo (spec `002`)

`apps/mobile` com `expo-router`. A tela principal hoje **não é route-driven**: `Index.tsx` é uma máquina de estados `AppStep = 'home'|'upload'|'review'|'schedule'`. Isso mapeia direto num stack navigator:

```
app/
├── _layout.tsx            # SupabaseProvider + AuthProvider + PlanProvider + NotificationProvider
├── (auth)/sign-in.tsx     # ← src/pages/Auth.tsx
├── (app)/_layout.tsx      # guard de sessão (substitui o useEffect+navigate de Index.tsx:47-51)
├── (app)/index.tsx        # AppStep 'home'
├── (app)/new/upload.tsx   # AppStep 'upload'
├── (app)/new/review.tsx   # AppStep 'review'
├── (app)/treatment/[id].tsx # AppStep 'schedule'
└── (app)/profile.tsx      # ← src/pages/Profile.tsx
```
Bônus: `/reset-password` — rota que `AuthContext.resetPassword:99` referencia e que **não existe hoje no web** — passa a existir nos dois.

**NativeWind v4:** portar os tokens HSL de `src/index.css` (205 linhas) para `tailwind.config.js` compartilhado. O que **não** tem equivalente e precisa reescrita explícita: `gradient-primary bg-clip-text text-transparent` (→ `expo-linear-gradient` com `MaskedView`), `shadow-[var(--shadow-soft)]` (→ `boxShadow`/elevation), `hover:`/`group-hover:` (→ estados de `Pressable`), breakpoints `md:`/`sm:` (→ `useWindowDimensions`), `container mx-auto`, `min-h-screen` (→ `SafeAreaView` + flex).

**Kit de primitivas** em `apps/mobile/components/ui/` — mesma API dos shadcn para o port ser quase mecânico: `Button` (preservando `variant: medical|accent|warning|default|outline|ghost` de [button.tsx:7-40](Documents/github-projects/PROJECTS/pill-parse-plan/src/components/ui/button.tsx#L7-L40)), `Card/CardHeader/CardContent/CardTitle`, `Badge`, `Tabs`, `Input`, `Textarea`, `Label`, `Alert`, `Dialog` (`react-native-modal`), `Checkbox`, `Progress`, `Separator`, `Collapsible`, `Toast` (`sonner-native` ou `react-native-toast-message`). Ícones: `lucide-react-native` (mesmos nomes de import).

---

## E. Fase 3 — Telas, uma a uma (specs `003`–`005`, `008`)

Ordem e o que muda:

| # | Tela | Origem | Mudança principal |
|---|---|---|---|
| 003 | Auth | `pages/Auth.tsx` (370) | `signInWithOAuth({ skipBrowserRedirect: true })` + `expo-web-browser` `openAuthSessionAsync` + `expo-auth-session` `makeRedirectUri({ scheme: 'pillparse' })`; troca do code por sessão via `exchangeCodeForSession`. Substitui os três `window.location.origin` de `AuthContext.tsx:63,84,99`. Sessão em AsyncStorage. |
| 004 | Home | `pages/Index.tsx` step `home` | Tabs Ativos/Arquivados → `FlatList`; contador de plano free (1 tratamento) preservado |
| 004 | Upload | `components/ImagePicker.tsx` (150) | `expo-image-picker` `launchCameraAsync`/`launchImageLibraryAsync` com `base64: true`; drag&drop e `alert()` desaparecem; preview com `expo-image` |
| 005 | Review | `components/PlanReview.tsx` (230) | `<input type="date">`/`<input type="time">` ([linhas 163-188](Documents/github-projects/PROJECTS/pill-parse-plan/src/components/PlanReview.tsx#L163-L188)) → `@react-native-community/datetimepicker` |
| 005 | Schedule | `components/SupabaseScheduleView.tsx` (302) | `SectionList` agrupada por dia; checkbox de dose dispara `updateEventStatus` + cancela a notificação local |
| 008 | Profile | `pages/Profile.tsx` (278) | Pagamento hoje é toast mock. Se for cobrar in-app, **as lojas exigem IAP** — recomendo manter o mock/link externo no v1 e tratar assinatura numa spec própria (`react-native-purchases`) |

Critério de paridade por tela: o `parity-auditor` produz uma tabela campo-a-campo web vs mobile; divergência sem justificativa na spec é bug.

---

## F. Fase 4 — Capacidades nativas (specs `006`–`007`)

**Notificações locais** (`expo-notifications`) a partir de `expandPlanToEvents` — sem servidor, sem VAPID, sem janela de 48h, offline.

A armadilha real: **iOS limita 64 notificações locais pendentes por app.** Um tratamento q8h por 7 dias já são 21; dois tratamentos estouram. Estratégia: agendar uma janela deslizante (as próximas ~50 doses), persistir o mapa `event_id → notificationId`, e re-agendar em cada abertura do app e em cada interação com notificação. Android tem o problema oposto — a partir do Android 13 exige `POST_NOTIFICATIONS` em runtime, e alarmes exatos precisam de `SCHEDULE_EXACT_ALARM`/canal de alta prioridade para sobreviver ao Doze.

Ações "Tomei"/"Adiar" (que hoje vivem em `public/sw.js`) viram `setNotificationCategoryAsync` com dois botões; "Tomei" marca `events.done` e "Adiar" reagenda +15min.

**Calendário** (`expo-calendar`) substituindo o download `.ics`: `eventsToICS` continua no core como string (útil para compartilhar via `expo-sharing`), mas o caminho principal passa a ser inserir os eventos no calendário do sistema — melhor UX que baixar um arquivo no celular. `createGoogleCalendarUrl` (que hoje só leva o primeiro evento) é aposentado.

Permissões declaradas em `app.json` com justificativa em PT-BR: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSCalendarsUsageDescription`, `POST_NOTIFICATIONS`.

---

## G. Fase 5 — Qualidade, build e publicação (spec `009`)

- **Testes:** Vitest no `packages/core` (scheduler, schemas zod, domínio); `@testing-library/react-native` + `jest-expo` para componentes; Maestro para E2E do fluxo crítico (login → foto → revisão → agenda → marcar dose).
- **CI** (`.github/workflows/ci.yml` — hoje não existe `.github/`): `turbo lint typecheck test` em PR; matriz de TZ (`America/Sao_Paulo`, `UTC`) nos testes do core.
- **EAS:** `eas.json` com perfis `development` (dev client), `preview` (APK interno) e `production`; `eas submit` para as lojas.
- **App de saúde nas lojas:** disclaimer médico visível (já existe no web, manter), política de privacidade publicada (obrigatória — o app processa foto de receita, dado sensível de saúde), justificativa de cada permissão, e cuidado com a descrição na loja: posicionar como **organizador de tratamento**, nunca como ferramenta de diagnóstico ou prescrição.

---

## H. Riscos e armadilhas

| Risco | Mitigação |
|---|---|
| Timezone (bug ativo, item 1 do Context) | Corrigir e provar em teste **antes** de migrar; `timestamptz` + backfill lossless |
| Doses truncadas por `preferredTimes` | Corrigir na Fase 0; teste dedicado |
| 64 notificações pendentes no iOS | Janela deslizante + re-agendamento no foreground |
| Doze mode / Android 13+ | Canal de alta prioridade + permissão em runtime; testar em device real |
| `Intl` no Hermes/Android | `toLocaleDateString('pt-BR')` está espalhado no código; validar em Android real ou centralizar em `date-fns` com locale `ptBR` (já é dependência) |
| Google OAuth deep link | Registrar `pillparse://` como redirect autorizado no Supabase **e** no Google Cloud Console antes de codar a tela |
| Anon key hardcoded | Fase 0; rotacionar as chaves expostas no `.env` |
| `useCloud = true` e string `'limite'` | Erro tipado `PlanLimitError` na Fase 1 |
| Migrations aplicadas pelo dashboard | Reconciliar o estado real do banco antes de rodar `supabase db push` — o histórico local não é confiável (o SQL inválido nunca rodou como está) |

---

## I. Esforço e paralelização

| Fase | Esforço | Paralelizável? |
|---|---|---|
| 0 — Estabilização | 2–3 dias | Não — bloqueia todo o resto |
| 1 — Core | 2–3 dias | Não |
| 2 — Shell + UI kit | 3–4 dias | Sim — kit de primitivas ‖ config do router |
| 3 — Telas | 5–7 dias | Sim — uma spec por tela, agentes independentes após a 003 |
| 4 — Nativo | 3–4 dias | Sim — notificações ‖ calendário |
| 5 — CI/EAS | 2–3 dias | Parcial |

**~3–4 semanas** de trabalho focado. Fases 0 e 1 são sequenciais e inegociáveis; a partir da Fase 3, cada tela é uma spec isolada que um agente executa em paralelo — é aí que a estrutura SDD paga o investimento.

---

## Verificação

1. **Fase 0:** `pnpm test` verde com `TZ=America/Sao_Paulo` e `TZ=UTC`; snapshot do scheduler versionado; `pnpm dev` no web com comportamento idêntico; `git grep` sem chaves hardcoded.
2. **Fase 1:** golden master passa importando de `packages/core`; `turbo build` verde nos dois apps; web em produção sem regressão.
3. **Fase 2:** `pnpm --filter mobile start` abre no Expo Go; navegação entre as 4 rotas; screenshot lado a lado do kit de primitivas vs shadcn.
4. **Fase 3:** por tela, relatório do `parity-auditor` sem divergências não justificadas; login Google real em device físico.
5. **Fase 4:** agendar tratamento q8h/7dias e conferir no device que os disparos batem com `expandPlanToEvents` (incluindo a virada de dia — o caso do bug 1); verificar o teto de 64 no iOS com dois tratamentos ativos; evento inserido corretamente no calendário do sistema.
6. **Fase 5:** E2E Maestro verde no CI; build `preview` do EAS instalado em Android e iOS reais; fluxo completo ponta a ponta com uma receita de verdade.
