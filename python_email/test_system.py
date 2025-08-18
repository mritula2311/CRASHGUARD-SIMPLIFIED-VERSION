#!/usr/bin/env python3
"""
Simple test script to verify CrashGuard email system
"""

import json
from crashguard_integration import send_crash_alert_from_nodejs

def test_email():
    """Test the email system with sample data"""
    print("Testing CrashGuard Email System...")
    
    # Sample crash data
    test_data = {
        "location": "Test Location - Highway 101",
        "severity": "Medium", 
        "speed": 65,
        "recipient": "mritulashankar@gmail.com",
        "timestamp": "2025-08-18T12:00:00Z",
        "vehicleId": "TEST-001"
    }
    
    print(f"Sending test email to: {test_data['recipient']}")
    print(f"Test severity: {test_data['severity']}")
    
    # Send test email
    result = send_crash_alert_from_nodejs(json.dumps(test_data))
    
    print("\n=== RESULT ===")
    print(json.dumps(result, indent=2))
    
    if result.get('success'):
        print("\n✅ Email system is working!")
        if 'simulated' in result.get('message', '').lower():
            print("⚠️  Running in simulation mode (check Gmail credentials)")
        else:
            print("🚀 Real email sent successfully!")
    else:
        print("\n❌ Email system failed!")
        print(f"Error: {result.get('error', 'Unknown error')}")

if __name__ == "__main__":
    test_email()
