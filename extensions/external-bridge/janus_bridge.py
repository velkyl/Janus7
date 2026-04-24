import os
import json
import time
import sqlite3
import subprocess
from pathlib import Path

# Configuration
# The bridge will look for tasks in worlds/*/janus7/io/outbox relative to FOUNDRY_DATA
FOUNDRY_DATA = Path("../../..").resolve() # Default: assuming we are in modules/Janus7/extensions/external-bridge

def get_outbox_dirs():
    """Finds all Janus7 outbox directories in all worlds."""
    worlds_dir = FOUNDRY_DATA / "worlds"
    if not worlds_dir.exists():
        return []
    return list(worlds_dir.glob("*/janus7/io/outbox"))

def handle_sync_task(task, db_path):
    """Syncs the academy data bundle to SQLite."""
    data = task.get("data", {})
    if not data:
        return {"status": "error", "message": "No data in sync task"}

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Helper to sync a collection
        def sync_collection(table_name, items):
            if not items: return
            
            # Drop and recreate for simplicity in sync mode
            # In a production app, you might want to do delta-syncing
            cursor.execute(f"DROP TABLE IF EXISTS {table_name}")
            
            if not items: return
            
            # Infer columns from first item
            first = items[0]
            cols = []
            for k, v in first.items():
                if isinstance(v, (dict, list)):
                    cols.append(f"{k} TEXT") # Store as JSON string
                elif isinstance(v, int):
                    cols.append(f"{k} INTEGER")
                elif isinstance(v, float):
                    cols.append(f"{k} REAL")
                else:
                    cols.append(f"{k} TEXT")
            
            cursor.execute(f"CREATE TABLE {table_name} ({', '.join(cols)})")
            
            # Insert data
            col_names = list(first.keys())
            placeholders = ", ".join(["?" for _ in col_names])
            insert_sql = f"INSERT INTO {table_name} ({', '.join(col_names)}) VALUES ({placeholders})"
            
            for item in items:
                vals = []
                for k in col_names:
                    v = item.get(k)
                    if isinstance(v, (dict, list)):
                        vals.append(json.dumps(v))
                    else:
                        vals.append(v)
                cursor.execute(insert_sql, vals)

        # Sync main collections
        if "lessons" in data: sync_collection("lessons", data["lessons"].get("lessons", []))
        if "npcs" in data: sync_collection("npcs", data["npcs"].get("npcs", []))
        if "locations" in data: sync_collection("locations", data["locations"].get("locations", []))
        if "events" in data: sync_collection("events", data["events"].get("events", []))
        
        conn.commit()
        conn.close()
        return {"status": "success", "message": f"Synced {len(data)} collections"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def process_task(task_file):
    try:
        with open(task_file, "r", encoding="utf-8") as f:
            task = json.load(f)
        
        if task.get("version") != "JANUS_EXTERNAL_TASK_V1":
            return
            
        task_id = task.get("taskId")
        task_type = task.get("type")
        raw_db_path = task.get("db")
        
        # Resolve DB path relative to FOUNDRY_DATA
        if raw_db_path:
            db_path = (FOUNDRY_DATA / raw_db_path).resolve()
            # Ensure DB directory exists
            db_path.parent.mkdir(parents=True, exist_ok=True)
        else:
            db_path = None
        
        print(f"Processing {task_type} task: {task_id}")
        
        result = {"taskId": task_id, "status": "success", "data": None}
        
        if task_type == "sqlite" and db_path:
            query = task.get("query")
            params = task.get("params", [])
            conn = sqlite3.connect(str(db_path))
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(query, params)
            result["data"] = [dict(row) for row in cursor.fetchall()]
            conn.close()
            
        elif task_type == "python":
            script = task.get("script")
            args = task.get("args", {})
            process = subprocess.run(["python", script, json.dumps(args)], capture_output=True, text=True)
            if process.returncode == 0:
                try: result["data"] = json.loads(process.stdout)
                except: result["data"] = process.stdout
            else:
                result["status"] = "error"
                result["error"] = process.stderr

        elif task_type == "sync" and db_path:
            sync_res = handle_sync_task(task, str(db_path))
            result.update(sync_res)
                
        # Write result to inbox (same world as outbox)
        inbox_dir = task_file.parent.parent / "inbox"
        inbox_dir.mkdir(parents=True, exist_ok=True)
        result_file = inbox_dir / f"result_{task_id}.json"
        with open(result_file, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)
            
        print(f"Task {task_id} completed. Result written to {result_file}")
        os.remove(task_file)
        
    except Exception as e:
        print(f"Error processing task {task_file}: {e}")

def main():
    print(f"Janus7 External Bridge started.")
    print(f"Foundry Data Root: {FOUNDRY_DATA}")
    
    while True:
        outbox_dirs = get_outbox_dirs()
        for outbox in outbox_dirs:
            for task_file in outbox.glob("task_*.json"):
                process_task(task_file)
        time.sleep(1)

if __name__ == "__main__":
    main()
