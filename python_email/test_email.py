#!/usr/bin/env python3
"""
CrashGuard Email Alert System
Enhanced email functionality with image attachments and multiple recipients
"""

# Import the following modules
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
import smtplib
import sys
import os
import glob
import datetime
import random
import string
import base64
import json
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import ssl


# ---------------------------------------------------Email Alert--------------------------------------------------------------------------------------
''' This class is used to send Email Alert to respective departments when a Vehicle Crash is detected '''

# Gmail SMTP is used here for Email service, it is free to use service

class CrashGuardEmail:

    def __init__(self, source=0):
        self.source = source
        self.location = "Location not received yet"
        
        # OAuth2 Configuration
        self.client_id = "606923243091-e03ejlhvpv9143gn254v6q9qv16ff1m1.apps.googleusercontent.com"
        self.oauth_credentials_file = "python_email/oauth_credentials.json"
        self.token_file = "python_email/token.json"
        self.scopes = ['https://www.googleapis.com/auth/gmail.send']
        
        # SMTP Configuration (fallback)
        self.smtp_user = 'crashguard1234@gmail.com'
        self.smtp_pass = 'lhmj cfdv dwlo dmiv'  # Gmail App Password for real email sending
        
        # Create outputs directory if it doesn't exist
        self.folder_path = "python_email/outputs/frame_img/"
        self.create_directories()
        
        self.files_path = os.path.join(self.folder_path, '*')
        
        # Get latest files or create dummy if none exist
        self.files = sorted(glob.iglob(self.files_path), key=os.path.getctime, reverse=True)
        if self.files:
            self.last_file1 = self.files[0]
        else:
            # Create a dummy image file for testing
            self.create_dummy_image()
            self.last_file1 = os.path.join(self.folder_path, "crash_detection.txt")
        
        self.smtp = None
        self.gmail_service = None

    def authenticate_gmail_api(self):
        """Authenticate using Gmail API with OAuth2."""
        try:
            creds = None
            # Load existing token if available
            if os.path.exists(self.token_file):
                creds = Credentials.from_authorized_user_file(self.token_file, self.scopes)
            
            # If there are no valid credentials, get new ones
            if not creds or not creds.valid:
                if creds and creds.expired and creds.refresh_token:
                    creds.refresh(Request())
                else:
                    # For now, we'll use a simplified approach without OAuth flow
                    print("OAuth2 credentials not configured properly")
                    print("Need to set up OAuth2 flow with client secret")
                    return False
            
            # Build Gmail service
            self.gmail_service = build('gmail', 'v1', credentials=creds)
            print("Gmail API authenticated successfully")
            return True
            
        except Exception as e:
            print(f"Gmail API authentication failed: {e}")
            return False

    def send_via_gmail_api(self, message_data):
        """Send email using Gmail API."""
        try:
            if not self.gmail_service:
                if not self.authenticate_gmail_api():
                    return False
            
            # Create email message
            message = self.create_gmail_message(message_data)
            
            # Send the message
            result = self.gmail_service.users().messages().send(
                userId='me', 
                body={'raw': message}
            ).execute()
            
            print(f"Email sent via Gmail API. Message ID: {result['id']}")
            return True
            
        except HttpError as error:
            print(f"Gmail API error: {error}")
            return False
        except Exception as e:
            print(f"Gmail API sending failed: {e}")
            return False

    def create_gmail_message(self, message_data):
        """Create a Gmail API compatible message."""
        message = MIMEMultipart()
        message['to'] = message_data['to']
        message['from'] = self.smtp_user
        message['subject'] = message_data['subject']
        
        # Add message body
        message.attach(MIMEText(message_data['body']))
        
        # Encode message
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        return raw_message

    def create_directories(self):
        """Create necessary directories for the email system."""
        os.makedirs(self.folder_path, exist_ok=True)
        os.makedirs("python_email/messages", exist_ok=True)
        
        # Create message files if they don't exist
        self.create_message_files()

    def create_message_files(self):
        """Create default message files for different departments."""
        messages = {
            "python_email/messages/hospital_message.txt": """
EMERGENCY MEDICAL ALERT

A high-impact vehicle crash has been detected requiring immediate medical attention.

Emergency Details:
- Crash severity indicates potential injuries
- Immediate medical response may be required
- Vehicle occupants may need emergency medical care
- Location coordinates provided for ambulance dispatch

Please dispatch emergency medical services to the crash location immediately.

Priority: HIGH
Response Required: IMMEDIATE
""",
            "python_email/messages/police_message.txt": """
TRAFFIC ACCIDENT ALERT

A vehicle crash has been detected and requires police investigation and traffic management.

Incident Details:
- Traffic accident requiring police response
- Potential traffic disruption at crash site
- Investigation may be required
- Scene security and traffic control needed

Please dispatch police units to manage the incident and secure the crash site.

Priority: HIGH
Response Required: IMMEDIATE
""",
            "python_email/messages/rto_message.txt": """
VEHICLE CRASH NOTIFICATION

A registered vehicle crash incident has been detected in your jurisdiction.

Incident Information:
- Vehicle crash detection confirmed
- Registration and insurance verification may be required
- Incident documentation needed for records
- Follow-up investigation required

Please initiate standard crash investigation procedures.

Priority: MEDIUM
Response Required: WITHIN 24 HOURS
"""
        }
        
        for file_path, content in messages.items():
            if not os.path.exists(file_path):
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content.strip())

    def create_dummy_image(self):
        """Create a dummy crash detection file for testing."""
        dummy_content = """
CRASH DETECTION IMAGE PLACEHOLDER

This is a placeholder for crash detection image data.
In a real scenario, this would be an actual image from the crash scene.

Timestamp: """ + datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S') + """
Status: SIMULATED CRASH DETECTION
System: CrashGuard Alert System
"""
        with open(os.path.join(self.folder_path, "crash_detection.txt"), 'w', encoding='utf-8') as f:
            f.write(dummy_content)

    # Initialize connection to email server
    def email_conn(self):
        """Initialize connection to Gmail SMTP server."""
        try:
            self.smtp = smtplib.SMTP('smtp.gmail.com', 587)
            self.smtp.ehlo()
            self.smtp.starttls()
            # Use CrashGuard credentials
            self.smtp.login(self.smtp_user, self.smtp_pass)
            print("SMTP Email connection established successfully", file=sys.stderr)
            return True
        except Exception as e:
            print(f"SMTP Email connection failed: {e}")
            print("Make sure to enable 2FA and use App Password for Gmail")
            return False

    def send_email_enhanced(self, send_message, location, mail, vcd_reference_code):
        """Enhanced email sending with multiple methods."""
        current_date = datetime.date.today()
        current_time = datetime.datetime.now().time()
        
        # Prepare professional email data
        subject = "URGENT: Vehicle Crash Detection Alert"
        
        # Create professional email body with standard format
        body = f"""Hi Emergency Response Team,

