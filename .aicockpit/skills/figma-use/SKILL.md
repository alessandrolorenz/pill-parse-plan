---
name: figma-use
description: "**MANDATORY prerequisite** — you MUST invoke this skill BEFORE every Figma canvas write or complex read operation. NEVER call Figma MCP tools directly without loading this skill first. Skipping it causes common, hard-to-debug failures. Trigger whenever the user wants to perform a write action or a unique read action that requires JavaScript execution in the Figma file context — e.g. create/edit/delete nodes, set up variables or tokens, build components and variants, modify auto-layout or fills, bind variables to properties, or inspect file structure programmatically. Also triggers when user needs to choose between Figma Console MCP and Figma Official MCP tools."
disable-model-invocation: false
---

# figma-use

**MANDATORY prerequisite** — you MUST invoke this skill BEFORE every Figma canvas write or complex read operation. NEVER call Figma MCP tools directly without loading this skill first. Skipping it causes common, hard-to-debug failures.

## When to Activate This Skill

Trigger whenever the user wants to perform a write action or a unique read action that requires JavaScript execution in the Figma file context — e.g. create/edit/delete nodes, set up variables or tokens, build components and variants, modify auto-layout or fills, bind variables to properties, or inspect file structure programmatically.

## MCP Tool Selection: Console MCP First

This skill supports **two Figma MCP servers** that can coexist:
- **Figma Console MCP** (`figma-console-mcp`) — 94+ purpose-built tools with Zod-validated parameters. **Preferred for all write operations.**
- **Figma Official MCP** (`figma-windows-cmd`) — 11 tools including `use_figma` (raw JS executor), `get_screenshot`, `generate_figma_design`, `create_new_file`, `whoami`, Code Connect tools.

### Decision Rule: Which MCP to Use

```
Need to create/update/delete nodes?          → Console MCP purpose-built tools
Need to create variables or tokens?          → Console MCP figma_batch_create_variables
Need to bind variables to properties?        → Console MCP figma_bind_variable
Need to instantiate components?              → Console MCP figma_instantiate_component
Need design system data?                     → Console MCP figma_get_design_system_kit
Need a screenshot?                           → Official MCP get_screenshot
Need AI design generation?                   → Official MCP generate_figma_design
Need to create a new file?                   → Official MCP create_new_file (use figma-create-new-file skill)
Need Code Connect?                           → Official MCP tools (use figma-code-connect skill)
Need design system rules?                    → Official MCP create_design_system_rules
Need a complex custom operation?             → Console MCP figma_execute (escape hatch)
```

## Setup Requirements

### Prerequisites (VERIFY BEFORE PROCEEDING)

1. **Figma Desktop app** must be running
2. **Figma Desktop Bridge plugin** must be installed and active in Figma
   - Install from: Figma Community → search "Figma Console MCP Bridge"
   - Activate: Plugins menu → Development → Figma Console MCP Bridge → Run
3. **Console MCP server** must be configured:
   ```json
   {
     "mcpServers": {
       "figma-console": {
         "command": "npx",
         "args": ["figma-console-mcp"],
         "env": {
           "FIGMA_ACCESS_TOKEN": "your-token-here"
         }
       }
     }
   }
   ```
4. **FIGMA_ACCESS_TOKEN** environment variable must be set (get from Figma → Settings → Personal Access Tokens)

### Verify Connection
Before any write operation, verify the Desktop Bridge is connected:
- Call `figma_get_selection` — if it returns without error, the bridge is active
- If it fails, remind the user to activate the Desktop Bridge plugin in Figma

## Console MCP Tool Reference

### Node Creation Tools
```
figma_create_frame(name, width, height, parentId?, x?, y?)
figma_create_text(content, parentId?, x?, y?, fontSize?, fontFamily?)
figma_create_rectangle(width, height, parentId?, x?, y?, fills?)
figma_group_nodes(nodeIds[], parentId?)
figma_ungroup_nodes(nodeId)
```

### Node Manipulation Tools
```
figma_update_node(nodeId, properties{})
figma_delete_node(nodeId)
figma_move_node(nodeId, x, y)
figma_resize_node(nodeId, width, height)
figma_navigate_to(nodeId)
```

### Variable & Token Tools (PREFER BATCH)
```
figma_create_variable_collection(name, modes[])
figma_batch_create_variables(collectionId, variables[])   ← USE THIS (10-50x faster)
figma_batch_update_variables(updates[])                   ← USE THIS (10-50x faster)
figma_create_variable(collectionId, name, type, values{}) ← only for single variables
figma_update_variable(variableId, updates{})
figma_delete_variable(variableId)
figma_setup_design_tokens(tokens{})                       ← full token setup in one call
figma_bind_variable(nodeId, variableId, property)
figma_get_local_variables(fileKey?)
figma_get_variable_collections(fileKey?)
```

