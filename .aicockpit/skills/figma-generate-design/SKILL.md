---
name: figma-generate-design
description: "Use when the task involves translating an application page, view, or multi-section layout into Figma. Triggers: 'write to Figma', 'create in Figma from code', 'push page to Figma', 'take this app/page and build it in Figma', 'create a screen', 'build a landing page in Figma', 'update the Figma screen to match code'. This is the preferred workflow skill whenever the user wants to build or update a full page, screen, or view in Figma from code or a description."
disable-model-invocation: false
---

# figma-generate-design

Use this skill alongside `figma-use` when the task involves translating an application page, view, or multi-section layout into Figma. 

**Triggers**: 'write to Figma', 'create in Figma from code', 'push page to Figma', 'take this app/page and build it in Figma', 'create a screen', 'build a landing page in Figma', 'update the Figma screen to match code'.

This is the preferred workflow skill whenever the user wants to build or update a full page, screen, or view in Figma from code or a description.

## MCP Requirements

This skill uses **both** Figma MCP servers:
- **Figma Console MCP** (`figma-console-mcp`) — Primary: design system discovery, all canvas write operations
- **Figma Official MCP** (`figma-windows-cmd`) — Secondary: `generate_figma_design` (AI generation), `get_screenshot` (visual verification)

**Load `figma-use` skill first** — it provides the complete tool reference and setup verification.

## Workflow Overview

```
Phase 1: Design System Discovery    → figma_get_design_system_kit (Console MCP)
Phase 2: AI Design Generation       → generate_figma_design (Official MCP) [optional]
Phase 3: Section-by-Section Build   → Console MCP write tools
Phase 4: Token Binding              → figma_bind_variable (Console MCP)
Phase 5: Visual Verification        → get_screenshot (Official MCP)
```

## Phase 1: Design System Discovery

**Goal**: Discover all available design system components, variables, and styles before building.

### Step 1.1 — Get Design System Overview
```
figma_get_design_system_kit(fileKey, 'inventory')
```
Returns: component list, variable collections, style names — lightweight overview.

### Step 1.2 — Get Full Design System Data (if needed)
```
figma_get_design_system_kit(fileKey, 'full')
```
Returns: complete variable values, component properties, style definitions.

### Step 1.3 — Build Component Inventory
From the kit response, extract:
- **Component IDs** → for `figma_instantiate_component`
- **Variable IDs** → for `figma_bind_variable`
- **Color style IDs** → for fills and strokes
- **Text style IDs** → for typography

### Step 1.4 — State Ledger Initialization
```
## Design State Ledger
- File: [fileKey]
- Page: [pageName]
- Design System: [library file key if separate]
- Components Available: [list]
- Variable Collections: [list]
- Sections to Build: [list from user's layout]
- Sections Completed: []
```

## Phase 2: AI Design Generation (Optional)

If the user wants AI-assisted layout generation:
```
generate_figma_design(prompt, fileKey, nodeId?)
```

Use this to:
- Generate initial layout structure from a text description
- Create placeholder content that will be replaced with real components
- Establish responsive grid and spacing

After generation, use `figma_get_file` to discover the generated node IDs for Phase 3.

## Phase 3: Section-by-Section Build

Build the screen incrementally, one section at a time. **Never attempt to build the entire screen in one operation.**

### Section Build Pattern

For each section of the layout:

```
Step A: Create section frame
  figma_create_frame(sectionName, width, height, pageId, x, y)
  → get sectionFrameId

Step B: Add content to section
  figma_instantiate_component(componentId, sectionFrameId, x, y)  ← use DS components
  figma_create_text(content, sectionFrameId, x, y, fontSize)
  figma_create_rectangle(width, height, sectionFrameId, x, y, fills)

Step C: Configure layout
  figma_update_node(sectionFrameId, {
    layoutMode: "VERTICAL",
    primaryAxisAlignItems: "MIN",
    counterAxisAlignItems: "MIN",
    itemSpacing: 24,
    paddingTop: 48,
    paddingBottom: 48,
    paddingLeft: 64,
    paddingRight: 64
  })

Step D: Set component properties
  figma_set_component_property(instanceId, "variant", "primary")
  figma_set_component_property(instanceId, "size", "large")
  figma_set_component_property(instanceId, "label", "Get Started")

Step E: Update state ledger
  → Mark section as completed
```

### Common Section Types

**Hero Section:**
```
1. figma_create_frame("Hero", 1440, 800, pageId)
2. figma_create_text(headline, heroId, 120, 200, 64)
3. figma_create_text(subheadline, heroId, 120, 290, 24)
4. figma_instantiate_component(buttonComponentId, heroId, 120, 380)
5. figma_update_node(heroId, { layoutMode: "NONE" })
```

