"""
CrashGuard Direct Dashboard Integration Module

This module handles the integration between ThingSpeak IoT sensors and the dashboard,
providing real-time crash detection using Advanced DRQN neural network.

Features:
- Live ThingSpeak data streaming
- Advanced DRQN machine learning predictions  
- Email alert system for crash detection
- Real-time dashboard updates
- Professional logging and monitoring

Author: CrashGuard Team
Version: 2.0
"""

import time
import json
import os
import sys
import logging
from datetime import datetime
from typing import Dict, Any, Optional

from thingspeak_live_processor import ThingSpeakLiveDataProcessor
from simple_drqn import get_drqn_instance as get_simple_drqn
from advanced_drqn import get_advanced_drqn_instance, AdvancedDRQN

# Configure email system
sys.path.append(os.path.join(os.path.dirname(__file__), 'python_email'))

try:
    from crashguard_integration import send_crash_alert_from_nodejs
    EMAIL_AVAILABLE = True
    print("INFO: Email system loaded successfully")
except ImportError:
    EMAIL_AVAILABLE = False
    print("WARNING: Email system not available - alerts will be logged only")

# Configure logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def send_crash_alert_email(sensor_data: Dict[str, Any], analysis: Dict[str, Any], 
                          prediction: Dict[str, Any], cycle_count: int) -> bool:
    """
    Send email alert for crash detection
    
    Args:
        sensor_data: Processed sensor data from ThingSpeak
        analysis: Risk analysis results
        prediction: DRQN model predictions
        cycle_count: Current monitoring cycle number
        
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        if not EMAIL_AVAILABLE:
            logger.info("Email system not available - alert logged only")
            return False
        
        # Extract data for email
        risk_level = analysis.get('risk_assessment', {}).get('overall_risk', 'unknown')
        crash_prob = prediction.get('crash_probability', 0)
        confidence = prediction.get('confidence', 0)
        
        # Create email data structure
        email_data = {
            "location": "Vehicle Location (GPS not available)",
            "severity": risk_level.title(),
            "speed": 0,  # Speed not available in current sensor setup
            "recipient": "mritulashankar@gmail.com",
            "timestamp": datetime.now().isoformat(),
            "crash_data": {
                "cycle": cycle_count,
                "acceleration": {
                    "magnitude": sensor_data.get("acceleration", {}).get("magnitude", 0),
                    "x": sensor_data.get("acceleration", {}).get("x", 0),
                    "y": sensor_data.get("acceleration", {}).get("y", 0),
                    "z": sensor_data.get("acceleration", {}).get("z", 0)
                },
                "gyroscope": {
                    "magnitude": sensor_data.get("gyroscope", {}).get("magnitude", 0),
                    "x": sensor_data.get("gyroscope", {}).get("x", 0),
                    "y": sensor_data.get("gyroscope", {}).get("y", 0),
                    "z": sensor_data.get("gyroscope", {}).get("z", 0)
                },
                "vibration": {
                    "active_sensors": sensor_data.get("vibration", {}).get("total_active", 0),
                    "total_sensors": 6
                },
                "ai_prediction": {
                    "crash_probability": crash_prob,
                    "confidence": confidence,
                    "risk_level": risk_level,
                    "recommended_action": prediction.get("recommended_action", "unknown")
                }
            }
        }
        
        # Send email
        email_json = json.dumps(email_data)
        result = send_crash_alert_from_nodejs(email_json)
        
        if result and result.get("success"):
            logger.info(f"Crash alert email sent successfully! Reference: {result.get('reference_code', 'N/A')}")
            print(f"EMAIL ALERT SENT: {risk_level.upper()} risk detected!")
            print(f"Reference: {result.get('reference_code', 'N/A')}")
            return True
        else:
            logger.error(f"Failed to send crash alert email: {result}")
            return False
            
    except Exception as e:
        logger.error(f"Error sending crash alert email: {e}")
        return False

def main():
    """
    Main function to run the CrashGuard monitoring system
    
    Initializes the ThingSpeak processor and Advanced DRQN model,
    then continuously monitors sensor data and updates the dashboard.
    """
    print("CrashGuard Advanced Dashboard Integration System")
    print("=" * 60)
    print("LEARNING MODE - Advanced DRQN with Environment Learning")
    print("Data Flow: ThingSpeak -> Advanced DRQN -> Dashboard -> Email Alerts")
    print("AI learns from environment and improves predictions")
    print("Pure ThingSpeak streaming with machine learning")
    print(f"Dashboard: http://localhost:9003")
    print("\nPress Ctrl+C to stop...")
    print("-" * 60)
    
    try:
        # Initialize processor in non-streaming mode to save to JSON
        processor = ThingSpeakLiveDataProcessor(streaming_mode=False)
        logger.info(f"Initialized dashboard processor for {len(processor.channels)} channels")
        
        # Initialize Advanced DRQN model 
        advanced_drqn = get_advanced_drqn_instance()
        logger.info("Advanced DRQN with Learning initialized")
        
        # Show learning stats
        stats = advanced_drqn.get_learning_stats()
        print(f"DRQN Learning Status:")
        print(f"   Steps: {stats['step_count']}")
        print(f"   Training Count: {stats['training_count']}")
        print(f"   Exploration Rate: {stats['epsilon']:.3f}")
        print(f"   Experience Buffer: {stats['experience_buffer_size']} samples")
        print("-" * 60)
        
        # Ensure output directory exists
        output_file = processor.config.get("dashboard_output_file", "src/data/live_sensor_data.json")
        output_dir = os.path.dirname(output_file)
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            logger.info(f"Created output directory: {output_dir}")
        
        update_interval = processor.config.get("update_interval", 5)
        logger.info(f"Starting dashboard updates (every {update_interval}s)")
        print(f"Monitoring channels: {list(processor.channels.keys())}")
        print(f"Update interval: {update_interval} seconds")
        print(f"Live data file: {output_file}")
        print("-" * 60)
        
        cycle_count = 0
        
        while True:
            cycle_count += 1
            logger.info(f"--- Dashboard Update Cycle {cycle_count} ---")
            
            try:
                # Fetch live data from ThingSpeak
                channel_data = processor.fetch_live_sensor_data()
                
                if channel_data:
                    # DETAILED CHANNEL VALUES PRINTING
                    print("\n" + "="*80)
                    print(f"ThingSpeak Channel Values - Cycle {cycle_count}")
                    print("="*80)
                    
                    # Print all channel data in detail
                    for channel_name, data in channel_data.items():
                        print(f"\n{channel_name.upper()} CHANNEL:")
                        if isinstance(data, list) and len(data) > 0:
                            latest_entry = data[-1]  # Get latest data
                            print(f"   Raw Data: {latest_entry}")
                            
                            # Extract specific fields for each channel type
                            if 'field' in str(latest_entry):
                                for key, value in latest_entry.items():
                                    if key.startswith('field'):
                                        print(f"   {key}: {value}")
                                    elif key in ['created_at', 'entry_id']:
                                        print(f"   {key}: {value}")
                        else:
                            print(f"   No data available")
                    
                    print("="*80)
                    
                    # Process the data
                    processed_data = processor.process_thingspeak_data(channel_data)
                    
                    if processed_data:
                        # PROCESSED SENSOR VALUES
                        print(f"\nPROCESSED SENSOR VALUES:")
                        print("-"*50)
                        
                        # Acceleration details
                        if "acceleration" in processed_data:
                            acc_data = processed_data["acceleration"]
                            print(f"ACCELERATION:")
                            print(f"   X-axis: {acc_data.get('x', 0):.4f} m/s²")
                            print(f"   Y-axis: {acc_data.get('y', 0):.4f} m/s²") 
                            print(f"   Z-axis: {acc_data.get('z', 0):.4f} m/s²")
                            print(f"   Magnitude: {acc_data.get('magnitude', 0):.4f} m/s²")
                            print(f"   Timestamp: {acc_data.get('timestamp', 'N/A')}")

                        # Gyroscope details
                        if "gyroscope" in processed_data:
                            gyro_data = processed_data["gyroscope"]
                            print(f"\nGYROSCOPE:")
                            print(f"   X-axis: {gyro_data.get('x', 0):.4f} °/s")
                            print(f"   Y-axis: {gyro_data.get('y', 0):.4f} °/s")
                            print(f"   Z-axis: {gyro_data.get('z', 0):.4f} °/s")
                            print(f"   Magnitude: {gyro_data.get('magnitude', 0):.4f} °/s")
                            print(f"   Timestamp: {gyro_data.get('timestamp', 'N/A')}")

                        # Vibration details
                        if "vibration" in processed_data:
                            vib_data = processed_data["vibration"]
                            print(f"\nVIBRATION SENSORS:")
                            print(f"   Front Left: {vib_data.get('front_left', 0)}")
                            print(f"   Front Right: {vib_data.get('front_right', 0)}")
                            print(f"   Mid Left: {vib_data.get('mid_left', 0)}")
                            print(f"   Mid Right: {vib_data.get('mid_right', 0)}")
                            print(f"   Rear Left: {vib_data.get('rear_left', 0)}")
                            print(f"   Rear Right: {vib_data.get('rear_right', 0)}")
                            print(f"   Total Active: {vib_data.get('total_active', 0)}/6")
                            print(f"   Timestamp: {vib_data.get('timestamp', 'N/A')}")
                        
                        print("-"*50)
                    
                    if processed_data:
                        # Analyze for crash conditions
                        analysis = processor.analyze_sensor_data(processed_data)
                        
                        # Generate DRQN AI prediction using Advanced DRQN with Learning
                        model_pred = advanced_drqn.predict(processed_data)
                        
                        # AI MODEL PREDICTION DETAILS
                        print(f"\nADVANCED DRQN AI MODEL PREDICTIONS (LEARNING):")
                        print("-"*50)
                        print(f"Risk Level: {model_pred.get('risk_level', 'unknown').upper()}")
                        print(f"Confidence: {model_pred.get('confidence', 0):.2%}")
                        print(f"Crash Probability: {model_pred.get('crash_probability', 0):.2%}")
                        print(f"Recommended Action: {model_pred.get('recommended_action', 'unknown').replace('_', ' ').title()}")
                        print(f"Model Version: {model_pred.get('model_version', 'unknown')}")
                        
                        # Learning-specific information
                        if 'step_count' in model_pred:
                            print(f"Learning Step: {model_pred.get('step_count', 0)}")
                        if 'epsilon' in model_pred:
                            print(f"Exploration Rate: {model_pred.get('epsilon', 0):.3f}")
                        if 'reward' in model_pred:
                            print(f"Current Reward: {model_pred.get('reward', 0):.2f}")
                        if 'reasoning' in model_pred:
                            print(f"AI Reasoning: {model_pred.get('reasoning', 'No reasoning available')}")
                        
                        # Q-Values and Action Probabilities
                        if 'q_values' in model_pred:
                            q_vals = model_pred['q_values']
                            print(f"Q-Values: {[f'{q:.4f}' for q in q_vals]}")
                        
                        if 'action_probabilities' in model_pred:
                            action_probs = model_pred['action_probabilities'] 
                            actions = ['Normal', 'Caution', 'Alert', 'Emergency']
                            print(f"Action Probabilities:")
                            for i, prob in enumerate(action_probs):
                                if i < len(actions):
                                    print(f"   {actions[i]}: {prob:.2%}")
                        
                        print("-"*50)
                        print(f"RISK ASSESSMENT: {analysis.get('risk_assessment', {}).get('overall_risk', 'unknown').upper()}")
                        print("="*80)
                        
                        # EMAIL ALERT SYSTEM
                        risk_level = analysis.get('risk_assessment', {}).get('overall_risk', 'unknown')
                        crash_prob = model_pred.get('crash_probability', 0)
                        
                        # Send email alert for high-risk situations
                        if risk_level in ['critical', 'high'] or crash_prob > 0.7:
                            send_crash_alert_email(processed_data, analysis, model_pred, cycle_count)
                            
                        # Alert for high-risk situations
                        if risk_level in ['critical', 'high']:
                            print(f"HIGH RISK DETECTED - {risk_level.upper()}!")
                            print(f"AI Crash Probability: {crash_prob:.1%}")
                            logger.warning(f"HIGH RISK: {risk_level.upper()} - Crash Prob: {crash_prob:.1%}")
                            if EMAIL_AVAILABLE:
                                logger.warning("Email alert triggered for high-risk detection!")
                        elif crash_prob > 0.7:
                            print(f"AI HIGH CRASH PROBABILITY: {crash_prob:.1%}")
                            logger.warning(f"AI ALERT: High crash probability detected - {crash_prob:.1%}")
                            if EMAIL_AVAILABLE:
                                logger.warning("Email alert triggered for AI crash prediction!")
                        
                        print("="*80)
                        
                        # Create dashboard data structure with learning info
                        dashboard_data = {
                            "timestamp": datetime.now().isoformat(),
                            "data_source": "thingspeak_live_advanced_drqn",
                            
                            # Direct sensor data from ThingSpeak
                            "acceleration": processed_data.get("acceleration", {}),
                            "gyroscope": processed_data.get("gyroscope", {}),
                            "vibration": processed_data.get("vibration", {}),
                            
                            # Risk assessment
                            "risk_assessment": analysis.get("risk_assessment", {}),
                            
                            # Advanced DRQN AI model prediction with learning stats
                            "model_prediction": model_pred,
                            
                            # Learning statistics
                            "learning_stats": advanced_drqn.get_learning_stats(),
                            
                            # Live status
                            "live_status": {
                                "connected": True,
                                "last_update": datetime.now().isoformat(),
                                "channels_active": len(channel_data),
                                "data_quality": "excellent",
                                "mode": "advanced_drqn_learning",
                                "ai_version": "Advanced DRQN v1.0"
                            }
                        }
                        
                        # Save directly to the file that dashboard API reads
                        with open(output_file, 'w') as f:
                            json.dump(dashboard_data, f, indent=2)
                        
                        # Log summary with AI metrics
                        accel_mag = processed_data.get("acceleration", {}).get("magnitude", 0)
                        gyro_mag = processed_data.get("gyroscope", {}).get("magnitude", 0)
                        vib_active = processed_data.get("vibration", {}).get("total_active", 0)
                        risk_level = analysis.get("risk_assessment", {}).get("overall_risk", "unknown")
                        ai_confidence = model_pred.get("confidence", 0)
                        crash_prob = model_pred.get("crash_probability", 0)
                        
                        logger.info(f"✅ Dashboard Updated {cycle_count}: "
                                  f"Accel={accel_mag:.3f}m/s², Gyro={gyro_mag:.3f}°/s, "
                                  f"Vib={vib_active}/6, Risk={risk_level.upper()}, "
                                  f"AI_Confidence={ai_confidence:.1%}, Crash_Prob={crash_prob:.1%}")
                        
                        # Alert for high-risk situations
                        if risk_level in ['critical', 'high']:
                            print(f"🚨 HIGH RISK DETECTED - {risk_level.upper()}!")
                            print(f"🧠 AI Crash Probability: {crash_prob:.1%}")
                            logger.warning(f"HIGH RISK: {risk_level.upper()} - Crash Prob: {crash_prob:.1%}")
                            
                    else:
                        logger.warning(f"❌ Failed to process sensor data in cycle {cycle_count}")
                        
                        # Create error data for dashboard
                        error_data = {
                            "timestamp": datetime.now().isoformat(),
                            "data_source": "processing_error",
                            "error": "Failed to process ThingSpeak sensor data",
                            "live_status": {
                                "connected": False,
                                "last_update": datetime.now().isoformat(),
                                "channels_active": 0,
                                "data_quality": "processing_error"
                            }
                        }
                        
                        with open(output_file, 'w') as f:
                            json.dump(error_data, f, indent=2)
                else:
                    logger.warning(f"No data received from ThingSpeak in cycle {cycle_count}")
                    
                    # Create no-data status for dashboard
                    no_data = {
                        "timestamp": datetime.now().isoformat(),
                        "data_source": "no_thingspeak_data",
                        "error": "No data received from ThingSpeak channels",
                        "live_status": {
                            "connected": False,
                            "last_update": datetime.now().isoformat(),
                            "channels_active": 0,
                            "data_quality": "no_data"
                        }
                    }
                    
                    with open(output_file, 'w') as f:
                        json.dump(no_data, f, indent=2)
                
            except Exception as e:
                logger.error(f"Error in dashboard update cycle {cycle_count}: {e}")
                
                # Create error data for dashboard
                error_data = {
                    "timestamp": datetime.now().isoformat(),
                    "data_source": "system_error",
                    "error": str(e),
                    "live_status": {
                        "connected": False,
                        "last_update": datetime.now().isoformat(),
                        "channels_active": 0,
                        "data_quality": "system_error"
                    }
                }
                
                with open(output_file, 'w') as f:
                    json.dump(error_data, f, indent=2)
            
            # Wait before next dashboard update
            time.sleep(update_interval)
            
    except KeyboardInterrupt:
        print("\nStopping CrashGuard dashboard integration...")
        logger.info("CrashGuard system stopped by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        print(f"Fatal error: {e}")

if __name__ == "__main__":
    main()
