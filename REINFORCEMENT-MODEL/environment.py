"""
CrashGuard Reinforcement Learning Environment

This module implements a simulated crash detection environment for training
the RL agent using real sensor data patterns.

Features:
- Realistic crash scenario simulation
- Multi-sensor data integration
- Professional reward system
- State normalization and preprocessing

Author: CrashGuard Team
Version: 2.0
License: MIT
"""

import numpy as np
import logging
from typing import Dict, List, Tuple, Any, Optional
import random
import json
from datetime import datetime
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class SensorReading:
    """Structured sensor reading data"""
    accelerometer_x: float
    accelerometer_y: float
    accelerometer_z: float
    gyroscope_x: float
    gyroscope_y: float
    gyroscope_z: float
    vibration: float
    timestamp: str
    device_id: str

class CrashEnvironment:
    """
    Reinforcement Learning Environment for Crash Detection
    
    Simulates various driving scenarios including normal driving,
    sudden movements, and actual crash events.
    """
    
    def __init__(self, max_steps: int = 1000, crash_probability: float = 0.02):
        """
        Initialize crash detection environment
        
        Args:
            max_steps: Maximum steps per episode
            crash_probability: Probability of crash event per step
        """
        self.max_steps = max_steps
        self.crash_probability = crash_probability
        
        # Environment state
        self.current_step = 0
        self.crash_occurred = False
        self.scenario_type = "normal"
        
        # Sensor ranges for normalization
        self.sensor_ranges = {
            'accelerometer': (-20.0, 20.0),  # m/s²
            'gyroscope': (-500.0, 500.0),    # deg/s
            'vibration': (0.0, 100.0)        # intensity
        }
        
        # Crash detection thresholds
        self.crash_thresholds = {
            'high_acceleration': 15.0,
            'sudden_rotation': 300.0,
            'high_vibration': 75.0
        }
        
        # Scenario parameters
        self.scenarios = {
            'normal': {'weight': 0.70, 'intensity': 0.3},
            'sudden_brake': {'weight': 0.15, 'intensity': 0.6},
            'sharp_turn': {'weight': 0.10, 'intensity': 0.5},
            'rough_road': {'weight': 0.03, 'intensity': 0.4},
            'crash': {'weight': 0.02, 'intensity': 1.0}
        }
        
        logger.info("Initialized CrashEnvironment with realistic simulation parameters")
    
    def reset(self) -> np.ndarray:
        """
        Reset environment to initial state
        
        Returns:
            Initial state vector
        """
        self.current_step = 0
        self.crash_occurred = False
        self.scenario_type = "normal"
        
        # Generate initial normal state
        initial_state = self._generate_sensor_data("normal")
        
        logger.debug(f"Environment reset - Initial scenario: {self.scenario_type}")
        return initial_state
    
    def step(self, action: int) -> Tuple[np.ndarray, float, bool, Dict[str, Any]]:
        """
        Execute one step in the environment
        
        Args:
            action: Agent's action (0=normal, 1=caution, 2=alert, 3=emergency)
            
        Returns:
            next_state, reward, done, info
        """
        self.current_step += 1
        
        # Determine current scenario
        self._update_scenario()
        
        # Generate sensor data for current scenario
        state = self._generate_sensor_data(self.scenario_type)
        
        # Calculate reward
        reward = self._calculate_reward(action, self.scenario_type, state)
        
        # Check if episode is done
        done = self.current_step >= self.max_steps or self.crash_occurred
        
        # Prepare info dictionary
        info = {
            'scenario': self.scenario_type,
            'step': self.current_step,
            'crash_detected': self._is_crash_state(state),
            'action_correctness': self._evaluate_action_correctness(action, self.scenario_type),
            'sensor_analysis': self._analyze_sensor_data(state)
        }
        
        return state, reward, done, info
    
    def _update_scenario(self) -> None:
        """Update the current scenario based on probabilities"""
        if self.crash_occurred:
            self.scenario_type = "crash"
            return
        
        # Random scenario selection based on weights
        scenarios = list(self.scenarios.keys())
        weights = [self.scenarios[s]['weight'] for s in scenarios]
        
        self.scenario_type = random.choices(scenarios, weights=weights)[0]
        
        if self.scenario_type == "crash":
            self.crash_occurred = True
            logger.warning(f"Crash event triggered at step {self.current_step}")
    
    def _generate_sensor_data(self, scenario: str) -> np.ndarray:
        """
        Generate realistic sensor data for given scenario
        
        Args:
            scenario: Current driving scenario
            
        Returns:
            Normalized sensor state vector [13 dimensions]
        """
        intensity = self.scenarios[scenario]['intensity']
        
        if scenario == "normal":
            # Normal driving patterns
            accel_x = np.random.normal(0, 1.0)
            accel_y = np.random.normal(0, 0.5)
            accel_z = np.random.normal(-9.81, 0.3)  # Gravity + small variations
            gyro_x = np.random.normal(0, 10)
            gyro_y = np.random.normal(0, 5)
            gyro_z = np.random.normal(0, 15)
            vibration = np.random.normal(20, 5)
            
        elif scenario == "sudden_brake":
            # Hard braking scenario
            accel_x = np.random.normal(-8.0, 2.0)  # Strong deceleration
            accel_y = np.random.normal(0, 1.0)
            accel_z = np.random.normal(-9.81, 0.5)
            gyro_x = np.random.normal(0, 20)
            gyro_y = np.random.normal(0, 15)
            gyro_z = np.random.normal(0, 10)
            vibration = np.random.normal(40, 10)
            
        elif scenario == "sharp_turn":
            # Sharp turning maneuver
            accel_x = np.random.normal(0, 2.0)
            accel_y = np.random.normal(6.0, 1.5)  # Lateral acceleration
            accel_z = np.random.normal(-9.81, 0.4)
            gyro_x = np.random.normal(0, 15)
            gyro_y = np.random.normal(0, 10)
            gyro_z = np.random.normal(100, 30)  # Strong yaw rate
            vibration = np.random.normal(25, 8)
            
        elif scenario == "rough_road":
            # Driving on rough terrain
            accel_x = np.random.normal(0, 3.0)
            accel_y = np.random.normal(0, 2.0)
            accel_z = np.random.normal(-9.81, 2.0)  # High vertical variation
            gyro_x = np.random.normal(0, 30)
            gyro_y = np.random.normal(0, 25)
            gyro_z = np.random.normal(0, 20)
            vibration = np.random.normal(60, 15)
            
        elif scenario == "crash":
            # Actual crash event - extreme values
            accel_x = np.random.normal(-15.0, 3.0)  # Extreme deceleration
            accel_y = np.random.normal(0, 8.0)      # High lateral forces
            accel_z = np.random.normal(-9.81, 5.0)  # Chaotic vertical motion
            gyro_x = np.random.normal(0, 200)       # Extreme rotation
            gyro_y = np.random.normal(0, 150)
            gyro_z = np.random.normal(0, 250)
            vibration = np.random.normal(90, 10)    # Maximum vibration
            
        else:
            # Fallback to normal
            return self._generate_sensor_data("normal")
        
        # Clip values to realistic ranges
        accel_x = np.clip(accel_x, -20, 20)
        accel_y = np.clip(accel_y, -20, 20)
        accel_z = np.clip(accel_z, -30, 10)
        gyro_x = np.clip(gyro_x, -500, 500)
        gyro_y = np.clip(gyro_y, -500, 500)
        gyro_z = np.clip(gyro_z, -500, 500)
        vibration = np.clip(vibration, 0, 100)
        
        # Create state vector with additional computed features
        state = np.array([
            accel_x, accel_y, accel_z,           # Raw accelerometer
            gyro_x, gyro_y, gyro_z,              # Raw gyroscope
            vibration,                            # Vibration sensor
            np.sqrt(accel_x**2 + accel_y**2 + accel_z**2),  # Acceleration magnitude
            np.sqrt(gyro_x**2 + gyro_y**2 + gyro_z**2),     # Gyroscope magnitude
            abs(accel_x),                         # Longitudinal force magnitude
            abs(accel_y),                         # Lateral force magnitude
            abs(gyro_z),                          # Yaw rate magnitude
            vibration / 100.0                     # Normalized vibration
        ])
        
        # Normalize state vector
        normalized_state = self._normalize_state(state)
        
        return normalized_state
    
    def _normalize_state(self, state: np.ndarray) -> np.ndarray:
        """
        Normalize state vector to [0, 1] range
        
        Args:
            state: Raw state vector
            
        Returns:
            Normalized state vector
        """
        # Define normalization ranges for each feature
        ranges = np.array([
            [-20, 20],   # accel_x
            [-20, 20],   # accel_y  
            [-30, 10],   # accel_z
            [-500, 500], # gyro_x
            [-500, 500], # gyro_y
            [-500, 500], # gyro_z
            [0, 100],    # vibration
            [0, 35],     # accel_magnitude
            [0, 866],    # gyro_magnitude
            [0, 20],     # longitudinal_force
            [0, 20],     # lateral_force
            [0, 500],    # yaw_rate_magnitude
            [0, 1]       # normalized_vibration
        ])
        
        normalized = np.zeros_like(state)
        for i in range(len(state)):
            min_val, max_val = ranges[i]
            normalized[i] = (state[i] - min_val) / (max_val - min_val)
            normalized[i] = np.clip(normalized[i], 0, 1)
        
        return normalized
    
    def _calculate_reward(self, action: int, scenario: str, state: np.ndarray) -> float:
        """
        Calculate reward based on action appropriateness
        
        Args:
            action: Agent's action
            scenario: Current scenario
            state: Current state vector
            
        Returns:
            Reward value
        """
        base_reward = 0.0
        
        # Action mapping: 0=normal, 1=caution, 2=alert, 3=emergency
        correct_action = self._get_correct_action(scenario, state)
        
        # Perfect action match
        if action == correct_action:
            base_reward = 10.0
        # Close action (within 1 level)
        elif abs(action - correct_action) == 1:
            base_reward = 5.0
        # Moderate mismatch
        elif abs(action - correct_action) == 2:
            base_reward = -2.0
        # Severe mismatch
        else:
            base_reward = -10.0
        
        # Bonus for crash detection
        if scenario == "crash" and action == 3:
            base_reward += 50.0
            logger.info(f"Crash correctly detected! Bonus reward applied")
        
        # Penalty for false alarms
        elif scenario == "normal" and action >= 2:
            base_reward -= 15.0
        
        # Small penalty for each step to encourage efficiency
        base_reward -= 0.1
        
        return base_reward
    
    def _get_correct_action(self, scenario: str, state: np.ndarray) -> int:
        """
        Determine the correct action for given scenario and state
        
        Args:
            scenario: Current scenario
            state: Current state vector
            
        Returns:
            Correct action index
        """
        if scenario == "crash" or self._is_crash_state(state):
            return 3  # Emergency
        elif scenario in ["sudden_brake", "sharp_turn"]:
            return 2  # Alert
        elif scenario == "rough_road":
            return 1  # Caution
        else:
            return 0  # Normal
    
    def _is_crash_state(self, state: np.ndarray) -> bool:
        """
        Check if current state indicates a crash
        
        Args:
            state: Normalized state vector
            
        Returns:
            True if crash conditions detected
        """
        # Denormalize key values for threshold comparison
        accel_magnitude = state[7] * 35  # Acceleration magnitude
        gyro_magnitude = state[8] * 866  # Gyroscope magnitude
        vibration = state[6] * 100       # Vibration
        
        # Multiple criteria for crash detection
        crash_indicators = [
            accel_magnitude > self.crash_thresholds['high_acceleration'],
            gyro_magnitude > self.crash_thresholds['sudden_rotation'],
            vibration > self.crash_thresholds['high_vibration']
        ]
        
        # Crash if 2 or more indicators are true
        return sum(crash_indicators) >= 2
    
    def _evaluate_action_correctness(self, action: int, scenario: str) -> str:
        """Evaluate if the taken action was appropriate"""
        correct_action = self._get_correct_action(scenario, np.zeros(13))
        
        if action == correct_action:
            return "perfect"
        elif abs(action - correct_action) == 1:
            return "good"
        elif abs(action - correct_action) == 2:
            return "poor"
        else:
            return "terrible"
    
    def _analyze_sensor_data(self, state: np.ndarray) -> Dict[str, Any]:
        """Analyze sensor data for insights"""
        return {
            'acceleration_magnitude': float(state[7] * 35),
            'gyroscope_magnitude': float(state[8] * 866),
            'vibration_level': float(state[6] * 100),
            'crash_probability': float(self._estimate_crash_probability(state)),
            'scenario_confidence': 0.85  # Placeholder
        }
    
    def _estimate_crash_probability(self, state: np.ndarray) -> float:
        """Estimate crash probability from current state"""
        accel_mag = state[7] * 35
        gyro_mag = state[8] * 866
        vibration = state[6] * 100
        
        # Simple heuristic for crash probability
        prob = 0.0
        prob += min(accel_mag / 20.0, 1.0) * 0.4
        prob += min(gyro_mag / 500.0, 1.0) * 0.3
        prob += min(vibration / 100.0, 1.0) * 0.3
        
        return min(prob, 1.0)
    
    def get_scenario_info(self) -> Dict[str, Any]:
        """Get current scenario information"""
        return {
            'current_scenario': self.scenario_type,
            'step': self.current_step,
            'max_steps': self.max_steps,
            'crash_occurred': self.crash_occurred,
            'scenario_weights': self.scenarios
        }

# Factory function
def create_crash_environment(**kwargs) -> CrashEnvironment:
    """Create and return a CrashEnvironment instance"""
    return CrashEnvironment(**kwargs)
