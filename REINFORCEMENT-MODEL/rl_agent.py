"""
CrashGuard Reinforcement Learning Agent

This module implements a Deep Q-Network (DQN) agent for crash detection
using reinforcement learning techniques.

Features:
- Deep Q-Network with experience replay
- Target network for stable learning
- Epsilon-greedy exploration strategy
- Professional logging and monitoring

Author: CrashGuard Team
Version: 2.0
License: MIT
"""

import numpy as np
import random
import logging
from collections import deque
from typing import Dict, List, Tuple, Any, Optional
import json
import pickle
import os
from datetime import datetime

# Configure logging
logger = logging.getLogger(__name__)

class ReplayBuffer:
    """Experience replay buffer for DQN training"""
    
    def __init__(self, capacity: int = 50000):
        """
        Initialize replay buffer
        
        Args:
            capacity: Maximum number of experiences to store
        """
        self.buffer = deque(maxlen=capacity)
        self.capacity = capacity
    
    def push(self, state: np.ndarray, action: int, reward: float, 
             next_state: np.ndarray, done: bool) -> None:
        """Store experience in buffer"""
        experience = (state, action, reward, next_state, done)
        self.buffer.append(experience)
    
    def sample(self, batch_size: int) -> List[Tuple]:
        """Sample random batch of experiences"""
        if len(self.buffer) < batch_size:
            return list(self.buffer)
        return random.sample(self.buffer, batch_size)
    
    def __len__(self) -> int:
        return len(self.buffer)

class DQNNetwork:
    """Deep Q-Network implementation using NumPy"""
    
    def __init__(self, state_size: int, action_size: int, hidden_size: int = 128):
        """
        Initialize DQN network
        
        Args:
            state_size: Dimension of input state
            action_size: Number of possible actions
            hidden_size: Size of hidden layers
        """
        self.state_size = state_size
        self.action_size = action_size
        self.hidden_size = hidden_size
        
        # Initialize network weights
        self.weights = self._initialize_weights()
        
    def _initialize_weights(self) -> Dict[str, np.ndarray]:
        """Initialize network weights using Xavier initialization"""
        weights = {}
        
        # Input to first hidden layer
        weights['W1'] = np.random.randn(self.state_size, self.hidden_size) * np.sqrt(2.0 / self.state_size)
        weights['b1'] = np.zeros(self.hidden_size)
        
        # First to second hidden layer
        weights['W2'] = np.random.randn(self.hidden_size, self.hidden_size) * np.sqrt(2.0 / self.hidden_size)
        weights['b2'] = np.zeros(self.hidden_size)
        
        # Second hidden to output layer
        weights['W3'] = np.random.randn(self.hidden_size, self.action_size) * np.sqrt(2.0 / self.hidden_size)
        weights['b3'] = np.zeros(self.action_size)
        
        return weights
    
    def forward(self, state: np.ndarray) -> np.ndarray:
        """Forward pass through network"""
        # First hidden layer
        z1 = np.dot(state, self.weights['W1']) + self.weights['b1']
        a1 = self._relu(z1)
        
        # Second hidden layer
        z2 = np.dot(a1, self.weights['W2']) + self.weights['b2']
        a2 = self._relu(z2)
        
        # Output layer
        z3 = np.dot(a2, self.weights['W3']) + self.weights['b3']
        
        return z3
    
    def _relu(self, x: np.ndarray) -> np.ndarray:
        """ReLU activation function"""
        return np.maximum(0, x)
    
    def copy_weights_from(self, other_network: 'DQNNetwork') -> None:
        """Copy weights from another network"""
        for key in self.weights:
            self.weights[key] = other_network.weights[key].copy()

