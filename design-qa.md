# Design QA：聊天输入框单层焦点态

- Source visual truth: `C:/Users/zeno/AppData/Local/Temp/codex-clipboard-3cbca2a7-2ed5-4dd0-a41d-0b333990a294.png`
- Implementation screenshot: `E:/Coding/plan-pal-agentic/output/playwright/focus-after.png`
- Comparison screenshot: `E:/Coding/plan-pal-agentic/output/playwright/focus-comparison.png`
- Viewport: source crop 872 × 233；isolated implementation harness 900 × 260
- State: empty PlanPal message composer with the textarea focused

## Full-view comparison evidence

The source is a cropped composer rather than a complete application screen, so the full comparison is scoped to that composer. The source shows both the textarea's yellow border and a second offset yellow outline. The implementation keeps the existing composer structure and shows only the component-owned yellow focus border and bottom shadow.

## Focused region comparison evidence

The input region is large enough in both screenshots to inspect the complete perimeter. The post-fix screenshot has no second offset rectangle. Browser-computed styles confirm `outline-style: none`, yellow `border-color: rgb(255, 204, 0)`, and the existing dark-yellow bottom shadow.

## Required fidelity surfaces

- Fonts and typography: unchanged by this fix; placeholder, helper text, and labels preserve the existing component styles.
- Spacing and layout rhythm: input dimensions, radius, padding, grid layout, and adjacent send button are unchanged.
- Colors and visual tokens: focus continues to use `--animal-focus-yellow` and `--animal-focus-yellow-d`.
- Image quality and asset fidelity: no image assets are involved in this component state.
- Copy and content: all existing composer copy is unchanged.

## Interaction and console checks

- Tab navigation focused the textarea and produced one yellow focus border.
- Pointer click focused the textarea and produced the same single focus border.
- Both states matched `:focus` and `:focus-visible`.
- No console errors were emitted after the isolated component was mounted.

## Comparison history

1. Earlier P1 finding: the global unlayered `:focus-visible` outline overrode the component's layered Tailwind `outline-none`, creating two focus rectangles.
2. Fix: add a narrowly scoped `planpal-focus-managed` rule in the same unlayered stylesheet and let it own the textarea border, shadow, and outline behavior.
3. Post-fix evidence: `focus-after.png`, `focus-comparison.png`, and `focus-check.json` confirm one visible focus indicator for keyboard and pointer input.

## Findings

No actionable P0, P1, or P2 differences remain within the requested focus-state scope.

final result: passed
