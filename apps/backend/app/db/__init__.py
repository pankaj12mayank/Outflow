from .mongodb import MongoDB, get_db as _get_db, get_collection as _get_collection, serialize_doc, serialize_docs


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


__all__ = [
    "get_db",
    "get_collection",
    "connect_db",
    "disconnect_db",
    "health_check",
    "MongoDB",
    "serialize_doc",
    "serialize_docs",
]
