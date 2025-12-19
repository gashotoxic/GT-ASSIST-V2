# New Supabase Database Setup Guide

## Database Information
- **URL**: https://ybuogspdugmqcyvhsjyr.supabase.co
- **Project**: ybuogspdugmqcyvhsjyr
- **Key Feature**: Full Clerk integration with TEXT user IDs (no UUID issues!)

## ✅ What's Already Done

### 1. Environment Variables Updated
- `.env.local` has been updated with new Supabase credentials
- All other API keys remain the same (Clerk, Chutes, Tavily, etc.)

### 2. Complete Schema Created
- `database/migrations/week3_new_database_schema.sql` contains the complete schema
- All user_id columns are TEXT type (compatible with Clerk IDs)
- All functions have TEXT user_id parameters
- Proper indexes and RLS policies configured

## 📋 Manual Setup Steps Required

### Step 1: Apply Database Schema

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ybuogspdugmqcyvhsjyr/sql)
2. Click "SQL Editor" in the left sidebar
3. Copy the entire content of `database/migrations/week3_new_database_schema.sql`
4. Paste into the SQL editor
5. Click "Run" or press Ctrl+Enter
6. Wait for execution to complete (should show "Success")

### Step 2: Create Storage Buckets

1. In Supabase Dashboard, go to "Storage" → "Buckets"
2. Click "New Bucket" and create:
   - **Bucket name**: `chat-audio`
   - **Public**: ✅ Check this box
   - Click "Create bucket"
3. Click "New Bucket" again and create:
   - **Bucket name**: `media-assets`
   - **Public**: ✅ Check this box
   - Click "Create bucket"

### Step 3: Verify Schema (Optional)

Run these SQL queries in the SQL Editor to verify:

```sql
-- Check table structure
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('users', 'credits_log', 'subscriptions')
  AND column_name LIKE '%user_id%'
ORDER BY table_name;

-- Expected: All user_id columns should be 'text' type

-- Check functions
SELECT proname, proargtypes::regtype[] 
FROM pg_proc 
WHERE proname IN ('deduct_user_credits', 'add_user_credits', 'sync_user_profile');

-- Expected: p_user_id should be 'text' type
```

### Step 4: Restart Development Server

```bash
# Stop the current dev server (Ctrl+C)
# Restart to pick up new environment variables
npm run dev
```

## 🔧 What Gets Fixed

### Before (Old Database)
```
❌ users.id = UUID (expects format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
❌ Clerk ID = "user_36w3Fapt8nVkGFm2Uo4mNIOTRsM" (text format)
❌ Error: invalid input syntax for type uuid
❌ Infinite loops in user sync
```

### After (New Database)
```
✅ users.id = TEXT (accepts any text format)
✅ Clerk ID = "user_36w3Fapt8nVkGFm2Uo4mNIOTRsM" (works perfectly)
✅ No type errors
✅ Smooth user sync
```

## 🧪 Testing the Integration

1. **Start your app**: `npm run dev`
2. **Open browser console**: Check for errors
3. **Sign in with Clerk**: Should work without UUID errors
4. **Check Supabase**: User profile should be created automatically
5. **Test credits**: Try generating content to test credit deduction

## 📁 Files Created/Modified

### New Files
- `database/migrations/week3_new_database_schema.sql` - Complete schema
- `SETUP_NEW_DATABASE.md` - This guide

### Modified Files
- `.env.local` - Updated Supabase credentials

### Existing Files (Already Compatible)
- `services/userSync.ts` - Already handles Clerk IDs correctly
- `services/supabase.ts` - Already uses TEXT user IDs
- `context/AuthContext.tsx` - Already syncs users properly

## 🚨 Troubleshooting

### If you see "relation does not exist" errors:
- Schema wasn't applied. Run Step 1 again.

### If you see storage errors:
- Buckets weren't created. Run Step 2.

### If you see "Invalid API key" errors:
- Check `.env.local` has the correct `VITE_APP_SUPABASE_KEY`

### If user sync still fails:
1. Check browser console for exact error
2. Check Supabase Logs: Dashboard → Logs → Postgres
3. Verify functions exist: Run `SELECT proname FROM pg_proc WHERE proname LIKE '%user%';`

## 🎉 Expected Behavior After Setup

### User Flow:
1. User signs in with Clerk ✅
2. `AuthContext` detects sign-in ✅
3. `userSync.ts` syncs to Supabase ✅
4. `users` table gets new row with TEXT id ✅
5. User gets 10 free credits ✅
6. All operations work smoothly ✅

### Credit Flow:
1. User generates content ✅
2. `deduct_user_credits()` called with TEXT user_id ✅
3. Credits deducted successfully ✅
4. Transaction logged in `credits_log` ✅
5. Real-time updates via subscriptions ✅

## 🔄 Migration from Old Database

If you need to migrate data from the old database:

1. Use the old credentials to export data
2. Transform UUIDs to TEXT format if needed
3. Import into new database
4. Or start fresh (recommended for this case since old DB had type issues)

You're now ready to start fresh with a properly configured database that fully supports Clerk authentication! 🚀