# Unused File Candidates (Verification Complete)

## Analysis Date
19 December 2025

## Verification Method
1. Built project successfully (`npm run build`)
2. Ran `npx depcheck` to identify unused dependencies
3. Manual verification using "Find All References" for each candidate
4. Checked route registrations in `AppRouter.tsx`

## ❌ NO FILES IDENTIFIED FOR DELETION

### Demo Pages (CANNOT DELETE - Active Routes)
- `src/pages/LintDemoPage.tsx` - Referenced in AppRouter.tsx as `/lint-demo`
- `src/pages/CoverageDemo.tsx` - Referenced in AppRouter.tsx as `/coverage-demo`

**Reason**: These are registered routes and may be accessed by users.

### Component Files
All component files under `src/components/` are actively imported and used:
- `ErrorTable.tsx` - Used by ValidationResultPanel
- All playground components - Used by PlaygroundPage
- All shared components - Used across multiple pages

## ✅ RESULT
**Zero files identified for safe deletion.**

All source files in `src/` are either:
1. Actively imported by other modules
2. Registered as routes in AppRouter
3. Entry points (main.tsx, App.tsx)

## Dependencies Analysis
From `depcheck`:
- **Unused dependencies**: `antd` (can be removed from package.json if not planned)
- **Unused devDependencies**: `autoprefixer`, `postcss`, `tailwindcss` (FALSE POSITIVE - used by build)
- **Missing dependencies**: `vitest` (should be in devDependencies for tests)

## Next Steps
Since no source files can be safely deleted, proceed directly to:
- **STEP 2**: Consolidate Markdown documentation
- **STEP 3**: Clarify component folders (move shared components)
