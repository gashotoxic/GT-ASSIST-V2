# Database Backup and Rollback Procedures

## Overview

This document outlines the backup and rollback procedures for the GT Assistant Supabase database during Week 2 implementation and beyond.

## 🔄 Backup Procedures

### Automated Daily Backups
Supabase provides automated daily backups by default. Ensure these are enabled:
1. Go to Supabase Dashboard → Settings → Database → Backups
2. Verify "Daily backups" is enabled
3. Set retention period (recommended: 30 days)

### Manual Pre-Deployment Backup
Before running the Week 2 migration:

```bash
# Using Supabase CLI
supabase db dump --data-only > backup_$(date +%Y%m%d_%H%M%S).sql

# Or via SQL (run in Supabase SQL Editor)
CREATE TABLE backup_users AS SELECT * FROM users;
CREATE TABLE backup_credits_log AS SELECT * FROM credits_log;
CREATE TABLE backup_subscriptions AS SELECT * FROM subscriptions;
CREATE TABLE backup_user_api_keys AS SELECT * FROM user_api_keys;
```

### Critical Data Export
Export user data before major changes:

```sql
-- Export existing user data
COPY (
  SELECT 
    id,
    email,
    created_at,
    updated_at
  FROM users 
  WHERE id IS NOT NULL
) TO 'users_backup.csv' WITH CSV HEADER;

-- Export existing sessions with user relationships
COPY (
  SELECT 
    cs.id,
    cs.title,
    cs.preview,
    cs.user_id,
    cs.updated_at
  FROM chat_sessions cs
  WHERE cs.user_id IS NOT NULL
) TO 'sessions_backup.csv' WITH CSV HEADER;
```

## 🚨 Rollback Procedures

### Immediate Rollback (Within 1 Hour)
If migration causes critical issues:

```sql
-- Week 2 Rollback Script
-- Run in Supabase SQL Editor immediately

-- Step 1: Disable new features
DROP FUNCTION IF EXISTS deduct_user_credits CASCADE;
DROP FUNCTION IF EXISTS add_user_credits CASCADE;
DROP FUNCTION IF EXISTS sync_user_profile CASCADE;
DROP FUNCTION IF EXISTS reset_daily_credits CASCADE;

-- Step 2: Remove new tables (preserves data)
DROP TABLE IF EXISTS user_api_keys CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS credits_log CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Step 3: Remove user_id columns from existing tables
ALTER TABLE chat_sessions DROP COLUMN IF EXISTS user_id;
ALTER TABLE messages DROP COLUMN IF EXISTS user_id;
ALTER TABLE messages DROP COLUMN IF EXISTS cost_credits;
ALTER TABLE media_history DROP COLUMN IF EXISTS user_id;

-- Step 4: Remove RLS (if it was enabled on existing tables)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
-- (Other RLS policies will be dropped with table drops)

-- Step 5: Restore from backup if needed
-- (Only if data corruption occurred)
```

### Point-in-Time Recovery (PITR)
For critical data loss within the backup window:

1. **Contact Supabase Support** immediately
2. **Provide timestamp** of when to restore to
3. **Request PITR** for the specific time before migration
4. **Verify data integrity** after restoration

### Manual Data Recovery
If only specific data is affected:

```sql
-- Restore users table from backup
INSERT INTO users (id, email, credits, subscription_tier, created_at, updated_at)
SELECT id, email, credits, subscription_tier, created_at, updated_at
FROM backup_users
WHERE id NOT IN (SELECT id FROM users);

-- Restore credits log from backup
INSERT INTO credits_log (user_id, amount, action, model_used, remaining_balance, created_at)
SELECT user_id, amount, action, model_used, remaining_balance, created_at
FROM backup_credits_log
WHERE created_at > NOW() - INTERVAL '1 hour';
```

## 📋 Pre-Migration Checklist

### Before Running Week 2 Migration:
- [ ] Create full database backup
- [ ] Export critical user data to CSV
- [ ] Test migration on staging environment
- [ ] Prepare rollback script
- [ ] Schedule maintenance window (2-4 hours)
- [ ] Notify users of scheduled maintenance
- [ ] Prepare monitoring dashboard

