#!/usr/bin/env python3
# run_realtime.py — CrashGuard realtime loop (vibration-only, LSTM-DQN policy)
# - DRQN policy (drqn.pt)
# - Safety override
# - K-consecutive + cooldown + incident window (single EMER per burst)
# - Serial / MQTT / File / Stdin sources
# - --exit-after-eof for deterministic replays

import argparse, json, os, sys, time, threading, queue
from typing import Any, Dict, List, Optional
import hashlib

# --------------------- Model Integrity ---------------------
MODEL_VERSION = "drqn_v0.1"
EXPECTED_MODEL_SHA256 = "CE4AFB6B236D9BABCB938147F4E68363581F68C65EFC79935331873976881C3F"

# --------------------- Config ---------------------
CONFIG = {
    "model_path": "drqn.pt",
    "log_dir": "data",
    "debounce_sec": 1.0,
    "serial_baud": 115200,
    "default_interval_sec": 0.10,
    "print_decisions": True,

    # LoRa (UART) — set port to enable; leave None to disable
    "lora": {"port": None, "baud": 57600},

    # EMS backend (HTTP) — set url (and api_key) to enable; leave None to disable
    "ems": {"url": None, "api_key": None},

    # Emergency gating (dedupe + fast dispatch)
    "emergency": {
        "k_consecutive": 1,          # dispatch on first S3 frame
        "cooldown_sec": 5.0,         # suppress repeated dispatches for N seconds
        "min_vib_for_dispatch": 4    # require >= vib hits OR roll3>=9
    },
    "incident_window_sec": 10.0      # ensure only one EMER per incident window
}

os.makedirs(CONFIG["log_dir"], exist_ok=True)

# --------------------- Actions / States ---------------------
ACTIONS = ["WAIT", "LOG_MINOR", "ALERT_NEARBY", "EMERGENCY_DISPATCH"]
WAIT, LOG_MINOR, ALERT_NEARBY, EMERGENCY_DISPATCH = 0, 1, 2, 3

S0_NORMAL, S1_MINOR, S2_MODERATE, S3_SEVERE = 0, 1, 2, 3
STATE_NAMES = ["S0_NORMAL", "S1_MINOR", "S2_MODERATE", "S3_SEVERE"]

# --------------------- Feature engineering (vibration-only) ---------------------
def vib_count(v: Dict[str, int]) -> int:
    keys = ("front_left","front_right","mid_left","mid_right","rear_left","rear_right")
    return sum(int(v.get(k, 0)) for k in keys)

def last3_roll_sum(hist: List[Dict[str,int]]) -> int:
    w = hist[-3:] if len(hist) >= 3 else hist
    return sum(vib_count(x) for x in w)

def features_from_vib(hist: List[Dict[str,int]]) -> List[float]:
    """
    Observation vector (D=10):
      [FL, FR, ML, MR, RL, RR, total, roll_sum(3), (L-R), (F-R)]
    """
    cur = hist[-1]
    bits = [
        int(cur.get("front_left",0)), int(cur.get("front_right",0)),
        int(cur.get("mid_left",0)),   int(cur.get("mid_right",0)),
        int(cur.get("rear_left",0)),  int(cur.get("rear_right",0)),
    ]
    total = sum(bits)
    roll_sum = last3_roll_sum(hist)

    left  = int(cur.get("front_left",0)) + int(cur.get("mid_left",0)) + int(cur.get("rear_left",0))
    right = int(cur.get("front_right",0))+ int(cur.get("mid_right",0))+ int(cur.get("rear_right",0))
    front = int(cur.get("front_left",0)) + int(cur.get("front_right",0))
    rear  = int(cur.get("rear_left",0))  + int(cur.get("rear_right",0))

    return [*bits, float(total), float(roll_sum), float(left-right), float(front-rear)]

def sev_from_vib(hist: List[Dict[str,int]]) -> int:
    cur_active = vib_count(hist[-1])
    roll_sum = last3_roll_sum(hist)
    if cur_active >= 5 or roll_sum >= 9: return S3_SEVERE
    if cur_active >= 3 or roll_sum >= 5: return S2_MODERATE
    if cur_active >= 1:                  return S1_MINOR
    return S0_NORMAL

# --------------------- Safety override ---------------------
def safety_override(vib: Dict[str,int], proposed_action: int) -> int:
    # Force emergency if 5+ sensors at once
    if vib_count(vib) >= 5:
        return EMERGENCY_DISPATCH
    return proposed_action

# --------------------- Optional deps for I/O hooks ---------------------
try:
    import serial as _serial         # pyserial
except Exception:
    _serial = None

try:
    import requests as _requests     # HTTP
except Exception:
    _requests = None

# --------------------- DRQN runner (PyTorch) ---------------------
try:
    import torch
    import torch.nn as nn
    TORCH_OK = True
