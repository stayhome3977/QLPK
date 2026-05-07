# Email Configuration Guide

## Gmail SMTP Configuration for Production

### Issue
Email sending works locally but fails in production deployment on Render.

### Root Cause
Gmail's security policies require an **App Password** for third-party applications, especially when deployed to production environments.

### Solution

#### 1. Generate Gmail App Password
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Enable **2-Step Verification** if not already enabled
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Select:
   - **App**: Mail
   - **Device**: Other (Custom name)
   - **Name**: QLPK Backend Production
5. Copy the generated 16-character password

#### 2. Update Environment Variables
Update your Render environment variables:

```bash
# Email Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-16-character-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=QLPK Hospital System
```

**Important**: The app password should be a continuous 16-character string without spaces.

#### 3. Gmail Settings
Ensure these Gmail settings are configured:
- **Less secure app access**: OFF (recommended)
- **2-Step Verification**: ON (required for App Passwords)
- **IMAP/POP access**: Enabled

### Alternative Email Services

If Gmail continues to have issues, consider these alternatives:

#### SendGrid
```bash
SMTP_SERVER=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=YOUR_SENDGRID_API_KEY
FROM_EMAIL=noreply@yourdomain.com
```

#### Brevo (Sendinblue)
```bash
SMTP_SERVER=smtp-relay.sendinblue.com
SMTP_PORT=587
SMTP_USERNAME=your-email@example.com
SMTP_PASSWORD=YOUR_BREVO_API_KEY
FROM_EMAIL=noreply@yourdomain.com
```

### Testing Email Configuration

Use this Python script to test email configuration:

```python
import smtplib
from email.mime.text import MIMEText

def test_email_config():
    smtp_server = "smtp.gmail.com"
    smtp_port = 587
    smtp_username = "your-email@gmail.com"
    smtp_password = "your-app-password"
    
    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        print("✅ Email configuration is valid")
        server.quit()
    except Exception as e:
        print(f"❌ Email configuration failed: {e}")

if __name__ == "__main__":
    test_email_config()
```

### Deployment Checklist

- [ ] Generate Gmail App Password
- [ ] Update environment variables in Render
- [ ] Test email configuration
- [ ] Redeploy application
- [ ] Verify registration with email verification

### Common Issues

1. **"Application-specific password required"**
   - Solution: Use Gmail App Password instead of regular password

2. **"Too many bad auth attempts"**
   - Solution: Wait a few hours and retry with correct App Password

3. **"Connection timed out"**
   - Solution: Check firewall settings and SMTP port accessibility

4. **"SSL/TLS handshake failed"**
   - Solution: Ensure STARTTLS is used (port 587)

### Monitoring

The enhanced email service now includes:
- Retry mechanism (3 attempts)
- Detailed error logging
- Configuration validation
- Exponential backoff between retries

Check your Render logs for detailed email sending status.
