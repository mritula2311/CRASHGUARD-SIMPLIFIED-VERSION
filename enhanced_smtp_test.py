#!/usr/bin/env python3
"""
Enhanced SMTP Test with Detailed Logging
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import datetime

def test_smtp_with_logging():
    """Test SMTP with detailed logging"""
    try:
        # Gmail SMTP configuration
        smtp_server = "smtp.gmail.com"
        smtp_port = 587
        sender_email = "crashguard1234@gmail.com"
        sender_password = "lhmj cfdv dwlo dmiv"
        recipient = "mritulashankar@gmail.com"
        
        print("Enhanced SMTP Test with Logging")
        print("=" * 50)
        print(f"From: {sender_email}")
        print(f"To: {recipient}")
        print(f"Time: {datetime.datetime.now()}")
        print("-" * 50)
        
        # Create message
        message = MIMEMultipart()
        message["From"] = f"CrashGuard Alert System <{sender_email}>"
        message["To"] = recipient
        message["Subject"] = f"🚨 CrashGuard Test Alert - {datetime.datetime.now().strftime('%H:%M:%S')}"
        message["Reply-To"] = sender_email
        
        body = f"""🚨 CRASHGUARD TEST ALERT 🚨

This is a test email from the CrashGuard Emergency Alert System.

TEST DETAILS:
- Sent: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
- From: CrashGuard Alert System
- To: {recipient}
- Method: Gmail SMTP with App Password
- Purpose: Email delivery verification

IMPORTANT: If you receive this email, the CrashGuard email system is working correctly.

If this email goes to spam, please mark it as "Not Spam" to ensure future crash alerts are delivered to your inbox.

---
CrashGuard Emergency Alert System
Automated Test Email"""
        
        message.attach(MIMEText(body, "plain"))
        
        # Create SMTP session with detailed logging
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.set_debuglevel(1)  # Enable debug output
        
        print("Starting TLS encryption...")
        server.starttls()
        
        print("Authenticating with Gmail...")
        server.login(sender_email, sender_password)
        
        print("Sending email message...")
        result = server.sendmail(sender_email, [recipient], message.as_string())
        
        print("Closing connection...")
        server.quit()
        
        print("-" * 50)
        print("📧 EMAIL SENT SUCCESSFULLY!")
        print(f"✅ Delivered to: {recipient}")
        print(f"✅ Time: {datetime.datetime.now()}")
        print("✅ SMTP Response: Success")
        
        if result:
            print(f"⚠️  SMTP Warnings: {result}")
        else:
            print("✅ No SMTP errors or warnings")
            
        print("\n📋 NEXT STEPS:")
        print("1. Check your Gmail inbox")
        print("2. Check Gmail Spam folder")
        print("3. Check Gmail Promotions tab")
        print("4. If found in spam, mark as 'Not Spam'")
        
        return True
        
    except Exception as e:
        print(f"❌ Enhanced SMTP test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_smtp_with_logging()
