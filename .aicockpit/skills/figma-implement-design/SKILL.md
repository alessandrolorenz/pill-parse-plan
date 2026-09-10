---
name: figma-implement-design
description: "Translates Figma designs into production-ready application code with 1:1 visual fidelity. Use when implementing UI code from Figma files, when user mentions 'implement design', 'generate code', 'implement component', provides Figma URLs, or asks to build components matching Figma specs. Triggers: 'implement this design', 'generate code from Figma', 'build this component from Figma', 'translate Figma to code', 'implement the design spec', 'code this component'."
disable-model-invocation: false
---

# figma-implement-design

Translates Figma designs into production-ready application code with 1:1 visual fidelity. Use when implementing UI code from Figma files, when user mentions "implement design", "generate code", "implement component", provides Figma URLs, or asks to build components matching Figma specs.

**Triggers**: 'implement this design', 'generate code from Figma', 'build this component from Figma', 'translate Figma to code', 'implement the design spec', 'code this component'.

## MCP Requirements

This skill uses **both** Figma MCP servers:
- **Figma Official MCP** (`figma-windows-cmd`) — `get_design_context`, `get_screenshot`, `get_metadata` for design inspection
- **Figma Console MCP** (`figma-console-mcp`) — `figma_check_design_parity`, `figma_deep_extract_component`, `figma_get_design_system_kit` for deep analysis and validation

> **Note**: For Console MCP tools (`figma_check_design_parity`, `figma_deep_extract_component`, `figma_get_design_system_kit`), verify the Desktop Bridge is connected first. See the `figma-use` skill for setup verification steps.

## Workflow Overview

```
Step 1: Extract Figma URL/Node ID
Step 2: Get Design Context          → get_design_context (Official MCP)
Step 3: Deep Component Analysis     → figma_deep_extract_component (Console MCP)
Step 4: Get Design System Context   → figma_get_design_system_kit (Console MCP)
Step 5: Take Screenshot             → get_screenshot (Official MCP)
Step 6: Implement Code              → Write production-ready code
Step 7: Parity Validation           → figma_check_design_parity (Console MCP) ← NEW
Step 8: Fix Discrepancies           → Iterate until parity score ≥ 90
```

## Step 1: Extract Figma URL/Node ID

Parse the Figma URL to extract:
- `fileKey` — the file identifier (between `/file/` and `/` in the URL)
- `nodeId` — the node identifier (after `?node-id=` in the URL, URL-decoded)

Example URL parsing:
```
URL: https://www.figma.com/file/ABC123/MyDesign?node-id=1%3A234
fileKey: ABC123
nodeId: 1:234
```

## Step 2: Get Design Context

```
get_design_context(nodeId, fileKey)
```

This returns structured design data including:
- Node type, name, dimensions
- Layout properties (auto-layout, padding, spacing)
- Fill colors and gradients
- Typography (font family, size, weight, line height)
- Border radius, stroke, effects
- Component properties and variants

## Step 3: Deep Component Analysis

For components and component sets, get deeper analysis:

```
figma_deep_extract_component(nodeId, fileKey, depth=3)
```

Returns:
- Complete component structure with all nested layers
- All variant properties and their values
- Design token bindings (which variables are bound to which properties)
- Component API (exposed properties, their types and defaults)
- Interaction states (hover, focus, active, disabled)

For component sets:
```
figma_analyze_component_set(componentSetId, fileKey)
```

Returns:
- Variant matrix (all property combinations)
- Property axes (e.g., variant × size × state)
- Coverage gaps (missing variant combinations)

## Step 4: Get Design System Context

Understand the design tokens used in the component:

```
figma_get_design_system_kit(fileKey, 'summary')
```

Extract:
- Color token names and values used in the component
- Spacing token names and values
- Typography token names and values
- Map token names to CSS custom properties or design system variables

## Step 5: Take Screenshot

```
get_screenshot(nodeId)
```

Use the screenshot as the visual reference throughout implementation. Compare your code output against this screenshot.

## Step 6: Implement Code

