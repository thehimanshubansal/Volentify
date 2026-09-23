import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Load .env.local and .env from frontend and workspace root
base_dir = Path(__file__).resolve().parent.parent.parent
env_files = [
    base_dir / ".env.local",
    base_dir / ".env",
    base_dir.parent / ".env.local",
    base_dir.parent / ".env",
]

for env_path in env_files:
    if env_path.exists():
        load_dotenv(dotenv_path=env_path, override=False)

url: str = os.environ.get("SUPABASE_URL", "")
key: str = os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")

# Initialize the Supabase client if keys are present
supabase: Client = None
if url and key:
    try:
        supabase = create_client(url, key)
        print(f"Connected to Supabase at: {url}")
    except Exception as e:
        print(f"Supabase connection initialization error: {e}")
else:
    print("WARNING: SUPABASE_URL or SUPABASE_KEY missing from environment. Database connection failed.")

