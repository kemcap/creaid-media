# Release candidate: architecture and quality gate

Reference (pre-refactoring): 335c4c27fa7b50af10e095c5e8db0d69c4d457b8.
The source CSS migration compared all 20 referenced stylesheets to the exact output of the previous transformation. Sixteen source CSS files were replaced with the already-delivered bytes; four were already equal. The Eleventy after-build regex CSS rewrite was removed. The HTML heading transform is retained to preserve the planned H1/H2 outline.

## Ownership
- fonts.css: local typography, brand and primary CTA tokens.
- global-shell.css / global-shell.js: shared shell and menu interactions.
- hero-balance.css: hero and real pinned story heights only.
- ux-phase1.css / ux-phase1.js: natural-flow components, accessible fallbacks, shared viewport height.
- adaptive-scroll.js: shared input smoothing and live motion preferences.
- family CSS/JS: page-specific artwork and interactions; no bulk merge or appearance redesign.
- heading-semantics.css: visible semantic labels and explicit heading-grid placements.

## Verification
npm ci; npm run verify; npm run preview; npm run test:routes -- http://127.0.0.1:8080.
Install the pinned browser tools as in the workflow, then npm run test:browser.
The workflow renders 98 routes in Chromium at three viewport sizes, representative routes in Firefox and WebKit, and tests narrow/landscape/breakpoint cases. Reduced-motion reference screenshots are compared against the committed baseline. Differences are reported, not silently accepted. Local resource size and timing measurements are diagnostic laboratory data, not real-user Core Web Vitals. Browser runs are a release gate, not a claim that every test has passed.

## Release blockers outside the refactoring
- Production contact transport remains a user-confirmed mail draft, not a server-side submission.
- Final legal text, company address and data-processing/hosting choices need owner approval.
- Production domain deployment and indexability must be enabled separately only after approval.
- Do not merge until quality reports and visual differences have been reviewed. No live-site changes are authorized by this candidate.
