# Spec: <feature_title>

- **Branch**: aicockpit/feature/<feature_slug>
- **Pacotes / Camadas Afetadas**: [ex: `@pill-parse/core`, `src/components`, `src/hooks`]
- **Regra de Dependência Arquitetural**: Respeitar `apps → hooks → api → core` (core é 100% puro e não possui dependências externas)
- **Figma Reference**: <link ou "N/A">

---

## 1. Context & Objectives (Epic & User Story)
- **Objetivo do Épico**: [Objetivo de alto nível e valor de negócio]
- **User Story**: 
  > Como [perfil de usuário],  
  > Quero [ação ou funcionalidade],  
  > Para que [benefício de negócio ou usabilidade].

---

## 2. Subtasks & Dependencies
Mapeamento de subtarefas atômicas e suas relações de dependência:

| Subtask ID | Descrição da Subtarefa | Escopo / Arquivos | Dependência |
| :--- | :--- | :--- | :--- |
| **SUB-01** | [Definição de tipos e contratos de domínio] | `packages/core/src/types.ts` | Nenhuma |
| **SUB-02** | [Implementação da lógica de negócio pura] | `packages/core/src/...` | SUB-01 |
| **SUB-03** | [Componente visual ou Hook de integração] | `src/components/...` | SUB-02 |

---

## 3. Business Rules (Regras Explícitas)
- **BR-01**: [Regra de negócio obrigatória 1]
- **BR-02**: [Regra de negócio obrigatória 2]

---

## 4. Technical Requirements & Architecture Constraints
- **Isolamento de Plataforma**: Código em `packages/core` não pode utilizar APIs específicas de Browser, Node ou `Intl`/`toLocale*` (compatibilidade Hermes/React Native).
- **Gerenciamento de Estado & Persistência**: Indicar se afeta `useManagedTreatments`, Supabase (`treatments`/`events`) ou localStorage.
- **Figma / Design Tokens**: Utilizar variáveis CSS mapeadas em `src/index.css` sem valores de cor hardcoded.

---

## 5. Edge Cases (Casos de Borda)
- **EC-01**: [Comportamento com entrada nula, vazia ou dados inválidos]
- **EC-02**: [Comportamento em falha de rede/serviço externo]
- **EC-03**: [Casos de fuso horário / horário de verão na manipulação de datas]

---

## 6. Acceptance Criteria (Critérios de Aceite)
Critérios mensuráveis a serem verificados no Step 7 do Hierarchical Reasoning:

| ID | Critério de Aceite | Método de Validação |
| :--- | :--- | :--- |
| **AC-01** | [O cálculo deve retornar exatamente X para o cenário Y] | Unit Test (`npm run test:run`) |
| **AC-02** | [A interface deve renderizar os tokens de cor do DS] | Inspeção visual / Component test |
| **AC-03** | [Nenhuma quebra de build ou regressão no linter] | `npm run build` |

---

## 7. Testing & Verification Guidelines
- **Core Domain**: Adicionar testes no harness compartilhado (`packages/core/src/__tests__/`).
- **Web App**: Validar fluxo via browser e executar `npm run build`.
- **Mobile**: Garantir que o harness execute via `npm run test:mobile`.
