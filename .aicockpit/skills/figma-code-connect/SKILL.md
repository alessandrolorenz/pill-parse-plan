---
name: figma-code-connect
description: "Creates and maintains Figma Code Connect template files that map Figma components to code snippets. Use when the user mentions Code Connect, Figma component mapping, design-to-code translation, or asks to create/update .figma.js files. Triggers: 'create code connect', 'set up code connect', 'map Figma components to code', 'create .figma.js files', 'update code connect', 'connect Figma to code'."
disable-model-invocation: false
---

# figma-code-connect

Creates and maintains Figma Code Connect template files that map Figma components to code snippets. Use when the user mentions Code Connect, Figma component mapping, design-to-code translation, or asks to create/update `.figma.js` files.

**Triggers**: 'create code connect', 'set up code connect', 'map Figma components to code', 'create .figma.js files', 'update code connect', 'connect Figma to code'.

**Requires**: Figma Official MCP (`figma-windows-cmd`) connection.

## MCP Requirements

This skill uses **Figma Official MCP** primarily:
- `get_code_connect_suggestions` — Get AI-generated Code Connect mapping suggestions
- `get_context_for_code_connect` — Get detailed component context for Code Connect

Optionally uses **Figma Console MCP** for enhanced component analysis:
- `figma_deep_extract_component` — Deep component structure analysis
- `figma_get_component_properties` — Get all component properties

## Workflow

### Step 1: Identify Components to Connect
Get the list of components that need Code Connect files:

```
get_code_connect_suggestions(fileKey, nodeIds?)
```

Returns suggestions for which components should have Code Connect files and what the mappings should look like.

### Step 2: Get Component Context
For each component, get detailed context:

```
get_context_for_code_connect(nodeId, fileKey)
```

Returns:
- Component name and description
- All properties (variant, boolean, text, instance swap)
- Property types and default values
- Nested component references

### Step 3: Enhanced Analysis (Optional — Console MCP)
For complex components, get deeper analysis:

```
figma_deep_extract_component(nodeId, fileKey, depth=3)
```

Use this to understand:
- Nested component structure
- Design token bindings
- All variant combinations

### Step 4: Generate Code Connect Files
Create `.figma.js` files for each component:

```javascript
// Button.figma.js
import figma from '@figma/code-connect';
import { Button } from './Button';

figma.connect(Button, 'https://www.figma.com/file/[fileKey]?node-id=[nodeId]', {
  props: {
    variant: figma.enum('Variant', {
      primary: 'primary',
      secondary: 'secondary',
      destructive: 'destructive',
    }),
    size: figma.enum('Size', {
      small: 'sm',
      medium: 'md',
      large: 'lg',
    }),
    disabled: figma.boolean('Disabled'),
    label: figma.string('Label'),
  },
  example: ({ variant, size, disabled, label }) => (
    <Button variant={variant} size={size} disabled={disabled}>
      {label}
    </Button>
  ),
});
```

### Step 5: Property Type Mapping

| Figma Property Type | Code Connect API | Example |
|--------------------|-----------------|---------|
| Variant (enum) | `figma.enum('PropName', { figmaValue: codeValue })` | `figma.enum('Variant', { Primary: 'primary' })` |
| Boolean | `figma.boolean('PropName')` | `figma.boolean('Disabled')` |
| Text | `figma.string('PropName')` | `figma.string('Label')` |
| Instance swap | `figma.instance('PropName')` | `figma.instance('Icon')` |
| Nested instance | `figma.nestedProps('LayerName', { ... })` | Complex nested components |

### Step 6: Validate and Save
Save each `.figma.js` file next to its corresponding component file:
```
src/components/Button/
  ├── Button.tsx
  ├── Button.module.css
  ├── Button.test.tsx
  └── Button.figma.js  ← Code Connect file
```

### Step 7: Publish Code Connect
After creating all files, publish to Figma:
```bash
npx @figma/code-connect publish
```

## File Structure Template

```javascript
// [ComponentName].figma.js
import figma from '@figma/code-connect';
import { ComponentName } from './ComponentName';

figma.connect(ComponentName, 'FIGMA_URL_HERE', {
  props: {
    // Map Figma properties to code props
  },
  example: (props) => (
    <ComponentName {...props} />
  ),
});
```

## Common Patterns

### Boolean Props
```javascript
props: {
  disabled: figma.boolean('Disabled'),
  loading: figma.boolean('Loading'),
  fullWidth: figma.boolean('Full Width'),
}
```

### Enum/Variant Props
```javascript
props: {
  variant: figma.enum('Variant', {
    'Primary': 'primary',
    'Secondary': 'secondary',
    'Ghost': 'ghost',
  }),
  size: figma.enum('Size', {
    'Small': 'sm',
    'Medium': 'md',
    'Large': 'lg',
  }),
}
```

### Text Content Props
```javascript
props: {
  label: figma.string('Label'),
  placeholder: figma.string('Placeholder'),
  helperText: figma.string('Helper Text'),
}
```

### Nested Components
```javascript
props: {
  icon: figma.instance('Icon'),
  badge: figma.nestedProps('Badge', {
    count: figma.string('Count'),
    visible: figma.boolean('Visible'),
  }),
}
```
## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| "No components found" | File has no published components | Ensure components are published in the Figma file |
| "Component context empty" | Node is not a component | Verify the nodeId points to a COMPONENT or COMPONENT_SET |
| "figma.connect() type error" | Wrong import or version | Ensure `@figma/code-connect` is installed: `npm install @figma/code-connect` |
| "Publish failed" | Authentication error | Run `npx @figma/code-connect auth` to re-authenticate |
| "Property not found" | Figma property name mismatch | Use exact property names from `get_context_for_code_connect` response |


## Completion Checklist

- [ ] Component list obtained from `get_code_connect_suggestions`
- [ ] Context gathered for each component
- [ ] `.figma.js` files created for all components
- [ ] All Figma properties mapped to code props
- [ ] Example usage written for each component
- [ ] Files saved next to component source files
- [ ] `npx @figma/code-connect publish` command provided to user
