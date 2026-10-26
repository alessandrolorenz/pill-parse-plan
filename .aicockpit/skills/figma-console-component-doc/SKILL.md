---
name: figma-console-component-doc
description: "Generates comprehensive markdown documentation for Figma components using figma_generate_component_doc and figma_deep_extract_component. Use when the user wants to document a component, generate component specs, create a component reference guide, or extract anatomy/variant/token documentation from Figma. Triggers: 'document this component', 'generate component docs', 'create component spec', 'extract component documentation', 'generate component reference', 'document the design system', 'create component API docs'. Requires Figma Console MCP server connection."
disable-model-invocation: false
---

# figma-console-component-doc

Generates comprehensive markdown documentation for Figma components using `figma_generate_component_doc` and `figma_deep_extract_component`. Use when the user wants to document a component, generate component specs, create a component reference guide, or extract anatomy/variant/token documentation from Figma.

**Triggers**: 'document this component', 'generate component docs', 'create component spec', 'extract component documentation', 'generate component reference', 'document the design system', 'create component API docs'.

**Requires**: Figma Console MCP (`figma-console-mcp`) connection.

## MCP Requirements

This skill uses **Figma Console MCP** exclusively:
- `figma_generate_component_doc` — Generate full markdown component documentation from Figma
- `figma_deep_extract_component` — Deep extraction of component structure, properties, variants
- `figma_analyze_component_set` — Analyze component set variant matrix and coverage
- `figma_get_design_system_kit` — Get design system context for token documentation

## What Gets Documented

The `figma_generate_component_doc` tool generates documentation covering:

1. **Component Overview** — Name, description, purpose, usage guidelines
2. **Anatomy** — Visual breakdown of component layers and sub-components
3. **Variants Table** — All property combinations (variant × size × state)
4. **Design Token References** — Which tokens are bound to which properties
5. **Typography Specifications** — Font family, size, weight, line height per text element
6. **Spacing Specifications** — Padding, gap, margin values
7. **Accessibility Notes** — ARIA roles, keyboard behavior, screen reader requirements
8. **Annotation Summary** — Design annotations and usage notes from Figma

## Workflow

### Step 1: Identify the Component

Parse the Figma URL or accept a node ID:
```
URL: https://www.figma.com/file/ABC123/Design?node-id=1%3A234
fileKey: ABC123
nodeId: 1:234
```

Verify the node is a component or component set (not a frame or group).

### Step 2: Deep Extract Component Structure

Before generating docs, get the full component structure:

```
figma_deep_extract_component(nodeId, fileKey, depth=3)
```

This provides:
- Complete layer hierarchy
- All variant properties and their values
- Design token bindings
- Component API (exposed properties)
- Interaction states

### Step 3: Analyze Component Set (if applicable)

If the node is a component set with multiple variants:

```
figma_analyze_component_set(componentSetId, fileKey)
```

Returns:
- Variant matrix (all property combinations)
- Property axes (e.g., variant × size × state)
- Coverage gaps (missing variant combinations)
- Total variant count

### Step 4: Generate Component Documentation

```
figma_generate_component_doc(nodeId, fileKey, includeCode=true)
```

Parameters:
- `nodeId` — Component or component set node ID
- `fileKey` — Figma file key
- `includeCode` — Whether to include code examples (default: true)

### Step 5: Get Design System Context

For token documentation, get the full design system:

```
figma_get_design_system_kit(fileKey, 'summary')
```

Use this to:
- Resolve token names to actual values
- Document which collection each token belongs to
- Show light/dark mode values

### Step 6: Augment with Code Examples

If `includeCode=true`, add framework-specific code examples:

**React:**
```typescript
import { Button } from '@/components/Button';

// Primary button
<Button variant="primary" size="md">Click me</Button>

// Secondary button with icon
<Button variant="secondary" size="sm" icon={<ArrowIcon />}>
  Back
</Button>

// Disabled state
<Button variant="primary" disabled>Submit</Button>
```

**Vue:**
```vue
<Button variant="primary" size="md">Click me</Button>
<Button variant="secondary" :disabled="true">Cancel</Button>
```

### Step 7: Save Documentation

Save the generated documentation to the project:

