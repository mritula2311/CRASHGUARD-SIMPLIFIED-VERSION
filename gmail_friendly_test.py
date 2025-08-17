#!/usr/bin/env python3
"""
Gmail-Friendly Email Test
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import datetime

def send_gmail_friendly_test():
    """Send a Gmail-friendly test email"""
    try:
        # Gmail SMTP configuration
        smtp_server = "smtp.gmail.com"
        smtp_port = 587
        sender_email = "crashguard1234@gmail.com"
        sender_password = "lhmj cfdv dwlo dmiv"
        recipient = "mritulashankar@gmail.com"
        
        # Create a more "normal" looking email
        message = MIMEMultipart()
        message["From"] = f"CrashGuard Support <{sender_email}>"
        message["To"] = recipient
        message["Subject"] = "CrashGuard System Status Update"
        
        # More professional, less "spammy" content
        body = f"""Hello,

This is a status update from your CrashGuard monitoring system.

System Information:
- Date: {datetime.datetime.now().strftime('%B %d, %Y')}
- Time: {datetime.datetime.now().strftime('%I:%M %p')}
- Status: System operational
- Email service: Working correctly

Your CrashGuard system is functioning properly and ready to send emergency alerts when needed.

Best regards,
CrashGuard Support Team

---
If you received this email, your CrashGuard email notifications are working correctly.
You can reply to this email if you have any questions."""
        
        message.attach(MIMEText(body, "plain"))
        
        # Send email
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, recipient, message.as_string())
            
        print("✅ Gmail-friendly test email sent successfully!")
        print("📧 Check your inbox - this should be less likely to go to spam")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    print("Gmail-Friendly Email Test")
    print("=" * 30)
    send_gmail_friendly_test()