except Exception:
    TORCH_OK = False

if TORCH_OK:
    class DRQNet(nn.Module):
        def __init__(self, input_dim: int, n_actions: int = 4, hidden: int = 128):
            super().__init__()
            self.fe = nn.Sequential(
                nn.Linear(input_dim, 128), nn.ReLU(),
                nn.Linear(128, 128), nn.ReLU(),
            )
            self.lstm = nn.LSTM(128, hidden, batch_first=True)
            self.head = nn.Linear(hidden, n_actions)
        def forward(self, x, h=None):
            # x: (B,T,D)
            B, T, D = x.shape
            x = self.fe(x.reshape(B*T, D)).reshape(B, T, -1)
            y, h = self.lstm(x, h)
            q = self.head(y[:, -1, :])
            return q, h

    class DRQNRunner:
        def __init__(self, model_path: str, input_dim: int):
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"Model not found: {model_path}")
            self.net = DRQNet(input_dim).eval()
            self.net.load_state_dict(torch.load(model_path, map_location="cpu"))
            self.h = None
        def step(self, obs_vec: List[float]) -> int:
            with torch.no_grad():
                x = torch.tensor(obs_vec, dtype=torch.float32).view(1,1,-1)
                q, self.h = self.net(x, self.h)
                return int(q.argmax(1).item())
        def reset(self): self.h = None
else:
    DRQNRunner = None

# --------------------- Dispatcher (LoRa / EMS / logging) ---------------------
class Dispatcher:
    def __init__(self, debounce_sec: float, lora_cfg: Dict[str,Any], ems_cfg: Dict[str,Any]):
        self._last_ts = 0.0
        self._debounce = debounce_sec

        # LoRa (UART)
        self._lora = None
        if lora_cfg and lora_cfg.get("port") and _serial is not None:
            try:
                self._lora = _serial.Serial(lora_cfg["port"], baudrate=int(lora_cfg.get("baud",57600)), timeout=0.5)
                print(f"[LORA] Connected {lora_cfg['port']} @ {lora_cfg.get('baud',57600)}")
            except Exception as e:
                print(f"[LORA] WARN: {e} — Loora disabled.")

        # EMS backend
        self._ems_url = (ems_cfg or {}).get("url")
        self._ems_key = (ems_cfg or {}).get("api_key")

    def _throttle(self) -> bool:
        now = time.time()
        if now - self._last_ts < self._debounce: return False
        self._last_ts = now; return True

    def _write_log(self, name: str, payload: Dict[str,Any]):
        path = os.path.join(CONFIG["log_dir"], f"{name}.ndjson")
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(payload) + "\n")

    def log_minor(self, frame: Dict[str,Any]):
        if not self._throttle(): return
        payload = {"ts": int(time.time()*1000), "type": "LOG_MINOR", "frame": frame}
        self._write_log("events", payload)
        print("[ACTION] LOG_MINOR")

    def alert_nearby(self, frame: Dict[str,Any]):
        if not self._throttle(): return
        payload = {"ts": int(time.time()*1000), "type": "ALERT_NEARBY", "gps": frame.get("gps")}
        if self._lora is not None:
            try: self._lora.write((json.dumps(payload) + "\n").encode("utf-8"))
            except Exception as e: print(f"[LORA] send error: {e}")
        self._write_log("events", payload)
        print("[ACTION] ALERT_NEARBY (LoRa broadcast)")

    def emergency_dispatch(self, frame: Dict[str,Any]):
        payload = {"ts": int(time.time()*1000), "type": "EMERGENCY_DISPATCH", "gps": frame.get("gps"), "frame": frame}
        payload["model_version"] = MODEL_VERSION
        payload["model_sha256"] = EXPECTED_MODEL_SHA256
        if self._ems_url and _requests is not None:
            try:
                headers = {"Authorization": f"Bearer {self._ems_key}"} if self._ems_key else {}
                _requests.post(self._ems_url, json=payload, headers=headers, timeout=3.0)
            except Exception as e:
                print(f"[EMS] POST failed: {e}")
        self._write_log("events", payload)
        print("[ACTION] EMERGENCY_DISPATCH (EMS workflow)")

# --------------------- Utilities ---------------------
def ts_ms() -> int:
    return int(time.time() * 1000)

def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1<<20), b""):
            h.update(chunk)
    return h.hexdigest().upper()

def extract_vibration(obj: Dict[str,Any]) -> Optional[Dict[str,int]]:
    if "vibration_sensors" in obj: return obj["vibration_sensors"]
    if "vibration" in obj: return obj["vibration"]
    if "data" in obj and isinstance(obj["data"], dict):
        if "vibration_sensors" in obj["data"]: return obj["data"]["vibration_sensors"]
        if "vibration" in obj["data"]: return obj["data"]["vibration"]
    return None

