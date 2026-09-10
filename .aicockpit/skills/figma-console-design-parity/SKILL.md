---
name: figma-console-design-parity
description: "Orchestrates design-code parity audits using figma_check_design_parity from the Figma Console MCP. Use when the user wants to compare a Figma design against code implementation, audit design drift, get a parity score, or identify and prioritize design-code discrepancies. Triggers: 'check design parity', 'audit design vs code', 'how close is the implementation to the design', 'find design drift', 'parity score', 'compare Figma to code', 'design implementation audit', 'check if code matches design'. Requires Figma Console MCP server connection."
disable-model-invocation: false
---

# figma-console-design-parity

Orchestrates design-code parity audits using `figma_check_design_parity` from the Figma Console MCP. Use when the user wants to compare a Figma design against code implementation, audit design drift, get a parity score, or identify and prioritize design-code discrepancies.

**Triggers**: 'check design parity', 'audit design vs code', 'how close is the implementation to the design', 'find design drift', 'parity score', 'compare Figma to code', 'design implementation audit', 'check if code matches design'.

**Requires**: Figma Console MCP (`figma-console-mcp`) connection.

## MCP Requirements

This skill uses **Figma Console MCP** exclusively:
- `figma_check_design_parity` — Compare Figma design specs against code implementation
- `figma_deep_extract_component` — Get detailed component specs for comparison
- `figma_get_design_system_kit` — Get design system context

## What is Design Parity?

Design parity measures how closely a code implementation matches its Figma design specification. The `figma_check_design_parity` tool compares:

1. **Visual** — Colors, fills, gradients, opacity
2. **Spacing** — Padding, margin, gap, itemSpacing
3. **Typography** — Font family, size, weight, line height, letter spacing
4. **Tokens** — Whether design tokens are used vs hardcoded values
5. **Component API** — Props, variants, states match Figma component properties
6. **Accessibility** — ARIA attributes, contrast ratios, focus indicators
7. **Naming** — Component and prop names match design system conventions
8. **Metadata** — Documentation, descriptions, annotations

## Workflow

### Step 1: Gather Inputs

Collect from the user:
1. **Figma node URL or ID** — The component/frame to audit
2. **Code implementation** — The CSS/styles from the code side

Parse the Figma URL:
```
URL: https://www.figma.com/file/ABC123/Design?node-id=1%3A234
fileKey: ABC123
nodeId: 1:234
```

### Step 2: Extract Code Data

From the user's code implementation, extract the style properties as a structured object:

```json
{
  "backgroundColor": "#2563EB",
  "color": "#FFFFFF",
  "padding": "10px 20px",
  "borderRadius": "8px",
  "fontSize": "14px",
  "fontWeight": "500",
  "fontFamily": "Inter, sans-serif",
  "lineHeight": "1.5",
  "display": "flex",
  "alignItems": "center",
  "justifyContent": "center",
  "gap": "8px",
  "border": "none",
  "boxShadow": "0 1px 2px rgba(0,0,0,0.05)"
}
```

If the user provides React/TypeScript code, extract the computed styles. If they provide CSS, parse the properties directly.

### Step 3: Get Figma Component Context (Optional but Recommended)

Before running the parity check, get the full component spec:

```
figma_deep_extract_component(nodeId, fileKey, depth=2)
```

This gives you the expected values to compare against, helping you understand what the parity check will evaluate.

### Step 4: Run Parity Check

```
figma_check_design_parity(nodeId, codeData, fileKey)
```

Parameters:
- `nodeId` — The Figma node to compare against
- `codeData` — The extracted style object from Step 2
- `fileKey` — The Figma file key

### Step 5: Interpret the Parity Score

| Score | Grade | Status | Recommended Action |
|-------|-------|--------|-------------------|
| 95-100 | A+ | ✅ Perfect | Ship it |
| 90-94 | A | ✅ Ship-ready | Minor polish optional |
| 80-89 | B | ⚠️ Good | Fix minor issues |
| 70-79 | C | ⚠️ Acceptable | Fix major issues before shipping |
| 60-69 | D | 🔶 Poor | Significant rework needed |
| < 60 | F | ❌ Failing | Major rework required |