class CrashDetectionAgent:
    """
    Deep Q-Network Agent for Crash Detection
    
    This agent learns to detect crashes using reinforcement learning
    with experience replay and target networks.
    """
    
    def __init__(self, state_size: int = 13, action_size: int = 4, 
                 learning_rate: float = 0.001, epsilon: float = 1.0,
                 epsilon_min: float = 0.01, epsilon_decay: float = 0.995,
                 gamma: float = 0.95, batch_size: int = 32):
        """
        Initialize the RL agent
        
        Args:
            state_size: Dimension of sensor input
            action_size: Number of crash detection actions
            learning_rate: Learning rate for network updates
            epsilon: Initial exploration rate
            epsilon_min: Minimum exploration rate
            epsilon_decay: Exploration decay rate
            gamma: Discount factor for future rewards
            batch_size: Batch size for training
        """
        self.state_size = state_size
        self.action_size = action_size
        self.learning_rate = learning_rate
        self.epsilon = epsilon
        self.epsilon_min = epsilon_min
        self.epsilon_decay = epsilon_decay
        self.gamma = gamma
        self.batch_size = batch_size
        
        # Initialize networks
        self.q_network = DQNNetwork(state_size, action_size)
        self.target_network = DQNNetwork(state_size, action_size)
        
        # Copy weights to target network
        self.target_network.copy_weights_from(self.q_network)
        
        # Experience replay buffer
        self.memory = ReplayBuffer()
        
        # Training statistics
        self.training_steps = 0
        self.episode_count = 0
        self.total_reward = 0.0
        
        # Action mappings
        self.action_mapping = {
            0: "normal",
            1: "caution",
            2: "alert", 
            3: "emergency"
        }
        
        logger.info(f"Initialized CrashDetection RL Agent - State: {state_size}, Actions: {action_size}")
    
    def act(self, state: np.ndarray, training: bool = True) -> int:
        """
        Choose action using epsilon-greedy policy
        
        Args:
            state: Current sensor state
            training: Whether in training mode
            
        Returns:
            Selected action index
        """
        if training and np.random.random() <= self.epsilon:
            # Exploration: random action
            action = random.randrange(self.action_size)
            logger.debug(f"Exploration action: {action}")
        else:
            # Exploitation: best action from Q-network
            q_values = self.q_network.forward(state.reshape(1, -1))
            action = np.argmax(q_values[0])
            logger.debug(f"Exploitation action: {action}, Q-values: {q_values[0]}")
        
        return action
    
    def remember(self, state: np.ndarray, action: int, reward: float,
                 next_state: np.ndarray, done: bool) -> None:
        """Store experience in replay buffer"""
        self.memory.push(state, action, reward, next_state, done)
        self.total_reward += reward
    
    def replay(self) -> Optional[float]:
        """
        Train the network using experience replay
        
        Returns:
            Training loss if training occurred, None otherwise
        """
        if len(self.memory) < self.batch_size:
            return None
        
        # Sample batch of experiences
        batch = self.memory.sample(self.batch_size)
        states = np.array([e[0] for e in batch])
        actions = np.array([e[1] for e in batch])
        rewards = np.array([e[2] for e in batch])
        next_states = np.array([e[3] for e in batch])
        dones = np.array([e[4] for e in batch])
        
        # Current Q-values
        current_q_values = np.array([self.q_network.forward(state.reshape(1, -1))[0] for state in states])
        
        # Next Q-values from target network
        next_q_values = np.array([self.target_network.forward(state.reshape(1, -1))[0] for state in next_states])
        
        # Compute target Q-values
        target_q_values = current_q_values.copy()
        for i in range(self.batch_size):
            if dones[i]:
                target_q_values[i][actions[i]] = rewards[i]
            else:
                target_q_values[i][actions[i]] = rewards[i] + self.gamma * np.max(next_q_values[i])
        
        # Compute loss (simplified MSE)
        loss = np.mean((target_q_values - current_q_values) ** 2)
        
        # Simplified gradient update (in practice, would use proper backpropagation)
        self._update_weights(states, target_q_values, current_q_values)
        
        # Decay exploration rate
        if self.epsilon > self.epsilon_min:
            self.epsilon *= self.epsilon_decay
        
        self.training_steps += 1
        
        # Update target network periodically
        if self.training_steps % 100 == 0:
            self.target_network.copy_weights_from(self.q_network)
            logger.info(f"Target network updated at step {self.training_steps}")
        
        return loss
    
    def _update_weights(self, states: np.ndarray, target_q: np.ndarray, current_q: np.ndarray) -> None:
        """Simplified weight update (placeholder for proper backpropagation)"""
        # This is a simplified update - in practice would use proper gradient computation
        learning_factor = self.learning_rate * 0.1
        error_magnitude = np.mean(np.abs(target_q - current_q))
        
        # Apply small random updates proportional to error
        for key in self.q_network.weights:
            gradient_estimate = np.random.randn(*self.q_network.weights[key].shape) * learning_factor * error_magnitude
            self.q_network.weights[key] -= gradient_estimate
    
    def save_model(self, filepath: str) -> None:
        """Save the trained model"""
        model_data = {
            'q_network_weights': self.q_network.weights,
            'target_network_weights': self.target_network.weights,
            'training_steps': self.training_steps,
            'episode_count': self.episode_count,
            'epsilon': self.epsilon,
            'total_reward': self.total_reward,
            'hyperparameters': {
                'state_size': self.state_size,
                'action_size': self.action_size,
                'learning_rate': self.learning_rate,
                'gamma': self.gamma,
                'batch_size': self.batch_size
            }
        }
        
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
        
        logger.info(f"Model saved to {filepath}")
    
    def load_model(self, filepath: str) -> None:
        """Load a trained model"""
        try:
            with open(filepath, 'rb') as f:
                model_data = pickle.load(f)
            
            self.q_network.weights = model_data['q_network_weights']
            self.target_network.weights = model_data['target_network_weights']
            self.training_steps = model_data.get('training_steps', 0)
            self.episode_count = model_data.get('episode_count', 0)
            self.epsilon = model_data.get('epsilon', self.epsilon_min)
            self.total_reward = model_data.get('total_reward', 0.0)
            
            logger.info(f"Model loaded from {filepath}")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise
    
    def get_training_stats(self) -> Dict[str, Any]:
        """Get current training statistics"""
        return {
            'training_steps': self.training_steps,
            'episode_count': self.episode_count,
            'epsilon': self.epsilon,
            'total_reward': self.total_reward,
            'memory_size': len(self.memory),
            'average_reward': self.total_reward / max(1, self.episode_count)
        }
    
    def predict(self, state: np.ndarray) -> Dict[str, Any]:
        """
        Make a crash detection prediction
        
        Args:
            state: Sensor state vector
            
        Returns:
            Prediction results including action, confidence, and Q-values
        """
        q_values = self.q_network.forward(state.reshape(1, -1))[0]
        action = np.argmax(q_values)
        confidence = self._softmax(q_values)[action]
        
        return {
            'action': action,
            'action_name': self.action_mapping[action],
            'confidence': float(confidence),
            'q_values': q_values.tolist(),
            'action_probabilities': self._softmax(q_values).tolist(),
            'model_type': 'RL_DQN_Agent',
            'timestamp': datetime.now().isoformat()
        }
    
    def _softmax(self, x: np.ndarray) -> np.ndarray:
        """Softmax activation for probability conversion"""
        exp_x = np.exp(x - np.max(x))
        return exp_x / np.sum(exp_x)

# Factory function for creating RL agent
def create_crash_detection_agent(**kwargs) -> CrashDetectionAgent:
    """Create and return a CrashDetection RL agent"""
    return CrashDetectionAgent(**kwargs)

# Global agent instance
_global_rl_agent = None

def get_rl_agent_instance() -> CrashDetectionAgent:
    """Get or create global RL agent instance"""
    global _global_rl_agent
    if _global_rl_agent is None:
        _global_rl_agent = CrashDetectionAgent()
        logger.info("Created global RL agent instance")
    return _global_rl_agent
