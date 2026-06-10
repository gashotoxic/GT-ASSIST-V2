# DOX -- context

**React context providers**

## Purpose

Global state management via React Context API.

## Files

- SupabaseContext.tsx -- Supabase client provider (session, user, credits)
- ThemeContext.tsx -- Theme provider (dark/light)
- UIContext.tsx -- UI state (modals, toasts, sidebar)

## Local Contracts

- Contexts wrap the app at router level in AppRoutes.tsx
- SupabaseContext provides: user, session, credits, isAuthenticated, deductCredits