### Step 6: Triage Discrepancies

Organize discrepancies by severity:

**Critical (must fix)**:
- Wrong color (e.g., using `#FF0000` instead of `#2563EB`)
- Broken layout (wrong flex direction, missing padding)
- Missing accessibility attributes
- Wrong font size (>2px difference)

**Major (should fix)**:
- Wrong spacing (>4px difference)
- Missing component variant
- Wrong font weight
- Hardcoded values instead of design tokens

**Minor (nice to fix)**:
- Slightly off border radius (1-2px difference)
- Minor color shade difference
- Missing hover state

**Info (informational)**:
- Naming suggestions
- Documentation improvements
- Token usage recommendations

### Step 7: Generate Fix Plan

For each critical and major discrepancy, generate a specific fix:

```
Discrepancy: backgroundColor mismatch
  Figma value: #2563EB (color/background/primary token)
  Code value:  #1D4ED8
  Fix: Change background to #2563EB or use var(--color-background-primary)
  
Discrepancy: padding mismatch
  Figma value: paddingTop=10, paddingBottom=10, paddingLeft=20, paddingRight=20
  Code value:  padding: 8px 16px
  Fix: Change padding to 10px 20px or use var(--spacing-component-padding-md)
  
Discrepancy: Missing aria-label
  Figma annotation: Button requires aria-label for icon-only variants
  Fix: Add aria-label={label || 'Button'} to the button element
```

### Step 8: Re-Validate After Fixes

After the user applies fixes, re-run the parity check:

```
figma_check_design_parity(nodeId, updatedCodeData, fileKey)
```

Track score improvement:
```
Iteration 1: Score 72 (8 discrepancies: 2 critical, 3 major, 2 minor, 1 info)
Iteration 2: Score 88 (3 discrepancies: 0 critical, 1 major, 1 minor, 1 info)
Iteration 3: Score 95 (1 discrepancy: 0 critical, 0 major, 1 minor, 0 info)
→ Ship-ready ✅
```

## Comparator Reference

### Visual Comparator
Checks: fill colors, stroke colors, opacity, gradients, shadows
Common issues: Wrong hex values, missing opacity, wrong shadow blur

### Spacing Comparator
Checks: paddingTop/Bottom/Left/Right, itemSpacing (gap), margin
Common issues: Off-by-4px (using 8px instead of 12px), missing gap

### Typography Comparator
Checks: fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, textAlign
Common issues: Wrong font weight (400 vs 500), wrong line height

### Token Comparator
Checks: Whether hardcoded values match design token values; whether tokens are used
Common issues: Hardcoded `#2563EB` instead of `var(--color-background-primary)`

### Component API Comparator
Checks: Props match Figma component properties; all variants implemented
Common issues: Missing `disabled` state, wrong variant names

### Accessibility Comparator
Checks: ARIA attributes, color contrast ratios, focus indicators, touch targets
Common issues: Missing `aria-label`, insufficient contrast ratio

### Naming Comparator
Checks: Component name matches Figma component name; prop names match property names
Common issues: `ButtonPrimary` instead of `Button` with `variant="primary"`

### Metadata Comparator
Checks: JSDoc comments, prop descriptions, component documentation
Common issues: Missing prop descriptions, no component documentation

## Output Format

Present the parity audit results as:

```
## Design Parity Audit: [Component Name]

**Parity Score: [score]/100** ([grade])

### Summary
- Critical issues: [count]
- Major issues: [count]  
- Minor issues: [count]
- Info: [count]

### Critical Issues (Must Fix)
1. [Issue description]
   - Figma: [expected value]
   - Code: [actual value]
   - Fix: [specific fix]

### Major Issues (Should Fix)
...

### Minor Issues (Optional)
...

### Recommended Next Steps
1. [Prioritized fix list]
```

## Completion Checklist

- [ ] Figma node ID and file key obtained
- [ ] Code style data extracted from implementation
- [ ] `figma_check_design_parity` called successfully
- [ ] Parity score interpreted and communicated
- [ ] Discrepancies triaged by severity
- [ ] Fix plan generated for critical and major issues
- [ ] Re-validation run after fixes (if applicable)
- [ ] Final score ≥ 90 before marking complete