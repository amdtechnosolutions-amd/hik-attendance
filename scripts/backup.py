#!/usr/bin/env python3
import os
import sys
import subprocess
import zipfile
from urllib.parse import urlparse, parse_qs

# Configuration
PROJECT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ENV_FILE = os.path.join(PROJECT_DIR, ".env")
DB_BACKUP_DIR = os.path.join(PROJECT_DIR, "db_backup")
ZIP_BACKUP_PROJECT_NAME = "hikvision_attendance_backend_31_05_2026.zip"
ZIP_BACKUP_DB_NAME = "db_backup_31_05_2026.zip"

def get_mongo_credentials():
    """Reads .env file and parses MONGO_URI to get connection details."""
    if not os.path.exists(ENV_FILE):
        print(f"[-] Error: .env file not found at {ENV_FILE}")
        return None

    mongo_uri = None
    with open(ENV_FILE, "r") as f:
        for line in f:
            line = line.strip()
            if line.startswith("MONGO_URI="):
                mongo_uri = line.split("=", 1)[1].strip()
                # Remove quotes if present
                if (mongo_uri.startswith('"') and mongo_uri.endswith('"')) or \
                   (mongo_uri.startswith("'") and mongo_uri.endswith("'")):
                    mongo_uri = mongo_uri[1:-1]
                break

    if not mongo_uri:
        print("[-] Error: MONGO_URI not found in .env")
        return None

    try:
        parsed = urlparse(mongo_uri)
        db_name = parsed.path.lstrip("/")
        
        # Parse query params for authSource
        query_params = parse_qs(parsed.query)
        auth_db = query_params.get("authSource", ["admin"])[0]

        return {
            "uri": mongo_uri,
            "host": parsed.hostname or "127.0.0.1",
            "port": str(parsed.port or 27017),
            "username": parsed.username,
            "password": parsed.password,
            "db": db_name,
            "auth_db": auth_db
        }
    except Exception as e:
        print(f"[-] Error parsing MONGO_URI: {e}")
        return None

def run_mongodump(creds):
    """Executes mongodump to export the database."""
    print("[*] Starting database dump via mongodump...")
    
    # Construct the mongodump command
    cmd = [
        "mongodump",
        "--host", creds["host"],
        "--port", creds["port"],
        "--db", creds["db"],
        "--out", DB_BACKUP_DIR
    ]
    
    if creds["username"] and creds["password"]:
        cmd.extend([
            "--username", creds["username"],
            "--password", creds["password"],
            "--authenticationDatabase", creds["auth_db"]
        ])
        
    print(f"[*] Running command: mongodump --host {creds['host']} --port {creds['port']} --db {creds['db']} --out ./db_backup ...")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print("[+] Database dump successfully created in ./db_backup")
        return True
    except subprocess.CalledProcessError as e:
        print(f"[-] Error running mongodump: {e.stderr}")
        return False

def zip_db_backup():
    """Zips the database backup folder."""
    downloads_dir = os.path.join(PROJECT_DIR, "public", "downloads")
    os.makedirs(downloads_dir, exist_ok=True)
    zip_path = os.path.join(downloads_dir, ZIP_BACKUP_DB_NAME)
    print(f"[*] Creating database ZIP archive: {ZIP_BACKUP_DB_NAME}...")
    
    if not os.path.exists(DB_BACKUP_DIR):
        print(f"[-] Error: Database backup directory {DB_BACKUP_DIR} does not exist.")
        return False
        
    try:
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(DB_BACKUP_DIR):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, PROJECT_DIR)
                    zipf.write(file_path, arcname)
        print(f"[+] Successfully created database backup zip at {zip_path}")
        return True
    except Exception as e:
        print(f"[-] Error zipping database backup: {e}")
        return False

