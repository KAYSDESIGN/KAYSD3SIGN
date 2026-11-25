"""Reads `simctl list devices available -j` on stdin, prints the UDID of the newest iPhone on the newest iOS runtime."""
import json, re, sys

data = json.load(sys.stdin)["devices"]
best = None
for runtime, devices in data.items():
    m = re.search(r"iOS-(\d+)-(\d+)", runtime)
    if not m:
        continue
    version = (int(m.group(1)), int(m.group(2)))
    for d in devices:
        if d.get("isAvailable") and d["name"].startswith("iPhone"):
            pro = "Pro" in d["name"]
            key = (version, not pro, d["name"])
            if best is None or key > best[0]:
                best = (key, d["udid"])
if not best:
    sys.exit("no iPhone simulator available")
print(best[1])
