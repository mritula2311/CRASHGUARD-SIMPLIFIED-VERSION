#!/usr/bin/env python3
"""
Direct SMTP Test for CrashGuard Email System
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import datetime

def test_smtp_direct():
    """Test direct SMTP connection to Gmail"""
    try:
        # Gmail SMTP configuration
        smtp_server = "smtp.gmail.com"
        smtp_port = 587
        sender_email = "crashguard1234@gmail.com"
        sender_password = "lhmj cfdv dwlo dmiv"  # App Password
        recipient = "mritulashankar@gmail.com"
        
        print("Testing SMTP connection...")
        
        # Create message
        message = MIMEMultipart()
        message["From"] = f"CrashGuard Test <{sender_email}>"
        message["To"] = recipient
        message["Subject"] = "CrashGuard SMTP Test - " + datetime.datetime.now().strftime("%H:%M:%S")
        
        body = f"""This is a test email from CrashGuard system.

Time: {datetime.datetime.now()}
Test: Direct SMTP connection test
Purpose: Verify email delivery to {recipient}

If you receive this email, the SMTP configuration is working correctly.

---
CrashGuard Test System"""
        
        message.attach(MIMEText(body, "plain"))
        
        # Create SMTP session
        print("Connecting to Gmail SMTP...")
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            print("Starting TLS...")
            server.starttls()
            print("Logging in...")
            server.login(sender_email, sender_password)
            print("Sending email...")
            text = message.as_string()
            server.sendmail(sender_email, recipient, text)
            print(f"✅ Test email sent successfully to {recipient}")
            
        return True
        
    except Exception as e:
        print(f"❌ SMTP test failed: {e}")
        return False

if __name__ == "__main__":
    print("CrashGuard SMTP Direct Test")
    print("=" * 40)
    success = test_smtp_direct()
    if success:
        print("✅ SMTP test completed successfully")
        print("Check your email inbox and spam folder")
    else:
        print("❌ SMTP test failed")
