from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    student,
    official,
    schemes,
    documents,
    policies,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(student.router)
api_router.include_router(official.router)
api_router.include_router(schemes.router)
api_router.include_router(documents.router)
api_router.include_router(policies.router)