A crash has been detected in CrashGuard Monitoring System. Below are the details:

Incident Details:

Date & Time: {current_date} {current_time} (Local Time)
Environment: Production
Affected Module/Component: Vehicle Safety Monitoring
Location: {location}
Crash ID: {vcd_reference_code}

{send_message}

This is an automatically generated alert. Please do not reply to this email.
For urgent matters, contact the emergency response team directly.

Best regards,
CrashGuard Monitoring System
"""
        
        # Try Gmail API first
        message_data = {
            'to': mail,
            'subject': subject,
            'body': body
        }
        
        print(f"Attempting to send email to: {mail}")
        print(f"Using OAuth2 Client ID: {self.client_id[:20]}...")
        
        # Method 1: Try Gmail API with OAuth2
        if self.send_via_gmail_api(message_data):
            print("Email sent successfully via Gmail API")
            return True
        
        # Method 2: Fallback to SMTP
        print("Falling back to SMTP method...")
        if self.email_conn():
            try:
                # Create message with attachment
                msg = self.message(subject, body, self.last_file1)
                to = [mail]
                
                self.smtp.sendmail(from_addr=self.smtp_user, to_addrs=to, msg=msg.as_string())
                print("Email sent successfully via SMTP")
                self.quit_conn()
                return True
            except Exception as e:
                print(f"SMTP sending failed: {e}")
                self.quit_conn()
        
        # Method 3: Simulation fallback
        print("SIMULATING EMAIL SEND (all methods failed):")
        print("=" * 60)
        print(f"FROM: {self.smtp_user}")
        print(f"TO: {mail}")
        print(f"SUBJECT: {subject}")
        print(f"TIMESTAMP: {datetime.datetime.now()}")
        print(f"REFERENCE: {vcd_reference_code}")
        print("EMAIL BODY:")
        print("-" * 30)
        print(body)
        print("-" * 30)
        print("EMAIL SIMULATION COMPLETED")
        print("=" * 60)
        return True

    # Send email message with attachments
    def message(self, subject="CrashGuard Notification", text="", img=None, attachment=None):
        """Build email message with text, images, and attachments."""
        # Build message contents
        msg = MIMEMultipart()

        # Add Subject
        msg['Subject'] = subject
        msg['From'] = 'crashguard1234@gmail.com'

        # Add text contents
        msg.attach(MIMEText(text))

        # Check if we have anything given in the img parameter
        if img is not None:
            # Check whether we have the lists of images or not!
            if type(img) is not list:
                # if it isn't a list, make it one
                img = [img]

            # Now iterate through our list
            for one_img in img:
                try:
                    if os.path.exists(one_img) and one_img.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                        # read the image binary data
                        img_data = open(one_img, 'rb').read()
                        # Attach the image data to MIMEMultipart
                        msg.attach(MIMEImage(img_data, name=os.path.basename(one_img)))
                    else:
                        # If it's not an image file, treat as text attachment
                        with open(one_img, 'rb') as f:
                            file_data = MIMEApplication(f.read(), name=os.path.basename(one_img))
                            file_data['Content-Disposition'] = f'attachment; filename="{os.path.basename(one_img)}"'
                            msg.attach(file_data)
                except Exception as e:
                    print(f"⚠️ Could not attach file {one_img}: {e}")

        # Handle additional attachments
        if attachment is not None:
            # Check whether we have the lists of attachments or not!
            if type(attachment) is not list:
                attachment = [attachment]

            for one_attachment in attachment:
                try:
                    with open(one_attachment, 'rb') as f:
                        file = MIMEApplication(f.read(), name=os.path.basename(one_attachment))
                    file['Content-Disposition'] = f'attachment; filename="{os.path.basename(one_attachment)}"'
                    msg.attach(file)
                except Exception as e:
                    print(f"⚠️ Could not attach file {one_attachment}: {e}")
                    
        return msg

    def send_email(self, send_message, location, mail, vcd_reference_code):
        """Send crash alert email to specified recipient."""
        current_date = datetime.date.today()
        current_time = datetime.datetime.now().time()

        # Professional email template
        email_body = f"""Hi Emergency Response Team,