```
docs/components/[ComponentName].md
```

Or for a design system:
```
docs/design-system/components/[ComponentName].md
```

## Documentation Template

The generated documentation follows this structure:

```markdown
# [ComponentName]

[Brief description of the component's purpose]

## Overview

| Property | Value |
|----------|-------|
| Component type | [Atom / Molecule / Organism] |
| Figma file | [Link to Figma] |
| Status | [Stable / Beta / Deprecated] |

## Anatomy

[Visual description of component layers]

- **Root** — The outermost container frame
  - **Icon** (optional) — Leading icon slot
  - **Label** — Primary text content
  - **Badge** (optional) — Trailing badge/count

## Variants

| Variant | Size | State | Description |
|---------|------|-------|-------------|
| primary | sm | default | Primary action, small size |
| primary | sm | hover | Hover state |
| primary | sm | disabled | Disabled state |
| primary | md | default | Primary action, medium size |
| ... | ... | ... | ... |

## Props / Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| variant | 'primary' \| 'secondary' \| 'ghost' | 'primary' | Visual style variant |
| size | 'sm' \| 'md' \| 'lg' | 'md' | Component size |
| disabled | boolean | false | Disabled state |
| loading | boolean | false | Loading state |
| icon | ReactNode | undefined | Leading icon |
| children | ReactNode | required | Button label |

## Design Tokens

| Property | Token | Light Value | Dark Value |
|----------|-------|-------------|------------|
| Background | color/background/primary | #2563EB | #3B82F6 |
| Text | color/text/inverse | #FFFFFF | #FFFFFF |
| Padding X | spacing/component/padding-md | 20px | 20px |
| Padding Y | spacing/component/padding-sm | 10px | 10px |
| Border radius | radius/md | 8px | 8px |

## Typography

| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|-------------|
| Label (sm) | Inter | 12px | 500 | 1.5 |
| Label (md) | Inter | 14px | 500 | 1.5 |
| Label (lg) | Inter | 16px | 500 | 1.5 |

## Accessibility

- **Role**: `button`
- **Keyboard**: Space/Enter to activate
- **Focus**: Visible focus ring using `outline: 2px solid var(--color-focus-ring)`
- **Screen reader**: Reads button label; announces disabled state
- **ARIA**: `aria-disabled` when disabled; `aria-busy` when loading

## Usage Guidelines

### Do
- Use primary variant for the main call-to-action on a page
- Use secondary for supporting actions
- Always provide a meaningful label

### Don't
- Don't use more than one primary button per section
- Don't use icon-only buttons without an aria-label
- Don't disable buttons without explaining why

## Code Examples

### React
[code examples]

### Vue
[code examples]
```

## Batch Documentation

To document an entire design system, iterate through all components:

```
Step 1: figma_get_design_system_kit(fileKey, 'inventory')
        → get list of all component IDs

Step 2: For each component:
        figma_generate_component_doc(componentId, fileKey)
        → save to docs/components/[name].md

Step 3: Generate index file
        → docs/components/README.md with links to all components
```

## Output Formats

| Format | Use Case | File Extension |
|--------|----------|---------------|
| Markdown | General documentation, GitHub | `.md` |
| MDX | Storybook, Docusaurus | `.mdx` |
| JSON | API documentation, tooling | `.json` |
| HTML | Standalone documentation site | `.html` |

Default format is Markdown (`.md`).

## Error Handling

| Issue | Fix |
|-------|-----|
| "Node is not a component" | Verify the node is a COMPONENT or COMPONENT_SET type |
| "Component has no variants" | Use `figma_deep_extract_component` instead of `figma_analyze_component_set` |
| "Token not found" | Use `figma_get_design_system_kit(fileKey, 'full')` to get all token data |
| "Documentation incomplete" | Run `figma_deep_extract_component` first to get full structure |

## Completion Checklist

- [ ] Component node ID and file key obtained
- [ ] `figma_deep_extract_component` run to get full structure
- [ ] `figma_analyze_component_set` run (if component set)
- [ ] `figma_generate_component_doc` called successfully
- [ ] Design token values resolved from design system kit
- [ ] Code examples added for target framework
- [ ] Documentation saved to correct file path
- [ ] Index/README updated with new component link