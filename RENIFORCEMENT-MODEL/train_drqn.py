#!/usr/bin/env python3
# LSTM-DQN (DRQN) for CrashGuard — vibration-only (tilt/accel ignored)
# Updates:
#  - Stores severity in transitions
#  - Adds small supervised (behavior cloning) loss so the net learns:
#      S0->WAIT, S1->LOG_MINOR, S2->ALERT_NEARBY, S3->EMERGENCY

import json, math, random, argparse
from typing import List, Dict, Any
from collections import deque, namedtuple

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim

ACTIONS = ["WAIT","LOG_MINOR","ALERT_NEARBY","EMERGENCY_DISPATCH"]
WAIT, LOG_MINOR, ALERT_NEARBY, EMERGENCY_DISPATCH = 0,1,2,3
S0_NORMAL, S1_MINOR, S2_MODERATE, S3_SEVERE = 0,1,2,3

REWARD = {
    S0_NORMAL:   {WAIT:+1.0, LOG_MINOR:-1.0, ALERT_NEARBY:-4.0, EMERGENCY_DISPATCH:-6.0},
    S1_MINOR:    {WAIT: 0.0, LOG_MINOR:+2.0, ALERT_NEARBY:-2.0, EMERGENCY_DISPATCH:-4.0},
    S2_MODERATE: {WAIT:-3.0, LOG_MINOR:-1.0, ALERT_NEARBY:+4.0, EMERGENCY_DISPATCH:+0.5},
    S3_SEVERE:   {WAIT:-12.0, LOG_MINOR:-8.0, ALERT_NEARBY:-8.0, EMERGENCY_DISPATCH:+12.0},
}
WAIT_STEP_COST = 0.05

# Training defaults
SEQ_LEN       = 8
BATCH_SIZE    = 32
BUFFER_EPIS   = 256
GAMMA         = 0.99
LR            = 1e-3
EPS_START     = 1.0
EPS_END       = 0.05
EPS_DECAY     = 20000
TARGET_SYNC   = 500
GRAD_CLIP     = 2.0
EPOCHS        = 40
AUG_NOISE_P   = 0.05
SUP_LAMBDA    = 1.0   # weight for supervised imitation (BC) loss - was 0.5/0.8, increased for stronger S2/S3 preferences

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def vib_count(v: Dict[str,int]) -> int:
    return int(v.get("front_left",0)) + int(v.get("front_right",0)) + int(v.get("mid_left",0)) + int(v.get("mid_right",0)) + int(v.get("rear_left",0)) + int(v.get("rear_right",0))

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
    return np.array(bits + [total, roll_sum, left-right, front-rear], dtype=np.float32)

def load_sensor_json(path: str) -> List[Dict[str,Any]]:
    with open(path, "r", encoding="utf-8") as f:
        arr = json.load(f)
    seq, vib_hist = [], []
    for row in arr:
        vib = row["data"]["vibration_sensors"] if "data" in row and "vibration_sensors" in row["data"] else row.get("vibration_sensors") or row.get("vibration")
        if vib is None: continue
        vib_hist.append(vib)
        obs = features_from_vib(vib_hist)
        sev = sev_from_vib(vib_hist)
        seq.append({"time": row.get("time"), "obs": obs, "sev": sev, "raw_vib": vib})
    return seq

class LogEnv:
    def __init__(self, sequence: List[Dict[str,Any]]):
        self.base = sequence
    def reset(self, start: int = 0):
        self.idx = start; self.done = False
        return self.base[self.idx]["obs"]
    def step(self, action: int):
        cur = self.base[self.idx]; sev = cur["sev"]
        r = REWARD[sev][action] - (WAIT_STEP_COST if action==WAIT else 0.0)
        if action == EMERGENCY_DISPATCH:
            return np.zeros_like(cur["obs"]), r, True, {"sev": sev}
        self.idx += 1
        if self.idx >= len(self.base):
            return np.zeros_like(cur["obs"]), r, True, {"sev": sev}
        return self.base[self.idx]["obs"], r, False, {"sev": sev}

class DRQNet(nn.Module):
    def __init__(self, input_dim: int, n_actions: int = 4, hidden: int = 128):
        super().__init__()
        self.fe = nn.Sequential(nn.Linear(input_dim,128), nn.ReLU(), nn.Linear(128,128), nn.ReLU())
        self.lstm = nn.LSTM(128, hidden, batch_first=True)
        self.head = nn.Linear(hidden, n_actions)
    def forward(self, x, h=None):
        B,T,D = x.shape
        x = self.fe(x.reshape(B*T,D)).reshape(B,T,-1)
        y,h = self.lstm(x, h)
        q = self.head(y[:, -1, :])
        return q, h

# include sev_last
Transition = namedtuple("Transition", "seq_obs seq_act seq_rew seq_done seq_next_obs sev_last")