**Navigation Bar:**
```
1. figma_create_frame("Nav", 1440, 72, pageId, 0, 0)
2. figma_instantiate_component(logoComponentId, navId, 24, 16)
3. figma_instantiate_component(navLinksComponentId, navId, 400, 16)
4. figma_instantiate_component(ctaButtonId, navId, 1300, 16)
5. figma_update_node(navId, { layoutMode: "HORIZONTAL", primaryAxisAlignItems: "SPACE_BETWEEN" })
```

**Card Grid:**
```
1. figma_create_frame("Cards Section", 1440, 600, pageId)
2. figma_create_frame("Card Grid", 1200, 500, cardsSectionId, 120, 50)
3. figma_update_node(cardGridId, { layoutMode: "HORIZONTAL", itemSpacing: 24, layoutWrap: "WRAP" })
4. for each card:
   figma_instantiate_component(cardComponentId, cardGridId)
   figma_set_component_property(cardId, "title", cardTitle)
   figma_set_component_property(cardId, "description", cardDesc)
```

**Form Section:**
```
1. figma_create_frame("Form", 600, 500, pageId)
2. figma_update_node(formId, { layoutMode: "VERTICAL", itemSpacing: 16 })
3. for each field:
   figma_instantiate_component(inputComponentId, formId)
   figma_set_component_property(inputId, "label", fieldLabel)
   figma_set_component_property(inputId, "placeholder", placeholder)
4. figma_instantiate_component(submitButtonId, formId)
```

## Phase 4: Token Binding

After building the structure, bind design tokens to nodes:

```
Step 4.1: Bind color tokens
  figma_bind_variable(nodeId, colorTokenId, "fills")
  figma_bind_variable(nodeId, strokeColorId, "strokes")

Step 4.2: Bind spacing tokens
  figma_bind_variable(frameId, spacingTokenId, "paddingTop")
  figma_bind_variable(frameId, spacingTokenId, "paddingBottom")
  figma_bind_variable(frameId, spacingTokenId, "itemSpacing")

Step 4.3: Bind typography tokens
  figma_bind_variable(textNodeId, fontSizeTokenId, "fontSize")
```

**Token Binding Priority:**
1. Color fills and backgrounds → bind to color tokens
2. Interactive states (hover, focus) → bind to semantic color tokens
3. Spacing and padding → bind to spacing tokens
4. Typography sizes → bind to typography tokens

## Phase 5: Visual Verification

After completing each major section, take a screenshot to verify:

```
get_screenshot(sectionFrameId)
```

Review the screenshot for:
- Layout correctness (spacing, alignment)
- Component rendering (correct variants, properties)
- Typography (correct sizes, weights)
- Color accuracy (correct token values)

If issues are found, use Console MCP tools to fix:
```
figma_update_node(nodeId, { property: correctedValue })
figma_move_node(nodeId, x, y)
figma_resize_node(nodeId, width, height)
```

## Design System Usage Rules

### ALWAYS use design system components when available
```
✅ figma_instantiate_component(buttonComponentId, parentId)
❌ figma_create_frame("Button", 120, 40)  ← don't recreate existing components
```

### ALWAYS use design tokens for colors and spacing
```
✅ figma_bind_variable(nodeId, colorTokenId, "fills")
❌ figma_update_node(nodeId, { fills: [{ type: "SOLID", color: { r: 0, g: 0.4, b: 1 } }] })
```

### Use compression levels appropriately
```
'inventory'  → quick overview, component/variable names and IDs only
'summary'    → component properties + variable values (recommended for most cases)
'full'       → complete data including all nested properties
'compact'    → minimal data for token-only operations
```

## Responsive Design Patterns

### Desktop (1440px)
```
figma_create_frame("Desktop", 1440, 900, pageId)
figma_update_node(frameId, { layoutMode: "VERTICAL" })
```

### Tablet (768px)
```
figma_create_frame("Tablet", 768, 1024, pageId, 1500, 0)
```

### Mobile (375px)
```
figma_create_frame("Mobile", 375, 812, pageId, 2400, 0)
```

## Error Handling

| Issue | Fix |
|-------|-----|
| Component not found in design system | Use `figma_get_design_system_kit(fileKey, 'full')` to get complete component list |
| Variable binding fails | Use `figma_get_local_variables()` to verify variable IDs |
| Layout looks wrong | Use `get_screenshot` to inspect, then `figma_update_node` to fix |
| Section too complex | Break into smaller sub-frames, build incrementally |
| Font not rendering | Use `figma_execute` with `await figma.loadFontAsync()` as fallback |

## Completion Checklist

Before marking the task complete:
- [ ] All sections from the layout are built
- [ ] Design system components used (not custom recreations)
- [ ] Design tokens bound to all color and spacing properties
- [ ] Final screenshot taken and reviewed
- [ ] State ledger shows all sections completed
- [ ] Node IDs documented for future reference