### Component Tools
```
figma_instantiate_component(componentId, parentId?, x?, y?)
figma_set_component_property(nodeId, property, value)
figma_get_component_properties(nodeId)
figma_detach_instance(nodeId)
figma_arrange_component_set(componentSetId, columns?, padding?)
```

### Design System Read Tools
```
figma_get_design_system_kit(fileKey, compressionLevel?)   ← REPLACES search_design_system + use_figma inspection
figma_get_file(fileKey, depth?)
figma_get_node(fileKey, nodeId)
figma_get_nodes(fileKey, nodeIds[])
figma_get_components(fileKey)
figma_get_styles(fileKey)
figma_search_nodes(fileKey, query, nodeType?)
figma_get_selection()
```

### Escape Hatch (Last Resort)
```
figma_execute(code)   ← Use ONLY when no purpose-built tool exists
```

## Workflow

### Step 1: Identify the Operation
Determine what the user wants to do and select the appropriate Console MCP tool(s).

**IMPORTANT**: Always prefer purpose-built Console MCP tools over `figma_execute`. Only use `figma_execute` when no purpose-built tool covers the operation.

### Step 2: Gather Context (if needed)
If you need to know the current file structure:
```
figma_get_file(fileKey)          → file overview, pages, top-level nodes
figma_get_selection()            → currently selected nodes
figma_get_design_system_kit(fileKey, 'inventory')  → design system overview
```

### Step 3: Execute the Operation
Use the appropriate Console MCP tool with validated parameters.

**Variable/Token Creation Pattern (ALWAYS use batch):**
```
1. figma_create_variable_collection(name, modes)  → get collectionId
2. figma_batch_create_variables(collectionId, [
     { name: "color/primary", type: "COLOR", values: { Light: "#0066FF", Dark: "#4D9FFF" } },
     { name: "color/secondary", type: "COLOR", values: { Light: "#6B21A8", Dark: "#A855F7" } },
     ... up to 50 variables per call
   ])
```

**Component Instantiation Pattern:**
```
1. figma_get_design_system_kit(fileKey, 'inventory')  → find component IDs
2. figma_instantiate_component(componentId, parentId, x, y)
3. figma_set_component_property(nodeId, property, value)  → configure props
```

**Frame + Content Pattern:**
```
1. figma_create_frame(name, width, height, parentId)  → get frameId
2. figma_create_text(content, frameId, x, y)
3. figma_create_rectangle(width, height, frameId, x, y, fills)
4. figma_update_node(nodeId, { layoutMode: "VERTICAL", itemSpacing: 16 })
```

### Step 4: Verify the Result
After write operations, verify success:
```
figma_get_node(fileKey, nodeId)   → confirm node was created/updated
figma_navigate_to(nodeId)         → navigate to the result in Figma
```

For visual verification, use Official MCP:
```
get_screenshot(nodeId)   → capture screenshot of the result
```

### Step 5: Handle Errors
If a Console MCP tool fails:
1. Check if the Desktop Bridge plugin is active (`figma_get_selection`)
2. Verify the fileKey is correct (`figma_get_file`)
3. If the operation is complex and no purpose-built tool exists, fall back to `figma_execute`:
   ```
   figma_execute("
     const frame = figma.createFrame();
     frame.name = 'My Frame';
     frame.resize(400, 300);
     figma.currentPage.appendChild(frame);
   ")
   ```

## State Ledger

Maintain a state ledger throughout multi-step operations:

```
## Figma State Ledger
- File: [fileKey]
- Active Page: [pageName] ([pageId])
- Created Nodes: [nodeId → name]
- Variable Collections: [collectionId → name]
- Variables Created: [count]
- Last Operation: [tool name + result]
```

## Common Patterns

### Pattern: Create Design Tokens
```
1. figma_create_variable_collection("Primitives", ["Light", "Dark"])
2. figma_batch_create_variables(collectionId, colorTokens)    ← batch all colors
3. figma_batch_create_variables(collectionId, spacingTokens)  ← batch all spacing
4. figma_batch_create_variables(collectionId, typographyTokens)
```

### Pattern: Build Component Variant
```
1. figma_create_frame("Button/Primary/Default", 120, 40)
2. figma_create_text("Label", frameId)
3. figma_update_node(frameId, { cornerRadius: 8, fills: [...] })
4. figma_bind_variable(frameId, colorVariableId, "fills")
```

