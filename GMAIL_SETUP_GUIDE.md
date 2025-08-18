# 🚀 Setup Instructions for crashguard123@gmail.com

## ✅ Current Status: 
- Email system configured for `crashguard123@gmail.com`
- System working in simulation mode
- Ready for Gmail App Password

---

## 📧 **STEP-BY-STEP GMAIL SETUP:**

### 1. **Access the Gmail Account**
- Go to Gmail and login to `crashguard123@gmail.com`
- Make sure you have access to this account

### 2. **Enable 2-Factor Authentication**
- Go to [Google Account Security](https://myaccount.google.com/security)
- Click "2-Step Verification" 
- Follow the setup process (phone number required)

### 3. **Generate App Password**
- After 2FA is enabled, go to [App Passwords](https://myaccount.google.com/apppasswords)
- Click "Select app" → Choose "Mail"
- Click "Select device" → Choose "Other" → Type "CrashGuard"
- Click "Generate"
- **Copy the 16-character password** (like: `abcd efgh ijkl mnop`)

### 4. **Update Credentials File**
Edit `python_email/oauth_credentials.json`:
```json
{
  "email": "crashguard123@gmail.com",
  "app_password": "abcdefghijklmnop"
}
```
⚠️ **Replace `abcdefghijklmnop` with your actual app password (no spaces)**

### 5. **Test the System**
```bash
cd python_email
python test_system.py
```

### 6. **Verify Real Emails**
- Check `mritulashankar@gmail.com` inbox
- Look for subject: "🚨 EMERGENCY CRASH ALERT"
- Should see real email instead of simulation

---

## 🔧 **Troubleshooting:**

**If you get "535 Username and Password not accepted":**
- Double-check the app password (16 characters, no spaces)
- Ensure 2FA is enabled on crashguard123@gmail.com
- Make sure you're using App Password, not regular password

**If 2FA setup fails:**
- Make sure you have phone access for verification
- Try using SMS instead of authenticator app
- Contact Google support if account is locked

---

## 🎯 **Expected Result:**
After setup, you should see:
```
✅ Email system is working!
🚀 Real email sent successfully!
```

Instead of:
```
⚠️ Running in simulation mode (check Gmail credentials)
```

---

**Need the app password for crashguard123@gmail.com to complete the setup!** 🔑
