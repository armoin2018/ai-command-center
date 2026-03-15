#!/usr/bin/env python3
"""Sprint 23 frontier preview — find next executable items from BACKLOG."""
import json

PLAN = ".project/PLAN.json"
with open(PLAN, "r") as f:
    plan = json.load(f)

items_by_id = {i["id"]: i for i in plan["items"]}
done_ids = {i["id"] for i in plan["items"] if i["status"] == "DONE"}

def get_name(item):
    return item.get("name") or item.get("title") or item.get("summary") or "untitled"

# Find BACKLOG items whose dependencies are all DONE
frontier = []
for item in plan["items"]:
    if item["status"] != "BACKLOG":
        continue
    deps = item.get("dependencies", [])
    if all(d in done_ids for d in deps):
        frontier.append(item)

# Group by type
epics = [i for i in frontier if i["type"] == "epic"]
stories = [i for i in frontier if i["type"] == "story"]
tasks = [i for i in frontier if i["type"] == "task"]
bugs = [i for i in frontier if i["type"] == "bug"]

print(f"Sprint 23 Frontier: {len(frontier)} items")
print(f"  Epics: {len(epics)}, Stories: {len(stories)}, Tasks: {len(tasks)}, Bugs: {len(bugs)}")
print()

# Show epics with priority
for e in sorted(epics, key=lambda x: x.get("priority", 99)):
    print(f"  [{e['id']}] {get_name(e)} (priority={e.get('priority','?')})")

# Group stories by parent
print()
parent_groups = {}
for s in stories:
    pid = s.get("parentId", "none")
    parent_groups.setdefault(pid, []).append(s)

# Show first 10 parent groups
shown = 0
for pid, slist in sorted(parent_groups.items()):
    if shown >= 10:
        break
    pname = get_name(items_by_id.get(pid, {}))
    pstatus = items_by_id.get(pid, {}).get("status", "?")
    print(f"  Parent: [{pid}] {pname} ({pstatus})")
    for s in slist:
        print(f"    [{s['id']}] {get_name(s)} (priority={s.get('priority','?')})")
    shown += 1

# Count compliance stories
compliance = [s for s in stories if "compliance" in get_name(s).lower() or "compliance" in str(s.get("labels", [])).lower()]
print(f"\nCompliance stories: {len(compliance)}")
for c in compliance:
    print(f"  [{c['id']}] {get_name(c)}")

# Show total DONE progress
total = len(plan["items"])
done = len([i for i in plan["items"] if i["status"] == "DONE"])
print(f"\nOverall: {done}/{total} DONE ({100*done/total:.1f}%)")
