from datetime import datetime
from typing import Optional, List, Dict, Any, AsyncGenerator
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorCollection
from pymongo import ASCENDING, DESCENDING, IndexModel
from pydantic import BaseModel, Field
import logging
import asyncio

logger = logging.getLogger(__name__)


class MongoDBConfig(BaseModel):
    mongo_url: str = "mongodb://localhost:27017"
    database_name: str = "outflo"
    min_pool_size: int = Field(default=10, alias="MONGO_POOL_SIZE")
    max_pool_size: int = Field(default=100, alias="MONGO_MAX_POOL_SIZE")
    server_selection_timeout_ms: int = Field(default=5000, alias="MONGO_SERVER_SELECTION_TIMEOUT")
    connect_timeout_ms: int = Field(default=10000, alias="MONGO_CONNECT_TIMEOUT")


class MongoDB:
    _client: Optional[AsyncIOMotorClient] = None
    _database: Optional[AsyncIOMotorDatabase] = None
    _config: Optional[MongoDBConfig] = None

    @classmethod
    async def connect(cls, config: Optional[MongoDBConfig] = None) -> None:
        if cls._client is not None:
            return

        if config is None:
            from app.core.config import settings
            mongo_url = getattr(settings, 'mongo_url', 'mongodb://localhost:27017')
            database_name = getattr(settings, 'mongo_database', 'outflo')
            config = MongoDBConfig(mongo_url=mongo_url, database_name=database_name)

        cls._config = config
        cls._client = AsyncIOMotorClient(
            config.mongo_url,
            minPoolSize=config.min_pool_size,
            maxPoolSize=config.max_pool_size,
            serverSelectionTimeoutMS=config.server_selection_timeout_ms,
            connectTimeoutMS=config.connect_timeout_ms,
        )
        cls._database = cls._client[config.database_name]
        logger.info(f"Connected to MongoDB: {config.database_name}")

        asyncio.get_event_loop().create_task(cls._create_indexes())

    @classmethod
    async def disconnect(cls) -> None:
        if cls._client:
            cls._client.close()
            cls._client = None
            cls._database = None
            logger.info("Disconnected from MongoDB")

    @classmethod
    def get_database(cls) -> AsyncIOMotorDatabase:
        if cls._database is None:
            raise RuntimeError("MongoDB not connected. Call MongoDB.connect() first.")
        return cls._database

    @classmethod
    def get_collection(cls, name: str) -> AsyncIOMotorCollection:
        return cls.get_database()[name]

    @classmethod
    def get_client(cls) -> AsyncIOMotorClient:
        if cls._client is None:
            raise RuntimeError("MongoDB not connected. Call MongoDB.connect() first.")
        return cls._client

    @classmethod
    async def _create_indexes(cls) -> None:
        if cls._database is None:
            return

        indexes = {
            "organizations": [
                IndexModel([("slug", ASCENDING)], unique=True),
                IndexModel([("created_at", DESCENDING)]),
            ],
            "users": [
                IndexModel([("email", ASCENDING)], unique=True),
                IndexModel([("organization_id", ASCENDING)]),
                IndexModel([("role", ASCENDING)]),
            ],
            "memberships": [
                IndexModel([("user_id", ASCENDING), ("organization_id", ASCENDING)], unique=True),
            ],
            "roles": [
                IndexModel([("organization_id", ASCENDING), ("name", ASCENDING)], unique=True),
            ],
            "leads": [
                IndexModel([("email", ASCENDING)]),
                IndexModel([("organization_id", ASCENDING)]),
                IndexModel([("status", ASCENDING)]),
                IndexModel([("linkedin_url", ASCENDING)], sparse=True),
                IndexModel([("created_at", DESCENDING)]),
            ],
            "campaigns": [
                IndexModel([("organization_id", ASCENDING)]),
                IndexModel([("status", ASCENDING)]),
                IndexModel([("created_at", DESCENDING)]),
            ],
            "campaign_sequences": [
                IndexModel([("campaign_id", ASCENDING)]),
                IndexModel([("organization_id", ASCENDING)]),
            ],
            "campaign_steps": [
                IndexModel([("sequence_id", ASCENDING)]),
                IndexModel([("organization_id", ASCENDING)]),
            ],
            "email_messages": [
                IndexModel([("organization_id", ASCENDING)]),
                IndexModel([("campaign_id", ASCENDING)]),
                IndexModel([("lead_id", ASCENDING)]),
                IndexModel([("status", ASCENDING)]),
                IndexModel([("scheduled_at", ASCENDING)], sparse=True),
                IndexModel([("to_email", ASCENDING)]),
            ],
            "sequences": [
                IndexModel([("organization_id", ASCENDING)]),
                IndexModel([("status", ASCENDING)]),
            ],
            "email_templates": [
                IndexModel([("organization_id", ASCENDING)]),
                IndexModel([("slug", ASCENDING)]),
            ],
            "email_accounts": [
                IndexModel([("organization_id", ASCENDING)]),
                IndexModel([("email", ASCENDING)], unique=True),
            ],
            "notifications": [
                IndexModel([("user_id", ASCENDING), ("is_read", ASCENDING)]),
                IndexModel([("created_at", DESCENDING)]),
            ],
            "background_tasks": [
                IndexModel([("status", ASCENDING), ("priority", DESCENDING)]),
                IndexModel([("created_at", DESCENDING)]),
            ],
            "audit_logs": [
                IndexModel([("organization_id", ASCENDING)]),
                IndexModel([("user_id", ASCENDING)]),
                IndexModel([("created_at", DESCENDING)]),
            ],
            "analytics_events": [
                IndexModel([("organization_id", ASCENDING)]),
                IndexModel([("event_type", ASCENDING)]),
                IndexModel([("created_at", DESCENDING)]),
            ],
            "ai_usage_logs": [
                IndexModel([("organization_id", ASCENDING)]),
                IndexModel([("user_id", ASCENDING)]),
                IndexModel([("created_at", DESCENDING)]),
            ],
            "leads_enrichment": [
                IndexModel([("lead_id", ASCENDING)]),
            ],
            "leads_activities": [
                IndexModel([("lead_id", ASCENDING)]),
                IndexModel([("created_at", DESCENDING)]),
            ],
            "leads_tags": [
                IndexModel([("organization_id", ASCENDING)]),
            ],
            "lead_tag_assignments": [
                IndexModel([("lead_id", ASCENDING)]),
                IndexModel([("tag_id", ASCENDING)]),
            ],
            "scraping_jobs": [
                IndexModel([("organization_id", ASCENDING)]),
                IndexModel([("status", ASCENDING)]),
                IndexModel([("created_at", DESCENDING)]),
            ],
            "inboxes": [
                IndexModel([("organization_id", ASCENDING)]),
            ],
            "deals": [
                IndexModel([("organization_id", ASCENDING)]),
                IndexModel([("pipeline_id", ASCENDING)]),
                IndexModel([("stage", ASCENDING)]),
            ],
            "tasks": [
                IndexModel([("organization_id", ASCENDING)]),
                IndexModel([("assigned_to", ASCENDING)]),
                IndexModel([("status", ASCENDING)]),
            ],
            "cms_pages": [
                IndexModel([("organization_id", ASCENDING)]),
                IndexModel([("slug", ASCENDING)]),
            ],
            "sessions": [
                IndexModel([("user_id", ASCENDING)]),
                IndexModel([("refresh_token_hash", ASCENDING)], unique=True, sparse=True),
            ],
            "login_logs": [
                IndexModel([("user_id", ASCENDING)]),
                IndexModel([("created_at", DESCENDING)]),
            ],
            "password_resets": [
                IndexModel([("email", ASCENDING)]),
                IndexModel([("token_hash", ASCENDING)], unique=True),
                IndexModel([("expires_at", ASCENDING)]),
            ],
        }

        for collection_name, collection_indexes in indexes.items():
            try:
                coll = cls._database[collection_name]
                await coll.create_indexes(collection_indexes)
                logger.info(f"Created indexes for {collection_name}")
            except Exception as e:
                logger.warning(f"Failed to create indexes for {collection_name}: {e}")

    @classmethod
    async def drop_database(cls) -> None:
        if cls._database:
            await cls._database.drop()
            logger.info("Database dropped")

    @classmethod
    async def health_check(cls) -> Dict[str, Any]:
        try:
            if cls._client is None:
                return {"status": "disconnected", "healthy": False}
            await cls._client.admin.command('ping')
            return {
                "status": "connected",
                "healthy": True,
                "database": cls._config.database_name if cls._config else "unknown"
            }
        except Exception as e:
            return {"status": "error", "healthy": False, "error": str(e)}