### Framework Detection
Determine the target framework from the project context:
- React + TypeScript (most common)
- Vue 3 + TypeScript
- Angular
- Vanilla HTML/CSS
- React Native

### Implementation Rules

#### 1. Use Design Tokens, Not Hardcoded Values
```typescript
// ✅ Correct — use design tokens
const Button = styled.button`
  background: var(--color-background-primary);
  padding: var(--spacing-component-padding-md);
  border-radius: var(--radius-md);
`;

// ❌ Wrong — hardcoded values
const Button = styled.button`
  background: #2563EB;
  padding: 10px 20px;
  border-radius: 8px;
`;
```

#### 2. Map Figma Auto-Layout to CSS Flexbox
```
Figma Auto-Layout → CSS
─────────────────────────────────────────
layoutMode: HORIZONTAL → flex-direction: row
layoutMode: VERTICAL   → flex-direction: column
primaryAxisAlignItems: MIN         → justify-content: flex-start
primaryAxisAlignItems: CENTER      → justify-content: center
primaryAxisAlignItems: MAX         → justify-content: flex-end
primaryAxisAlignItems: SPACE_BETWEEN → justify-content: space-between
counterAxisAlignItems: MIN         → align-items: flex-start
counterAxisAlignItems: CENTER      → align-items: center
counterAxisAlignItems: MAX         → align-items: flex-end
itemSpacing: N                     → gap: Npx
paddingTop/Bottom/Left/Right: N    → padding: Npx
```

#### 3. Map Figma Typography to CSS
```
Figma Typography → CSS
─────────────────────────────────────────
fontFamily: "Inter"     → font-family: 'Inter', sans-serif
fontSize: 16            → font-size: 1rem (or 16px)
fontWeight: 600         → font-weight: 600
lineHeight: 24          → line-height: 1.5 (or 24px)
letterSpacing: 0.5      → letter-spacing: 0.5px
textAlignHorizontal: CENTER → text-align: center
```

#### 4. Map Figma Effects to CSS
```
Figma Effects → CSS
─────────────────────────────────────────
DROP_SHADOW: { x:0, y:4, blur:8, color:{r,g,b,a} }
  → box-shadow: 0 4px 8px rgba(r*255, g*255, b*255, a)
INNER_SHADOW → box-shadow: inset ...
LAYER_BLUR: { radius: 8 } → filter: blur(8px)
BACKGROUND_BLUR: { radius: 8 } → backdrop-filter: blur(8px)
```

#### 5. Component Variants → Props
```typescript
// Figma component set with variant=primary|secondary|destructive, size=sm|md|lg
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}
```

### React Component Template
```typescript
import React from 'react';
import styles from './ComponentName.module.css';

interface ComponentNameProps {
  // Props derived from Figma component properties
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  variant = 'primary',
  size = 'md',
  children,
}) => {
  return (
    <div className={`${styles.root} ${styles[variant]} ${styles[size]}`}>
      {children}
    </div>
  );
};

export default ComponentName;
```

### CSS Module Template
```css
/* ComponentName.module.css */
.root {
  /* Base styles from Figma */
  display: flex;
  align-items: center;
  justify-content: center;
  
  /* Use design tokens */
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}

.primary {
  background: var(--color-background-primary);
  color: var(--color-text-inverse);
}

.secondary {
  background: transparent;
  border: 1px solid var(--color-border-default);
  color: var(--color-text-primary);
}

.sm { padding: var(--spacing-2) var(--spacing-4); font-size: var(--font-size-sm); }
.md { padding: var(--spacing-3) var(--spacing-6); font-size: var(--font-size-base); }
.lg { padding: var(--spacing-4) var(--spacing-8); font-size: var(--font-size-lg); }
```

## Step 7: Parity Validation (NEW — Console MCP)

After implementing the component, validate it against the Figma design:

```
figma_check_design_parity(nodeId, codeData, fileKey)
```

Where `codeData` is the extracted CSS/style data from your implementation:
```json
{
  "backgroundColor": "#2563EB",
  "padding": "10px 20px",
  "borderRadius": "8px",
  "fontSize": "14px",
  "fontWeight": "500",
  "color": "#FFFFFF",
  "display": "flex",
  "alignItems": "center",
  "gap": "8px"
}
```

