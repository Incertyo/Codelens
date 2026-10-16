# Style ownership

The application imports one entry, src/styles/index.css, through the Next global stylesheet. Its import order preserves the original helper styles, global rules and final refinements. Token/base files and domain files form logical layers; CSS cascade layers are deliberately not introduced because unlayered Monaco/third-party styles would gain a different priority.

Order:

- visualizer/structures
- insights/breakdown
- visualizer/algorithms
- library/navigation
- tokens
- base
- workspace/chrome
- editor/editor
- workspace/results
- visualizer/snapshots
- workspace/dialogs
- intro/loading
- design/design
- workspace/responsive
- insights/analysis
- intro/page
- insights/enrichment
- insights/complexity
- tokens-overrides
- base-overrides
- workspace/controls
- insights/panels
- library/browser
- workspace/interactions
- intro/study
- workspace/motion
- insights/chart

Only positive selector branches whose leading class was absent in the Phase 2A static scan are removed. Dynamic prefixes and remaining intentional overrides are retained. Removed classes: accent-text, array-cells, array-column, array-index, array-view, complexity-definition-card, definition-header, growth-ladder, node-diagram, phase-placeholder, pointer-label, preloader, preloader-number, recursion-scroll, space-breakdown-grid, space-breakdown-item, star-tag. The earlier duplicate mobile hero font-size is removed; the final identical declaration remains. No other differing selector group is deduplicated merely because its selector repeats.

All media, theme, keyframe and reduced-motion ordering is retained in the moved source. No browser, screenshot, accessibility or visual-diff run was performed at the owner's request. Visual parity is unverified.
