---
name: figma-console-accessibility
description: "Runs a comprehensive accessibility audit combining Figma design-side linting, component accessibility auditing, and code-side axe-core scanning. Use when the user wants to audit accessibility, check WCAG compliance, find contrast issues, audit touch targets, or scan HTML for a11y violations. Triggers: 'accessibility audit', 'check a11y', 'WCAG compliance', 'contrast check', 'audit component accessibility', 'check accessibility', 'find a11y issues', 'WCAG 2.2 audit', 'scan for accessibility violations'. Requires Figma Console MCP server connection."
disable-model-invocation: false
---

# figma-console-accessibility

Runs a comprehensive accessibility audit combining Figma design-side linting, component accessibility auditing, and code-side axe-core scanning. Use when the user wants to audit accessibility, check WCAG compliance, find contrast issues, audit touch targets, or scan HTML for a11y violations.

**Triggers**: 'accessibility audit', 'check a11y', 'WCAG compliance', 'contrast check', 'audit component accessibility', 'check accessibility', 'find a11y issues', 'WCAG 2.2 audit', 'scan for accessibility violations'.

**Requires**: Figma Console MCP (`figma-console-mcp`) connection.

## MCP Requirements

This skill uses **Figma Console MCP** exclusively:
- `figma_lint_design` — WCAG 2.2 design-side lint (14 rules) via Desktop Bridge
- `figma_audit_component_accessibility` — Full component accessibility audit
- `figma_scan_code_accessibility` — axe-core scan of HTML (no Figma connection needed)

## Audit Scope Options

| Scope | Tools Used | When to Use |
|-------|-----------|-------------|
| Design-only | `figma_lint_design` | Auditing Figma designs before implementation |
| Component audit | `figma_audit_component_accessibility` | Deep audit of a specific component |
| Code-only | `figma_scan_code_accessibility` | Auditing HTML/code without Figma |
| Full-stack | All three tools | Complete design + code audit |

## Workflow

### Step 1: Determine Audit Scope

Ask the user (or infer from context):
- Do they have a Figma design to audit? → Use `figma_lint_design`
- Is it a specific component? → Also use `figma_audit_component_accessibility`
- Do they have HTML/code to audit? → Use `figma_scan_code_accessibility`
- Full audit? → Use all three

### Step 2: Design-Side Audit (Figma)

#### 2a: Design Lint (WCAG 2.2 Rules)
```
figma_lint_design(nodeId, fileKey?)
```

This checks 14 WCAG 2.2 design rules:

| Rule | WCAG Criterion | What It Checks |
|------|---------------|----------------|
| Color Contrast | 1.4.3 (AA) | Text contrast ratio ≥ 4.5:1 (normal), ≥ 3:1 (large) |
| Large Text Contrast | 1.4.3 (AA) | Large text (≥18pt or ≥14pt bold) contrast ≥ 3:1 |
| Non-text Contrast | 1.4.11 | UI components and graphics contrast ≥ 3:1 |
| Touch Target Size | 2.5.5 | Interactive elements ≥ 44×44px |
| Touch Target Spacing | 2.5.8 | Spacing between targets ≥ 24px |
| Focus Indicator | 2.4.11 | Focus indicators visible and sufficient |
| Text Resize | 1.4.4 | Text can be resized to 200% without loss |
| Text Spacing | 1.4.12 | Content works with custom text spacing |
| Reflow | 1.4.10 | Content reflows at 320px width |
| Animation | 2.3.3 | Animations can be disabled |
| Color Not Only | 1.4.1 | Color not the only visual means of conveying info |
| Link Purpose | 2.4.4 | Link text describes destination |
| Heading Structure | 1.3.1 | Headings used correctly |
| Form Labels | 1.3.1 | Form inputs have associated labels |

#### 2b: Component Accessibility Audit
```
figma_audit_component_accessibility(nodeId, fileKey?)
```

Returns deeper component-level issues:
- Missing ARIA role annotations
- Keyboard navigation flow issues
- State communication (focus, hover, active, disabled, error)
- Screen reader text requirements
- Color-only information encoding
- Animation and motion issues

### Step 3: Code-Side Audit (axe-core)

```
figma_scan_code_accessibility(html)
```

Pass the HTML string of the component or page:

```html
<button class="btn btn-primary" onclick="handleClick()">
  Submit Form
</button>
```

The tool runs axe-core rules including:
- `button-name` — Buttons must have accessible names
- `color-contrast` — Elements must have sufficient color contrast
- `label` — Form elements must have labels
- `link-name` — Links must have accessible names
- `image-alt` — Images must have alt text
- `aria-required-attr` — Required ARIA attributes must be present
- `aria-valid-attr-value` — ARIA attribute values must be valid
- `focus-order-semantics` — Focus order must follow DOM order
- `keyboard` — All functionality must be keyboard accessible
- `landmark-one-main` — Page must have one main landmark