### Pattern: Inspect Design System
```
1. figma_get_design_system_kit(fileKey, "summary")   → overview
2. figma_get_design_system_kit(fileKey, "full")      → complete data
3. figma_get_variable_collections()                  → variable structure
4. figma_get_local_variables()                       → all variables
```

### Pattern: Complex Custom Operation (Escape Hatch)
Only when no purpose-built tool exists:
```
figma_execute(`
  const nodes = figma.currentPage.findAll(n => n.type === 'COMPONENT');
  nodes.forEach(n => {
    n.setSharedPluginData('myPlugin', 'exported', 'true');
  });
  return { count: nodes.length };
`)
```

## Figma Plugin API Quick Reference (for figma_execute only)

```javascript
// Node creation
figma.createFrame()
figma.createText()
figma.createRectangle()
figma.createComponent()
figma.createComponentSet()

// Node access
figma.currentPage.children
figma.currentPage.findAll(predicate)
figma.getNodeById(id)

// Variable API
figma.variables.createVariableCollection(name)
figma.variables.createVariable(name, collectionId, type)
variable.setValueForMode(modeId, value)
node.setBoundVariable(field, variable)

// Layout
node.layoutMode = 'VERTICAL' | 'HORIZONTAL' | 'NONE'
node.primaryAxisAlignItems = 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN'
node.counterAxisAlignItems = 'MIN' | 'CENTER' | 'MAX'
node.itemSpacing = number
node.paddingTop/paddingBottom/paddingLeft/paddingRight = number

// Fills & Strokes
node.fills = [{ type: 'SOLID', color: { r, g, b }, opacity: 1 }]
node.strokes = [{ type: 'SOLID', color: { r, g, b } }]
node.strokeWeight = number

// Text
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
textNode.fontName = { family: 'Inter', style: 'Regular' }
textNode.fontSize = 16
textNode.characters = 'Hello World'

// Async operations (MUST use async/await in figma_execute)
async function main() {
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  // ... rest of code
}
main();
```

## Error Recovery

| Error | Cause | Fix |
|-------|-------|-----|
| "Desktop Bridge not connected" | Plugin not running | Activate Figma Console MCP Bridge plugin in Figma |
| "Node not found" | Wrong nodeId | Use `figma_get_file` to find correct IDs |
| "Variable collection not found" | Wrong collectionId | Use `figma_get_variable_collections` to list collections |
| "Font not loaded" | Font async issue | In `figma_execute`, use `await figma.loadFontAsync()` before setting text |
| "Cannot read property of null" | Node was deleted | Verify node exists with `figma_get_node` first |
| "Rate limit exceeded" | Too many API calls | Use batch tools (`figma_batch_create_variables`) to reduce call count |

## Coexistence with Official MCP

When both MCPs are connected, use them together:

```
Task: "Build a button component with design tokens and take a screenshot"

Step 1: figma_get_design_system_kit(fileKey, 'inventory')   [Console MCP - read]
Step 2: figma_create_frame("Button", 120, 40)               [Console MCP - write]
Step 3: figma_create_text("Label", frameId)                 [Console MCP - write]
Step 4: figma_bind_variable(frameId, colorVarId, "fills")   [Console MCP - write]
Step 5: get_screenshot(frameId)                             [Official MCP - screenshot]
```

## IMPORTANT CONSTRAINTS

1. **NEVER use `figma_execute` when a purpose-built Console MCP tool exists** — always prefer the purpose-built tool
2. **ALWAYS use batch tools** (`figma_batch_create_variables`, `figma_batch_update_variables`) when creating/updating 2+ variables
3. **ALWAYS verify the Desktop Bridge is connected** before write operations
4. **NEVER skip this skill** before calling any Figma MCP write tool
5. **State ledger is mandatory** for operations involving 3+ steps


## Completion Checklist

Before marking any Figma operation complete:
- [ ] Desktop Bridge connection verified (`figma_get_selection` returned without error)
- [ ] Correct MCP selected for each operation (Console MCP for writes, Official MCP for screenshots/generation)
- [ ] Batch tools used for 2+ variable operations (`figma_batch_create_variables` not individual calls)
- [ ] Purpose-built Console MCP tools used (not `figma_execute`) wherever available
- [ ] State ledger maintained for operations involving 3+ steps
- [ ] Result verified with `figma_get_node` or `get_screenshot` after write operations
- [ ] No hardcoded color/spacing values — design tokens used via `figma_bind_variable`