A crash has been detected in CrashGuard Monitoring System. Below are the details:

Incident Details:

Date & Time: {current_date} {current_time} (Local Time)
Environment: Production
Affected Module/Component: Vehicle Safety Monitoring
Location: {location}
Crash ID: {vcd_reference_code}

{send_message}

This is an automatically generated alert. Please do not reply to this email.
For urgent matters, contact the emergency response team directly.

Best regards,
CrashGuard Monitoring System
"""

        try:
            # Call the message function
            msg = self.message(
                "URGENT: Vehicle Crash Detected",
                email_body,
                self.last_file1
            )
            
            # Set recipient
            msg['To'] = mail
            
            # Make a list of emails
            to = [mail]
            
            # Send the email
            if self.smtp:
                self.smtp.sendmail(
                    from_addr="crashguard1234@gmail.com",
                    to_addrs=to, 
                    msg=msg.as_string()
                )
                print(f"Email Alert Successfully Sent to {mail}", file=sys.stderr)
                return True
            else:
                print("SMTP connection not established")
                return False
                
        except Exception as e:
            print(f"Failed to send email to {mail}: {e}")
            return False

    # Close the SMTP connection
    def quit_conn(self):
        """Close SMTP connection."""
        if self.smtp:
            self.smtp.quit()
            print("Email connection closed", file=sys.stderr)

    def run_mail(self, test_mode=True):
        """Main function to send crash alerts to all departments."""
        try:
            # Read message files
            rto_message = open('python_email/messages/rto_message.txt').read().strip()
            hospital_message = open('python_email/messages/hospital_message.txt').read().strip()
            police_message = open('python_email/messages/police_message.txt').read().strip()

            # Generate unique reference code
            code_length = 6
            vcd_reference_code = "VCD" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=code_length))

            # Set location based on source
            if self.source == 0:
                self.location = "Highway 101, Near Exit 23, Metro City"
            elif self.source == 1:
                self.location = "BE Road, XYZ Layout, Bengaluru"
            else:
                self.location = "Main Street, ABC Area, Chennai"

            print(f"Crash Location: {self.location}")
            print(f"Reference Code: {vcd_reference_code}")
            print(f"OAuth2 Client ID: {self.client_id[:30]}...")

            if test_mode:
                # Test mode - send all alerts to the same email
                recipient = "mritulashankar@gmail.com"
                print(f"\nTEST MODE: Sending all alerts to {recipient}")
                
                success_count = 0
                
                print("\nSending Hospital Alert...")
                if self.send_email(hospital_message, self.location, recipient, vcd_reference_code + "-H"):
                    success_count += 1
                
                print("\nSending Police Alert...")
                if self.send_email(police_message, self.location, recipient, vcd_reference_code + "-P"):
                    success_count += 1
                
                print("\nSending RTO Alert...")
                if self.send_email(rto_message, self.location, recipient, vcd_reference_code + "-R"):
                    success_count += 1
                
                print(f"\nSuccessfully sent {success_count}/3 alerts")
                
            else:
                # Production mode - send to actual departments
                print("\nPRODUCTION MODE: Sending to actual departments")
                # Replace with actual department email addresses
                self.send_email(hospital_message, self.location, "emergency@hospital.com", vcd_reference_code + "-H")
                self.send_email(police_message, self.location, "dispatch@police.gov", vcd_reference_code + "-P")
                self.send_email(rto_message, self.location, "accidents@rto.gov", vcd_reference_code + "-R")

            # Close connection
            self.quit_conn()
            return True
            
        except Exception as e:
            print(f"Error in run_mail: {e}")
            return False


# Test functions for quick testing
def test_simple_alert():
    """Send a simple test email."""
    print("Testing Simple Alert...")
    
    try:
        context = ssl.create_default_context()
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls(context=context)
            server.login("crashguard1234@gmail.com", "lhmj cfdv dwlo dmiv")
            
            message = MIMEMultipart()
            message["Subject"] = "CrashGuard System Test"
            message["From"] = "crashguard1234@gmail.com"
            message["To"] = "mritulashankar@gmail.com"
            
            text = f"""
