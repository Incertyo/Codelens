# Public GitHub preparation — 2026-10-14

Source-only changes; no Git initialization, commit, push, deployment or project LICENSE creation.

## Comment cleanup and protected text

Removed 55 nonfunctional comments across 32 source/config files. JavaScript/TypeScript/TSX used Babel parser comment ranges and before/after AST comparison; CSS used PostCSS AST/token ranges; workflow YAML used parser/CST comment ranges and data comparison; Python used tokenize COMMENT tokens plus AST comparison. No raw-source regex comment removal was used. The tools ran outside the project and added no application dependencies.

The preservation policy covers compiler/lint/bundler pragmas, triple-slash references and directives. String, regex and template contents were verified unchanged, including embedded reference/fixture programs and use-client/use-server directives. Python docstrings remain strings. Next's generated type declaration file is left generated and ignored.

All **23 freshness-manifest inputs** and `src/generated/library.json` match the baseline byte-for-byte after cleanup, formatting, seeding and production/browser checks. Entire manifest inputs were exempt from cleanup, including library sources/schema, catalog/example files, compiler and seeding scripts. The catalog export SHA-256 remains:

```text
054cf4d55ba35611b4eb2b6a917d32ee833908a5dbfa94d14f846e94149d1eac
```

## Ignore rules and secret scan

Verified 18 representative ignore paths covering private .env files, dependencies, Next builds/types, all three generated public runtime asset trees, both runtime metadata files, SQLite files, reports/artifacts, logs, Python caches and local Vercel metadata. `.env.example`, the catalog export, reference sources and lockfile remain publishable.

[Gitleaks 8.30.1](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1) ran locally with default rules, full redaction and one archive-decoding level. The working-tree scan includes ignored local env/config/log/report files; installed vendors, binary/generated build caches and large binary assets were excluded. A separate fresh-source copy selected by .gitignore was scanned for publication.

- Working-tree finding: one generic API-key credential in ignored `.env.local`, line 1. Its value was not printed, changed or copied into the clean-source setup. No other secret findings were reported in the scanned scope.
- Publishable-source findings: **zero**.
- Key-like test strings in five test files are deliberately synthetic provider/Redis fixture credentials; fixtures and quoted source contents were preserved.
- Git history: unavailable. This directory and its parents are not a Git repository, so no commits/history exist locally to scan. No remote repository was assumed or contacted for history. These results do not certify any separate remote/history or future changes.

## Clean-source setup and checks

A fresh directory containing only publishable source was created without private env files, node_modules, build/runtime assets, Next generated types or a SQLite database. It used only the copied env template, with inherited provider/Redis/build configuration removed. `npm ci` recreated all runtime assets and metadata; `npm run build` succeeded with the original export unchanged. This verifies the documented clean-clone-equivalent setup; an actual Git clone was impossible because no repository exists yet.

Production prebuild now performs read-only manifest verification in every environment. Catalog export remains an explicit maintenance command. The env template selects the static catalog and leaves AI off; production setup needs Node 24 and no Python. Development, tests and catalog maintenance still use Python/local SQLite.

| Check                             | Result                                         |
| --------------------------------- | ---------------------------------------------- |
| Lint                              | Passed, zero warnings                          |
| Typecheck                         | Passed                                         |
| Unit tests                        | 573 passed in 16 files                         |
| Production build                  | Passed in the workspace and fresh-source setup |
| Production Playwright             | 54 passed, 2 workers, 4.8 minutes              |
| Catalog manifest/export integrity | All 23 inputs and export unchanged             |
| Public-source secret scan         | Zero findings                                  |

The browser suite used AI_ENABLED=false, CODELENS_STATIC_LIBRARY=1, an unavailable SQLite path and port 3107. No live provider/Redis calls, push or deployment were performed for this task.

## Remaining dependency and license decisions

`npm audit` reports five high-severity findings in the development ESLint chain: eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces 3.0.3. The [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) lists no patched version. npm's suggested fix downgrades eslint-config-next to 14.2.35, incompatible with the current Next 16 setup, so no forced downgrade was applied. `npm audit --omit=dev` reports zero production dependency findings.

No LICENSE was added. The README lists MIT, Apache-2.0 and GPL-3.0-only options with their official texts; the owner must choose. Dependency licenses retain their own terms.
