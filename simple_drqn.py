"""
CrashGuard Simple DRQN Model Implementation

Lightweight DRQN implementation using NumPy for crash detection.
This module provides a simplified neural network when advanced
deep learning frameworks are not available.

Features:
- Pure NumPy implementation
- Lightweight sensor data processing
- Simple weight-based crash detection
- Professional logging and error handling
- Sequence-based temporal analysis

Author: CrashGuard Team
Version: 2.0
License: MIT
"""

import numpy as np
import logging
from typing import Dict, List, Tuple, Any, Optional
from collections import deque
import json
import math
from datetime import datetime

# Configure logging
logger = logging.getLogger(__name__)

class SimpleDRQN:
    """
    Lightweight DRQN implementation using only NumPy.
    
    This class provides basic crash detection functionality without
    requiring advanced machine learning frameworks.
    """
    
    def __init__(self, sequence_length: int = 10):
        """
        Initialize the Simple DRQN model.
        
        Args:
            sequence_length: Number of sensor readings to keep in sequence buffer
        """
        self.sequence_length = sequence_length
        self.input_dim = 13  # 3 accel + 3 gyro + 6 vibration + 1 magnitude
        self.n_actions = 4   # normal, caution, alert, emergency
        
        # Sensor data buffer for sequence processing
        self.sensor_buffer = deque(maxlen=self.sequence_length)
        
        # Simple weights simulation (trained patterns)
        self.weights = self._initialize_weights()
        
        # Action mappings
        self.action_to_risk = {
            0: "normal",
            1: "caution", 
            2: "alert",
            3: "emergency"
        }
        
        self.action_to_action = {
            0: "continue_monitoring",
            1: "increased_monitoring",
            2: "prepare_alerts",
            3: "immediate_response"
        }
        
        logger.info("Initialized Simple DRQN (NumPy-based)")
    
    def _initialize_weights(self) -> Dict[str, np.ndarray]:
        """Initialize simple weight matrices for crash detection"""
        # These weights simulate learned crash patterns
        weights = {
            'feature_weights': np.array([
                2.0,  # accel_x importance
                2.0,  # accel_y importance  
                3.0,  # accel_z importance (vertical impact)
                4.0,  # accel_magnitude (most important)
                1.5,  # gyro_x
                1.5,  # gyro_y
                1.5,  # gyro_z
                0.8,  # vib_front_left
                0.8,  # vib_front_right
                1.0,  # vib_mid_left
                1.0,  # vib_mid_right
                1.2,  # vib_rear_left
                1.2   # vib_rear_right
            ]),
            'threshold_weights': np.array([0.3, 0.5, 0.7, 0.9])  # thresholds for each action
        }
        return weights
    
    def preprocess_sensor_data(self, sensor_data: Dict[str, Any]) -> np.ndarray:
        """Convert sensor data to model input format"""
        try:
            # Extract acceleration data
            accel = sensor_data.get("acceleration", {})
            accel_x = float(accel.get("x", 0.0))
            accel_y = float(accel.get("y", 0.0))
            accel_z = float(accel.get("z", 0.0))
            accel_mag = float(accel.get("magnitude", 0.0))
            
            # Extract gyroscope data
            gyro = sensor_data.get("gyroscope", {})
            gyro_x = float(gyro.get("x", 0.0))
            gyro_y = float(gyro.get("y", 0.0))
            gyro_z = float(gyro.get("z", 0.0))
            
            # Extract vibration data
            vib = sensor_data.get("vibration", {})
            vib_sensors = [
                float(vib.get("front_left", 0)),
                float(vib.get("front_right", 0)),
                float(vib.get("mid_left", 0)),
                float(vib.get("mid_right", 0)),
                float(vib.get("rear_left", 0)),
                float(vib.get("rear_right", 0))
            ]
            
            # Combine into feature vector
            features = np.array([
                accel_x, accel_y, accel_z, accel_mag,
                gyro_x, gyro_y, gyro_z,
                *vib_sensors
            ], dtype=np.float32)
            
            # Normalize features for better processing
            features = self._normalize_features(features)
            
            return features
            
        except Exception as e:
            logger.error(f"Error preprocessing sensor data: {e}")
            return np.zeros(self.input_dim, dtype=np.float32)
    
    def _normalize_features(self, features: np.ndarray) -> np.ndarray:
        """Normalize sensor features"""
        # Acceleration normalization (typical range: -20 to 20 m/s²)
        features[0:4] = np.tanh(features[0:4] / 10.0)  # Soft normalization
        
        # Gyroscope normalization (typical range: -2000 to 2000 deg/s)
        features[4:7] = np.tanh(features[4:7] / 1000.0)  # Soft normalization
        
        # Vibration sensors are already 0-1, no normalization needed
        features[7:13] = np.clip(features[7:13], 0.0, 1.0)
        
        return features
    
    def predict(self, sensor_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate prediction from sensor data"""
        try:
            # Preprocess current sensor data
            current_features = self.preprocess_sensor_data(sensor_data)
            
            # Add to sequence buffer
            self.sensor_buffer.append(current_features)
            
            if len(self.sensor_buffer) == 0:
                return self._get_default_prediction()
            
            # Simple neural network simulation
            # 1. Feature importance weighting
            weighted_features = current_features * self.weights['feature_weights']
            
            # 2. Temporal pattern simulation (using recent history)
            if len(self.sensor_buffer) > 1:
                # Calculate change rate
                prev_features = self.sensor_buffer[-2]
                feature_change = np.abs(current_features - prev_features)
                temporal_weight = np.sum(feature_change * self.weights['feature_weights'])
            else:
                temporal_weight = 0.0
            
            # 3. Calculate activation score
            base_activation = np.sum(np.abs(weighted_features))
            temporal_activation = temporal_weight * 0.5
            total_activation = base_activation + temporal_activation
            
            # 4. Map to action probabilities using thresholds
            action_scores = np.zeros(4)
            thresholds = self.weights['threshold_weights']
            
            for i, threshold in enumerate(thresholds):
                if total_activation > threshold:
                    action_scores[i] = total_activation - threshold
            
            # 5. Convert to probabilities
            if np.sum(action_scores) > 0:
                action_probs = action_scores / np.sum(action_scores)
            else:
                action_probs = np.array([1.0, 0.0, 0.0, 0.0])  # Default to normal
            
            # 6. Select predicted action
            predicted_action = int(np.argmax(action_probs))
            confidence = float(action_probs[predicted_action])
            
            # 7. Calculate crash probability
            crash_prob = float(action_probs[2] + action_probs[3])  # alert + emergency
            
            # 8. Map action to risk level and recommended action
            risk_level = self.action_to_risk[predicted_action]
            recommended_action = self.action_to_action[predicted_action]
            
            # 9. Generate reasoning
            reasoning = self._generate_reasoning(current_features, predicted_action, total_activation)
            
            return {
                "risk_level": risk_level,
                "confidence": confidence,
                "recommended_action": recommended_action,
                "crash_probability": crash_prob,
                "model_version": "SimpleDRQN_v2.0_numpy",
                "timestamp": datetime.now().isoformat(),
                "activation_score": float(total_activation),
                "action_probabilities": action_probs.tolist(),
                "reasoning": reasoning,
                "sequence_length": len(self.sensor_buffer)
            }
                
        except Exception as e:
            logger.error(f"Error in Simple DRQN prediction: {e}")
            return self._get_error_prediction()
    
    def _generate_reasoning(self, features: np.ndarray, action: int, activation: float) -> str:
        """Generate human-readable reasoning for the prediction"""
        # Denormalize key features for reasoning
        accel_mag = abs(features[3]) * 10.0  # Approximate denormalization
        vib_active = int(np.sum(features[7:13]))
        
        if action == 0:  # normal
            return f"Normal operation detected. Low activation score ({activation:.2f}), stable patterns"
        elif action == 1:  # caution  
            return f"Moderate patterns: Activation {activation:.2f}, accel magnitude ~{accel_mag:.1f}m/s²"
        elif action == 2:  # alert
            return f"Alert patterns: High activation ({activation:.2f}), {vib_active}/6 vibration sensors active"
        else:  # emergency
            return f"Emergency patterns: Critical activation ({activation:.2f}), extreme sensor values detected"
    
    def _get_default_prediction(self) -> Dict[str, Any]:
        """Default prediction when no data available"""
        return {
            "risk_level": "normal",
            "confidence": 0.5,
            "recommended_action": "continue_monitoring",
            "crash_probability": 0.0,
            "model_version": "SimpleDRQN_v2.0_numpy",
            "timestamp": datetime.now().isoformat(),
            "reasoning": "Insufficient data for prediction",
            "sequence_length": 0
        }
    
    def _get_error_prediction(self) -> Dict[str, Any]:
        """Error prediction when something goes wrong"""
        return {
            "risk_level": "unknown",
            "confidence": 0.0,
            "recommended_action": "check_sensors",
            "crash_probability": 0.0,
            "model_version": "SimpleDRQN_v2.0_numpy",
            "timestamp": datetime.now().isoformat(),
            "reasoning": "Error in model prediction",
            "sequence_length": len(self.sensor_buffer)
        }
    
    def reset_sequence(self):
        """Reset the sequence buffer"""
        self.sensor_buffer.clear()
        logger.info("Simple DRQN sequence buffer reset")

# Simple factory function to get DRQN instance
def get_simple_drqn_instance() -> SimpleDRQN:
    """Get Simple DRQN instance"""
    return SimpleDRQN()

# Global instance
_global_simple_drqn = None

def get_drqn_instance() -> SimpleDRQN:
    """Get or create global simple DRQN instance"""
    global _global_simple_drqn
    if _global_simple_drqn is None:
        _global_simple_drqn = SimpleDRQN()
        logger.info("Created global Simple DRQN instance")
    return _global_simple_drqn
