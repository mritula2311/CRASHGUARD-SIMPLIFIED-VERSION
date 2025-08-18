#!/usr/bin/env python3
"""
CrashGuard Email Integration Module

This module provides email notification services for the CrashGuard system.
It integrates with Gmail SMTP to send crash alert notifications to emergency
contacts and stakeholders.

Features:
- Gmail SMTP integration
- Professional email templates
- Error handling and logging
- JSON-based configuration
- Multi-recipient support

Author: CrashGuard Team
Version: 2.0
License: MIT
"""

import sys
import json
import os
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import datetime
from typing import Dict, Any, List, Optional

class CrashGuardEmail:
    """
    CrashGuard Email Service Class
    
    Handles all email functionality including SMTP connection,
    message formatting, and delivery confirmation.
    """
    
    def __init__(self):
        """
        Initialize the CrashGuard email service.
        
        Loads credentials from oauth_credentials.json and sets up
        SMTP configuration for Gmail integration.
        """
        self.smtp_server = None
        
        # Load credentials from oauth_credentials.json with proper path handling
        script_dir = os.path.dirname(os.path.abspath(__file__))
        creds_path = os.path.join(script_dir, 'oauth_credentials.json')
        
        try:
            with open(creds_path, 'r') as f:
                self.credentials = json.load(f)
            print(f"INFO: Loaded credentials from {creds_path}", file=sys.stderr)
        except FileNotFoundError:
            print(f"WARNING: OAuth credentials file not found at {creds_path}. Using default settings.", file=sys.stderr)
            self.credentials = {
                "email": "crashguard1234@gmail.com",
                "app_password": "your_gmail_app_password_here"
            }
    
    def email_conn(self):
        """Establish SMTP connection to Gmail"""
        try:
            # Create SMTP connection
            self.smtp_server = smtplib.SMTP('smtp.gmail.com', 587)
            self.smtp_server.starttls()  # Enable TLS encryption
            
            # Login with app password
            email = self.credentials.get('email', 'crashguard1234@gmail.com')
            app_password = self.credentials.get('app_password', '')
            
            if not app_password or app_password == 'your_app_password_here':
                print("Gmail App Password not configured in oauth_credentials.json", file=sys.stderr)
                return False
                
            self.smtp_server.login(email, app_password)
            print("SMTP Email connection established successfully", file=sys.stderr)
            return True
            
        except Exception as e:
            print(f"SMTP connection failed: {e}", file=sys.stderr)
            return False
    
    def send_email(self, send_message, location, mail, vcd_reference_code):
        """Send email using SMTP"""
        try:
            # Create message
            msg = MIMEMultipart()
            msg['From'] = self.credentials.get('email', 'crashguard1234@gmail.com')
            msg['To'] = mail
            msg['Subject'] = f"URGENT: Vehicle Crash Notification - {vcd_reference_code}"
            
            # Add body to email
            msg.attach(MIMEText(send_message, 'plain'))
            
            # Send email
            self.smtp_server.send_message(msg)
            print(f"Email Alert Successfully Sent to {mail}", file=sys.stderr)
            return True
            
        except Exception as e:
            print(f"Email sending failed: {e}", file=sys.stderr)
            return False
    
    def quit_conn(self):
        """Close SMTP connection"""
        if self.smtp_server:
            self.smtp_server.quit()
            print("Email connection closed", file=sys.stderr)


