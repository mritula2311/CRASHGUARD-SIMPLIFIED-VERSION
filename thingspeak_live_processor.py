"""
CrashGuard ThingSpeak Live Data Integration
Fetches real-time sensor data from ThingSpeak and processes it through the DRQN model
"""

import json
import requests
import numpy as np
import time
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
import os
import sys

# Import DRQN model
try:
    from drqn_model import get_drqn_instance
    DRQN_AVAILABLE = True
    DRQN_TYPE = "PyTorch"
except ImportError:
    try:
        from simple_drqn import get_drqn_instance
        DRQN_AVAILABLE = True
        DRQN_TYPE = "NumPy"
        print("Using Simple DRQN (NumPy-based)")
    except ImportError:
        DRQN_AVAILABLE = False
        DRQN_TYPE = "None"
        print("Warning: No DRQN model available - using rule-based prediction")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ThingSpeakLiveDataProcessor:
    """Processes live sensor data from ThingSpeak for CrashGuard system"""
    
    def __init__(self, config_path: str = "config/thingspeak_config.json", streaming_mode: bool = False):
        """Initialize the ThingSpeak data processor
        
        Args:
            config_path: Path to configuration file
            streaming_mode: If True, disable JSON file saving and use streaming only
        """
        self.config = self._load_config(config_path)
        self.streaming_mode = streaming_mode
        
        if self.streaming_mode:
            logger.info("🌊 STREAMING MODE: JSON file saving disabled - direct data streaming")
        
        # Multi-channel ThingSpeak configuration
        self.channels = self.config.get("channels", {})
        self.base_url = "https://api.thingspeak.com/channels"
        
        # Data processing configuration
        self.sequence_length = self.config.get("sequence_length", 10)
        self.update_interval = self.config.get("update_interval", 5)  # seconds
        
        # Initialize data storage
        self.sensor_history = []
        self.max_history = 100
        
        # Crash detection thresholds
        self.crash_thresholds = self.config.get("crash_thresholds", {
            "acceleration_threshold": 15.0,  # m/s²
            "vibration_threshold": 3,        # sensor units (digital)
            "gyro_threshold": 500.0,         # degrees/sec
            "confidence_threshold": 0.8      # model confidence
        })
        
        logger.info(f"ThingSpeak processor initialized - Channels: {list(self.channels.keys())}")
    
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load ThingSpeak configuration from JSON file"""
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.error(f"Config file {config_path} not found, creating default config")
            return self._create_default_config(config_path)
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON in config file {config_path}")
            return self._create_default_config(config_path)
    
    def _create_default_config(self, config_path: str) -> Dict[str, Any]:
        """Create default configuration file"""
        default_config = {
            "channel_id": "YOUR_THINGSPEAK_CHANNEL_ID",
            "read_api_key": "YOUR_THINGSPEAK_READ_API_KEY",
            "sequence_length": 10,
            "update_interval": 5,
            "dashboard_output_file": "../src/data/live_sensor_data.json",
            "enable_email_alerts": True,
            "field_mappings": {
                "field1": "vibration_x",
                "field2": "vibration_y", 
                "field3": "vibration_z",
                "field4": "acceleration_x",
                "field5": "acceleration_y",
                "field6": "acceleration_z",
                "field7": "tilt_angle"
            }
        }
        
        # Create config directory
        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        
        with open(config_path, 'w') as f:
            json.dump(default_config, f, indent=2)
        
        logger.info(f"Created default config file: {config_path}")
        return default_config
    
    def fetch_live_sensor_data(self, results: int = 1) -> Optional[Dict[str, Any]]:
        """Fetch live sensor data from all configured ThingSpeak channels"""
        all_sensor_data = {}
        
        # Fetch data from each configured channel
        for channel_type in ['acceleration', 'gyroscope', 'vibration']:
            if channel_type in self.channels:
                channel_data = self.fetch_channel_data(channel_type, results)
                if channel_data:
                    all_sensor_data[channel_type] = channel_data
                else:
                    logger.warning(f"No data received from {channel_type} channel")
        
        if not all_sensor_data:
            logger.error("No data received from any configured channels")
            return None
            
        logger.info(f"Successfully fetched data from {len(all_sensor_data)} channels")
        return all_sensor_data
    
    def fetch_channel_data(self, channel_type: str, results: int = 1) -> Optional[List[Dict]]:
        """Fetch data from a specific ThingSpeak channel"""
        if channel_type not in self.channels:
            logger.error(f"Channel type '{channel_type}' not configured")
            return None
            
        channel_config = self.channels[channel_type]
        channel_id = channel_config.get("channel_id", "")
        api_key = channel_config.get("read_api_key", "")
        
        if not channel_id or channel_id.startswith("YOUR_"):
            logger.error(f"Channel ID not configured for {channel_type}")
            return None
            
        try:
            url = f"{self.base_url}/{channel_id}/feeds.json"
            params = {"results": results}
            
            if api_key and not api_key.startswith("YOUR_"):
                params["api_key"] = api_key
            
            logger.info(f"Fetching {channel_type} data from: {url}")
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            feeds = data.get('feeds', [])
            
            if not feeds:
                logger.warning(f"No data received from {channel_type} channel")
                return []
                
            logger.info(f"Retrieved {len(feeds)} records from {channel_type} channel")
            return feeds
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching {channel_type} data: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error fetching {channel_type} data: {e}")
            return None
    
    def process_thingspeak_data(self, channel_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process raw ThingSpeak multi-channel response into structured sensor data"""
        if not channel_data:
            logger.error("No valid ThingSpeak data to process")
            return None
        
        processed_data = {
            "timestamp": datetime.now().isoformat(),
            "data_source": "thingspeak_live",
            "acceleration": {},
            "gyroscope": {},
            "vibration": {}
        }
        
        try:
            # Process Acceleration data
            if 'acceleration' in channel_data and channel_data['acceleration']:
                accel_feed = channel_data['acceleration'][-1]  # Latest data
                x = float(accel_feed.get("field1", 0.0)) if accel_feed.get("field1") else 0.0
                y = float(accel_feed.get("field2", 0.0)) if accel_feed.get("field2") else 0.0
                z = float(accel_feed.get("field3", 0.0)) if accel_feed.get("field3") else 0.0
                # Calculate magnitude from x, y, z components
                magnitude = np.sqrt(x**2 + y**2 + z**2)
                processed_data["acceleration"] = {
                    "x": x,
                    "y": y,
                    "z": z,
                    "magnitude": round(magnitude, 3),
                    "timestamp": accel_feed.get("created_at", "")
                }
            
            # Process Gyroscope data
            if 'gyroscope' in channel_data and channel_data['gyroscope']:
                gyro_feed = channel_data['gyroscope'][-1]  # Latest data
                x = float(gyro_feed.get("field1", 0.0)) if gyro_feed.get("field1") else 0.0
                y = float(gyro_feed.get("field2", 0.0)) if gyro_feed.get("field2") else 0.0
                z = float(gyro_feed.get("field3", 0.0)) if gyro_feed.get("field3") else 0.0
                # Calculate magnitude from x, y, z components
                magnitude = np.sqrt(x**2 + y**2 + z**2)
                processed_data["gyroscope"] = {
                    "x": x,
                    "y": y,
                    "z": z,
                    "magnitude": round(magnitude, 3),
                    "timestamp": gyro_feed.get("created_at", "")
                }
            
            # Process Vibration data (digital sensors)
            if 'vibration' in channel_data and channel_data['vibration']:
                vib_feed = channel_data['vibration'][-1]  # Latest data
                processed_data["vibration"] = {
                    "front_left": int(vib_feed.get("field1", 0)) if vib_feed.get("field1") else 0,
                    "front_right": int(vib_feed.get("field2", 0)) if vib_feed.get("field2") else 0,
                    "mid_left": int(vib_feed.get("field3", 0)) if vib_feed.get("field3") else 0,
                    "mid_right": int(vib_feed.get("field4", 0)) if vib_feed.get("field4") else 0,
                    "rear_left": int(vib_feed.get("field5", 0)) if vib_feed.get("field5") else 0,
                    "rear_right": int(vib_feed.get("field6", 0)) if vib_feed.get("field6") else 0,
                    "total_active": 0,  # Will be calculated
                    "timestamp": vib_feed.get("created_at", "")
                }
                
                # Calculate total active vibration sensors
                vib_sensors = [
                    processed_data["vibration"]["front_left"],
                    processed_data["vibration"]["front_right"],
                    processed_data["vibration"]["mid_left"],
                    processed_data["vibration"]["mid_right"],
                    processed_data["vibration"]["rear_left"],
                    processed_data["vibration"]["rear_right"]
                ]
                processed_data["vibration"]["total_active"] = sum(vib_sensors)
            
            logger.info(f"Processed multi-channel sensor data - "
                       f"Accel: {processed_data['acceleration'].get('magnitude', 0):.2f} m/s², "
                       f"Gyro: {processed_data['gyroscope'].get('magnitude', 0):.2f} deg/s, "
                       f"Vib: {processed_data['vibration'].get('total_active', 0)} sensors active")
            
            return processed_data
            
        except (ValueError, TypeError) as e:
            logger.error(f"Error processing ThingSpeak sensor data: {e}")
            return None
            logger.error(f"Error parsing sensor values: {e}")
            logger.error(f"Raw feed data: {latest_feed}")
            return None
    
    def analyze_sensor_data(self, sensor_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze live sensor data for crash conditions"""
        if not sensor_data:
            return {"error": "No sensor data to analyze"}
        
        # Extract sensor values safely
        accel_mag = sensor_data.get("acceleration", {}).get("magnitude", 0.0)
        gyro_mag = sensor_data.get("gyroscope", {}).get("magnitude", 0.0)
        vib_active = sensor_data.get("vibration", {}).get("total_active", 0)
        
        analysis = {
            "timestamp": datetime.now().isoformat(),
            "data_quality": "good",
            "sensor_status": {
                "acceleration_active": accel_mag > 0.1,
                "gyroscope_active": gyro_mag > 0.1,
                "vibration_sensors_active": vib_active > 0,
                "total_vibration_count": vib_active
            },
            
            # Crash risk assessment
            "risk_assessment": {
                "acceleration_level": self._assess_acceleration_level(accel_mag),
                "gyroscope_level": self._assess_gyroscope_level(gyro_mag),
                "vibration_level": self._assess_vibration_level(vib_active),
                "overall_risk": "normal"  # Will be calculated
            },
            
            # Threshold checks
            "threshold_checks": {
                "high_acceleration": accel_mag > self.crash_thresholds["acceleration_threshold"],
                "high_rotation": gyro_mag > self.crash_thresholds["gyro_threshold"],
                "excessive_vibration": vib_active >= self.crash_thresholds["vibration_threshold"]
            },
            
            # Current sensor readings
            "current_readings": {
                "acceleration_magnitude": round(accel_mag, 3),
                "gyroscope_magnitude": round(gyro_mag, 3),
                "vibration_sensors_triggered": vib_active
            }
        }
        
        # Determine overall risk level
        risk_levels = [analysis["risk_assessment"][key] for key in ["acceleration_level", "gyroscope_level", "vibration_level"]]
        if "critical" in risk_levels:
            analysis["risk_assessment"]["overall_risk"] = "critical"
        elif "high" in risk_levels:
            analysis["risk_assessment"]["overall_risk"] = "high" 
        elif "medium" in risk_levels:
            analysis["risk_assessment"]["overall_risk"] = "medium"
        else:
            analysis["risk_assessment"]["overall_risk"] = "normal"
        
        return analysis
    
    def _assess_acceleration_level(self, magnitude: float) -> str:
        """Assess acceleration risk level"""
        if magnitude > 20: return "critical"
        elif magnitude > 12: return "high"
        elif magnitude > 6: return "medium"
        else: return "normal"
    
    def _assess_gyroscope_level(self, magnitude: float) -> str:
        """Assess gyroscope rotation risk level"""
        if magnitude > 1000: return "critical"
        elif magnitude > 600: return "high"
        elif magnitude > 300: return "medium"
        else: return "normal"
    
    def _assess_vibration_level(self, active_sensors: int) -> str:
        """Assess vibration risk level based on number of active sensors"""
        if active_sensors >= 5: return "critical"
        elif active_sensors >= 4: return "high"
        elif active_sensors >= 2: return "medium"
        else: return "normal"
    
    def generate_model_prediction(self, sensor_data: Dict[str, Any], analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Generate AI model prediction from live sensor data using DRQN"""
        if not sensor_data or not analysis:
            return self._get_error_prediction()
        
        try:
            if DRQN_AVAILABLE:
                # Use actual DRQN model for prediction
                drqn_model = get_drqn_instance()
                drqn_prediction = drqn_model.predict(sensor_data)
                
                # Extract features for additional analysis
                accel_data = sensor_data.get("acceleration", {})
                gyro_data = sensor_data.get("gyroscope", {})
                vib_data = sensor_data.get("vibration", {})
                
                # Prepare feature analysis
                features = {
                    "acceleration_magnitude": accel_data.get("magnitude", 0.0),
                    "gyroscope_magnitude": gyro_data.get("magnitude", 0.0),
                    "vibration_sensors_active": vib_data.get("total_active", 0),
                    "acceleration_components": [
                        accel_data.get("x", 0.0),
                        accel_data.get("y", 0.0),
                        accel_data.get("z", 0.0)
                    ],
                    "gyroscope_components": [
                        gyro_data.get("x", 0.0),
                        gyro_data.get("y", 0.0),
                        gyro_data.get("z", 0.0)
                    ],
                    "vibration_pattern": [
                        vib_data.get("front_left", 0),
                        vib_data.get("front_right", 0),
                        vib_data.get("mid_left", 0),
                        vib_data.get("mid_right", 0),
                        vib_data.get("rear_left", 0),
                        vib_data.get("rear_right", 0)
                    ]
                }
                
                # Combine DRQN prediction with feature analysis
                return {
                    "model_prediction": {
                        "risk_level": drqn_prediction["risk_level"],
                        "confidence": drqn_prediction["confidence"],
                        "recommended_action": drqn_prediction["recommended_action"],
                        "crash_probability": drqn_prediction["crash_probability"],
                        "model_version": drqn_prediction["model_version"],
                        "timestamp": drqn_prediction["timestamp"],
                        "q_values": drqn_prediction.get("q_values", []),
                        "action_probabilities": drqn_prediction.get("action_probabilities", [])
                    },
                    "feature_analysis": {
                        "primary_risk_factors": self._identify_risk_factors(features),
                        "sensor_contributions": self._calculate_sensor_weights(features),
                        "prediction_reasoning": drqn_prediction.get("reasoning", "DRQN-based prediction"),
                        "sequence_length": drqn_prediction.get("sequence_length", 0),
                        "model_type": "DRQN_Neural_Network"
                    },
                    "raw_features": features
                }
            else:
                # Fallback to rule-based prediction if DRQN not available
                return self._fallback_rule_based_prediction(sensor_data, analysis)
                
        except Exception as e:
            logger.error(f"Error in DRQN prediction: {e}")
            return self._fallback_rule_based_prediction(sensor_data, analysis)
    
    def _fallback_rule_based_prediction(self, sensor_data: Dict[str, Any], analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback rule-based prediction when DRQN is not available"""
        # Extract sensor values safely
        accel_data = sensor_data.get("acceleration", {})
        gyro_data = sensor_data.get("gyroscope", {})
        vib_data = sensor_data.get("vibration", {})
        
        # Prepare input features for the model
        features = {
            "acceleration_magnitude": accel_data.get("magnitude", 0.0),
            "gyroscope_magnitude": gyro_data.get("magnitude", 0.0),
            "vibration_sensors_active": vib_data.get("total_active", 0),
            "acceleration_components": [
                accel_data.get("x", 0.0),
                accel_data.get("y", 0.0),
                accel_data.get("z", 0.0)
            ],
            "gyroscope_components": [
                gyro_data.get("x", 0.0),
                gyro_data.get("y", 0.0),
                gyro_data.get("z", 0.0)
            ],
            "vibration_pattern": [
                vib_data.get("front_left", 0),
                vib_data.get("front_right", 0),
                vib_data.get("mid_left", 0),
                vib_data.get("mid_right", 0),
                vib_data.get("rear_left", 0),
                vib_data.get("rear_right", 0)
            ]
        }
        
        # Rule-based prediction (fallback)
        prediction = self._rule_based_prediction(features, analysis)
        
        return {
            "model_prediction": {
                "risk_level": prediction["risk_level"],
                "confidence": prediction["confidence"],
                "recommended_action": prediction["action"],
                "crash_probability": prediction["crash_probability"],
                "model_version": "Rule_Based_v1.0_fallback",
                "timestamp": datetime.now().isoformat()
            },
            "feature_analysis": {
                "primary_risk_factors": prediction["risk_factors"],
                "sensor_contributions": prediction["sensor_weights"],
                "prediction_reasoning": prediction["reasoning"],
                "model_type": "Rule_Based_Fallback"
            },
            "raw_features": features
        }
    
    def _identify_risk_factors(self, features: Dict[str, Any]) -> List[str]:
        """Identify primary risk factors from sensor data"""
        risk_factors = []
        
        acc_mag = features["acceleration_magnitude"]
        gyro_mag = features["gyroscope_magnitude"]
        vib_active = features["vibration_sensors_active"]
        
        if acc_mag > 15:
            risk_factors.append("high_acceleration")
        if gyro_mag > 500:
            risk_factors.append("rapid_rotation")
        if vib_active >= 4:
            risk_factors.append("multiple_impacts")
            
        return risk_factors
    
    def _calculate_sensor_weights(self, features: Dict[str, Any]) -> Dict[str, float]:
        """Calculate relative importance of each sensor type"""
        acc_mag = features["acceleration_magnitude"]
        gyro_mag = features["gyroscope_magnitude"]
        vib_active = features["vibration_sensors_active"]
        
        weights = {
            "acceleration": min(1.0, acc_mag / 20.0),
            "gyroscope": min(1.0, gyro_mag / 1000.0),
            "vibration": min(1.0, vib_active / 6.0)
        }
        
        return weights
    
    def _rule_based_prediction(self, features: Dict[str, Any], analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Rule-based prediction system (to be replaced with actual AI model)"""
        acc_mag = features["acceleration_magnitude"]
        gyro_mag = features["gyroscope_magnitude"] 
        vib_active = features["vibration_sensors_active"]
        
        risk_factors = []
        sensor_weights = {"acceleration": 0.0, "gyroscope": 0.0, "vibration": 0.0}
        
        # Analyze each sensor contribution
        if acc_mag > 15:
            risk_factors.append("high_acceleration")
            sensor_weights["acceleration"] = min(1.0, acc_mag / 25)
        
        if gyro_mag > 500:
            risk_factors.append("excessive_rotation")
            sensor_weights["gyroscope"] = min(1.0, gyro_mag / 1200)
        
        if vib_active >= 3:
            risk_factors.append("multiple_vibrations")
            sensor_weights["vibration"] = min(1.0, vib_active / 6)
        
        # Calculate overall crash probability
        crash_probability = (
            sensor_weights["acceleration"] * 0.45 +
            sensor_weights["gyroscope"] * 0.35 +
            sensor_weights["vibration"] * 0.20
        )
        
        # Determine risk level and action
        if crash_probability > 0.8:
            risk_level = "critical"
            confidence = 0.95
            action = "emergency_dispatch"
            reasoning = "Multiple critical thresholds exceeded"
        elif crash_probability > 0.6:
            risk_level = "high"
            confidence = 0.85
            action = "alert_contacts"
            reasoning = "Elevated risk factors detected"
        elif crash_probability > 0.3:
            risk_level = "medium"
            confidence = 0.70
            action = "monitor_closely"
            reasoning = "Potential risk indicators present"
        else:
            risk_level = "normal"
            confidence = 0.90
            action = "continue_monitoring"
            reasoning = "All parameters within normal range"
        
        return {
            "risk_level": risk_level,
            "confidence": confidence,
            "action": action,
            "crash_probability": crash_probability,
            "risk_factors": risk_factors,
            "sensor_weights": sensor_weights,
            "reasoning": reasoning
        }
    
    def _get_error_prediction(self) -> Dict[str, Any]:
        """Return error prediction when data is unavailable"""
        return {
            "model_prediction": {
                "risk_level": "unknown",
                "confidence": 0.0,
                "recommended_action": "system_check_required",
                "crash_probability": 0.0,
                "model_version": "error_fallback",
                "timestamp": datetime.now().isoformat()
            },
            "feature_analysis": {
                "error": "Insufficient sensor data for prediction"
            }
        }
    
    def check_emergency_conditions(self, sensor_data: Dict[str, Any], prediction: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check for emergency conditions that require immediate action"""
        alerts = []
        
        if not sensor_data or not prediction:
            return alerts
        
        # Check critical thresholds
        if sensor_data["acceleration"]["magnitude"] > self.crash_thresholds["acceleration_threshold"]:
            alerts.append({
                "type": "critical_acceleration",
                "severity": "emergency",
                "message": f"Critical acceleration detected: {sensor_data['acceleration']['magnitude']:.2f} m/s²",
                "value": sensor_data["acceleration"]["magnitude"],
                "threshold": self.crash_thresholds["acceleration_threshold"],
                "timestamp": datetime.now().isoformat()
            })
        
        if sensor_data["vibration"]["magnitude"] > self.crash_thresholds["vibration_threshold"]:
            alerts.append({
                "type": "excessive_vibration",
                "severity": "critical",
                "message": f"Excessive vibration detected: {sensor_data['vibration']['magnitude']:.2f}",
                "value": sensor_data["vibration"]["magnitude"],
                "threshold": self.crash_thresholds["vibration_threshold"],
                "timestamp": datetime.now().isoformat()
            })
        
        if abs(sensor_data["tilt_angle"]) > self.crash_thresholds["tilt_threshold"]:
            alerts.append({
                "type": "dangerous_tilt",
                "severity": "emergency",
                "message": f"Dangerous vehicle tilt: {sensor_data['tilt_angle']:.2f}°",
                "value": abs(sensor_data["tilt_angle"]),
                "threshold": self.crash_thresholds["tilt_threshold"],
                "timestamp": datetime.now().isoformat()
            })
        
        # Check AI model confidence for crash prediction
        model_pred = prediction.get("model_prediction", {})
        if (model_pred.get("crash_probability", 0) > 0.8 and 
            model_pred.get("confidence", 0) > self.crash_thresholds["confidence_threshold"]):
            alerts.append({
                "type": "ai_crash_prediction",
                "severity": "emergency",
                "message": f"AI model predicts crash - Probability: {model_pred['crash_probability']*100:.1f}%, Confidence: {model_pred['confidence']*100:.1f}%",
                "crash_probability": model_pred["crash_probability"],
                "confidence": model_pred["confidence"],
                "timestamp": datetime.now().isoformat()
            })
        
        return alerts
    
    def save_dashboard_data(self, sensor_data: Dict[str, Any], analysis: Dict[str, Any], 
                           prediction: Dict[str, Any], alerts: List[Dict[str, Any]]) -> None:
        """Save processed live data for dashboard consumption"""
        
        # Create data directory if it doesn't exist
        output_file = self.config.get("dashboard_output_file", "../src/data/live_sensor_data.json")
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        
        dashboard_data = {
            "timestamp": datetime.now().isoformat(),
            "status": "live",
            "data_source": "thingspeak",
            "channel_id": self.channel_id,
            
            "live_sensors": sensor_data if sensor_data else {},
            "analysis": analysis if analysis else {},
            "ai_prediction": prediction if prediction else {},
            "emergency_alerts": alerts,
            
            "system_health": {
                "thingspeak_connected": sensor_data is not None,
                "data_quality": analysis.get("data_quality", "unknown") if analysis else "unknown",
                "ai_model_active": prediction.get("model_prediction", {}).get("confidence", 0) > 0,
                "last_update": sensor_data.get("timestamp") if sensor_data else datetime.now().isoformat(),
                "alerts_count": len(alerts)
            },
            
            "configuration": {
                "update_interval": self.update_interval,
                "thresholds": self.crash_thresholds,
                "channel_configured": self.channel_id != "YOUR_THINGSPEAK_CHANNEL_ID"
            }
        }
        
        try:
            if not self.streaming_mode:
                # File-based mode (legacy)
                with open(output_file, 'w') as f:
                    json.dump(dashboard_data, f, indent=2, ensure_ascii=False)
                logger.info(f"Dashboard data saved to {output_file}")
                
                # Also save a backup with timestamp
                backup_file = f"{output_file}.{int(time.time())}"
                with open(backup_file, 'w') as f:
                    json.dump(dashboard_data, f, indent=2, ensure_ascii=False)
            else:
                # Streaming mode - no file saving
                logger.info("🌊 Streaming mode: Dashboard data prepared for streaming (no file saved)")
            
        except Exception as e:
            if not self.streaming_mode:
                logger.error(f"Error saving dashboard data: {e}")
            else:
                logger.info("Streaming mode: No file operations needed")
    
    def trigger_emergency_response(self, sensor_data: Dict[str, Any], alerts: List[Dict[str, Any]]) -> None:
        """Trigger emergency response for critical alerts"""
        if not alerts:
            return
        
        critical_alerts = [alert for alert in alerts if alert.get("severity") in ["emergency", "critical"]]
        if not critical_alerts:
            return
        
        logger.critical(f"EMERGENCY CONDITIONS DETECTED: {len(critical_alerts)} critical alerts")
        
        for alert in critical_alerts:
            logger.critical(f"ALERT: {alert['message']}")
        
        # Prepare emergency data
        emergency_data = {
            "timestamp": datetime.now().isoformat(),
            "severity": "CRITICAL",
            "location": "Live Vehicle Tracking",
            "sensor_data": sensor_data,
            "alerts": critical_alerts,
            "trigger": "live_sensor_monitoring"
        }
        
        # Save emergency log
        emergency_file = "logs/emergency_alerts.json"
        os.makedirs(os.path.dirname(emergency_file), exist_ok=True)
        
        try:
            # Load existing emergencies
            if os.path.exists(emergency_file):
                with open(emergency_file, 'r') as f:
                    emergencies = json.load(f)
            else:
                emergencies = []
            
            emergencies.append(emergency_data)
            
            # Keep only last 100 emergencies
            emergencies = emergencies[-100:]
            
            with open(emergency_file, 'w') as f:
                json.dump(emergencies, f, indent=2)
            
            logger.info(f"Emergency logged to {emergency_file}")
            
        except Exception as e:
            logger.error(f"Error logging emergency: {e}")
    
    def run_single_cycle(self) -> Dict[str, Any]:
        """Run a single data processing cycle"""
        logger.info("Running single data processing cycle...")
        
        # Fetch live data from ThingSpeak
        thingspeak_data = self.fetch_live_sensor_data()
        
        # Process sensor data
        sensor_data = self.process_thingspeak_data(thingspeak_data)
        
        # Analyze sensor data
        analysis = self.analyze_sensor_data(sensor_data)
        
        # Generate AI prediction
        prediction = self.generate_model_prediction(sensor_data, analysis)
        
        # Check for emergency conditions
        alerts = self.check_emergency_conditions(sensor_data, prediction)
        
        # Save data for dashboard
        self.save_dashboard_data(sensor_data, analysis, prediction, alerts)
        
        # Handle emergencies
        if alerts:
            self.trigger_emergency_response(sensor_data, alerts)
        
        # Return summary
        return {
            "success": True,
            "sensor_data_available": sensor_data is not None,
            "analysis_complete": analysis is not None,
            "prediction_generated": prediction is not None,
            "alerts_count": len(alerts),
            "risk_level": prediction.get("model_prediction", {}).get("risk_level", "unknown") if prediction else "unknown"
        }
    
    def run_continuous_monitoring(self) -> None:
        """Run continuous live monitoring"""
        logger.info(f"Starting continuous live monitoring - Update interval: {self.update_interval}s")
        
        try:
            cycle_count = 0
            while True:
                start_time = time.time()
                cycle_count += 1
                
                logger.info(f"--- Monitoring Cycle {cycle_count} ---")
                
                try:
                    result = self.run_single_cycle()
                    
                    if result["success"]:
                        logger.info(f"Cycle {cycle_count} completed successfully - "
                                   f"Risk: {result['risk_level']}, "
                                   f"Alerts: {result['alerts_count']}")
                    else:
                        logger.warning(f"Cycle {cycle_count} completed with issues")
                        
                except Exception as e:
                    logger.error(f"Error in cycle {cycle_count}: {e}")
                
                # Calculate sleep time
                elapsed = time.time() - start_time
                sleep_time = max(0, self.update_interval - elapsed)
                
                if sleep_time > 0:
                    logger.debug(f"Sleeping for {sleep_time:.2f}s")
                    time.sleep(sleep_time)
                else:
                    logger.warning(f"Cycle took {elapsed:.2f}s - longer than update interval {self.update_interval}s")
                    
        except KeyboardInterrupt:
            logger.info("Continuous monitoring stopped by user")
        except Exception as e:
            logger.error(f"Fatal error in continuous monitoring: {e}")
            raise
    
    def create_dashboard_data(self, sensor_data: Dict[str, Any], analysis: Dict[str, Any], 
                            prediction_result: Dict[str, Any]) -> Dict[str, Any]:
        """Create formatted data for the dashboard"""
        if not sensor_data:
            return {
                "timestamp": datetime.now().isoformat(),
                "data_source": "error",
                "error": "No sensor data available"
            }
        
        dashboard_data = {
            "timestamp": datetime.now().isoformat(),
            "data_source": "thingspeak_live",
            "acceleration": sensor_data.get("acceleration", {}),
            "gyroscope": sensor_data.get("gyroscope", {}),
            "vibration": sensor_data.get("vibration", {}),
            "risk_assessment": analysis.get("risk_assessment", {}) if analysis else {},
            "model_prediction": prediction_result.get("model_prediction", {}) if prediction_result else {},
            "live_status": {
                "connected": True,
                "last_update": datetime.now().isoformat(),
                "channels_active": 3,
                "data_quality": "good"
            }
        }
        
        return dashboard_data

def main():
    """Main function"""
    print("CrashGuard ThingSpeak Live Data Processor")
    print("=" * 50)
    
    # Initialize processor
    processor = ThingSpeakLiveDataProcessor()
    
    # Check configuration
    if processor.channel_id == "YOUR_THINGSPEAK_CHANNEL_ID":
        print("\n❌ ThingSpeak configuration required!")
        print("Please update config/thingspeak_config.json with your:")
        print("- channel_id: Your ThingSpeak channel ID")
        print("- read_api_key: Your ThingSpeak read API key (optional for public channels)")
        print("\nExample config:")
        print('{\n  "channel_id": "1234567",\n  "read_api_key": "YOUR_API_KEY"\n}')
        return
    
    print(f"✅ Configured for ThingSpeak Channel: {processor.channel_id}")
    
    # Ask user for operation mode
    print("\nSelect operation mode:")
    print("1. Single data fetch (test)")
    print("2. Continuous monitoring")
    
    try:
        choice = input("Enter choice (1 or 2): ").strip()
        
        if choice == "1":
            print("\n--- Running Single Data Cycle ---")
            result = processor.run_single_cycle()
            print(f"✅ Cycle completed: {result}")
            
        elif choice == "2":
            print("\n--- Starting Continuous Monitoring ---")
            print("Press Ctrl+C to stop")
            processor.run_continuous_monitoring()
            
        else:
            print("Invalid choice")
            
    except KeyboardInterrupt:
        print("\n\n👋 Stopped by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    main()
