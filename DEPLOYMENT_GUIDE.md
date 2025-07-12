# Production Deployment Guide

## Overview
This guide covers the complete deployment process for the Personal Finance Manager application to production.

## Prerequisites

### Required Accounts & Services
1. **Supabase Account** - Database and authentication
2. **Netlify Account** - Hosting and deployment
3. **Sentry Account** (Optional) - Error tracking
4. **GitHub Account** - Source code and CI/CD

### Required Environment Variables
```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Error Tracking (Optional)
VITE_SENTRY_DSN=your_sentry_dsn

# CI/CD Secrets (GitHub)
NETLIFY_SITE_ID=your_netlify_site_id
NETLIFY_AUTH_TOKEN=your_netlify_auth_token
LHCI_GITHUB_APP_TOKEN=your_lighthouse_ci_token
```

## Pre-Deployment Checklist

### 1. Code Quality
- [ ] All tests passing (`npm run test`)
- [ ] No linting errors (`npm run lint`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Security audit clean (`npm run security:audit`)

### 2. Performance
- [ ] Lighthouse scores meet requirements
- [ ] Bundle size optimized
- [ ] Performance budgets met

### 3. Security
- [ ] Environment variables configured
- [ ] Security headers configured in `netlify.toml`
- [ ] Content Security Policy implemented
- [ ] Input validation in place

### 4. Database
- [ ] Production Supabase project created
- [ ] Database migrations applied
- [ ] RLS policies configured
- [ ] Backup strategy in place

## Deployment Steps

### 1. Supabase Setup

#### Create Production Project
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create new project
3. Note the project URL and anon key
4. Configure authentication settings

#### Apply Database Schema
```sql
-- Run the migration file in Supabase SQL Editor
-- File: supabase/migrations/20250712114911_ancient_shadow.sql
```

#### Configure RLS Policies
Ensure all tables have proper Row Level Security policies:
- Users can only access their own data
- Authenticated users required for all operations
- Proper foreign key constraints

### 2. Netlify Deployment

#### Initial Setup
1. Connect GitHub repository to Netlify
2. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: `18`

#### Environment Variables
Add in Netlify dashboard under Site Settings > Environment Variables:
```
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_anon_key
VITE_SENTRY_DSN=your_sentry_dsn (optional)
```

#### Deploy
1. Push to main branch triggers automatic deployment
2. Monitor build logs for any issues
3. Verify deployment at your Netlify URL

### 3. Domain Configuration

#### Custom Domain (Optional)
1. Add custom domain in Netlify
2. Configure DNS records
3. Enable HTTPS (automatic with Netlify)

#### Security Headers
The `netlify.toml` file includes:
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Referrer Policy
- Cache Control headers

### 4. Monitoring Setup

#### Error Tracking
If using Sentry:
1. Create Sentry project
2. Add DSN to environment variables
3. Verify error reporting works

#### Performance Monitoring
- Netlify Analytics (built-in)
- Lighthouse CI (automated)
- Custom performance metrics

#### Uptime Monitoring
Set up external monitoring:
- UptimeRobot
- Pingdom
- StatusCake

## Post-Deployment Verification

### 1. Functional Testing
- [ ] User registration works
- [ ] User login works
- [ ] All CRUD operations function
- [ ] Data persistence verified
- [ ] Exchange rate API working

### 2. Performance Testing
- [ ] Page load times < 3 seconds
- [ ] Lighthouse scores meet targets
- [ ] No memory leaks detected
- [ ] Mobile performance acceptable

### 3. Security Testing
- [ ] HTTPS enforced
- [ ] Security headers present
- [ ] No sensitive data exposed
- [ ] Authentication working properly

### 4. Error Handling
- [ ] Error boundaries working
- [ ] User-friendly error messages
- [ ] Error tracking functional
- [ ] Graceful degradation

## Rollback Procedures

### Application Rollback
1. **Netlify**: Deploy previous version
   ```bash
   # Via Netlify CLI
   netlify deploy --prod --dir=dist
   ```

2. **GitHub**: Revert commit and redeploy
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

### Database Rollback
1. **Backup**: Ensure recent backup exists
2. **Migration**: Create rollback migration if needed
3. **Restore**: Use Supabase dashboard or CLI

## Maintenance

### Regular Tasks
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Update dependencies monthly
- [ ] Review security logs
- [ ] Backup verification

### Scaling Considerations
- **Database**: Monitor Supabase usage
- **CDN**: Netlify handles automatically
- **API Limits**: Monitor exchange rate API usage

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check build logs
npm run build

# Common fixes
npm ci  # Clean install
rm -rf node_modules package-lock.json && npm install
```

#### Environment Variables
- Verify all required variables are set
- Check variable names (case sensitive)
- Ensure no trailing spaces

#### Database Connection
- Verify Supabase URL and key
- Check RLS policies
- Confirm user permissions

#### Performance Issues
- Check bundle size
- Verify caching headers
- Monitor API response times

### Support Contacts
- **Supabase**: [Support](https://supabase.com/support)
- **Netlify**: [Support](https://www.netlify.com/support/)
- **Application**: Check error tracking dashboard

## Security Considerations

### Data Protection
- All data encrypted in transit (HTTPS)
- Database encryption at rest (Supabase)
- No sensitive data in client-side code

### Access Control
- Authentication required for all operations
- Row Level Security enforced
- API keys properly secured

### Monitoring
- Error tracking for security events
- Failed login attempt monitoring
- Unusual activity detection

## Backup Strategy

### Automated Backups
- **Database**: Supabase automatic backups
- **Code**: GitHub repository
- **Configuration**: Environment variables documented

### Recovery Testing
- Test backup restoration quarterly
- Verify data integrity
- Document recovery procedures

## Performance Optimization

### Current Optimizations
- Bundle splitting and lazy loading
- Image optimization
- Caching strategies
- CDN delivery

### Monitoring
- Core Web Vitals tracking
- Performance budgets enforced
- Regular performance audits

This deployment guide ensures a secure, performant, and maintainable production deployment of the Personal Finance Manager application.