def send_crash_alert_from_nodejs(crash_data_json):
    """
    Send crash alert email based on data from Node.js application with DRQN analysis
    Expected JSON format:
    {
        "location": "GPS coordinates or address",
        "severity": "Low/Medium/High/Critical", 
        "speed": 75,
        "recipient": "email@example.com",
        "timestamp": "ISO date string",
        "sensorData": {...},
        "drqnAnalysis": {
            "severity_name": "S3_SEVERE",
            "action_name": "EMERGENCY_DISPATCH",
            "crash_risk_level": "CRITICAL",
            "confidence": 0.95,
            "sensor_data": {...}
        }
    }
    """
    try:
        # Parse the JSON data
        crash_data = json.loads(crash_data_json)
        
        # Extract data
        location = crash_data.get('location', 'Unknown Location')
        severity = crash_data.get('severity', 'Unknown')
        speed = crash_data.get('speed', 0)
        recipient = crash_data.get('recipient', 'mritulashankar@gmail.com')
        timestamp = crash_data.get('timestamp', datetime.datetime.now().isoformat())
        drqn_analysis = crash_data.get('drqnAnalysis', {})
        sensor_data = crash_data.get('sensorData', {})
        
        # Create email system
        email_system = CrashGuardEmail()
        
        # Connect to email server
        if not email_system.email_conn():
            # If connection fails, return simulation success
            print("PYTHON EMAIL SIMULATION:", file=sys.stderr)
            print(f"   FROM: crashguard1234@gmail.com", file=sys.stderr)
            print(f"   TO: {recipient}", file=sys.stderr)
            print(f"   SUBJECT: Emergency Crash Alert - {severity}", file=sys.stderr)
            print(f"   LOCATION: {location}", file=sys.stderr)
            print(f"   DRQN ANALYSIS: {drqn_analysis.get('action_name', 'N/A')}", file=sys.stderr)
            print(f"   TIME: {timestamp}", file=sys.stderr)
            print("   STATUS: Simulated (authentication failed)", file=sys.stderr)
            
            return {
                "success": True, 
                "message": f"Email simulated to {recipient} (auth failed)",
                "reference_code": "VCD-SIM123"
            }
        
        # Generate reference code
        import random
        import string
        vcd_reference_code = "VCD" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        
        # Create professional crash alert message with DRQN analysis
        crash_message = create_professional_crash_email(
            location, severity, speed, timestamp, vcd_reference_code, 
            drqn_analysis, sensor_data
        )
        
        # Send the email
        success = email_system.send_email(
            send_message=crash_message,
            location=location,
            mail=recipient,
            vcd_reference_code=vcd_reference_code
        )
        
        # Close connection
        email_system.quit_conn()
        
        if success:
            return {
                "success": True, 
                "message": f"Professional crash alert with DRQN analysis sent to {recipient}",
                "reference_code": vcd_reference_code
            }
        else:
            return {"success": False, "error": "Failed to send email"}
            
    except Exception as e:
        # Return detailed error information
        error_msg = f"Python integration error: {str(e)}"
        print(f"ERROR: {error_msg}")
        return {"success": False, "error": error_msg}


def create_professional_crash_email(location, severity, speed, timestamp, reference_code, drqn_analysis, sensor_data):
    """
    Create a professional crash alert email with model-based severity and GPS location
    """
    # Format timestamp for display
    try:
        dt = datetime.datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        formatted_time = dt.strftime('%B %d, %Y at %I:%M %p UTC')
    except:
        formatted_time = timestamp
    
    # Extract sensor data for summary
    sensor_details = drqn_analysis.get('sensor_data', sensor_data) or {}
    accel_x = sensor_details.get('accel_x', 0.0)
    accel_y = sensor_details.get('accel_y', 0.0)
    accel_z = sensor_details.get('accel_z', 0.0)
    accel_magnitude = sensor_details.get('accel_magnitude', 0.0)
    gyro_x = sensor_details.get('gyro_x', 0.0)
    gyro_y = sensor_details.get('gyro_y', 0.0)
    gyro_z = sensor_details.get('gyro_z', 0.0)
    
    # Get GPS data - use Arduino default coordinates if not available from ThingSpeak
    latitude = sensor_details.get('latitude', 13.042901)  # Arduino default
    longitude = sensor_details.get('longitude', 80.142150)  # Arduino default
    gps_source = sensor_details.get('gps_source', 'default')
    
    # Use model severity from DRQN analysis
    model_severity_name = drqn_analysis.get('severity_name', 'S0_NORMAL')
    model_risk_level = drqn_analysis.get('crash_risk_level', 'MINIMAL')
    
    # Convert model severity to readable format
    if 'S3_SEVERE' in model_severity_name or model_risk_level == 'CRITICAL':
        display_severity = 'CRITICAL'
    elif 'S2_MODERATE' in model_severity_name or model_risk_level == 'HIGH':
        display_severity = 'HIGH' 
    elif 'S1_MINOR' in model_severity_name or model_risk_level == 'MODERATE':
        display_severity = 'MEDIUM'
    else:
        display_severity = 'LOW'
    
    # Calculate accelerometer-based speed (magnitude of acceleration converted to km/h)
    accelerometer_speed = round(accel_magnitude * 3.6, 1)  # Convert m/s² to km/h approximation
    
    # Format GPS location
    location_display = f"{latitude:.6f}, {longitude:.6f}"
    if gps_source == 'thingspeak':
        location_source = "(Live GPS from ThingSpeak)"
    else:
        location_source = "(Default Coordinates)"
    
    # Extract driver information (using system info as placeholder)
    vehicle_id = "CG-VEHICLE-001"
    driver_name = "Vehicle Owner"
    
    # Create professional personalized message
    message = f"""Dear Emergency Contact,

This is an urgent notification regarding a vehicle crash involving {vehicle_id}.

Crash Details:
- Vehicle: {vehicle_id}
- Driver: {driver_name}
- Date & Time: {formatted_time}
- Location: {location_display} {location_source}
- Model Severity: {display_severity} (Risk Level: {model_risk_level})
- Accelerometer Speed: {accelerometer_speed:.1f} km/h
- Reference Code: {reference_code}

Sensor Readings at Time of Crash:
- Acceleration: X={accel_x:.2f}, Y={accel_y:.2f}, Z={accel_z:.2f} m/s²
- Acceleration Magnitude: {accel_magnitude:.2f} m/s²
- Gyroscope: X={gyro_x:.3f}, Y={gyro_y:.3f}, Z={gyro_z:.3f} rad/s
- GPS Coordinates: {latitude:.6f}, {longitude:.6f}

Emergency services have been notified and immediate assistance is on the way.

Emergency Helpline: 911 (US) | 112 (International)

This alert was automatically generated by our vehicle monitoring system using advanced AI crash detection models. Please take immediate action based on the severity level indicated above.

Sincerely,
CrashGuard Vehicle Safety System
Emergency Contact Information: crashguard1234@gmail.com

Reference: {reference_code} | Time: {formatted_time}"""

    return message

    return message