# --------------------- Ingest sources ---------------------
def serial_reader(port: str, baud: int, out_q: "queue.Queue[dict]"):
    try:
        import serial
        ser = serial.Serial(port, baudrate=baud, timeout=1.0)
        print(f"[SERIAL] open {port} @ {baud}")
    except Exception as e:
        print(f"[SERIAL] init failed: {e}"); return
    while True:
        try:
            line = ser.readline().decode(errors="ignore").strip()
            if not line: continue
            obj = json.loads(line.rstrip(") "))
            vib = extract_vibration(obj)
            if vib is not None: out_q.put({"raw": obj, "vibration": vib})
        except Exception: continue

def mqtt_reader(host: str, topic: str, out_q: "queue.Queue[dict]"):
    try:
        import paho.mqtt.client as mqtt
    except Exception:
        print("[MQTT] paho-mqtt not installed. pip install paho-mqtt"); return
    def on_connect(client, userdata, flags, rc):
        client.subscribe(topic); print(f"[MQTT] connected rc={rc}; subscribed {topic}")
    def on_message(client, userdata, msg):
        try:
            obj = json.loads(msg.payload.decode("utf-8"))
            vib = extract_vibration(obj)
            if vib is not None: out_q.put({"raw": obj, "vibration": vib})
        except Exception: pass
    client = mqtt.Client(); client.on_connect = on_connect; client.on_message = on_message
    try: client.connect(host, 1883, 60); client.loop_forever()
    except Exception as e: print(f"[MQTT] connect failed: {e}")

def file_reader(path: str, out_q: "queue.Queue[dict]", interval: float):
    print(f"[FILE] replay {path} @ {interval:.3f}s")
    try:
        with open(path, "r", encoding="utf-8") as f:
            txt = f.read().strip()
    except Exception as e:
        print(f"[FILE] read failed: {e}")
        out_q.put({"_eof": True})
        return

    # Try array first
    try:
        arr = json.loads(txt)
        if isinstance(arr, list):
            for obj in arr:
                vib = extract_vibration(obj)
                if vib is not None:
                    out_q.put({"raw": obj, "vibration": vib})
                    time.sleep(interval)
            out_q.put({"_eof": True})
            return
    except Exception:
        pass

    # Fallback NDJSON
    for line in txt.splitlines():
        line = line.strip()
        if not line: continue
        try:
            obj = json.loads(line.rstrip(") "))
            vib = extract_vibration(obj)
            if vib is not None:
                out_q.put({"raw": obj, "vibration": vib})
                time.sleep(interval)
        except Exception:
            continue
    out_q.put({"_eof": True})

def stdin_reader(out_q: "queue.Queue[dict]", interval: float):
    print(f"[STDIN] reading NDJSON @ ~{interval:.3f}s (Ctrl+C to stop)")
    for line in sys.stdin:
        line = line.strip()
        if not line: continue
        try:
            obj = json.loads(line.rstrip(") "))
            vib = extract_vibration(obj)
            if vib is not None:
                out_q.put({"raw": obj, "vibration": vib})
                if interval > 0: time.sleep(interval)
        except Exception:
            continue
    out_q.put({"_eof": True})

