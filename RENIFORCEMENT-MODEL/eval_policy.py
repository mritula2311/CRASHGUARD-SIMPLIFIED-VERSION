import json, numpy as np, torch
from train_drqn import DRQNRunner, load_sensor_json, ACTIONS
from train_drqn import S0_NORMAL,S1_MINOR,S2_MODERATE,S3_SEVERE

seq = load_sensor_json("sensor.json")
runner = DRQNRunner("drqn.pt", seq[0]["obs"].shape[0])
counts = np.zeros((4,4), int)
for row in seq:
    a = runner.step(row["obs"])
    counts[row["sev"], a] += 1
print("rows=severity S0..S3, cols=action WAIT LOG ALERT EMER")
print(counts)