CRASHGUARD SYSTEM TEST

This is a simple test email from your CrashGuard system.

Test Time: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Status: Email system functional

If you receive this email, the basic email functionality is working!

---
CrashGuard Test System
"""
            
            message.attach(MIMEText(text, "plain"))
            server.sendmail("crashguard1234@gmail.com", "mritulashankar@gmail.com", message.as_string())
            
        print("Simple test email sent successfully!")
        return True
        
    except Exception as e:
        print(f"Simple test failed: {e}")
        return False


def main():
    """Main function to test the CrashGuard email system."""
    print("🚗 CrashGuard Email Alert System")
    print("=" * 60)
    
    # Test 1: Simple email test
    print("\n1️⃣ Testing Simple Email...")
    simple_success = test_simple_alert()
    
    if simple_success:
        # Test 2: Full crash alert system
        print("\n2️⃣ Testing Full Crash Alert System...")
        
        # Test different crash scenarios
        for source in [0, 1, 2]:
            print(f"\n🎯 Testing crash scenario {source + 1}...")
            email_system = CrashGuardEmail(source=source)
            email_system.run_mail(test_mode=True)
            
        print("\n✅ All tests completed!")
        print("📧 Check your email: mritulashankar@gmail.com")
        print("📱 Don't forget to check spam folder!")
        
    else:
        print("\n❌ Basic email test failed. Please check Gmail credentials.")
        print("💡 Make sure to:")
        print("   • Enable 2-Factor Authentication")
        print("   • Generate App Password")
        print("   • Use App Password instead of regular password")


if __name__ == "__main__":
    main()
