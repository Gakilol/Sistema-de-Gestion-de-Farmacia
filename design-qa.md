# Design QA — Restauración visual de FarmaPOS

## Source visual truth

- Diseño anterior: `.codex-audit/before/01-dashboard-desktop.png`
- Implementación restaurada: `.codex-audit/restored/dashboard-desktop-final.png`
- Comparación conjunta: `.codex-audit/restored/qa-old-vs-restored-dashboard-final.png`
- Caja restaurada: `.codex-audit/restored/caja-desktop-final.png`
- Selector responsive: `.codex-audit/restored/reportes-dialog-desktop-final.png` y `.codex-audit/restored/reportes-dialog-mobile.png`

## Viewport and normalization

- Source pixels: 1426 × 900.
- Implementation pixels and CSS viewport: 1280 × 720, device density 1.
- Normalization: the source was cropped from the top to 1426 × 802 to match the implementation aspect ratio, then downsampled to 1280 × 720. Browser chrome was excluded.
- State: dark theme, dashboard empty/loading-user state. Caja and Reportes use their valid protected-data error/empty state because the QA browser had no database connection.

## Full-view comparison evidence

- Typography, dark navy palette, emerald accents, sidebar width, page gutters, card grid, radii, borders and spacing match the previous interface.
- Shared visual files (theme, Dashboard, sidebar and UI primitives) were restored to their previous source versions. The only deliberate structural differences are inside Caja and Reportes, where the requested new functionality remains.
- There are no raster images or custom visual assets in the source screen; the restored implementation continues using the original Lucide icon family and CSS surfaces.
- Copy and hierarchy on the restored shared screens are unchanged from the source.

## Focused region evidence

- Caja was checked separately at 1280 × 720 and 390 × 844. It uses the previous theme while retaining live totals, payment breakdown, movements and close-of-day reporting. No horizontal overflow was found.
- The Reportes export dialog was checked at 1280 × 720 and 390 × 844. Excel/PDF switching, section selection and close actions work. The footer remains reachable while content scrolls.
- Browser console check: no client-side errors. The visible API alerts correspond to the unavailable protected database in this local QA session.

## Findings and comparison history

- **P1 fixed — export dialog clipped on shorter desktop viewports.**
  - Earlier evidence: the 820 px dialog rendered at y = -50 in a 720 px viewport.
  - Fix: changed its height constraint to `max-h-[min(90vh,820px)]`.
  - Post-fix evidence: the dialog measures 648 px tall at y = 36, scrolls internally, and keeps its action footer visible.
- No remaining P0, P1 or P2 findings.
- P3 accepted: Caja necessarily has more content than its older screen because payment splitting and live operational reporting were intentionally preserved.

## Verification

- `npx tsc --noEmit` — passed.
- `npm run test:reportes` — 8/8 passed.
- `npm run test:xp` — 17/17 passed, including Caja calculations.
- `npm run build` — passed; 77 routes generated/validated.

## final result

passed
