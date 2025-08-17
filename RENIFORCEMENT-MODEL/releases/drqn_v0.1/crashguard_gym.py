#!/usr/bin/env python3
# crashguard_gym.py — Gymnasium-compatible envs for CrashGuard (vibration-only)
# Author: you. Works with Gymnasium >=0.29 and SB3 >=2.0.

from __future__ import annotations
import json, numpy as np
from dataclasses import dataclass
from typing import Any, Dict, List, Tuple, Optional

import gymnasium as gym
from gymnasium import spaces

# ---------- Constants ----------
ACTIONS = ["WAIT","LOG_MINOR","ALERT_NEARBY","EMERGENCY_DISPATCH"]
WAIT, LOG_MINOR, ALERT_NEARBY, EMERGENCY_DISPATCH = 0, 1, 2, 3
S0_NORMAL, S1_MINOR, S2_MODERATE, S3_SEVERE = 0, 1, 2, 3
STATE_NAMES = ["S0_NORMAL","S1_MINOR","S2_MODERATE","S3_SEVERE"]

# Reward grid (same semantics; severe row strengthened)
REWARD = {
    S0_NORMAL:   {WAIT:+1.0, LOG_MINOR:-1.0, ALERT_NEARBY:-4.0, EMERGENCY_DISPATCH:-6.0},
    S1_MINOR:    {WAIT: 0.0, LOG_MINOR:+2.0, ALERT_NEARBY:-2.0, EMERGENCY_DISPATCH:-4.0},
    S2_MODERATE: {WAIT:-2.0, LOG_MINOR: 0.0, ALERT_NEARBY:+3.0, EMERGENCY_DISPATCH:+1.0},
    S3_SEVERE:   {WAIT:-10.0, LOG_MINOR:-6.0, ALERT_NEARBY:-7.0, EMERGENCY_DISPATCH:+10.0},
}
WAIT_STEP_COST = 0.05  # discourage procrastination

# ---------- Feature engineering (vibration-only) ----------
def vib_count(v: Dict[str, int]) -> int:
    keys = ("front_left","front_right","mid_left","mid_right","rear_left","rear_right")
    return int(v.get("front_left",0)) + int(v.get("front_right",0)) + \
           int(v.get("mid_left",0))   + int(v.get("mid_right",0))   + \
           int(v.get("rear_left",0))  + int(v.get("rear_right",0))

def sev_from_vib(window: List[Dict[str,int]]) -> int:
    cur = window[-1]
    cur_active = vib_count(cur)
    w = window[-3:] if len(window) >= 3 else window
    roll_sum = sum(vib_count(x) for x in w)
    if cur_active >= 5 or roll_sum >= 9: return S3_SEVERE
    if cur_active >= 3 or roll_sum >= 5: return S2_MODERATE
    if cur_active >= 1:                  return S1_MINOR
    return S0_NORMAL

def features_from_vib(hist: List[Dict[str,int]]) -> np.ndarray:
    """
    Observation (D=10):
      [FL, FR, ML, MR, RL, RR, total, roll_sum(3), (L-R), (F-R)]
    """
    cur = hist[-1]
    bits = [
        int(cur.get("front_left",0)), int(cur.get("front_right",0)),
        int(cur.get("mid_left",0)),   int(cur.get("mid_right",0)),
        int(cur.get("rear_left",0)),  int(cur.get("rear_right",0)),
    ]
    total = sum(bits)
    w = hist[-3:] if len(hist) >= 3 else hist
    roll_sum = sum(vib_count(x) for x in w)

    left  = int(cur.get("front_left",0)) + int(cur.get("mid_left",0)) + int(cur.get("rear_left",0))
    right = int(cur.get("front_right",0))+ int(cur.get("mid_right",0))+ int(cur.get("rear_right",0))
    front = int(cur.get("front_left",0)) + int(cur.get("front_right",0))
    rear  = int(cur.get("rear_left",0))  + int(cur.get("rear_right",0))

    feat = np.array(bits + [total, roll_sum, left-right, front-rear], dtype=np.float32)
    return feat

