---
name: figma-generate-library
description: "Build or update a professional-grade design system in Figma from a codebase. Use when the user wants to create variables/tokens, build component libraries, set up theming (light/dark modes), document foundations, or reconcile gaps between code and Figma. Triggers: 'build design system in Figma', 'create design tokens', 'set up variables', 'create component library', 'build theme', 'create light/dark mode', 'sync design system to Figma', 'generate Figma library from code'."
disable-model-invocation: false
---

# figma-generate-library

Build or update a professional-grade design system in Figma from a codebase. Use when the user wants to create variables/tokens, build component libraries, set up theming (light/dark modes), document foundations, or reconcile gaps between code and Figma.

**Triggers**: 'build design system in Figma', 'create design tokens', 'set up variables', 'create component library', 'build theme', 'create light/dark mode', 'sync design system to Figma', 'generate Figma library from code'.

## MCP Requirements

This skill uses **Figma Console MCP** as the primary server:
- **Figma Console MCP** (`figma-console-mcp`) — All token/variable creation, component building, batch operations
- **Figma Official MCP** (`figma-windows-cmd`) — `get_screenshot` for visual verification only

**Load `figma-use` skill first** — it provides setup verification and the complete tool reference.

## Why Console MCP for Library Building

Console MCP's batch tools make library building dramatically faster:
- `figma_batch_create_variables` — Create 10-50 variables in ONE call (vs 50 individual calls)
- `figma_batch_update_variables` — Update 10-50 variables in ONE call
- `figma_setup_design_tokens` — Full token setup (collections + variables) in ONE call
- `figma_arrange_component_set` — Auto-arrange all variants in a grid in ONE call

## Workflow Overview

```
Phase 1: Audit & Plan          → figma_get_design_system_kit (discover existing)
Phase 2: Token Foundation      → figma_setup_design_tokens OR batch create
Phase 3: Semantic Tokens       → figma_batch_create_variables (semantic layer)
Phase 4: Component Building    → figma_create_frame + figma_instantiate_component
Phase 5: Variant Organization  → figma_arrange_component_set
Phase 6: Documentation         → figma_generate_component_doc (Console MCP)
Phase 7: Verification          → get_screenshot (Official MCP)
```

## Phase 1: Audit & Plan

### Step 1.1 — Discover Existing Design System
```
figma_get_design_system_kit(fileKey, 'full')
```

Analyze the response to identify:
- Existing variable collections (avoid duplicates)
- Existing components (avoid recreating)
- Missing tokens (gaps to fill)
- Naming conventions in use

### Step 1.2 — Initialize State Ledger
```
## Library Build State Ledger
- File: [fileKey]
- Existing Collections: [list]
- Existing Components: [count]
- Collections to Create: [list]
- Components to Build: [list]
- Phase: 1 - Audit
```

### Step 1.3 — Plan Token Architecture
Design the token hierarchy before creating:
```
Primitives (raw values)
  └── Colors: color/blue/100, color/blue/200, ... color/blue/900
  └── Spacing: spacing/1 (4px), spacing/2 (8px), ... spacing/16 (64px)
  └── Typography: font-size/xs (12px), font-size/sm (14px), ...
  └── Radius: radius/sm (4px), radius/md (8px), radius/lg (16px)

Semantic (purpose-based, reference primitives)
  └── color/background/primary → color/blue/600
  └── color/text/primary → color/gray/900
  └── color/border/default → color/gray/200
  └── spacing/component/padding → spacing/4

Component (component-specific, reference semantic)
  └── button/background → color/background/primary
  └── button/text → color/text/inverse
  └── button/padding-x → spacing/component/padding
```

## Phase 2: Token Foundation (Primitive Tokens)

### Option A: Full Setup in One Call
```
figma_setup_design_tokens({
  collections: [
    {
      name: "Primitives",
      modes: ["Value"],
      variables: [
        { name: "color/blue/100", type: "COLOR", values: { Value: "#EFF6FF" } },
        { name: "color/blue/200", type: "COLOR", values: { Value: "#DBEAFE" } },
        { name: "color/blue/500", type: "COLOR", values: { Value: "#3B82F6" } },
        { name: "color/blue/600", type: "COLOR", values: { Value: "#2563EB" } },
        { name: "color/blue/900", type: "COLOR", values: { Value: "#1E3A8A" } },
        { name: "spacing/1", type: "FLOAT", values: { Value: 4 } },
        { name: "spacing/2", type: "FLOAT", values: { Value: 8 } },
        { name: "spacing/4", type: "FLOAT", values: { Value: 16 } },
        { name: "spacing/8", type: "FLOAT", values: { Value: 32 } }
      ]
    }
  ]
})
```

