# DOX -- context

**React context providers**

## Purpose

Global state management via React Context API.

## Files

- AuthContext.tsx -- Clerk auth provider (userId, isLoaded, isSignedIn); registers Clerk's getToken() with services/authToken.ts so every /api/* call carries a session JWT
- CreditContext.tsx -- credits, dailyCredits, subscriptionTier, canAfford(action, model), refetch
- ServicesContext.tsx -- dependency-injected AppServices (useServices())

## Local Contracts

- Contexts wrap the app at router level in AppRoutes.tsx
- AuthContext provides: userId, isLoaded, isSignedIn (user data via Clerk); credit state lives in CreditContext
