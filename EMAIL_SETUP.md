# Email Setup Instructions

## To configure your personal email for crash alerts:

### 1. Update Emergency Contact
Edit the file: `src/services/emergency-contacts.ts`

Replace the contact information:
```typescript
{
  id: '1',
  name: 'Personal Alert',
  phone: '+1-YOUR-PHONE',
  email: 'your.email@example.com', // Replace with your actual email
  relation: 'Other',
  priority: 1
}
```

### 2. Configure Email Service
Edit the file: `src/app/actions.ts`

Make sure your email service is properly configured to send emails. You may need to:
- Set up SMTP credentials
- Configure email service provider (Gmail, Outlook, etc.)
- Set up app passwords if using Gmail

### 3. Test the System
- Use the "Test Crash Alert" button in the Quick Actions section
- Check your email for crash alert notifications
- Verify GPS location and sensor data are included in the email

## Email Content
Your crash alerts will include:
- Crash detection message
- GPS coordinates and location accuracy
- Sensor data (vibration, acceleration, tilt)
- AI model prediction and confidence level
- Timestamp of the incident

## Features Removed:
- ✅ Multiple emergency contacts (now just your email)
- ✅ 5-second automatic refresh (now loads once)
- ✅ Complex emergency response workflows
- ✅ Google Maps integration (placeholder added)

## Simplified Features:
- ✅ Personal email notifications only
- ✅ Clean dashboard layout with proper alignment
- ✅ Real-time sensor data from AI model
- ✅ GPS tracking with coordinates
- ✅ Simple crash detection alerts
