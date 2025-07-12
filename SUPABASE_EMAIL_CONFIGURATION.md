# Supabase Email Configuration Guide

## 🔧 Required Supabase Dashboard Settings

### 1. Authentication Settings
Navigate to: **Supabase Dashboard → Authentication → Settings**

#### Email Confirmation Settings:
```json
{
  "Enable email confirmations": true,
  "Enable email change confirmations": true,
  "Enable signup": true,
  "Confirm email change with new email": true
}
```

#### Site URL Configuration:
```
Site URL: https://your-domain.com
Additional redirect URLs:
- http://localhost:5173/verify-email
- https://your-domain.com/verify-email
- https://your-preview-url.netlify.app/verify-email
```

### 2. Email Templates Configuration
Navigate to: **Supabase Dashboard → Authentication → Email Templates**

#### Confirm Signup Template:
```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your account:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your account</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>
```

#### Reset Password Template:
```html
<h2>Reset Password</h2>
<p>Follow this link to reset the password for your account:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>
```

### 3. SMTP Configuration (Production)
Navigate to: **Supabase Dashboard → Authentication → Settings → SMTP Settings**

#### Recommended Providers:

**Option 1: SendGrid (Recommended)**
```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Pass: [Your SendGrid API Key]
Sender Email: noreply@yourdomain.com
Sender Name: Personal Finance Manager
```

**Option 2: AWS SES**
```
SMTP Host: email-smtp.us-east-1.amazonaws.com
SMTP Port: 587
SMTP User: [Your AWS SES SMTP Username]
SMTP Pass: [Your AWS SES SMTP Password]
Sender Email: noreply@yourdomain.com
Sender Name: Personal Finance Manager
```

**Option 3: Mailgun**
```
SMTP Host: smtp.mailgun.org
SMTP Port: 587
SMTP User: [Your Mailgun SMTP Username]
SMTP Pass: [Your Mailgun SMTP Password]
Sender Email: noreply@yourdomain.com
Sender Name: Personal Finance Manager
```

## 🧪 Testing Email Configuration

### 1. Development Testing
```bash
# Test signup with email verification
curl -X POST 'https://your-project.supabase.co/auth/v1/signup' \
-H "apikey: YOUR_ANON_KEY" \
-H "Content-Type: application/json" \
-d '{
  "email": "test@example.com",
  "password": "testpassword123"
}'
```

### 2. Production Testing Checklist
- [ ] Test email delivery to Gmail
- [ ] Test email delivery to Outlook
- [ ] Test email delivery to Yahoo
- [ ] Check spam folder placement
- [ ] Verify email links work correctly
- [ ] Test email delivery speed (<30 seconds)

## 🔍 Troubleshooting Common Issues

### Issue 1: Emails Not Sending
**Symptoms**: Users don't receive verification emails
**Solutions**:
1. Check SMTP credentials in Supabase Dashboard
2. Verify sender email domain is authenticated
3. Check email provider rate limits
4. Review Supabase logs for SMTP errors

### Issue 2: Emails Going to Spam
**Symptoms**: Emails delivered to spam folder
**Solutions**:
1. Set up SPF record: `v=spf1 include:sendgrid.net ~all`
2. Set up DKIM authentication
3. Set up DMARC policy
4. Use authenticated sender domain

### Issue 3: Verification Links Not Working
**Symptoms**: Clicking email links shows errors
**Solutions**:
1. Check redirect URLs in Supabase settings
2. Verify site URL configuration
3. Ensure HTTPS is properly configured
4. Check for URL encoding issues

## 📧 Email Provider Setup Guides

### SendGrid Setup (Recommended)
1. Create SendGrid account
2. Verify sender identity
3. Generate API key with mail send permissions
4. Configure SMTP settings in Supabase
5. Set up domain authentication (optional but recommended)

### AWS SES Setup
1. Create AWS account and enable SES
2. Verify sender email/domain
3. Request production access (removes sending limits)
4. Generate SMTP credentials
5. Configure SMTP settings in Supabase

### Mailgun Setup
1. Create Mailgun account
2. Add and verify domain
3. Generate SMTP credentials
4. Configure SMTP settings in Supabase
5. Set up DNS records for domain authentication

## 🔐 Security Best Practices

### Email Security
- Use TLS/SSL for SMTP connections
- Implement rate limiting (handled by Supabase)
- Set email verification token expiration
- Monitor for abuse patterns

### Domain Authentication
- Set up SPF records
- Configure DKIM signing
- Implement DMARC policy
- Use dedicated sending domain

## 📊 Monitoring & Analytics

### Key Metrics to Track
- Email delivery rate (>95%)
- Email open rate (>20%)
- Click-through rate (>5%)
- Spam complaint rate (<0.1%)
- Bounce rate (<5%)

### Monitoring Tools
- Supabase Dashboard Analytics
- Email provider analytics (SendGrid, etc.)
- Custom event tracking in application
- Error monitoring (Sentry)

## 🚀 Production Deployment Checklist

### Pre-Deployment
- [ ] SMTP provider configured and tested
- [ ] Domain authentication set up
- [ ] Email templates customized
- [ ] Rate limiting configured
- [ ] Monitoring set up

### Post-Deployment
- [ ] Test email delivery in production
- [ ] Monitor delivery rates
- [ ] Check spam folder placement
- [ ] Verify all email links work
- [ ] Set up alerts for delivery failures

This configuration will ensure reliable email delivery for your authentication system.