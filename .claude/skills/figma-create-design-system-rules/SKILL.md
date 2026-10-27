---
name: figma-create-design-system-rules
description: "Generates custom design system rules for the user's codebase from a Figma file. Use when user says 'create design system rules', 'generate rules for my project', 'set up design rules', 'customize design system guidelines', or wants to establish project-specific conventions for Figma-to-code workflows. Triggers: 'create design system rules', 'generate rules for my project', 'set up design rules', 'generate AI rules from Figma', 'create CLAUDE.md from design system'."
disable-model-invocation: false
---

# figma-create-design-system-rules

Generates custom design system rules for the user's codebase from a Figma file. Use when user says "create design system rules", "generate rules for my project", "set up design rules", "customize design system guidelines", or wants to establish project-specific conventions for Figma-to-code workflows.

**Triggers**: 'create design system rules', 'generate rules for my project', 'set up design rules', 'customize design system guidelines', 'generate AI rules from Figma', 'create CLAUDE.md from design system'.

**Requires**: Figma Official MCP (`figma-windows-cmd`) connection.

## MCP Requirements

This skill uses **Figma Official MCP** exclusively:
- `create_design_system_rules` — Generates AI-readable rules from a Figma design system file

The Figma Console MCP is NOT required for this skill.

## Workflow

### Step 1: Get the Figma File Key
Parse the Figma URL or ask the user for the design system file key.

```
URL: https://www.figma.com/file/ABC123/Design-System
fileKey: ABC123
```

### Step 2: Generate Design System Rules
```
create_design_system_rules(fileKey, outputFormat?)
```

Supported output formats:
- `claude` → CLAUDE.md format (for Claude Code)
- `cursor` → .cursorrules format (for Cursor IDE)
- `agents` → AGENTS.md format (for OpenAI Codex/Agents)
- `generic` → Generic markdown rules

### Step 3: Review Generated Rules
The tool generates rules covering:
- Component naming conventions from the design system
- Design token usage patterns
- Color and typography guidelines
- Spacing and layout conventions
- Component variant patterns
- Accessibility requirements from the design

### Step 4: Save Rules to Project
Save the generated rules to the appropriate file in the user's project:

| Format | File Location |
|--------|--------------|
| claude | `CLAUDE.md` (project root) |
| cursor | `.cursorrules` (project root) |
| agents | `AGENTS.md` (project root) |
| generic | `docs/design-system-rules.md` |

### Step 5: Augment with Console MCP Context (Optional)
If Figma Console MCP is also connected, enhance the rules with additional context:

```
figma_get_design_system_kit(fileKey, 'full')
```

Use the kit data to add:
- Complete token value reference
- Component property documentation
- Variable collection structure

## Output Format

The generated rules file should include:
1. **Design Token Reference** — All token names and their values
2. **Component Naming** — How components are named in the design system
3. **Variant Patterns** — How variants are structured (e.g., `variant/size/state`)
4. **Color Usage** — Semantic color token usage guidelines
5. **Typography Scale** — Font size and weight conventions
6. **Spacing System** — Spacing token usage patterns
7. **Do/Don't Rules** — Specific rules for AI code generation

## Example Output (CLAUDE.md section)

```markdown
## Design System Rules

### Color Tokens
- ALWAYS use semantic color tokens, never hardcoded hex values
- Primary actions: `--color-background-primary` (#2563EB)
- Text: `--color-text-primary` (#111827), `--color-text-secondary` (#6B7280)
- Backgrounds: `--color-surface-default` (#FFFFFF), `--color-surface-subtle` (#F9FAFB)

### Component Naming
- Components follow PascalCase: `Button`, `InputField`, `CardContainer`
- Variants use kebab-case props: `variant="primary"`, `size="md"`
- States: `disabled`, `loading`, `error`, `success`

### Spacing
- Use spacing tokens: `--spacing-1` (4px) through `--spacing-16` (64px)
- Component padding: `--spacing-component-padding-md` (16px)
- Section spacing: `--spacing-layout-section` (64px)
```
## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| "File not found" | Invalid fileKey | Re-parse the Figma URL to get the correct fileKey |
| "Insufficient permissions" | Token lacks read access | Generate a new token with `file:read` scope |
| "No design system found" | File has no variables/styles | Ensure the file has design tokens or styles defined |
| "Output format not supported" | Invalid outputFormat value | Use one of: `claude`, `cursor`, `agents`, `generic` |


## Completion Checklist

- [ ] Figma file key obtained
- [ ] `create_design_system_rules` called with correct format
- [ ] Rules reviewed for completeness
- [ ] Rules saved to correct file in project
- [ ] User notified of the output file location