### Option B: Batch Create (for large token sets)
```
Step 2.1: Create collection
  figma_create_variable_collection("Primitives", ["Value"])
  → get collectionId

Step 2.2: Batch create color tokens (up to 50 per call)
  figma_batch_create_variables(collectionId, [
    { name: "color/blue/100", type: "COLOR", values: { Value: "#EFF6FF" } },
    { name: "color/blue/200", type: "COLOR", values: { Value: "#DBEAFE" } },
    ... (up to 50 per batch)
  ])

Step 2.3: Batch create spacing tokens
  figma_batch_create_variables(collectionId, [
    { name: "spacing/1", type: "FLOAT", values: { Value: 4 } },
    { name: "spacing/2", type: "FLOAT", values: { Value: 8 } },
    ...
  ])

Step 2.4: Batch create typography tokens
  figma_batch_create_variables(collectionId, [
    { name: "font-size/xs", type: "FLOAT", values: { Value: 12 } },
    { name: "font-size/sm", type: "FLOAT", values: { Value: 14 } },
    { name: "font-size/base", type: "FLOAT", values: { Value: 16 } },
    { name: "font-size/lg", type: "FLOAT", values: { Value: 18 } },
    { name: "font-size/xl", type: "FLOAT", values: { Value: 20 } },
    { name: "font-size/2xl", type: "FLOAT", values: { Value: 24 } },
    ...
  ])
```

**CRITICAL**: Always use `figma_batch_create_variables` for 2+ variables. Never use individual `figma_create_variable` calls in a loop.

## Phase 3: Semantic Tokens (Theme Layer)

Create semantic tokens that reference primitives and support theming:

```
Step 3.1: Create semantic collection with modes
  figma_create_variable_collection("Semantic", ["Light", "Dark"])
  → get semanticCollectionId

Step 3.2: Batch create semantic color tokens
  figma_batch_create_variables(semanticCollectionId, [
    {
      name: "color/background/primary",
      type: "COLOR",
      values: {
        Light: { variableAlias: "color/blue/600" },  ← reference primitive
        Dark: { variableAlias: "color/blue/400" }
      }
    },
    {
      name: "color/background/surface",
      type: "COLOR",
      values: {
        Light: "#FFFFFF",
        Dark: "#1A1A2E"
      }
    },
    {
      name: "color/text/primary",
      type: "COLOR",
      values: {
        Light: { variableAlias: "color/gray/900" },
        Dark: { variableAlias: "color/gray/100" }
      }
    },
    {
      name: "color/border/default",
      type: "COLOR",
      values: {
        Light: { variableAlias: "color/gray/200" },
        Dark: { variableAlias: "color/gray/700" }
      }
    }
  ])

Step 3.3: Batch create semantic spacing tokens
  figma_batch_create_variables(semanticCollectionId, [
    { name: "spacing/component/padding-sm", type: "FLOAT", values: { Light: 8, Dark: 8 } },
    { name: "spacing/component/padding-md", type: "FLOAT", values: { Light: 16, Dark: 16 } },
    { name: "spacing/component/padding-lg", type: "FLOAT", values: { Light: 24, Dark: 24 } },
    { name: "spacing/layout/section", type: "FLOAT", values: { Light: 64, Dark: 64 } }
  ])
```

## Phase 4: Component Building

Build components using the token system:

### Button Component Pattern
```
Step 4.1: Create component frame
  figma_create_frame("Button/Primary/Default", 120, 40)
  → get buttonFrameId

Step 4.2: Add label text
  figma_create_text("Label", buttonFrameId, 0, 0, 14)
  → get labelId

Step 4.3: Configure layout
  figma_update_node(buttonFrameId, {
    layoutMode: "HORIZONTAL",
    primaryAxisAlignItems: "CENTER",
    counterAxisAlignItems: "CENTER",
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 20,
    paddingRight: 20,
    cornerRadius: 8
  })

Step 4.4: Bind tokens
  figma_bind_variable(buttonFrameId, bgColorTokenId, "fills")
  figma_bind_variable(labelId, textColorTokenId, "fills")
  figma_bind_variable(buttonFrameId, paddingTokenId, "paddingTop")
  figma_bind_variable(buttonFrameId, paddingTokenId, "paddingBottom")

Step 4.5: Create variants (Secondary, Destructive, Ghost)
  → Repeat Steps 4.1-4.4 with different token bindings
```

