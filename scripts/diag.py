import json, re, sys
from collections import defaultdict

LOG_DIR = "/home/ubuntu/living-nexus/.manus-logs"

def parse_log(path):
    entries = []
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                # Strip ISO timestamp prefix like [2026-06-22T...Z]
                m = re.match(r'^\[[\d\-T:.Z]+\]\s*(.*)', line)
                if m:
                    line = m.group(1)
                try:
                    entries.append(json.loads(line))
                except Exception:
                    pass
    except FileNotFoundError:
        pass
    return entries

# ── Network requests ─────────────────────────────────────────────────────────
print("=" * 60)
print("NETWORK REQUEST ANALYSIS")
print("=" * 60)

net = parse_log(f"{LOG_DIR}/networkRequests.log")
print(f"Total requests logged: {len(net)}")

durations = [e.get("duration", 0) for e in net if "duration" in e]
if durations:
    avg = sum(durations) / len(durations)
    print(f"Duration — min: {min(durations)}ms | max: {max(durations)}ms | avg: {avg:.0f}ms")

slow = [(e.get("duration", 0), e.get("url", "")[:90], e.get("response", {}).get("status", "?"))
        for e in net if e.get("duration", 0) > 1500]
slow.sort(reverse=True)
if slow:
    print(f"\nSLOW REQUESTS (>1500ms): {len(slow)}")
    for dur, url, status in slow[:10]:
        print(f"  {dur}ms | HTTP {status} | {url}")
else:
    print("\nNo requests over 1500ms found.")

errors = [(e.get("response", {}).get("status", 0), e.get("url", "")[:90], e.get("duration", 0))
          for e in net if str(e.get("response", {}).get("status", "")).startswith(("4", "5"))]
if errors:
    print(f"\nHTTP ERROR RESPONSES: {len(errors)}")
    for status, url, dur in errors[:10]:
        print(f"  HTTP {status} | {dur}ms | {url}")
else:
    print("\nNo HTTP 4xx/5xx responses found.")

# Endpoint frequency
endpoint_counts = defaultdict(int)
for e in net:
    url = e.get("url", "")
    # Normalize: strip query params and IDs
    url = re.sub(r'\?.*', '', url)
    url = re.sub(r'/\d+', '/:id', url)
    endpoint_counts[url] += 1

print(f"\nTOP ENDPOINTS BY CALL FREQUENCY:")
for url, count in sorted(endpoint_counts.items(), key=lambda x: -x[1])[:10]:
    print(f"  {count}x  {url}")

# ── Browser console errors ────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("BROWSER CONSOLE ERRORS")
print("=" * 60)

console = parse_log(f"{LOG_DIR}/browserConsole.log")
errors_only = [e for e in console if e.get("level") in ("ERROR", "WARN")]
print(f"Total console entries: {len(console)}")
print(f"Errors/Warnings: {len(errors_only)}")

if errors_only:
    print("\nERROR/WARN MESSAGES (most recent 15):")
    for e in errors_only[-15:]:
        args = e.get("args", [])
        msg = " ".join(str(a) for a in args)[:120]
        print(f"  [{e.get('level')}] {msg}")
else:
    print("No errors or warnings in browser console.")

# ── Session replay ────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("SESSION REPLAY — INTERACTION PATTERNS")
print("=" * 60)

replay = parse_log(f"{LOG_DIR}/sessionReplay.log")
print(f"Total interaction events: {len(replay)}")

event_types = defaultdict(int)
page_visits = defaultdict(int)
for e in replay:
    et = e.get("type") or e.get("event") or "unknown"
    event_types[et] += 1
    if et in ("navigation", "pageview", "page"):
        url = e.get("url") or e.get("path") or ""
        url = re.sub(r'\d{5,}', ':id', url)
        page_visits[url] += 1

print("\nEVENT TYPE BREAKDOWN:")
for et, count in sorted(event_types.items(), key=lambda x: -x[1])[:10]:
    print(f"  {count}x  {et}")

if page_visits:
    print("\nMOST VISITED PAGES:")
    for url, count in sorted(page_visits.items(), key=lambda x: -x[1])[:10]:
        print(f"  {count}x  {url}")

# ── Server log summary ────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("SERVER LOG — KEY SIGNALS")
print("=" * 60)

try:
    with open(f"{LOG_DIR}/devserver.log") as f:
        lines = f.readlines()
    print(f"Total server log lines: {len(lines)}")

    # Find crashes / restarts
    restarts = [l.strip() for l in lines if "Restarting" in l or "Rerunning" in l or "Server running" in l]
    print(f"\nServer restarts/reloads: {len(restarts)}")
    for r in restarts[-5:]:
        print(f"  {r}")

    # Find errors
    errs = [l.strip() for l in lines if "ERROR" in l.upper() or "ERR_" in l or "Error" in l]
    print(f"\nServer-side errors: {len(errs)}")
    for e in errs[-10:]:
        print(f"  {e[:120]}")

    # Find auth issues
    auth_issues = [l.strip() for l in lines if "Missing session" in l or "Unauthorized" in l or "401" in l]
    print(f"\nAuth issues logged: {len(auth_issues)}")
    for a in auth_issues[-5:]:
        print(f"  {a}")

except FileNotFoundError:
    print("devserver.log not found")

print("\n" + "=" * 60)
print("DIAGNOSTIC COMPLETE")
print("=" * 60)
