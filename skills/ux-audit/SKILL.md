---
name: ux-audit
description: Audit screens for UX issues using Nielsen's heuristics and modern mobile UX best practices
risk: unknown
source: https://github.com/bitjaru/styleseed/tree/main/engine/.claude/skills/ss-audit
source_repo: bitjaru/styleseed
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/bitjaru/styleseed/blob/main/LICENSE
---

# UX Audit
## When to Use

Use this skill when you need audit screens for UX issues using Nielsen's heuristics and modern mobile UX best practices.


## When NOT to use

- For accessibility-only issues → use `/ss-a11y`
- For design system token/golden-rule compliance → use `/ss-review`
- For copy/microcopy quality → use `/ss-copy`
- For brand new screens that don't exist yet — design first with `/ss-page` or `/ss-flow`

Target: **$ARGUMENTS**

## Audit Framework

### Nielsen's 10 Usability Heuristics

#### 1. Visibility of System Status
- [ ] Loading states present (skeleton screens, not spinners)
- [ ] Success/error feedback after actions (toast notifications)
- [ ] Progress indicators for multi-step flows
- [ ] Active state clearly shown on navigation items
- [ ] Real-time data has timestamp showing freshness

#### 2. Match Between System and Real World
- [ ] Labels use user's language, not technical jargon
- [ ] Icons are universally recognizable (Lucide standard set)
- [ ] Number formats match user expectations (comma separators, currency symbols)
- [ ] Date formats are locale-appropriate

#### 3. User Control and Freedom
- [ ] Back navigation available on all non-root screens
- [ ] Destructive actions have confirmation dialogs
- [ ] Undo available for reversible actions (toast with undo)
- [ ] Bottom sheet/modal can be dismissed (backdrop tap, swipe down, X button)
- [ ] No dark patterns (no forced actions, always a way to dismiss)

#### 4. Consistency and Standards
- [ ] Same action = same appearance everywhere
- [ ] Color meanings are consistent (green=success, red=error, brand=active)
- [ ] Text hierarchy follows the 5-level grayscale system
- [ ] All cards use the same shadow, radius, padding
- [ ] Spacing follows the 6px grid system

#### 5. Error Prevention
- [ ] Destructive buttons are visually distinct (destructive variant)
- [ ] Form validation happens on blur (not while typing)
- [ ] Dangerous actions require explicit confirmation
- [ ] Input constraints are visible before errors occur (character limits, format hints)

#### 6. Recognition Rather Than Recall
- [ ] Labels on all icons (especially BottomNav)
- [ ] Current state visible without memorization (active tab highlighted)
- [ ] Recent/frequent items shown for quick access
- [ ] Placeholder text shows expected format

#### 7. Flexibility and Efficiency
- [ ] Key actions reachable within 3 taps from home
- [ ] Pull-to-refresh on data screens
- [ ] Touch targets >= 44x44px (no tiny tap areas)
- [ ] Frequently used actions in easy-to-reach zones (bottom of screen)

#### 8. Aesthetic and Minimalist Design
- [ ] Each screen focuses on ONE primary task
- [ ] No decorative elements that don't serve a purpose
- [ ] Information pyramid respected (most important = biggest)
- [ ] Card density follows the max-4-items rule
- [ ] No competing visual elements (one hero metric per page)

#### 9. Help Users Recover from Errors
- [ ] Error messages explain what went wrong in plain language
- [ ] Error messages suggest how to fix the problem
- [ ] Partial failures don't break the whole page (one card fails, others load)
- [ ] Network errors show retry button
- [ ] Form errors highlight the specific field

#### 10. Help and Documentation
- [ ] Empty states guide users to take action
- [ ] Onboarding for first-time features (if applicable)
- [ ] Tooltips for complex metrics (if applicable)

### Mobile-Specific UX Checks

#### Touch & Gesture
- [ ] Touch targets minimum 44x44px
- [ ] Minimum 8px between adjacent touch targets
- [ ] No hover-dependent interactions (mobile has no hover)
- [ ] Swipe gestures have visible affordances (carousel indicators)

#### Performance Perception
- [ ] Skeleton screens appear within 300ms
- [ ] Optimistic updates for user actions
- [ ] Above-the-fold content loads first
- [ ] No layout shift after content loads

#### Safe Areas
- [ ] Content not hidden behind notch/Dynamic Island
- [ ] Bottom content not behind home indicator
- [ ] BottomNav has `pb-safe` padding

### Dark Pattern Prevention
- [ ] No forced bottom sheets on entry
- [ ] No exit-prevention dialogs
- [ ] Every screen has a way to go back/dismiss
- [ ] CTA labels clearly describe the action
- [ ] No manipulative graphics (begging, urgency)

## Output Format

1. **Score**: A+ to F rating with breakdown
2. **Critical Issues**: Must fix (blocks usability)
3. **Major Issues**: Should fix (degrades experience)
4. **Minor Issues**: Nice to fix (polish)
5. **Recommendations**: Specific code changes for each issue

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
