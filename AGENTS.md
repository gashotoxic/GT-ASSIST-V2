# GT Assistant - Agent Guidelines

This document provides essential information for AI agents working on the GT Assistant codebase.

## 1. Toolchain & Commands

*   **Runtime**: Node.js
*   **Package Manager**: npm
*   **Build**: `npm run build` (uses Vite)
*   **Dev Server**: `npm run dev`
*   **Lint**: `npm run lint` (uses ESLint)
*   **Type Check**: Run `npx tsc --noEmit` manually (no script in package.json).
*   **Tests**: 
    *   **WARNING**: There is NO automated test runner (no `npm test`, `jest`, or `vitest`).
    *   **Do not** attempt to run `npm test` or install test runners unless explicitly tasked.
    *   Tests are manual/interactive components located in the `tests/` directory (e.g., `tests/ClerkSupabaseIntegrationTest.tsx`).
    *   To test changes, you may need to verify manually via the UI or create a temporary test component if needed.

## 2. Project Structure

The project uses a root-based structure (no single `src` root for all code).

*   `App.tsx`, `index.tsx`: Entry points in the **root** directory.
*   `components/`: React UI components.
*   `context/`: React Context providers (Auth, Credits).
*   `services/`: Business logic and API integrations (Supabase, Chutes, Search).
*   `hooks/`: Custom React hooks.
*   `lib/`: Third-party library configurations (Paystack).
*   `database/`: SQL schemas and migration files.
*   `types.ts`: Shared TypeScript definitions.

## 3. Code Style & Conventions

*   **Language**: TypeScript (Strict mode preferred, `ES2022`).
*   **Framework**: React 18+ (Functional Components with Hooks).
*   **Styling**: Tailwind CSS.
    *   Use `lucide-react` for icons.
    *   Follow the "Glassmorphism" design language (transparency, blurs).
*   **State Management**: 
    *   Use React Context (`AuthContext`, `CreditContext`) for global state.
    *   Use local state (`useState`) for component-specific logic.
*   **Imports**:
    *   Use **relative paths** (e.g., `./components/UI`) as seen in `App.tsx`.
    *   Avoid using `@/` aliases unless verified in the specific file context, even if configured in tsconfig.
*   **Formatting**:
    *   Use standard Prettier formatting (2 spaces indentation, semicolons, single quotes preferred).
*   **Naming**:
    *   Components: `PascalCase` (e.g., `ChatInterface.tsx`).
    *   Hooks: `camelCase` (e.g., `useAudioRecorder.ts`).
    *   Functions/Variables: `camelCase`.

## 4. Key Technologies

*   **Backend**: Supabase (PostgreSQL, Edge Functions, Storage).
    *   **RLS**: Respect Row Level Security policies.
*   **Auth**: Clerk (User management).
*   **Payments**: Paystack (KES currency, unified credit system).
*   **AI Inference**: Chutes.ai (DeepSeek, Flux, Hunyuan, etc.).

## 5. Agent Rules & Best Practices

1.  **Safety First**: 
    *   NEVER commit secrets, API keys, or `.env` files.
    *   Always verify file paths exist before reading/writing.
2.  **No Hallucinations**:
    *   Do not invent scripts that don't exist (like `npm test`).
    *   Do not import non-existent libraries.
3.  **Verification**:
    *   Always run `npm run lint` and `npm run build` after making significant changes to ensure no regressions.
    *   If fixing a bug, verify the fix if possible (or explain how the user can verify).
4.  **Documentation**:
    *   Read `PROJECT_CONTEXT.md` for deep architectural details before architectural changes.
    *   Read `IMPLEMENTATION_STATUS.md` to know the current phase.
5.  **File Operations**:
    *   Use **absolute paths** for all file tools.
    *   Check directory contents (`ls -R`) if unsure of file location.

## 6. Contextual Notes

*   **Tests Directory**: Files in `tests/` are NOT unit tests. They are React components meant to be rendered in the app for manual integration testing.
*   **Supabase Types**: If modifying database schema, ensure TypeScript types in `types.ts` or `services/` are updated to match.