### Step 4: Merge and Deduplicate Results

Combine results from all three tools:

1. **Map to WCAG criteria** — Group issues by WCAG success criterion
2. **Deduplicate** — Remove issues reported by multiple tools
3. **Cross-reference** — Note when design issue → code issue (same root cause)
4. **Prioritize** — Sort by impact level (critical → serious → moderate → minor)

### Step 5: Generate Audit Report

```markdown
## Accessibility Audit Report: [Component/Page Name]

**Audit Date**: [date]
**Scope**: Design + Code (Full-stack)
**Overall Status**: ⚠️ Issues Found

### Summary
| Severity | Design Issues | Code Issues | Total |
|----------|--------------|-------------|-------|
| Critical | 2 | 1 | 3 |
| Serious | 3 | 2 | 5 |
| Moderate | 1 | 4 | 5 |
| Minor | 2 | 1 | 3 |
| **Total** | **8** | **8** | **16** |

### Critical Issues (Must Fix)

#### 1. Insufficient Color Contrast — Button Text
- **WCAG**: 1.4.3 (Level AA)
- **Design**: Button text `#FFFFFF` on `#4D9FFF` = 2.8:1 ratio (required: 4.5:1)
- **Code**: `color: white; background: #4D9FFF`
- **Fix (Design)**: Use `#0066CC` for button background (contrast 5.2:1)
- **Fix (Code)**: Update `background` to `#0066CC` or `var(--color-background-primary)`

#### 2. Missing Button Accessible Name
- **WCAG**: 4.1.2 (Level A)
- **Code**: `<button onclick="submit()">` — no text content or aria-label
- **Fix**: Add text content or `aria-label="Submit form"`

### Serious Issues (Should Fix)
...

### Remediation Priority

1. Fix color contrast issues (affects all users with low vision)
2. Add missing accessible names (affects screen reader users)
3. Ensure keyboard navigation works (affects keyboard-only users)
4. Add focus indicators (affects keyboard and low vision users)
5. Fix touch target sizes (affects motor-impaired users)
```

### Step 6: Provide Fix Guidance

For each issue, provide:
1. **Design fix** — What to change in Figma
2. **Code fix** — What to change in the implementation
3. **Testing method** — How to verify the fix

### Step 7: Re-Audit After Fixes

After fixes are applied, re-run the audit:
```
figma_lint_design(nodeId)                    → verify design fixes
figma_scan_code_accessibility(updatedHtml)   → verify code fixes
```

## WCAG Compliance Levels

| Level | Description | Required For |
|-------|-------------|-------------|
| A | Minimum | All web content |
| AA | Standard | Most legal requirements, WCAG 2.2 |
| AAA | Enhanced | Specialized content |

**Target**: WCAG 2.2 Level AA compliance for all components.

## Common Accessibility Patterns

### Accessible Button
```html
<!-- ✅ Correct -->
<button type="button" aria-label="Close dialog">
  <svg aria-hidden="true">...</svg>
</button>

<!-- ❌ Wrong -->
<div onclick="close()">×</div>
```

### Accessible Form Input
```html
<!-- ✅ Correct -->
<label for="email">Email address</label>
<input id="email" type="email" aria-describedby="email-hint" />
<p id="email-hint">We'll never share your email</p>

<!-- ❌ Wrong -->
<input type="email" placeholder="Email" />
```

### Accessible Error State
```html
<!-- ✅ Correct -->
<input
  id="email"
  type="email"
  aria-invalid="true"
  aria-describedby="email-error"
/>
<p id="email-error" role="alert">Please enter a valid email address</p>
```

### Color Contrast Requirements
```
Normal text (< 18pt / < 14pt bold):  4.5:1 minimum (AA), 7:1 (AAA)
Large text (≥ 18pt / ≥ 14pt bold):  3:1 minimum (AA), 4.5:1 (AAA)
UI components and graphics:          3:1 minimum (AA)
```

## Completion Checklist

- [ ] Audit scope determined (design / code / full-stack)
- [ ] `figma_lint_design` run (if Figma node available)
- [ ] `figma_audit_component_accessibility` run (if component)
- [ ] `figma_scan_code_accessibility` run (if HTML available)
- [ ] Results merged and deduplicated
- [ ] Issues prioritized by severity
- [ ] Audit report generated
- [ ] Fix guidance provided for all critical and serious issues
- [ ] Re-audit run after fixes applied
- [ ] WCAG 2.2 AA compliance confirmed