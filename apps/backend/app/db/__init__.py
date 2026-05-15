from .mongodb import MongoDB, get_db as _get_db, get_collection as _get_collection

async def get_db():
    return _get_db()

def get_collection(name: str):
    return _get_collection(name)

async def connect_db():
    await MongoDB.connect()

async def disconnect_db():
    await MongoDB.disconnect()

async def health_check():
    return await MongoDB.health_check()

class AsyncSessionLocal:
    """Placeholder for SQLAlchemy async session - not used with MongoDB"""
    async def __aenter__(self):
        return None
    async def __aexit__(self, *args):
        pass

class Base:
    """Placeholder for SQLAlchemy Base - not used with MongoDB"""
    pass

__all__ = ["get_db", "get_collection", "connect_db", "disconnect_db", "health_check", "MongoDB", "AsyncSessionLocal", "Base"]