# ---------- Dataset helpers ----------
def extract_vibration(obj: Dict[str,Any]) -> Optional[Dict[str,int]]:
    if "vibration_sensors" in obj: return obj["vibration_sensors"]
    if "vibration" in obj: return obj["vibration"]
    if "data" in obj and isinstance(obj["data"], dict):
        if "vibration_sensors" in obj["data"]: return obj["data"]["vibration_sensors"]
        if "vibration" in obj["data"]: return obj["data"]["vibration"]
    return None

def load_sensor_json(path: str) -> List[Dict[str,Any]]:
    """
    Input: JSON array of frames with a 'vibration_sensors' object (like your sample).
    Output sequence: [{'time', 'obs'(np.ndarray), 'sev'(int), 'vib'(dict)}...]
    """
    with open(path, "r", encoding="utf-8") as f:
        arr = json.load(f)
    seq, vib_hist = [], []
    for row in arr:
        vib = extract_vibration(row)
        if vib is None: continue
        vib_hist.append(vib)
        seq.append({
            "time": row.get("time"),
            "vib": vib,
            "obs": features_from_vib(vib_hist),
            "sev": sev_from_vib(vib_hist),
        })
    if not seq:
        raise ValueError("No frames with vibration_sensors found in dataset.")
    return seq

# ---------- Config ----------
@dataclass
class CrashGuardConfig:
    emergency_ends_episode: bool = True
    wait_step_cost: float = WAIT_STEP_COST

# ---------- Gymnasium Env: Replay from Logged Sequence ----------
class CrashGuardReplayEnv(gym.Env):
    """
    Replays a fixed logged sequence. The action affects reward; the sequence itself is exogenous.
    If emergency_ends_episode=True, taking EMERGENCY_DISPATCH terminates the episode.
    """
    metadata = {"render_modes": []}

    def __init__(self, sequence: List[Dict[str,Any]], config: CrashGuardConfig | None = None):
        super().__init__()
        self.seq = sequence
        self.cfg = config or CrashGuardConfig()

        # Observation space bounds (exact, known):
        # bits 0/1, total [0..6], roll_sum [0..18] (3*6), L-R [-3..+3], F-R [-2..+2]
        low  = np.array([0]*6 + [0, 0, -3, -2], dtype=np.float32)
        high = np.array([1]*6 + [6, 18,  3,  2], dtype=np.float32)
        self.observation_space = spaces.Box(low=low, high=high, shape=(10,), dtype=np.float32)
        self.action_space = spaces.Discrete(4)

        self._idx = 0
        self._terminated = False
        self._truncated = False

    def reset(self, *, seed: Optional[int] = None, options: Optional[dict] = None) -> Tuple[np.ndarray, dict]:
        super().reset(seed=seed)
        self._idx = int(options.get("start_index", 0)) if options else 0
        self._terminated = False
        self._truncated = False
        obs = self.seq[self._idx]["obs"].astype(np.float32)
        info = {"sev": self.seq[self._idx]["sev"], "time": self.seq[self._idx].get("time")}
        return obs, info

    def step(self, action: int) -> Tuple[np.ndarray, float, bool, bool, dict]:
        assert self.action_space.contains(action), f"Invalid action {action}"

        cur = self.seq[self._idx]
        sev = cur["sev"]
        r = float(REWARD[sev][action])
        if action == WAIT:
            r -= self.cfg.wait_step_cost

        # Emergency can terminate episode
        if self.cfg.emergency_ends_episode and action == EMERGENCY_DISPATCH:
            self._terminated = True

        # advance timeline unless already at end/terminated
        if not self._terminated:
            self._idx += 1
            if self._idx >= len(self.seq):
                self._truncated = True

        if self._terminated or self._truncated:
            # dummy observation on terminal step
            next_obs = np.zeros_like(cur["obs"], dtype=np.float32)
            info = {"sev": sev, "time": cur.get("time")}
            return next_obs, r, self._terminated, self._truncated, info

        nxt = self.seq[self._idx]
        next_obs = nxt["obs"].astype(np.float32)
        info = {"sev": sev, "time": cur.get("time")}
        return next_obs, r, False, False, info

    # No-op stubs to satisfy render/close API
    def render(self): pass
    def close(self): pass

# ---------- Convenience factory ----------
def make_replay_env_from_json(path: str, config: CrashGuardConfig | None = None) -> CrashGuardReplayEnv:
    return CrashGuardReplayEnv(load_sensor_json(path), config or CrashGuardConfig())
