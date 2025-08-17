#!/usr/bin/env python3
import json, os, sys, math
from collections import Counter, defaultdict
from datetime import datetime, timezone

LOG = os.path.join("data", "frames.ndjson")
ACTIONS = ["WAIT","LOG_MINOR","ALERT_NEARBY","EMERGENCY_DISPATCH"]

def read_ndjson(path):
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line=line.strip()
            if not line: continue
            try: yield json.loads(line)
            except: pass

def main():
    if not os.path.exists(LOG):
        print(f"no log at {LOG}. run run_realtime.py first."); sys.exit(1)

    counts = Counter()
    sev_action = defaultdict(Counter)
    incidents, last_dispatch_ms = 0, -10**18
    COOLDOWN_MS = 5_000     # mirror your runtime config
    WINDOW_MS   = 10_000

    t0 = None
    latencies = []          # time from first S3 to first EMER in incident

    pending_s3_ms = None

    for row in read_ndjson(LOG):
        ts = row.get("ts")
        if t0 is None: t0 = ts
        action = row.get("action")
        sev    = row.get("sev")
        counts[action]+=1
        sev_action[sev][action]+=1

        if sev == "S3_SEVERE" and pending_s3_ms is None:
            pending_s3_ms = ts

        if action == "EMERGENCY_DISPATCH":
            # dedup by incident window / cooldown
            if ts - last_dispatch_ms >= max(COOLDOWN_MS, WINDOW_MS):
                incidents += 1
                if pending_s3_ms is not None:
                    latencies.append(ts - pending_s3_ms)
                pending_s3_ms = None
                last_dispatch_ms = ts

    print("\n=== ACTION COUNTS ===")
    for a in ACTIONS: print(f"{a:18s} {counts[a]:5d}")

    print("\n=== SEVERITY → ACTION ===")
    for sev in ["S0_NORMAL","S1_MINOR","S2_MODERATE","S3_SEVERE"]:
        row = sev_action[sev]
        print(f"{sev:12s} " + " ".join(f"{a[:5]}={row[a]:3d}" for a in ACTIONS))

    print(f"\nincidents={incidents}")
    if latencies:
        latencies_sorted = sorted(latencies)
        n = len(latencies_sorted)
        # linear interpolation percentile to avoid small-N bias
        rank = 0.95 * (n - 1)
        lo = int(math.floor(rank))
        hi = int(math.ceil(rank))
        if lo == hi:
            p95 = latencies_sorted[lo]
        else:
            p = rank - lo
            p95 = latencies_sorted[lo]*(1-p) + latencies_sorted[hi]*p
        avg = sum(latencies_sorted)/n
        print(f"dispatch_latency_ms: avg={avg:.1f}  p95={p95:.1f}")
    else:
        print("dispatch_latency_ms: n/a")

    if t0 is not None:
        t0_iso = datetime.fromtimestamp(t0/1000.0, tz=timezone.utc).isoformat()
        print(f"\nfirst_log_ts={t0_iso}")

if __name__ == "__main__":
    main()