### Interpreting the Parity Score

| Score | Status | Action |
|-------|--------|--------|
| 90-100 | ✅ Ship-ready | Implementation matches design |
| 70-89 | ⚠️ Minor fixes | Address minor discrepancies |
| 50-69 | 🔶 Significant gaps | Fix major issues before shipping |
| < 50 | ❌ Major rework | Significant implementation issues |

### Discrepancy Categories

The tool returns discrepancies in 8 categories:
1. **visual** — Color, opacity, fill differences
2. **spacing** — Padding, margin, gap differences
3. **typography** — Font size, weight, family differences
4. **tokens** — Wrong or missing design token usage
5. **component-api** — Missing props or wrong prop types
6. **accessibility** — Missing ARIA attributes, contrast issues
7. **naming** — Component/prop naming doesn't match design
8. **metadata** — Missing documentation, descriptions

### Severity Levels
- **critical** — Must fix before shipping (e.g., wrong color, broken layout)
- **major** — Should fix (e.g., wrong spacing, missing variant)
- **minor** — Nice to fix (e.g., slightly off border radius)
- **info** — Informational (e.g., naming suggestion)

## Step 8: Fix Discrepancies

For each critical and major discrepancy:

1. Identify the affected CSS property
2. Get the correct value from the Figma design context (Step 2-3)
3. Update the implementation
4. Re-run `figma_check_design_parity` to verify the fix

Iterate until parity score ≥ 90 (or all critical/major issues resolved).

## Design Token Mapping

When the Figma component uses design tokens, map them to your project's token system:

```
Figma Variable Name          → CSS Custom Property
─────────────────────────────────────────────────────
color/background/primary     → --color-background-primary
color/text/primary           → --color-text-primary
spacing/component/padding-md → --spacing-component-padding-md
font-size/base               → --font-size-base
radius/md                    → --radius-md
```

If the project uses a different token system (e.g., Tailwind, Chakra UI, MUI), map accordingly:
```
Figma Variable              → Tailwind Class
─────────────────────────────────────────────
color/blue/600              → bg-blue-600
spacing/4 (16px)            → p-4
font-size/base (16px)       → text-base
radius/md (8px)             → rounded-md
```

## Accessibility Requirements

Always include accessibility attributes based on the Figma design:

```typescript
// Buttons
<button
  type="button"
  aria-label={ariaLabel || children}
  aria-disabled={disabled}
  disabled={disabled}
>

// Form inputs
<input
  id={id}
  aria-label={label}
  aria-describedby={errorId}
  aria-invalid={hasError}
/>

// Interactive elements
<div
  role="button"
  tabIndex={0}
  aria-pressed={isPressed}
  onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
/>
## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `get_design_context` returns empty | Node ID incorrect or file not accessible | Re-parse the Figma URL; verify fileKey and nodeId |
| `figma_deep_extract_component` fails | Desktop Bridge not connected | Activate Figma Console MCP Bridge plugin in Figma |
| `figma_check_design_parity` returns score 0 | `codeData` object is empty or malformed | Ensure codeData has at least 3 CSS properties |
| Parity score stuck below 90 after 3 iterations | Fundamental design mismatch | Review the Figma design context again; check if using correct node ID |
| Font not rendering correctly | Font not loaded in browser | Verify font is imported; check font-family name matches exactly |
| Design tokens not resolving | CSS custom properties not defined | Ensure token CSS file is imported in the component |

```

## Completion Checklist

Before marking the task complete:
- [ ] Design context extracted from Figma
- [ ] Deep component analysis completed
- [ ] Design tokens identified and mapped
- [ ] Screenshot taken as visual reference
- [ ] Component implemented with correct structure
- [ ] All variants/states implemented
- [ ] Design tokens used (not hardcoded values)
- [ ] Accessibility attributes added
- [ ] Parity validation run with score ≥ 90
- [ ] All critical and major discrepancies resolved
- [ ] Code is production-ready (TypeScript types, exports, etc.)
