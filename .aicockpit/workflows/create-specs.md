---
description: Cria uma feature spec completa para Hierarchical Reasoning e nova branch git
---

Você é responsável por estruturar a especificação técnica e funcional de uma nova feature para este repositório, compatível com a metodologia Hierarchical Reasoning e rigorosamente alinhada às convenções em CLAUDE.md e _specs/architecture.md.

Entrada do usuário: $ARGUMENTS

## High level behavior

Seu objetivo é transformar a entrada do usuário em:
1. Um título amigável e legível em Title Case (feature_title).
2. Uma slug segura para Git em kebab-case (feature_slug).
3. Uma branch Git dedicada (branch_name).
4. Um arquivo de especificação completo salvo em _specs/<feature_slug>.md estruturado para o pipeline do Hierarchical Reasoning (Context, Epic/Story, Subtasks, Business Rules, Architecture, Edge Cases, Acceptance Criteria).

## Step 1. Check the current branch
1. Verifique o status do Git (git status).
2. Se houver arquivos modificados, unstaged ou untracked não commitados, alerte o usuário e solicite que faça commit ou stash antes de prosseguir. Não avance sem a árvore de trabalho limpa.

## Step 2. Parse the arguments
A partir de $ARGUMENTS, extraia:
1. feature_title: Título em Title Case (ex: "Filtro de Medicamentos por Horário").
2. feature_slug: Slug seguro em minúsculo, kebab-case, somente a-z, 0-9 e -, máximo 40 caracteres (ex: filtro-medicamentos-horario).
3. branch_name: Formato aicockpit/feature/<feature_slug>.
4. figma_hint (opcional): Se $ARGUMENTS contiver a substring figma:, extraia o link que segue após ela.

## Step 2.5 Pull Figma context when needed
Se figma_hint estiver presente e as ferramentas MCP do Figma estiverem disponíveis:
1. Inspecione o nó ou arquivo alvo (figma_get_component_for_development ou figma_get_file_data e figma_get_variables).
2. Extraia tokens visuais e cores semânticas (color/*, spacing/*, radius/*), tipografia, dimensões e auto-layout.
3. Resuma essas restrições como tópicos objetivos na seção Figma Design Reference da spec.

## Step 3. Switch to a new Git branch
Troque para uma nova branch Git utilizando branch_name. Se o nome já existir, adicione um sufixo numérico sequencial (ex: aicockpit/feature/<feature_slug>-01).

## Step 4. Draft the spec content
Gere o arquivo _specs/<feature_slug>.md seguindo rigorosamente o template abaixo:

1. Título e Metadados (Branch, Camadas Afetadas, Regra de Dependência Arquitetural apps -> hooks -> api -> core, Figma Reference).
2. Context & Objectives (Objetivo do Épico e User Story).
3. Subtasks & Dependencies (Tabela com Subtask ID, Descrição, Escopo de Arquivos e Dependências).
4. Business Rules (Regras Explícitas BR-01, BR-02...).
5. Technical Requirements & Architecture Constraints (Isolamento de plataforma no core, persistência, design tokens).
6. Edge Cases (Casos de borda EC-01, EC-02...).
7. Acceptance Criteria (Tabela com ID, Critério de Aceite e Método de Validação com testes/inspeção).
8. Testing & Verification Guidelines (Diretrizes para packages/core/src/__tests__/, npm run build, npm run test:run, npm run test:mobile).

## Step 5. Final output to the user
Após salvar o arquivo em disco, finalize com o resumo conciso:

Branch: <branch_name>
Spec file: _specs/<feature_slug>.md
Title: <feature_title>
Status: Pronto para execução via Hierarchical Reasoning