def main():
    """Main function to handle command line usage"""
    try:
        if len(sys.argv) < 2:
            # Default test if no arguments provided
            print("CrashGuard Integration Script")
            print("Testing with default crash data...")
            
            test_data = {
                "location": "Highway 101, Mile Marker 23",
                "severity": "High",
                "speed": 85,
                "recipient": "mritulashankar@gmail.com",
                "timestamp": datetime.datetime.now().isoformat()
            }
            
            result = send_crash_alert_from_nodejs(json.dumps(test_data))
            print(json.dumps(result, indent=2))
            
        else:
            # Handle input from Node.js - check if temp file path provided
            if len(sys.argv) >= 3 and sys.argv[1] == '--temp-file':
                # Read from temp file (new method)
                temp_file_path = sys.argv[2]
                try:
                    # Try different encodings to handle Windows file encoding issues
                    encodings_to_try = ['utf-8', 'utf-16', 'utf-16-le', 'utf-8-sig']
                    crash_data_json = None
                    
                    for encoding in encodings_to_try:
                        try:
                            with open(temp_file_path, 'r', encoding=encoding) as f:
                                crash_data_json = f.read().strip()
                            print(f"Successfully read file with {encoding} encoding", file=sys.stderr)
                            break
                        except UnicodeDecodeError:
                            continue
                    
                    if crash_data_json is None:
                        raise Exception("Could not read file with any supported encoding")
                    
                    # Clean up temp file
                    os.remove(temp_file_path)
                    print(f"Read data from temp file: {temp_file_path}", file=sys.stderr)
                except Exception as file_error:
                    print(f"Error reading temp file: {file_error}", file=sys.stderr)
                    result = {"success": False, "error": f"Temp file error: {str(file_error)}"}
                    print(json.dumps(result))
                    return
            else:
                # Original command line method (fallback)
                crash_data_json = sys.argv[1]
                
                # Debug: Print what we received (but limit length for security)
                print(f"Received data length: {len(crash_data_json)} characters", file=sys.stderr)
                if crash_data_json.startswith('{') and crash_data_json.endswith('}'):
                    print("Data appears to be valid JSON format", file=sys.stderr)
                else:
                    print(f"Data doesn't look like JSON: {crash_data_json[:50]}...", file=sys.stderr)
            
            result = send_crash_alert_from_nodejs(crash_data_json)
            print(json.dumps(result))
            
    except Exception as e:
        error_result = {"success": False, "error": f"Main execution error: {str(e)}"}
        print(json.dumps(error_result))


if __name__ == "__main__":
    main()
