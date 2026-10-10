import os
import uuid
from pathlib import Path
from typing import Optional, Any
from app.core.config import settings

try:
    from supabase import create_client
except ImportError:
    create_client = None


class StorageService:
    """Private document storage. Local storage is only for non-production deployments."""
    def __init__(self):
        self.client: Optional[Any] = None
        if create_client and settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
            self.client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        if settings.ENVIRONMENT.lower() == "production" and not self.client:
            raise RuntimeError("Production requires configured Supabase private storage")

    @staticmethod
    def _extension(filename: str, mime_type: str) -> str:
        ext = Path(filename).suffix.lower()
        allowed = {".pdf", ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".webp"}
        if ext not in allowed:
            ext = {"application/pdf": ".pdf", "image/png": ".png", "image/jpeg": ".jpg", "image/tiff": ".tiff", "image/webp": ".webp"}.get(mime_type, "")
        if not ext:
            raise ValueError("Unsupported document extension")
        return ext

    async def upload_document_file(self, application_id: uuid.UUID, doc_type: str, filename: str, file_bytes: bytes, mime_type: str) -> str:
        ext = self._extension(filename, mime_type)
        object_path = f"{application_id}/{uuid.uuid4().hex}{ext}"
        if self.client:
            self.client.storage.from_(settings.SUPABASE_STORAGE_BUCKET).upload(
                path=object_path, file=file_bytes, file_options={"content-type": mime_type, "upsert": "false"}
            )
            return f"supabase://{settings.SUPABASE_STORAGE_BUCKET}/{object_path}"
        if settings.ENVIRONMENT.lower() == "production":
            raise RuntimeError("Private storage is unavailable")
        root = Path(settings.STORAGE_ROOT).resolve()
        target = root / str(application_id) / object_path.rsplit("/", 1)[-1]
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(file_bytes)
        return f"local://{target}"

    async def read_document(self, file_path: str) -> bytes:
        if file_path.startswith("local://"):
            path = Path(file_path.removeprefix("local://")).resolve()
            root = Path(settings.STORAGE_ROOT).resolve()
            if root not in path.parents:
                raise PermissionError("Invalid storage path")
            return path.read_bytes()
        if file_path.startswith("supabase://") and self.client:
            _, bucket, object_path = file_path.split("/", 2)
            result = self.client.storage.from_(bucket).download(object_path)
            return result
        raise FileNotFoundError("Document storage object unavailable")

    async def signed_url(self, file_path: str) -> Optional[str]:
        if file_path.startswith("supabase://") and self.client:
            _, bucket, object_path = file_path.split("/", 2)
            result = self.client.storage.from_(bucket).create_signed_url(object_path, settings.STORAGE_SIGNED_URL_TTL_SECONDS)
            return result.get("signedURL") or result.get("signedUrl")
        return None


storage_service = StorageService()