### Input Component Pattern
```
Step 4.1: figma_create_frame("Input/Default", 280, 40)
Step 4.2: figma_create_text("Placeholder", inputId, 12, 0, 14)
Step 4.3: figma_update_node(inputId, {
  layoutMode: "HORIZONTAL",
  counterAxisAlignItems: "CENTER",
  paddingLeft: 12,
  paddingRight: 12,
  cornerRadius: 6,
  strokeWeight: 1
})
Step 4.4: figma_bind_variable(inputId, borderColorTokenId, "strokes")
Step 4.5: figma_bind_variable(inputId, bgTokenId, "fills")
```

### Card Component Pattern
```
Step 4.1: figma_create_frame("Card/Default", 320, 200)
Step 4.2: figma_create_rectangle(320, 160, cardId, 0, 0)  ← image placeholder
Step 4.3: figma_create_text("Card Title", cardId, 16, 168, 16)
Step 4.4: figma_create_text("Card description text", cardId, 16, 192, 14)
Step 4.5: figma_update_node(cardId, {
  layoutMode: "VERTICAL",
  itemSpacing: 8,
  paddingBottom: 16,
  cornerRadius: 12
})
Step 4.6: figma_bind_variable(cardId, surfaceColorId, "fills")
Step 4.7: figma_bind_variable(cardId, borderColorId, "strokes")
```

## Phase 5: Variant Organization

After creating all component variants, organize them into component sets:

```
Step 5.1: Group variants
  figma_group_nodes([buttonDefaultId, buttonHoverId, buttonDisabledId])

Step 5.2: Arrange component set grid
  figma_arrange_component_set(componentSetId, columns=3, padding=40)
```

This auto-arranges all variants in a clean grid layout.

## Phase 6: Component Documentation

Generate documentation for each component:

```
figma_generate_component_doc(componentId, fileKey, includeCode=true)
```

This generates:
- Component anatomy diagram description
- Variant table (all properties and values)
- Design token references
- Typography specifications
- Accessibility notes
- Usage guidelines

Save the generated documentation to `docs/components/[ComponentName].md`.

## Phase 7: Verification

Take screenshots of completed components:

```
get_screenshot(componentSetId)   → verify all variants render correctly
get_screenshot(tokenPageId)      → verify token documentation page
```

Review for:
- Token bindings applied correctly (colors match theme)
- Variant grid organized cleanly
- Component properties set correctly
- Typography renders with correct fonts

## Token Naming Conventions

### Color Tokens
```
Primitives:  color/{hue}/{shade}     → color/blue/500, color/gray/100
Semantic:    color/{role}/{variant}  → color/background/primary, color/text/secondary
Component:   {component}/{property} → button/background, input/border
```

### Spacing Tokens
```
Primitives:  spacing/{scale}         → spacing/1 (4px), spacing/4 (16px)
Semantic:    spacing/{context}/{size} → spacing/component/padding-md
```

### Typography Tokens
```
font-size/{scale}    → font-size/sm, font-size/base, font-size/xl
font-weight/{name}   → font-weight/regular, font-weight/medium, font-weight/bold
line-height/{scale}  → line-height/tight, line-height/normal, line-height/relaxed
```

## Batch Size Guidelines

| Token Count | Strategy |
|-------------|----------|
| 1-2 tokens | `figma_create_variable` (single) |
| 3-50 tokens | `figma_batch_create_variables` (one call) |
| 51-100 tokens | Two `figma_batch_create_variables` calls (50 each) |
| 100+ tokens | Multiple batches of 50, organized by category |
| Full token system | `figma_setup_design_tokens` (all collections at once) |

## Error Handling

| Issue | Fix |
|-------|-----|
| Duplicate variable names | Use `figma_get_local_variables()` to check existing names before creating |
| Variable alias not resolving | Ensure referenced variable exists in the same or linked collection |
| Component set not forming | Ensure all variants have matching property names |
| Batch limit exceeded | Split into multiple calls of ≤50 variables each |
| Token binding fails | Use `figma_get_variable_collections()` to verify collection and variable IDs |

## Completion Checklist

Before marking the task complete:
- [ ] Primitive token collection created with all base values
- [ ] Semantic token collection created with light/dark mode values
- [ ] All semantic tokens reference primitives (not hardcoded values)
- [ ] Components built using semantic tokens (not hardcoded colors)
- [ ] Component variants organized in component sets
- [ ] Component sets arranged with `figma_arrange_component_set`
- [ ] Documentation generated for key components
- [ ] Screenshots taken and verified
- [ ] State ledger shows all phases completed
