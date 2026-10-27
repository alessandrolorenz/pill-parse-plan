# Arquitetura do Sistema: Pills Planner (`pill-parse-plan`)

Documentação arquitetural de referência do sistema **Pills Planner**, incluindo modelos formais C4, diagramas de topologia, fluxo de dados clínicos, modelo de entidades e governança de qualidade.

---

## Índice

1. [Visão Geral e Contexto](#1-visão-geral-e-contexto)
2. [C4 Nível 1: Diagrama de Contexto do Sistema (System Context)](#2-c4-nível-1-diagrama-de-contexto-do-sistema-system-context)
3. [C4 Nível 2: Diagrama de Contêineres e Topologia Monorepo](#3-c4-nível-2-diagrama-de-contêineres-e-topologia-monorepo)
4. [C4 Nível 3: Diagrama de Componentes do Frontend Web](#4-c4-nível-3-diagrama-de-componentes-do-frontend-web)
5. [C4 Nível 3: Diagrama de Componentes do Aplicativo Mobile](#5-c4-nível-3-diagrama-de-componentes-do-aplicativo-mobile)
6. [C4 Nível 3: Diagrama do Motor de Domínio (`packages/core`)](#6-c4-nível-3-diagrama-do-motor-de-domínio-packagescore)
7. [Fluxo Funcional: Ciclo de Vida da Receita Médica (Sequence Diagram)](#7-fluxo-funcional-ciclo-de-vida-da-receita-médica-sequence-diagram)
8. [Arquitetura de UI e Sistema de Design (Radix UI + Tailwind CSS)](#8-arquitetura-de-ui-e-sistema-de-design-radix-ui--tailwind-css)
9. [Modelo de Dados Relacional e Segurança (ERD + RLS)](#9-modelo-de-dados-relacional-e-segurança-erd--rls)
10. [Governança de Qualidade: AI Cockpit Multi-Agent Pipeline](#10-governança-de-qualidade-ai-cockpit-multi-agent-pipeline)
11. [Matriz Comparativa Multiplataforma: Web vs. Mobile](#11-matriz-comparativa-multiplataforma-web-vs-mobile)

---

## 1. Visão Geral e Contexto

O **Pills Planner** é uma solução médica voltada à adesão farmacoterapêutica. O sistema permite ao paciente fotografar prescrições médicas manuais ou digitais, submetê-las a um extrator de visão computacional multimodal (OpenAI `gpt-4.1-2025-04-14` na Edge Function; o servidor Express legado usa `gpt-4o`) via backend seguro (Supabase Edge Functions), gerar um cronograma de doses determinístico com tratamento de timezones e horários preferenciais, e sincronizar eventos de alarme com a web e o ecossistema móvel nativo (iOS / Android).

### Premissas Inegociáveis
* **Segurança Clínica:** Nunca inferir doses ou frequências ausentes na receita. Havendo incerteza, o nível de confiança (`confidence < 1.0`) é reduzido e a interface solicita confirmação explícita ao paciente.
* **Disclaimer Médico Obrigatório:** Exibição explícita de um aviso informando que o sistema não substitui orientação profissional. Hoje o aviso está inline em `src/pages/Index.tsx`, `src/components/PlanReview.tsx` e `apps/mobile/app/(app)/new/review.tsx` (não há um componente `MedicalDisclaimer` compartilhado).
* **Isomorfismo de Domínio:** O motor de expansão de plano para eventos (`scheduler.ts`) reside exclusivamente em `packages/core`, garantindo paridade matemática exata entre Web e Mobile.
* **Acessibilidade e Consistência Visual:** Componentes fundamentados em primitivas acessíveis (Radix UI) com estilização semântica via Tailwind CSS v3.4 e variáveis de tema HSL centralizadas.

---

## 2. C4 Nível 1: Diagrama de Contexto do Sistema (System Context)

Mostra os limites do sistema e suas interações com usuários e provedores externos.

```mermaid
C4Context
    title C4 Nível 1 - Diagrama de Contexto (Pills Planner)

    Person(patient, "Paciente / Cuidador", "Usuário que fotografa receitas, consulta cronogramas e marca doses tomadas.")

    Enterprise_Boundary(b0, "Ecosistema Pills Planner") {
        System(pills_planner, "Pills Planner Platform", "Aplicação Web SPA e App Mobile para gestão inteligente de tratamentos médicos.")
    }

    System_Ext(supabase, "Supabase Cloud Platform", "BaaS: PostgreSQL com RLS, Autenticação JWT, Storage Privado de Receitas e Edge Functions.")
    System_Ext(openai, "OpenAI API (GPT-4.1 Vision)", "Modelo multimodal de visão para extração estruturada de medicamentos (TreatmentPlan).")
    System_Ext(calendar_ext, "Calendários Nativos (Apple / Google)", "Sincronização de eventos e alarmes via RFC-5545 iCal ou expo-calendar.")
    System_Ext(figma, "Figma Design Specs", "Fonte da verdade visual para layouts, espaçamentos, paleta de cores e protótipos de tela.")

    Rel(patient, pills_planner, "Envia fotos de receitas, revisa planos, gerencia doses", "HTTPS / Mobile UI")
    Rel(pills_planner, supabase, "Autenticação, persistência relacional, storage seguro", "HTTPS / WSS")
    Rel(pills_planner, openai, "Envio de imagem para extração de dados clínicos", "HTTPS / Edge Function")
    Rel(pills_planner, calendar_ext, "Exporta agendamento para calendário do dispositivo", "iCal / Native Bridge")
    Rel(figma, pills_planner, "Especificações visuais e guias de estilo", "Design Handoff")
```

---

## 3. C4 Nível 2: Diagrama de Contêineres e Topologia Monorepo

Detalhamento da estrutura em monorepo (`pnpm-workspace.yaml` + Turborepo), seus pacotes e os serviços da infraestrutura de nuvem.

```mermaid
graph TB
    subgraph Monorepo["Monorepo (pnpm workspaces + Turborepo)"]
        subgraph WebApp["Root SPA (src/ na raiz do repo)"]
            ReactWeb["React 18.3.1 + Vite 5.4<br/>• Tailwind CSS 3.4<br/>• Radix UI + CVA<br/>• Lucide React Icons<br/>• React Router v6"]
        end

        subgraph MobileApp["apps/mobile"]
            ExpoApp["React Native 0.85 + Expo SDK 56<br/>• Expo Router (File-based)<br/>• NativeWind v4<br/>• expo-notifications (Local)<br/>• expo-calendar<br/>• planStore (store em memória do rascunho)"]
        end

        subgraph CorePackage["packages/core (Biblioteca Isomórfica)"]
            CoreTypes["Domain Types<br/>(TreatmentPlan, CalendarEvent, TreatmentItem)"]
            Scheduler["Scheduler Engine<br/>(expandPlanToEvents, timezone-safe)"]
            SupabaseShared["Supabase Client & Types"]
            OpenAIExtractor["extractPlanFromImageWithClient()<br/>(cliente da Edge Function)"]
        end
    end

    subgraph UIArchitecture["Camada de UI e Estilos"]
        FigmaParser["Figma Specs (Protótipos & Layouts)"]
        TailwindTheme["Tailwind CSS 3.4 & Variáveis CSS (:root HSL em index.css)"]
        RadixPrims["Radix UI Primitives + class-variance-authority"]
    end

    subgraph CloudServices["Supabase Cloud Infrastructure"]
        SupabaseAuth["Supabase Auth (JWT, Google OAuth, Email)"]
        PostgresDB["PostgreSQL 15+ com RLS<br/>• users<br/>• treatments<br/>• events<br/>• notification_reminders<br/>• push_subscriptions"]
        PrescriptionsBucket["Storage Bucket 'prescriptions' (Privado)"]
        EdgeFunctions["Deno Edge Functions<br/>• analyze-prescription (prompt médico)<br/>• openai-status"]
        ExpressLegacy["Servidor Express legado (server.js)<br/>• /api/openai/*<br/>• /api/push/subscribe<br/>• /api/notifications/schedule<br/>• cron de envio de push"]
    end

    subgraph ExternalAI["Provedores Externos"]
        OpenAIService["OpenAI API (GPT-4.1 Vision)"]
    end

    %% Dependências de Pacotes
    ReactWeb --> CorePackage
    ExpoApp --> CorePackage
    RadixPrims --> ReactWeb
    TailwindTheme --> ReactWeb
    FigmaParser -.-> TailwindTheme

    %% Comunicação de Rede
    ReactWeb -->|Auth & Queries RLS| SupabaseAuth
    ReactWeb -->|CRUD Tratamentos & Eventos| PostgresDB
    ReactWeb -->|Upload de Receita| PrescriptionsBucket
    ReactWeb -->|Chamada de IA via Edge| EdgeFunctions

    ExpoApp -->|Auth Google & Sessão| SupabaseAuth
    ExpoApp -->|Sincronização Offline/Online| PostgresDB
    ExpoApp -->|Upload de Imagem| PrescriptionsBucket
    ExpoApp -->|Chamada de IA via Edge| EdgeFunctions

    EdgeFunctions -->|Proxy Seguro com Chave Privada| OpenAIService
    ReactWeb -->|Web Push via /api (proxy Vite)| ExpressLegacy
    ExpressLegacy -->|Rota legada /api/openai| OpenAIService
    EdgeFunctions -->|Validação de Usuário| SupabaseAuth
    PostgresDB --- PrescriptionsBucket
```

---

## 4. C4 Nível 3: Diagrama de Componentes do Frontend Web

Organização interna das camadas de apresentação, estado e integração no frontend Web (`src/`).

```mermaid
graph TD
    subgraph UI_Presentation_Layer["Camada de Apresentação (UI)"]
        subgraph Pages["Pages (Rotas)"]
            IndexPage["Index.tsx (Dashboard / Fluxo Principal)"]
            AuthPage["Auth.tsx (Login / Cadastro)"]
            ProfilePage["Profile.tsx (Assinatura / Configurações)"]
        end

        subgraph CompositeComponents["Componentes de Domínio e Fluxo"]
            ImagePickerComp["ImagePicker (Captura e Upload de Receita)"]
            PlanReviewComp["PlanReview (Revisão e Edição do TreatmentPlan)"]
            TreatmentCardComp["TreatmentCard (Card Resumo no Dashboard)"]
            ScheduleViewComp["SupabaseScheduleView (Cronograma de Doses & Check-in)"]
            PlanModalComp["PlanRestrictionModal (Gate Free vs Premium)"]
        end

        subgraph UIPrimitives["Primitivas de UI Acessíveis (src/components/ui/ - Radix UI + CVA)"]
            UIButton["Button (Default, Destructive, Outline, Secondary, Ghost, Link)"]
            UIInput["Input / Textarea (Estados: Default, Focus, Disabled)"]
            UICheckbox["Checkbox (Radix UI Checkbox acessível)"]
            UIProgress["Progress (Indicador de Adesão)"]
            UITabs["Tabs, TabsList & TabsTrigger"]
            UIBadge["Badge, Card & Dialog"]
            LucideIcons["Lucide React Icons (Pill, Calendar, Check, AlertTriangle)"]
        end
    end

    subgraph State_And_Hooks["Camada de Estado e Hooks"]
        AuthCtx["AuthContext (Supabase Auth / Sessão)"]
        PlanCtx["PlanContext (Regras Free vs Premium)"]
        useManagedTreatments["useManagedTreatments (Orquestrador Cloud/Local)"]
        useSupabaseTreatments["useSupabaseTreatments (Queries e Mutações DB)"]
        useTreatments["useTreatments (Fallback localStorage)"]
    end

    subgraph Core_Bridge["Ponte com Pacote Core e Backend"]
        SchedulerLib["packages/core -> scheduler.ts"]
        SupabaseClient["src/integrations/supabase/client.ts"]
        OpenAILib["src/lib/openai.ts -> Edge Function Bridge"]
    end

    %% Conexões
    IndexPage --> ImagePickerComp
    IndexPage --> PlanReviewComp
    IndexPage --> TreatmentCardComp
    IndexPage --> ScheduleViewComp
    IndexPage --> PlanModalComp

    CompositeComponents --> UIPrimitives

    IndexPage --> AuthCtx
    IndexPage --> PlanCtx
    IndexPage --> useManagedTreatments

    useManagedTreatments --> useSupabaseTreatments
    useManagedTreatments --> useTreatments
    useSupabaseTreatments --> SupabaseClient
    useSupabaseTreatments --> SchedulerLib

    IndexPage --> OpenAILib
```

---

## 5. C4 Nível 3: Diagrama de Componentes do Aplicativo Mobile

Estrutura e serviços nativos do aplicativo em `apps/mobile/`.

```mermaid
graph TD
    subgraph MobileAppRouter["Expo Router Navigation (apps/mobile/app/)"]
        RootLayout["_layout.tsx (Tema, Provedores, Auth Guard)"]
        AuthGroup["(auth)/<br/>• sign-in.tsx (Google OAuth & Email)"]
        AppGroup["(app)/<br/>• index.tsx (Dashboard de Tratamentos)<br/>• new/upload.tsx (Captura de Câmera/Galeria)<br/>• new/review.tsx (Revisão do TreatmentPlan)<br/>• treatment/[id].tsx (Timeline de Doses)<br/>• profile.tsx (Configurações)"]
    end

    subgraph MobileUIComponents["Componentes UI Nativos (NativeWind v4)"]
        MobTreatmentCard["TreatmentCard.tsx"]
        MobEventItem["EventItem.tsx"]
        MobButton["button.tsx"]
        MobCheckbox["Checkbox.tsx"]
        MobProgress["Progress.tsx"]
        MobTabs["Tabs.tsx"]
    end

    subgraph MobileServices["Serviços Nativos & Estado Local"]
        PlanStore["planStore.ts (rascunho do plano em memória, sem persistência)"]
        NativeNotifications["notifications.ts (expo-notifications / Alarmes Locais)"]
        NativeCalendar["calendar.ts (expo-calendar / Integração OS)"]
        MobileSupabase["lib/supabase.ts (Supabase Client Mobile)"]
    end

    subgraph SharedCoreImport["Import de packages/core"]
        CoreSchedulerMobile["packages/core/src/scheduler.ts"]
        CoreTypesMobile["packages/core/src/types.ts"]
    end

    %% Conexões Mobile
    RootLayout --> AuthGroup
    RootLayout --> AppGroup
    AppGroup --> MobileUIComponents

    AppGroup --> PlanStore
    AppGroup --> NativeNotifications
    AppGroup --> NativeCalendar
    AppGroup --> MobileSupabase

    AppGroup -->|new/review.tsx| CoreSchedulerMobile
    PlanStore --> CoreTypesMobile
    NativeNotifications --> CoreTypesMobile
```

---

## 6. C4 Nível 3: Diagrama do Motor de Domínio (`packages/core`)

Módulos desacoplados de qualquer framework de visualização.

```mermaid
graph LR
    subgraph PackagesCore["packages/core/src/"]
        subgraph DomainTypes["types.ts"]
            TreatmentItem["TreatmentItem (tipo, nome, dose, frequência, duração, confiança)"]
            TreatmentPlan["TreatmentPlan (título, resumo, lista de itens)"]
            CalendarEvent["CalendarEvent (título, startISO, endISO, descrição)"]
            TreatmentRecord["TreatmentRecord (registro com progresso e status)"]
        end

        subgraph CoreScheduler["scheduler.ts"]
            expandPlanToEvents["expandPlanToEvents() (Orquestrador de expansão)"]
            generateEventsForItem["generateEventsForItem() (Tratamento qXh e Xx/dia)"]
            createEventFromItem["createEventFromItem() (Formatação clínica e +5min janela)"]
        end

        subgraph OpenAICore["openai.ts"]
            ExtractPlan["extractPlanFromImageWithClient() (invoca a Edge Function analyze-prescription; o prompt médico e a validação ficam na Edge Function)"]
        end

        subgraph SupabaseCore["supabase/"]
            ClientCore["client.ts (Instanciação tipada)"]
            DBCoreTypes["types.ts (Schema Database gerado)"]
        end
    end

    TreatmentPlan --> expandPlanToEvents
    TreatmentItem --> generateEventsForItem
    generateEventsForItem --> createEventFromItem
    createEventFromItem --> CalendarEvent
    OpenAICore --> TreatmentPlan
```

---

## 7. Fluxo Funcional: Ciclo de Vida da Receita Médica (Sequence Diagram)

Fluxo ponta a ponta desde a captura da imagem até o agendamento de doses.

```mermaid
sequenceDiagram
    autonumber
    actor Paciente as Paciente / Cuidador
    participant App as App (Web / Mobile)
    participant Edge as Supabase Edge Function (analyze-prescription)
    participant OpenAI as OpenAI Vision (GPT-4.1)
    participant Core as packages/core (Scheduler Engine)
    participant DB as Supabase PostgreSQL & Storage
    participant Alarm as Motor de Notificações (Local / Web Push)

    Paciente->>App: 1. Fotografa / Seleciona imagem da receita
    App->>DB: 2. Upload para bucket privado 'prescriptions' (somente Web; o Mobile ainda não envia a imagem)
    DB-->>App: 3. Retorna imagePath seguro
    
    App->>Edge: 4. POST /analyze-prescription (imageBase64, userNotes)
    Note over Edge: JWT verificado pelo gateway do Supabase (verify_jwt padrão); a função lê OPENAI_API_KEY dos secrets
    Edge->>OpenAI: 5. Chat Completion com prompt médico especializado
    OpenAI-->>Edge: 6. Retorna JSON bruto estruturado
    Note over Edge: Sanitiza, valida campos e índice de confiança (0..1)
    Edge-->>App: 7. Retorna 200 OK com TreatmentPlan

    App->>Paciente: 8. Exibe tela de revisão (PlanReview)
    Note over Paciente: Confere medicamentos, dosagens, frequências e observações clínicas
    Paciente->>App: 9. Ajusta horários e clica em "Confirmar Tratamento"

    App->>Core: 10. expandPlanToEvents(plan, startDateTime)
    Note over Core: Calcula intervalos (qXh ou Xx/dia) de forma determinística,<br/>insere observações e calcula instantes UTC
    Core-->>App: 11. Lista de CalendarEvent[] gerada

    App->>DB: 12. INSERT into treatments (title, notes, image_path, status)
    DB-->>App: 13. Retorna treatment.id
    App->>DB: 14. BATCH INSERT into events (treatment_id, date, time, label, done)
    
    App->>Alarm: 15. Agenda lembretes locais / push para cada dose
    App->>Paciente: 16. Exibe a agenda do tratamento (SupabaseScheduleView) com progresso ativo
```

---

## 8. Arquitetura de UI e Sistema de Design (Radix UI + Tailwind CSS)

Estrutura de estilização semântica, acessibilidade e compartilhamento de design entre Web e Mobile.

```mermaid
graph LR
    subgraph DesignReference["Figma / Especificações Visuais"]
        FigmaSpecs["Guia de Estilos:<br/>• Paleta Semântica (Primary, Secondary, Destructive, Muted, Background)<br/>• Espaçamentos e Raios (sm, md, lg)<br/>• Layouts Responsivos (Desktop 1440px / Mobile 375px)"]
    end

    subgraph ThemeLayer["Camada de Tema e Variáveis CSS"]
        IndexCSS["src/index.css<br/>(:root e .dark com variáveis HSL)"]
        TailwindCfg["tailwind.config.ts<br/>(Mapeamento semântico hsl(var(--...)))"]
        NativeWindCfg["apps/mobile/global.css & tailwind.config.js<br/>(NativeWind v4 no React Native)"]
        UtilsCN["src/lib/utils.ts<br/>(Helper cn com clsx + tailwind-merge)"]
    end

    subgraph ComponentLayer["Biblioteca de Componentes e Telas"]
        RadixPrimitives["Radix UI Primitives<br/>(Dialog, Tabs, Progress, Checkbox, Tooltip)"]
        UIWrappers["src/components/ui/*<br/>(Button, Card, Input, Textarea, Badge com CVA)"]
        DomainComponents["src/components/*<br/>(PlanReview, TreatmentCard, SupabaseScheduleView)"]
        MobileUI["apps/mobile/components/ui/*<br/>(Button, Card, Badge, Checkbox em NativeWind)"]
    end

    %% Ligações
    FigmaSpecs --> IndexCSS
    IndexCSS --> TailwindCfg
    TailwindCfg --> UtilsCN
    NativeWindCfg --> MobileUI
    UtilsCN --> UIWrappers
    RadixPrimitives --> UIWrappers
    UIWrappers --> DomainComponents
```

---

## 9. Modelo de Dados Relacional e Segurança (ERD + RLS)

Diagrama Entidade-Relacionamento com integridade referencial e isolamento de dados por usuário.

```mermaid
erDiagram
    AUTH_USERS ||--o| PUBLIC_USERS : "possui perfil"
    AUTH_USERS ||--o{ TREATMENTS : "cria"
    TREATMENTS ||--o{ EVENTS : "contém"
    TREATMENTS ||--o{ NOTIFICATION_REMINDERS : "gera"
    EVENTS ||--o{ NOTIFICATION_REMINDERS : "vinculado a"
    AUTH_USERS ||--o{ PUSH_SUBSCRIPTIONS : "registra dispositivos"

    AUTH_USERS {
        uuid id PK
        string email
        timestamptz created_at
    }

    PUBLIC_USERS {
        uuid id PK
        uuid user_id FK "REFERENCES auth.users(id)"
        string name
        string email
        string provider
        boolean active_subscription "Indica plano Free vs Premium"
        timestamptz created_at
        timestamptz updated_at
    }

    TREATMENTS {
        uuid id PK
        uuid user_id FK "REFERENCES auth.users(id)"
        string title "Ex: Amoxicilina 500mg"
        text notes "Observações da receita"
        string status "active | archived"
        string image_path "Caminho no storage prescriptions"
        timestamptz created_at
        timestamptz updated_at
    }

    EVENTS {
        uuid id PK
        uuid treatment_id FK "REFERENCES public.treatments(id) ON DELETE CASCADE"
        date date "Data da dose (YYYY-MM-DD)"
        time time "Hora da dose (HH:MM:SS)"
        string label "Ex: Tomar Amoxicilina 500mg"
        boolean done "Status de cumprimento da dose"
        timestamptz created_at
    }

    NOTIFICATION_REMINDERS {
        uuid id PK
        uuid user_id FK "REFERENCES auth.users(id)"
        uuid treatment_id FK "REFERENCES public.treatments(id)"
        uuid event_id FK "REFERENCES public.events(id)"
        timestamptz scheduled_at "Instante UTC exato do alarme"
        timestamptz sent_at
        string status "pending | sent | cancelled | failed"
        uuid snooze_parent_id FK "Para doses adiadas"
        jsonb payload "Metadados do medicamento"
        timestamptz created_at
        timestamptz updated_at
    }

    PUSH_SUBSCRIPTIONS {
        uuid id PK
        uuid user_id FK "REFERENCES auth.users(id)"
        string endpoint
        string p256dh
        string auth
        string user_agent
        boolean is_active
        timestamptz created_at
        timestamptz last_used_at
    }
```

---

## 10. Governança de Qualidade: AI Cockpit Multi-Agent Pipeline

Pipeline determinístico de 12 etapas com auditoria de conformidade para prevenir regressões de layout, tokens e código.

> **Nota:** os agentes abaixo (`ui-orchestrator`, `spec-refiner`, `design-completeness`, etc.) descrevem o processo do AI Cockpit e não estão definidos neste repositório. O que existe aqui são as skills em `.claude/skills/` (importadas de `.aicockpit/skills/`), o comando `/create-specs` e o template em `_specs/`.

```mermaid
flowchart TD
    Demanda["Demanda do Usuário / Issue de UI"] --> Master["ui-orchestrator (Master Agent no Board)"]

    subgraph PipelineFidelidade["Pipeline de 12 Etapas (A até L)"]
        subgraph Especificacao["Etapas A-C: Especificação SMART"]
            SpecRefiner["spec-refiner<br/>• Gera _specs/<slug>.md<br/>• Critérios Gherkin<br/>• Matriz dos 5 Estados de UI"]
        end

        subgraph AuditoriaFigma["Etapas D-F: Inspeção e Auditoria"]
            DesignComp["design-completeness<br/>• Valida 5 estados no Figma<br/>• Valida 1440px / 375px"]
            DSVal["ds-validator<br/>• Zero nós desconectados<br/>• Auto-layout obrigatório"]
            FigmaInsp["figma-inspector<br/>• Extrai bound variables<br/>• Exporta baselines visuais"]
        end

        subgraph GeracaoECodigo["Etapas G-I: Código e Testes"]
            FigmaTrans["figma-transform<br/>• Gera React 18 / React Native<br/>• Primitivas Radix UI + Tailwind"]
            UIBuilder["ui-builder<br/>• Componentes e Hooks<br/>• Testes Vitest em src/test/"]
        end

        subgraph VerificacaoVisual["Etapas J-L: Validação e Testes"]
            VisualQA["Testes de Integração & Unidade<br/>• Paridade lógica entre Web e Mobile<br/>• Validação de agendamentos e regras clínicas"]
        end
    end

    subgraph QualityGate["Quality Gate Determinístico"]
        TSC["tsc --noEmit -p tsconfig.app.json / -p packages/core / -p apps/mobile (0 erros)"]
        ESLint["pnpm run lint (0 warnings/erros)"]
        Vitest["pnpm test (100% testes aprovados)"]
        BuildCheck["pnpm run build (Build de produção Vite)"]
        
        GateAudit{"Todos os Gates Aprovados?"}
    end

    Master --> SpecRefiner
    SpecRefiner --> DesignComp
    DesignComp --> DSVal
    DSVal --> FigmaInsp
    FigmaInsp --> FigmaTrans
    FigmaTrans --> UIBuilder
    UIBuilder --> VisualQA
    VisualQA --> QualityGate

    QualityGate --> TSC --> ESLint --> Vitest --> BuildCheck --> GateAudit
    GateAudit -- "SIM" --> Deploy["STATUS: APPROVED (Handoff para Produção / Build EAS)"]
    GateAudit -- "NÃO" --> AutoHealing["STATUS: REJECTED (Auto-healing / Retrabalho)"]
    AutoHealing -.-> UIBuilder
```

---

## 11. Matriz Comparativa Multiplataforma: Web vs. Mobile

| Capacidade | Aplicação Web (raiz do repo, `src/`) | Aplicação Mobile (`apps/mobile`) | Motor de Compartilhamento |
|---|---|---|---|
| **Ambiente de Execução** | Browser Desktop & Mobile | iOS e Android Nativo | JavaScript/TypeScript V8/Hermes |
| **Framework Base** | React 18.3.1 + Vite 5.4.19 | React Native 0.85 + React 19 + Expo SDK 56 | TypeScript 5.8 |
| **Navegação** | `react-router-dom` v6 | `expo-router` (File-based) | — |
| **Estilização** | Tailwind CSS v3.4 + Variáveis CSS (:root HSL) | NativeWind v4 + Tailwind CSS | Paleta Semântica HSL |
| **Biblioteca de UI** | Radix UI + Tailwind CSS (CVA) | Componentes Nativos (NativeWind) | Contrato de Props e Variantes |
| **Notificações** | Web Push API (Service Worker `public/sw.js` + servidor Express `server.js`) | `expo-notifications` (Alarmes locais nativos) | Tipos de Payload de Lembrete |
| **Calendário** | Exportação de arquivo `.ics` | `expo-calendar` (Gravação direta no app Nativo) | Gerador de Eventos RFC-5545 |
| **Captura de Imagem** | Input File HTML5 / Drag & Drop | Câmera nativa e Galeria de Fotos | Conversão base64 e envio seguro |
| **Regras de Negócio** | Consome `packages/core` | Consome `packages/core` | `packages/core/src/scheduler.ts` |
| **Armazenamento Offline** | `localStorage` / React Query cache | `AsyncStorage` (apenas sessão do Supabase); `planStore.ts` mantém só o rascunho em memória | Modelos de dados em `types.ts` |
