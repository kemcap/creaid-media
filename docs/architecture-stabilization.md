# Architecture stabilization – phase 2.1 / 2.2

Reference commit: ed7032b20ee8865ac4e10f99423a5992a1d30a4f. This immutable commit is a source baseline, not an approved visual screenshot baseline. Full browser capture of the 98 pages remains required before CSS consolidation.

## Navigation ownership
- global-shell.js owns the global header's interactions.
- audit-navigation.js remains a fallback only for pages without the shared header.
- A readiness guard prevents duplicate listener registration.
- No CSS, heading, page content, animation or route changes in this step.

## Verification
Isolated Chromium fixture with the shared header structure and both scripts: 375, 860, 861, 1440 px. Escape restores appropriate focus, mobile links close the menu, resizing to desktop closes the mobile menu, outside pointer closes desktop dropdown, repeated script inclusion does not double-toggle. This does not constitute a full-page rendering or release approval.

## Next steps
1. Capture all page families and critical responsive boundaries using the current rendered preview.
2. Consolidate motion ownership only after visual reference screenshots exist.
3. Move CSS rules to explicit component ownership in small verified changes. Retain all existing creative claims, semantic headings and motion design.
4. Make build, routing and visual checks release gates. The contact transport and production deployment are separate decisions.
