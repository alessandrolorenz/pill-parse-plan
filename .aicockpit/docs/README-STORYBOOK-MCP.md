> **Status (2026-10-26):** Storybook não está instalado neste repositório (sem `.storybook/` nem dependências `storybook` no `package.json`). O servidor MCP em `http://localhost:6006/mcp` (configurado em `.mcp.json`) só funciona depois de instalar e rodar o Storybook.

# Storybook MCP Server — Integration Guide

> **Version**: `@storybook/addon-mcp` v0.6.0+ (requires Storybook 10.3.5 or higher)
> **Protocol**: Model Context Protocol (MCP) over HTTP  
> **MCP Server URL**: `http://localhost:6006/mcp`  
> **Project context**: React + TypeScript + Vite

---

## Table of Contents

1. [Overview](#overview)
2. [Installation & Setup](#installation--setup)
3. [Agent Instructions Template](#agent-instructions-template)
4. [Toolsets Reference](#toolsets-reference)
5. [Configuration Options](#configuration-options)
6. [Best Practices — Writing Stories](#best-practices--writing-stories)
7. [Best Practices — Documenting Components](#best-practices--documenting-components)
8. [Manifest Curation](#manifest-curation)
9. [Storybook Composition Support](#storybook-composition-support)
10. [FAQ](#faq)
11. [Further Resources](#further-resources)

---

## Overview

The Storybook MCP server exposes your component library to AI agents via the **Model Context Protocol**. Once configured, agents can:

- **Query component documentation** — list all components, read props, read stories
- **Write and preview stories** — generate story files and preview them in the browser
- **Run visual/interaction tests** — execute Storybook tests and receive pass/fail results
- **Self-heal** — run tests → find failures → fix code → re-run tests in a loop

The MCP server is provided by the `@storybook/addon-mcp` addon and runs alongside your Storybook dev server at `http://localhost:6006/mcp`.

---

## Installation & Setup

### Step 1 — Install the addon

```bash
npx storybook add @storybook/addon-mcp
```

This automatically registers the addon in `.storybook/main.ts`.

### Step 2 — Register the MCP server with your AI agent

```bash
npx mcp-add --type http --url "http://localhost:6006/mcp" --scope project
```

When prompted, enter a name for the MCP server (e.g. `sds-air-sb-mcp`). This creates a project-scoped MCP registration so the agent knows where to connect.

> **Note**: The Storybook dev server must be running (`npm run storybook`) for the MCP server to be reachable.

### Step 3 — Add agent instructions

Create or update `AGENTS.md` (for Codex/OpenAI agents) or `CLAUDE.md` (for Claude agents) at the project root. See the [Agent Instructions Template](#agent-instructions-template) section below.

---

## Agent Instructions Template

Add the following to your `AGENTS.md` or `CLAUDE.md`:

```markdown
## Storybook MCP

- Always use the `sds-air-sb-mcp` MCP toolset when working on UI components
- CRITICAL: Never hallucinate component properties
- Query `list-all-documentation` to get a list of all components
- Query `get-documentation` for that component to see all available properties
- Only use explicitly documented properties
- Use `get-storybook-story-instructions` to fetch the latest story writing instructions
- Check your work by running `run-story-tests` after writing or modifying stories
```

---

## Toolsets Reference

The MCP server exposes three toolsets. All are **enabled by default**.

### `dev` — Development Toolset

| Tool | Description |
|---|---|
| `get-storybook-story-instructions` | Fetches the latest instructions for writing stories in this project |
| `preview-stories` | Renders a story in the Storybook preview and returns a screenshot |

### `docs` — Documentation Toolset

> ⚠️ **React only** — currently in preview. Requires React components with proper JSDoc and `react-docgen-typescript`.

| Tool | Description |
|---|---|
| `list-all-documentation` | Returns a list of all documented components and their summaries |
| `get-documentation` | Returns full documentation for a component, including all props and their types |
| `get-documentation-for-story` | Returns documentation scoped to a specific story |

### `test` — Testing Toolset

| Tool | Description |
|---|---|
| `run-story-tests` | Runs Storybook tests (play functions, interaction tests) and returns results |

---

## Configuration Options

The addon is configured in `.storybook/main.ts`:

```ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    // ... your existing addons
    {
      name: '@storybook/addon-mcp',
      options: {
        toolsets: {
          dev: true,   // default: true
          docs: true,  // default: true
          test: true,  // default: true
        },
      },
    },
  ],
};

export default config;
```

### `toolsets` option

```ts
type ToolsetsOption = {
  dev?: boolean;   // default: true
  docs?: boolean;  // default: true
  test?: boolean;  // default: true
};
```

Set any toolset to `false` to disable it. For example, to disable the `dev` toolset:

```ts
{
  name: '@storybook/addon-mcp',
  options: {
    toolsets: {
      dev: false,
    },
  },
}
```

---

## Best Practices — Writing Stories

### One concept per story

Each story should demonstrate **one concept**. This makes it easier for agents to understand what a story is testing and to generate accurate documentation.

```tsx
// ✅ Good — demonstrates one concept
export const Primary: Story = {
  args: { primary: true },
};

// ✅ Good — multiple renders, but all illustrate the same concept (disabled state)
export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => (
    <>
      <Button {...args}>Disabled Button</Button>
      <Button {...args} primary>Disabled Primary Button</Button>
    </>
  ),
};

// ❌ Bad — too many concepts at once (size AND variant)
export const SizesAndVariants: Story = {
  render: () => (
    <>
      <Button size="small">Small Button</Button>
      <Button>Medium Button</Button>
      <Button size="large">Large Button</Button>
    </>
  ),
};
```

### Describe the "why", not just the "what"

Story names and descriptions should explain **why** a state exists, not just what it looks like. This helps agents understand intent.

```tsx
// ✅ Good — explains the purpose
/**
 * Use the primary variant for the main action in a view.
 * There should only be one primary button per view.
 */
export const Primary: Story = {
  args: { primary: true },
};

// ❌ Bad — just describes appearance
/**
 * A blue button.
 */
export const Primary: Story = {
  args: { primary: true },
};
```

### Use CSF 3 (Component Story Format 3)

Always use the CSF 3 format with `args` and `argTypes`. Avoid inline render functions unless necessary.

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  component: Button,
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    primary: true,
    label: 'Button',
  },
};
```

---

## Best Practices — Documenting Components

### Component-level JSDoc

Add a JSDoc comment to your component describing its purpose. Use `@summary` for a short description that agents use in `list-all-documentation` responses.

```tsx
/**
 * Button is used for user interactions that do not navigate to another route.
 * For navigation, use [Link](?path=/docs/link--default) instead.
 *
 * @summary for user interactions that do not navigate to another route
 */
export const Button = (props: ButtonProps) => {
  // ...
};
```

### Prop-level JSDoc

Document every prop with a JSDoc comment. This is extracted by `react-docgen-typescript` and surfaced via the `get-documentation` MCP tool.

```tsx
export interface ButtonProps {
  /** The visual style of the button */
  variant?: 'primary' | 'neutral' | 'subtle';

  /** The size of the button */
  size?: 'small' | 'medium' | 'large';

  /** The icon to render before the button text */
  icon?: ReactNode;

  /** Whether the button is disabled */
  disabled?: boolean;
}
```

### Story-level JSDoc with `@summary`

Add `@summary` to individual stories to provide short descriptions in agent responses:

```ts
/**
 * Use the primary variant for the main action in a view.
 * There should only be one primary button per view.
 *
 * @summary for the main action in a view
 */
export const Primary: Story = {
  args: { primary: true },
};
```

### Enable `react-docgen-typescript`

For the `docs` toolset to work correctly, ensure `react-docgen-typescript` is configured in `.storybook/main.ts`:

```ts
const config: StorybookConfig = {
  // ...
  typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => {
        if (prop.parent) {
          return !prop.parent.fileName.includes('node_modules');
        }
        return true;
      },
    },
  },
};
```

### MDX docs summaries

For MDX documentation pages (design tokens, foundations, etc.), use the `summary` prop on the `<Meta>` block:

```mdx
import { Meta } from '@storybook/addon-docs/blocks';

<Meta
  title="Design Tokens/Colors"
  summary="A list of our color tokens and their intended usage."
/>

# Colors

This page documents all color tokens available in the design system...
```

### Keep docs content self-contained

Do not reference external sources (Figma links, Notion pages, etc.) as the primary source of truth in MDX docs. Agents can only read what is in Storybook. Include all relevant details directly in the MDX file.

---

## Manifest Curation

The `docs` toolset builds a **manifest** of all components and stories to surface to agents. You can control what is included.

### Exclude a single story

```ts
// This story will not appear in the manifest
export const ForInternalUseOnly: Story = {
  tags: ['!manifest'], // 👈 Remove the 'manifest' tag
  args: { primary: true },
};
```

### Exclude an entire component from the manifest

Remove the `manifest` tag from the component's `meta` export:

```ts
const meta: Meta<typeof InternalComponent> = {
  component: InternalComponent,
  tags: ['!manifest'], // 👈 Exclude entire component
};

export default meta;
```

### Exclude an MDX docs page

```mdx
<Meta title="Internal/Dev Notes" tags={['!manifest']} />

# Dev Notes

This page is for developers only and will not appear in agent manifests.
```

---

## Storybook Composition Support

If your project uses **Storybook Composition** (multiple Storybooks combined into one), the MCP server automatically includes manifests from all composed Storybooks.

This means agents can query documentation across your entire design system, even if components are split across multiple Storybook instances.

No additional configuration is required — the MCP server handles this automatically.

---

## FAQ

### Does the Storybook dev server need to be running?

Yes. The MCP server runs as part of the Storybook dev server. Start it with:

```bash
npm run storybook
```

The MCP endpoint will be available at `http://localhost:6006/mcp`.

### Which frameworks are supported?

- **`dev` toolset** (story writing, preview): All frameworks
- **`docs` toolset** (component documentation, manifests): **React only** (currently in preview)
- **`test` toolset** (running tests): All frameworks

### Can I use this with Claude, Copilot, or other agents?

Yes. Any agent that supports the Model Context Protocol (MCP) over HTTP can connect. The `mcp-add` CLI registers the server for the current project scope.

### What is the self-healing loop?

The self-healing loop is a workflow pattern where:

1. The agent writes or modifies a story
2. The agent calls `run-story-tests` to execute tests
3. If tests fail, the agent reads the failure output
4. The agent fixes the code
5. The agent re-runs tests
6. The loop continues until all tests pass

This allows agents to autonomously fix visual regressions and interaction test failures.

### How do I prevent agents from hallucinating component props?

1. Add the instruction `CRITICAL: Never hallucinate component properties` to your `AGENTS.md` / `CLAUDE.md`
2. Instruct the agent to always call `get-documentation` before using a component
3. Ensure all props are documented with JSDoc comments
4. Use `react-docgen-typescript` for accurate prop extraction

### What is `@summary` used for?

The `@summary` JSDoc tag provides a short, truncated description that agents receive when calling `list-all-documentation`. This helps agents quickly understand what a component or story is for without loading the full documentation.

---

## Further Resources

- [Storybook MCP Overview](https://storybook.js.org/docs/ai/mcp/overview)
- [Storybook AI Best Practices](https://storybook.js.org/docs/ai/best-practices)
- [Storybook MCP API Reference](https://storybook.js.org/docs/ai/mcp/api)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Storybook Code Connect Docs](https://www.figma.com/code-connect-docs/react/)
- [react-docgen-typescript](https://github.com/styleguidist/react-docgen-typescript)