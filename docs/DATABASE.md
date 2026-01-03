# GT Assistant Database & Architecture Guide (ULTRATHINK)

## 📑 Overview
This document is a comprehensive technical blueprint of the GT Assistant data layer. It covers the PostgreSQL schema, storage configuration, and the critical synchronization logic.

---

## 🏗️ Core Architecture: The Sync Logic

### 1. Persistence Tiers
| Data Type | Authenticated (Signed In) | Guest |
| :--- | :--- | :--- |
| **Sessions** | Supabase `chat_sessions` | LocalStorage |
| **Messages** | Supabase `messages` | LocalStorage |
| **Media** | Supabase `media_history` | *Not Persisted* |
| **Credits** | Supabase `users.credits` | *Not Shared* |

### 2. The CASE Logic
The app uses a strict mapping between frontend `camelCase` and backend `snake_case`.

---

## 🗃️ Table Schemas (Technical Specs)

### 1. `users` (Context: Identity)
The `id` is the **Clerk User ID**.

| Column | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | (PK) | Sync with Clerk `user.id` |
| `email` | TEXT | NOT NULL | User primary email |
| `credits` | INTEGER | 10 | Permanent credit ledger (purchased) |
| `daily_credits` | INTEGER | 0 | Automated daily reset allowance |
| `subscription_tier` | TEXT | 'free' | enum: `free`, `basic`, `plus`, `pro` |
| `paystack_customer_code` | TEXT | NULL | Linked Paystack Customer ID |
| `last_credit_reset` | TIMESTAMP | NULL | Tracks last daily allowance refill |

### 2. `chat_sessions`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `user_id` | TEXT | Owner |
| `is_branch` | BOOLEAN | Branching support |
| `model` | TEXT | Session-specific model ID |

### 3. `messages`
Content matches `OpenAI` format with support for `<thought>` tags (Reasoning models).

### 4. `media_history`
Tracks generated artifacts (Images, Videos). RLS enforces user isolation.

---

## 🔧 Critical Functions (PostgreSQL RPCs)

### `deduct_user_credits`
**Logic**: Two-pool system. 
1. **JIT Reset**: Checks if daily credits need a reset (`last_credit_reset < TODAY`) before deducting.
2. **Pro Bypass**: If `tier='pro'`, returns success without deduction.
3. **Hierarchy**: Deducts from `daily_credits` first, then `credits` (permanent).
**Security**: Row-level locking to prevent double-spending.

### `expire_user_subscription`
**Logic**: Triggered by webhook (`subscription.disable`). Reverts user to `free` tier and sets all credits to `0`. 
**Safety**: Only affects users on a paid tier.

### `reset_daily_credits_for_user`
**Logic**: Refills `daily_credits` based on tier (Basic: 300, Plus: 500, Pro: 0).
**Note**: Pro gets 0 because they bypass deduction entirely.

---

## 📦 Storage Hierarchy
| Bucket | Access | Path Pattern |
| :--- | :--- | :--- |
| `media-assets` | Public | `${userId}/${sessionId}/${itemId}.${ext}` |
| `chat-audio` | Public | `${sessionId}/${itemId}.wav` |

---
*Last Updated: January 3, 2026 | GT Assistant Engineering Audit*