def zip_project():
    """Zips the project directory excluding node_modules and public/reports."""
    downloads_dir = os.path.join(PROJECT_DIR, "public", "downloads")
    os.makedirs(downloads_dir, exist_ok=True)
    zip_path = os.path.join(downloads_dir, ZIP_BACKUP_PROJECT_NAME)
    print(f"[*] Creating full project ZIP archive: {ZIP_BACKUP_PROJECT_NAME}...")
    
    exclude_dirs = {
        "node_modules",
        "public/reports",
        "public/downloads",
        ".git",
        ".zencoder",
        ".zenflow"
    }
    
    exclude_files = {
        ZIP_BACKUP_PROJECT_NAME,
        ZIP_BACKUP_DB_NAME
    }

    try:
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(PROJECT_DIR):
                # Prune dirs in-place to avoid descending into excluded directories
                pruned_dirs = []
                for d in dirs:
                    d_rel = os.path.relpath(os.path.join(root, d), PROJECT_DIR).replace('\\', '/')
                    if d_rel in exclude_dirs:
                        continue
                    pruned_dirs.append(d)
                dirs[:] = pruned_dirs
                
                for file in files:
                    if file in exclude_files:
                        continue
                    
                    file_path = os.path.join(root, file)
                    file_rel = os.path.relpath(file_path, PROJECT_DIR).replace('\\', '/')
                    
                    # Split path parts to check if any parent directory is excluded
                    parts = file_rel.split('/')
                    is_excluded_file = False
                    for i in range(1, len(parts)):
                        prefix_path = "/".join(parts[:i])
                        if prefix_path in exclude_dirs:
                            is_excluded_file = True
                            break
                            
                    if is_excluded_file:
                        continue
                        
                    zipf.write(file_path, file_rel)
                    
        print(f"[+] Successfully created project backup zip at {zip_path}")
        return True
    except Exception as e:
        print(f"[-] Error zipping project: {e}")
        return False

def main():
    print("=== HIK Attendance Backup & Package Script ===")
    creds = get_mongo_credentials()
    if not creds:
        print("[-] Aborting database backup due to credential error.")
        db_ok = False
    else:
        db_ok = run_mongodump(creds)
        
    if db_ok:
        zip_db_backup()
    else:
        print("[-] Skipping database zip creation because database dump failed.")
        
    project_ok = zip_project()
    
    downloads_dir = os.path.join(PROJECT_DIR, "public", "downloads")
    db_zip_path = os.path.join(downloads_dir, ZIP_BACKUP_DB_NAME)
    proj_zip_path = os.path.join(downloads_dir, ZIP_BACKUP_PROJECT_NAME)
    
    if db_ok and project_ok:
        print("\n=== Backup Summary ===")
        db_zip_size = os.path.getsize(db_zip_path) / (1024 * 1024)
        proj_zip_size = os.path.getsize(proj_zip_path) / (1024 * 1024)
        print(f"[+] Database Backup ZIP: {db_zip_path} ({db_zip_size:.2f} MB)")
        print(f"[+] Project Backup ZIP: {proj_zip_path} ({proj_zip_size:.2f} MB)")
        print("\nDownload Links:")
        print(f"🔗 Project ZIP:  https://hikapi.amdtechno.in/downloads/{ZIP_BACKUP_PROJECT_NAME}")
        print(f"🔗 Database ZIP: https://hikapi.amdtechno.in/downloads/{ZIP_BACKUP_DB_NAME}")
    elif project_ok:
        proj_zip_size = os.path.getsize(proj_zip_path) / (1024 * 1024)
        print("\n=== Backup Summary ===")
        print(f"[+] Project Backup ZIP: {proj_zip_path} ({proj_zip_size:.2f} MB)")
        print("[-] Note: Database backup was not included in this zip.")
        print("\nDownload Link:")
        print(f"🔗 Project ZIP:  https://hikapi.amdtechno.in/downloads/{ZIP_BACKUP_PROJECT_NAME}")
    else:
        print("\n[-] Backup process completed with errors.")

if __name__ == "__main__":
    main()