class SeqReplay:
    def __init__(self, capacity=BUFFER_EPIS): self.buf = deque(maxlen=capacity)
    def push_episode(self, episode): self.buf.append(episode)
    def sample(self, batch_size: int, seq_len: int) -> Transition:
        obs_b, act_b, rew_b, done_b, nxt_b, sev_last_b = [], [], [], [], [], []
        for _ in range(batch_size):
            epi = random.choice(self.buf)
            if len(epi) < seq_len:
                epi = epi + [epi[-1]]*(seq_len-len(epi)); start = 0
            else:
                start = random.randint(0, len(epi)-seq_len)
            chunk = epi[start:start+seq_len]
            ob_seq = np.stack([c[0] for c in chunk], 0)
            ac_seq = np.array([c[1] for c in chunk], np.int64)
            rw_seq = np.array([c[2] for c in chunk], np.float32)
            dn_seq = np.array([c[3] for c in chunk], np.float32)
            nx_seq = np.stack([c[4] for c in chunk], 0)
            sev_seq= np.array([c[5] for c in chunk], np.int64)

            obs_b.append(ob_seq); act_b.append(ac_seq[-1]); rew_b.append(rw_seq[-1])
            done_b.append(dn_seq[-1]); nxt_b.append(nx_seq); sev_last_b.append(sev_seq[-1])

        return Transition(
            seq_obs=torch.tensor(np.stack(obs_b), dtype=torch.float32, device=DEVICE),
            seq_act=torch.tensor(np.array(act_b), dtype=torch.int64, device=DEVICE),
            seq_rew=torch.tensor(np.array(rew_b), dtype=torch.float32, device=DEVICE).unsqueeze(1),
            seq_done=torch.tensor(np.array(done_b), dtype=torch.float32, device=DEVICE).unsqueeze(1),
            seq_next_obs=torch.tensor(np.stack(nxt_b), dtype=torch.float32, device=DEVICE),
            sev_last=torch.tensor(np.array(sev_last_b), dtype=torch.long, device=DEVICE)
        )
    def __len__(self): return len(self.buf)

def epsilon_by_step(step): return EPS_END + (EPS_START - EPS_END) * math.exp(-step / EPS_DECAY)

def train(env: LogEnv, input_dim: int, epochs: int = EPOCHS, save_path="drqn.pt"):
    qnet = DRQNet(input_dim).to(DEVICE); tgt = DRQNet(input_dim).to(DEVICE)
    tgt.load_state_dict(qnet.state_dict())
    opt = optim.Adam(qnet.parameters(), lr=LR)
    huber = nn.SmoothL1Loss()
    ce = nn.CrossEntropyLoss()

    memory = SeqReplay()
    global_step = 0

    # heuristic optimal action per severity
    OPT = {S0_NORMAL:WAIT, S1_MINOR:LOG_MINOR, S2_MODERATE:ALERT_NEARBY, S3_SEVERE:EMERGENCY_DISPATCH}

    for ep in range(epochs):
        episode = []
        obs = env.reset(0); done = False
        while not done:
            eps = epsilon_by_step(global_step)
            if random.random() < eps:
                action = random.randrange(4)
            else:
                with torch.no_grad():
                    inp = torch.tensor(obs, dtype=torch.float32, device=DEVICE).view(1,1,-1)
                    q,_ = qnet(inp); action = int(q.argmax(1).item())

            next_obs, rew, done, info = env.step(action)

            # light augmentation
            if random.random() < AUG_NOISE_P and next_obs.sum() > 0:
                jj = random.randrange(len(next_obs)); next_obs = next_obs.copy(); next_obs[jj] += 1.0

            episode.append((obs, action, rew, done, next_obs, info["sev"]))
            obs = next_obs; global_step += 1

        memory.push_episode(episode)

        # train steps
        for _ in range(32):
            if len(memory) < 4: continue
            batch = memory.sample(BATCH_SIZE, SEQ_LEN)

            q,_ = qnet(batch.seq_obs)                            # (B,4) logits
            q_sa = q.gather(1, batch.seq_act.unsqueeze(1))       # (B,1)

            with torch.no_grad():
                qn,_ = tgt(batch.seq_next_obs)
                max_next = qn.max(1, keepdim=True)[0]
                target = batch.seq_rew + (1.0 - batch.seq_done) * GAMMA * max_next

            td_loss  = huber(q_sa, target)

            # behavior cloning on last step target action
            opt_act = torch.tensor([OPT[int(s.item())] for s in batch.sev_last], device=DEVICE)
            sup_loss = ce(q, opt_act)

            loss = td_loss + SUP_LAMBDA * sup_loss
            opt.zero_grad(); loss.backward()
            nn.utils.clip_grad_norm_(qnet.parameters(), GRAD_CLIP)
            opt.step()

        if (ep+1) % 2 == 0:
            tgt.load_state_dict(qnet.state_dict())
        print(f"[epoch {ep+1:03d}] episodes_in_buffer={len(memory):3d}")

    torch.save(qnet.state_dict(), save_path)
    print(f"[saved] {save_path}")
    return qnet

class DRQNRunner:
    def __init__(self, model_path: str, input_dim: int):
        self.net = DRQNet(input_dim).to(DEVICE)
        self.net.load_state_dict(torch.load(model_path, map_location=DEVICE))
        self.net.eval(); self.h = None
    def step(self, obs_vec: np.ndarray) -> int:
        with torch.no_grad():
            x = torch.tensor(obs_vec, dtype=torch.float32, device=DEVICE).view(1,1,-1)
            q, self.h = self.net(x, self.h); return int(q.argmax(1).item())
    def reset(self): self.h = None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", type=str, required=True)
    ap.add_argument("--epochs", type=int, default=EPOCHS)
    ap.add_argument("--save", type=str, default="drqn.pt")
    args = ap.parse_args()

    seq = load_sensor_json(args.data)
    env = LogEnv(seq); input_dim = seq[0]["obs"].shape[0]

    _ = train(env, input_dim, epochs=args.epochs, save_path=args.save)

    # quick validation run
    runner = DRQNRunner(args.save, input_dim)
    print("\n[demo] actions over the log:")
    for i, row in enumerate(seq):
        act = runner.step(row["obs"])
        print(f"{i:02d} vib={sum(row['obs'][:6])} sev={row['sev']} -> {ACTIONS[act]}")
    runner.reset()

if __name__ == "__main__":
    main()
