#!/usr/bin/env python3
import subprocess, time, os, sys, json

def tail_actions(path):
    emers, lines = 0, 0
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            lines += 1
            try:
                obj = json.loads(line)
                if obj.get("action") == "EMERGENCY_DISPATCH":
                    emers += 1
            except: pass
    return lines, emers

def main():
    log = os.path.join("data","frames.ndjson")
    if os.path.exists(log): os.remove(log)

    # run a short replay and wait for it to complete
    p = subprocess.run(
        [sys.executable, "run_realtime.py",
         "--file", "sensor.json",
         "--model", "drqn.pt",
         "--interval", "0.05",
         "--exit-after-eof"],  # <-- new flag
        check=False
    )

    lines, emers = tail_actions(log)
    print(f"lines={lines}, emers={emers}")
    assert emers <= 1, "duplicate EMERGENCY_DISPATCH in a single incident window!"
    print("OK: incident gating working.")

if __name__ == "__main__":
    main()