### Migration Validation:
- [ ] Verify all tables created successfully
- [ ] Check RLS policies are working
- [ ] Test credit deduction function
- [ ] Verify user profile sync works
- [ ] Test real-time subscriptions
- [ ] Check application functionality

### Post-Migration:
- [ ] Monitor error logs for 24 hours
- [ ] Verify credit system accuracy
- [ ] Test user authentication flow
- [ ] Check all existing features work
- [ ] Create post-migration backup

## 🔧 Environment-Specific Procedures

### Development Environment
```bash
# Reset development database
supabase db reset

# Apply migration
supabase db push

# Seed test data
supabase db seed
```

### Staging Environment
```bash
# Create backup before migration
supabase db dump --db-url=$STAGING_DB_URL > staging_backup.sql

# Apply migration with dry run
supabase db push --dry-run

# Apply actual migration
supabase db push
```

### Production Environment
```bash
# Create production backup
supabase db dump --db-url=$PROD_DB_URL > prod_backup_$(date +%Y%m%d_%H%M%S).sql

# Apply migration during maintenance window
supabase db push --db-url=$PROD_DB_URL
```

## 📊 Monitoring and Alerting

### Critical Metrics to Monitor:
1. **Database Connection Count**
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   ```

2. **Transaction Success Rate**
   ```sql
   SELECT 
     action,
     COUNT(*) as total_transactions,
     COUNT(CASE WHEN amount < 0 THEN 1 END) as usage_transactions,
     COUNT(CASE WHEN amount > 0 THEN 1 END) as credit_purchases
   FROM credits_log 
   WHERE created_at > NOW() - INTERVAL '1 hour'
   GROUP BY action;
   ```

3. **User Account Issues**
   ```sql
   SELECT 
     COUNT(*) as users_without_profiles,
     COUNT(CASE WHEN credits IS NULL THEN 1 END) as null_credits
   FROM users 
   WHERE created_at > NOW() - INTERVAL '1 day';
   ```

### Alert Thresholds:
- Database connections > 80% of max
- Credit deduction failures > 5%
- User profile sync failures > 2%
- API response time > 2 seconds

## 🚨 Emergency Contacts

### Primary Contacts:
- **Database Administrator**: [Contact Info]
- **Development Team Lead**: [Contact Info]
- **Product Manager**: [Contact Info]

### Supabase Support:
- **Emergency Support**: Available 24/7 for Enterprise plans
- **Standard Support**: Business hours response
- **Documentation**: https://supabase.com/docs

## 📝 Runbook Templates

### Migration Runbook
```
Time | Action | Owner | Status
-----|--------|-------|--------
00:00 | Notify users of maintenance | Product Manager | ☐
00:30 | Create database backup | DB Admin | ☐
01:00 | Apply Week 2 migration | Dev Team | ☐
01:30 | Run validation scripts | Dev Team | ☐
02:00 | Test application functionality | QA Team | ☐
02:30 | Monitor for 30 minutes | Dev Team | ☐
03:00 | Re-open application | Product Manager | ☐
```

### Rollback Runbook
```
Time | Action | Owner | Status
-----|--------|-------|--------
00:00 | Detect critical issue | Monitoring | ☐
00:05 | Alert team | Monitoring | ☐
00:10 | Assess impact | Dev Team | ☐
00:15 | Execute rollback | DB Admin | ☐
00:30 | Verify system stability | QA Team | ☐
00:45 | Notify users | Product Manager | ☐
```

## 🔄 Regular Maintenance

### Weekly:
- Review backup logs
- Check storage usage
- Monitor slow queries
- Validate user data integrity

### Monthly:
- Test restore procedures
- Update documentation
- Review security policies
- Optimize database performance

### Quarterly:
- Full disaster recovery test
- Security audit
- Performance review
- Capacity planning

---

**Last Updated**: 2025-12-17  
**Version**: 1.0  
**Next Review**: 2026-03-17