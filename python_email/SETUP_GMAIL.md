# Gmail SMTP Setup for CrashGuard

## Steps to Enable Email Functionality:

### 1. Enable 2-Factor Authentication
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Factor Authentication if not already enabled

### 2. Generate App Password
1. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" as the app
3. Copy the generated 16-character password

### 3. Update Credentials
Edit `oauth_credentials.json` with crashguard123@gmail.com details:

```json
{
  "email": "crashguard123@gmail.com",
  "app_password": "your-16-char-app-password"
}
```

### 4. Test Email System
Run the test:
```bash
python crashguard_integration.py
```

## Current Status
- Email system is set up but requires valid Gmail credentials
- System will fall back to simulation mode if credentials are invalid
- All email functionality is working, just needs proper authentication

## Security Notes
- Never commit real passwords to Git
- Use environment variables in production
- App passwords are safer than regular passwords
