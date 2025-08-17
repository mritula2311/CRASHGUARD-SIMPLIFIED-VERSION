#!/usr/bin/env python3
"""Test the full CrashGuard email system with real delivery"""

from test_email import CrashGuardEmail
import json

def test_crash_alert():
    """Test sending a real crash alert email"""
    print("Testing CrashGuard Crash Alert with Real Email Delivery...")
    
    try:
        # Initialize email system
        email_system = CrashGuardEmail()
        
        # Prepare crash alert data
        location = "Highway 101, Near Shopping Mall Exit"
        recipient = "mritulashankar@gmail.com"
        vcd_reference_code = "CG-REAL-TEST-001"
        
        crash_message = """CRITICAL VEHICLE CRASH DETECTED

Severity: CRITICAL
Speed at Impact: 85 mph
Impact Force: High
Vehicle ID: CG-TEST-001

EMERGENCY RESPONSE REQUIRED

Immediate attention and emergency services dispatch recommended."""
        
        # Send crash alert using the correct method signature
        result = email_system.send_email_enhanced(
            send_message=crash_message,
            location=location,
            mail=recipient,
            vcd_reference_code=vcd_reference_code
        )
        
        print("SUCCESS! Real crash alert email sent!")
        print(f"Delivered to: {recipient}")
        print(f"Location: {location}")
        print(f"Reference: {vcd_reference_code}")
        print("Check your email inbox for the crash alert!")
            
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_crash_alert()
