# Backend testing

## Requirements

- Python 3.11+ and project venv (`apps/backend/venv`)
- **MongoDB** running at `MONGO_URL` (default `mongodb://localhost:27017`)
- Optional: PostgreSQL only for legacy SQL integration tests in `tests/conftest.py` (skipped if unavailable)

## Quick run

```bash
cd apps/backend
.\venv\Scripts\activate   # Windows
pytest tests/test_l3_mongo_smoke.py tests/test_l4_schema.py tests/test_l5_api_gaps.py -v
pytest tests/test_api.py -v
```

Layer smoke tests (`test_l3_*`, `test_l4_*`, `test_l5_*`) need MongoDB and skip automatically when it is down.

SQL-backed API tests under `tests/api/` require PostgreSQL; `tests/conftest.py` skips DB setup on connection failure.

## CI suggestion

Use a MongoDB service container and set `MONGO_URL` / `MONGO_DATABASE` before `pytest`.
