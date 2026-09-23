import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL", "")
key: str = os.environ.get("SUPABASE_KEY", "")

# Initialize the Supabase client if keys are present
supabase: Client = None
if url and key:
    supabase = create_client(url, key)
else:
    print("WARNING: SUPABASE_URL or SUPABASE_KEY missing from environment. Database connection failed.")
