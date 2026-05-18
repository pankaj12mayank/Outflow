# Run from Outflo root directory
# Usage: python clean_data.py

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "apps", "backend"))

# Load env
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "apps", "backend", ".env"))

async def clean():
    from motor.motor_asyncio import AsyncIOMotorClient
    
    MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    DATABASE = os.getenv("MONGO_DATABASE", "outflo")
    
    print(f"Connecting to MongoDB: {MONGO_URL}/{DATABASE}")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DATABASE]
    
    # Test connection
    await client.admin.command('ping')
    print("Connected!\n")
    
    # Collections to clean
    TO_CLEAN = [
        "users", "organizations", "memberships", "campaigns", 
        "campaign_sequences", "campaign_steps", "leads", 
        "leads_enrichment", "leads_activities", "leads_tags",
        "lead_tag_assignments", "email_messages", "email_templates",
        "email_accounts", "sequences", "notifications", "sessions",
        "login_logs", "background_tasks", "audit_logs", 
        "analytics_events", "ai_usage_logs", "scraping_jobs",
        "inboxes", "deals", "tasks", "meetings", "cms_pages"
    ]
    
    # Keep these
    PROTECTED = [
        "system_owner_users", "system_owner_sessions", 
        "plans", "plan_features", "organization_plans", "counters"
    ]
    
    print("=" * 50)
    print("BEFORE CLEANUP:")
    print("-" * 50)
    for coll in TO_CLEAN + PROTECTED:
        count = await db[coll].count_documents({})
        status = "🗑️" if coll in TO_CLEAN else "🔒"
        print(f"  {status} {coll}: {count}")
    
    print("\nCleaning data...")
    total = 0
    for coll in TO_CLEAN:
        result = await db[coll].delete_many({})
        if result.deleted_count > 0:
            print(f"  ✓ {coll}: {result.deleted_count} deleted")
            total += result.deleted_count
    
    print("\n" + "=" * 50)
    print("AFTER CLEANUP:")
    print("-" * 50)
    for coll in TO_CLEAN:
        count = await db[coll].count_documents({})
        print(f"  ✓ {coll}: {count}")
    
    # Verify system owner
    so = await db["system_owner_users"].count_documents({})
    print(f"\n🔒 system_owner_users: {so} (protected)")
    
    print(f"\n✅ Total documents deleted: {total}")
    print("\nSystem Owner login: admin@outflo.com / Outflo@2024!")
    
    client.close()

if __name__ == "__main__":
    import asyncio
    asyncio.run(clean())