# --------------------- Main loop ---------------------
def main():
    ap = argparse.ArgumentParser()
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--serial", type=str, help="COM4 or /dev/ttyUSB0")
    src.add_argument("--mqtt", action="store_true", help="Read frames from MQTT")
    src.add_argument("--file", type=str, help="Replay from JSON array or NDJSON file")
    src.add_argument("--stdin", action="store_true", help="Read NDJSON from stdin")

    ap.add_argument("--mqtt-host", type=str, default="127.0.0.1")
    ap.add_argument("--mqtt-topic", type=str, default="crashguard/sensors")
    ap.add_argument("--interval", type=float, default=CONFIG["default_interval_sec"], help="Replay/stdin pacing interval (sec)")
    ap.add_argument("--model", type=str, default=CONFIG["model_path"])
    ap.add_argument("--exit-after-eof", action="store_true", help="Exit automatically when --file/--stdin reaches EOF")
    ap.add_argument("--verbose", action="store_true")
    ap.add_argument("--strict-integrity", action="store_true", help="Abort if model hash != EXPECTED_MODEL_SHA256")

    args = ap.parse_args()
    exit_on_eof = args.exit_after_eof and (args.file is not None or args.stdin)

    frames_q: "queue.Queue[dict]" = queue.Queue(maxsize=2000)

    if args.serial:
        threading.Thread(target=serial_reader, args=(args.serial, CONFIG["serial_baud"], frames_q), daemon=True).start()
    elif args.mqtt:
        threading.Thread(target=mqtt_reader, args=(args.mqtt_host, args.mqtt_topic, frames_q), daemon=True).start()
    elif args.file:
        threading.Thread(target=file_reader, args=(args.file, frames_q, args.interval), daemon=True).start()
    elif args.stdin:
        threading.Thread(target=stdin_reader, args=(frames_q, args.interval), daemon=True).start()

    # Vibration history & action dispatcher
    vib_hist: List[Dict[str,int]] = []
    disp = Dispatcher(CONFIG["debounce_sec"], CONFIG.get("lora"), CONFIG.get("ems"))

    # Determine input_dim (10 features)
    input_dim = 10

    # Load DRQN (or fallback)
    runner: Optional["DRQNRunner"] = None
    if TORCH_OK and os.path.exists(args.model):
        # Model integrity check
        actual = sha256_file(args.model)
        if actual != EXPECTED_MODEL_SHA256:
            msg = (f"[INTEGRITY] Model hash mismatch!\n"
                   f"  expected: {EXPECTED_MODEL_SHA256}\n"
                   f"  actual  : {actual}")
            if args.strict_integrity:
                raise SystemExit(msg)
            else:
                print(msg + "\n[INTEGRITY] Continuing (strict disabled).")
        
        try:
            runner = DRQNRunner(args.model, input_dim)
            print(f"[MODEL] Loaded DRQN from {args.model}")
        except Exception as e:
            print(f"[WARN] DRQN not loaded: {e}. Using heuristic fallback.")
    else:
        if not TORCH_OK:
            print("[WARN] torch not available; heuristic fallback.")
        else:
            print(f"[WARN] Model not found ({args.model}); heuristic fallback.")

    # Emergency gating state
    severe_streak = 0
    last_dispatch_ts = 0.0
    incident_open_until = 0.0

    print("[RUN] CrashGuard realtime started.")
    while True:
        item = frames_q.get()  # blocks

        # EOF sentinel for file/stdin sources
        if isinstance(item, dict) and item.get("_eof"):
            if exit_on_eof:
                print("[RUN] EOF reached — exiting (--exit-after-eof).")
                break
            continue

        vib = item.get("vibration")
        if vib is None:
            continue
        raw_frame = item.get("raw", {})

        # 1) Build observation & severity
        vib_hist.append(vib)
        obs_vec = features_from_vib(vib_hist)
        sev = sev_from_vib(vib_hist)

        # 2) Policy action (DRQN or heuristic fallback)
        if runner is not None:
            action = runner.step(obs_vec)
        else:
            action = {
                S0_NORMAL: WAIT,
                S1_MINOR: LOG_MINOR,
                S2_MODERATE: ALERT_NEARBY,
                S3_SEVERE: EMERGENCY_DISPATCH
            }[sev]

        # 3) Safety override (hard guardrail)
        action = safety_override(vib, action)

        # 4) STATE-BASED dispatch gating (one EMER per incident)
        # Track severity streak by STATE, not by chosen action
        if sev == S3_SEVERE:
            severe_streak += 1
        else:
            severe_streak = 0

        now = time.time()
        in_cooldown   = (now - last_dispatch_ts) < CONFIG["emergency"]["cooldown_sec"]
        incident_open = now < incident_open_until
        vib_now       = vib_count(vib)
        roll3         = last3_roll_sum(vib_hist)

        should_dispatch = (
            severe_streak >= CONFIG["emergency"]["k_consecutive"]
            and not in_cooldown
            and not incident_open
            and (vib_now >= CONFIG["emergency"]["min_vib_for_dispatch"] or roll3 >= 9)
        )

        if should_dispatch:
            action = EMERGENCY_DISPATCH
            last_dispatch_ts = now
            incident_open_until = now + CONFIG["incident_window_sec"]
        else:
            # During cooldown/incident window, don't spam EMER; escalate to ALERT if needed
            if in_cooldown or incident_open:
                if action in (WAIT, LOG_MINOR):
                    action = ALERT_NEARBY

        # 5) Execute action hooks
        if action == WAIT:
            pass
        elif action == LOG_MINOR:
            disp.log_minor(raw_frame)
        elif action == ALERT_NEARBY:
            disp.alert_nearby(raw_frame)
        elif action == EMERGENCY_DISPATCH:
            disp.emergency_dispatch(raw_frame)

        # 6) Persist decision row (NDJSON)
        row = {
            "ts": ts_ms(),
            "sev": STATE_NAMES[sev],
            "vib_active": vib_now,
            "action": ACTIONS[action],
            "raw": raw_frame
        }
        with open(os.path.join(CONFIG["log_dir"], "frames.ndjson"), "a", encoding="utf-8") as f:
            f.write(json.dumps(row) + "\n")

        if CONFIG["print_decisions"] or args.verbose:
            print(f"sev={STATE_NAMES[sev]:>10} vib={row['vib_active']} -> action={ACTIONS[action]}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[EXIT] Stopped by user.")