def get_db() -> AsyncIOMotorDatabase:
    return MongoDB.get_database()


def get_collection(name: str) -> AsyncIOMotorCollection:
    return MongoDB.get_collection(name)


async def get_next_sequence_value(collection: str, name: str) -> int:
    result = await MongoDB.get_database().counters.find_one_and_update(
        {"_id": f"{collection}_{name}"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )
    return result["seq"]


class BaseDocument:
    _collection_name: str = ""
    _id_field: str = "_id"

    @classmethod
    def get_collection(cls) -> AsyncIOMotorCollection:
        return MongoDB.get_collection(cls._collection_name)

    @classmethod
    async def find_by_id(cls, id: str) -> Optional[Dict]:
        from bson import ObjectId
        doc = await cls.get_collection().find_one({"_id": ObjectId(id)})
        return doc

    @classmethod
    async def find_one(cls, filter: Dict) -> Optional[Dict]:
        return await cls.get_collection().find_one(filter)

    @classmethod
    async def find(cls, filter: Dict, skip: int = 0, limit: int = 100, sort: List = None) -> List[Dict]:
        cursor = cls.get_collection().find(filter)
        if sort:
            cursor = cursor.sort(sort)
        cursor = cursor.skip(skip).limit(limit)
        return await cursor.to_list(length=limit)

    @classmethod
    async def count(cls, filter: Dict) -> int:
        return await cls.get_collection().count_documents(filter)

    @classmethod
    async def insert_one(cls, document: Dict) -> str:
        from bson import ObjectId
        result = await cls.get_collection().insert_one(document)
        return str(result.inserted_id)

    @classmethod
    async def update_one(cls, filter: Dict, update: Dict) -> int:
        result = await cls.get_collection().update_one(filter, {"$set": update})
        return result.modified_count

    @classmethod
    async def delete_one(cls, filter: Dict) -> int:
        result = await cls.get_collection().delete_one(filter)
        return result.deleted_count

    @classmethod
    async def aggregate(cls, pipeline: List) -> List[Dict]:
        cursor = cls.get_collection().aggregate(pipeline)
        return await cursor.to_list(length=None)


def serialize_doc(doc: Dict) -> Dict:
    if doc is None:
        return None
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
        elif isinstance(value, dict):
            doc[key] = serialize_doc(value)
        elif isinstance(value, list):
            doc[key] = [serialize_doc(v) if isinstance(v, dict) else str(v) if isinstance(v, datetime) else v for v in value]
    return doc


def serialize_docs(docs: List[Dict]) -> List[Dict]:
    return [serialize_doc(doc) for doc in docs]


def create_document(data: Dict) -> Dict:
    doc = data.copy()
    doc.pop("id", None)
    doc["created_at"] = datetime.utcnow()
    doc["updated_at"] = datetime.utcnow()
    return doc