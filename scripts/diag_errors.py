import json, re

errors = []
with open('/home/ubuntu/living-nexus/.manus-logs/browserConsole.log') as f:
    for line in f:
        line = line.strip()
        m = re.match(r'^\[[\d\-T:.Z]+\]\s*(.*)', line)
        if m:
            line = m.group(1)
        try:
            d = json.loads(line)
            if d.get('level') in ('ERROR', 'WARN'):
                args = d.get('args', [])
                msg = ' '.join(str(a) for a in args)
                errors.append((d.get('timestamp', 0), d.get('level'), msg))
        except Exception:
            pass

# Print unique error messages with full content
seen = set()
print(f"Total unique error/warn types: checking {len(errors)} entries\n")
for ts, level, msg in sorted(errors):
    key = msg[:100]
    if key not in seen:
        seen.add(key)
        print(f"[{level}] ts={ts}")
        print(f"  {msg[:500]}")
        print()
