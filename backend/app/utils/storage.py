import hashlib
import os
import re
import tempfile
from pathlib import Path
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
import cloudinary
from cloudinary import uploader

from app.core.config import get_settings


settings = get_settings()
ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}

if settings.cloudinary_cloud_name and settings.cloudinary_api_key and settings.cloudinary_api_secret:
    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,
    )


class StoredFile:
    def __init__(
        self,
        storage_url: str,
        public_id: str,
        asset_id: str,
        resource_type: str,
        format: str | None,
        version: int | None,
        size_bytes: int,
        checksum_sha256: str,
        original_filename: str,
    ) -> None:
        self.storage_url = storage_url
        self.public_id = public_id
        self.asset_id = asset_id
        self.resource_type = resource_type
        self.format = format
        self.version = version
        self.size_bytes = size_bytes
        self.checksum_sha256 = checksum_sha256
        self.original_filename = original_filename


def sanitize_filename(filename: str) -> str:
    safe_name = re.sub(r"[^A-Za-z0-9._-]+", "-", Path(filename).name).strip(".-")
    return safe_name or "document"


def validate_upload(file: UploadFile) -> str:
    filename = file.filename or ""
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF and Word documents are supported",
        )
    return extension


async def store_document_version(
    file: UploadFile,
    organization_id: UUID,
    project_id: UUID,
    document_id: UUID,
    version_number: int,
) -> StoredFile:
    validate_upload(file)
    safe_filename = sanitize_filename(file.filename or "document")
    checksum = hashlib.sha256()
    total_size = 0
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    temp_file_path: str | None = None
    upload_result: dict[str, object] = {}

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(safe_filename).suffix) as temp_file:
            temp_file_path = temp_file.name
            while chunk := await file.read(1024 * 1024):
                total_size += len(chunk)
                if total_size > max_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Upload exceeds {settings.max_upload_size_mb} MB limit",
                    )
                checksum.update(chunk)
                temp_file.write(chunk)

        upload_result = uploader.upload(
            temp_file_path,
            resource_type="raw",
            folder=(
                f"{settings.cloudinary_folder}/organizations/{organization_id}/projects/"
                f"{project_id}/documents/{document_id}/v{version_number}"
            ),
            use_filename=True,
            unique_filename=False,
            overwrite=True,
            filename_override=file.filename or safe_filename,
        )
    except Exception:
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        raise
    finally:
        await file.close()
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

    return StoredFile(
        storage_url=str(upload_result["secure_url"]),
        public_id=str(upload_result["public_id"]),
        asset_id=str(upload_result.get("asset_id", "")),
        resource_type=str(upload_result.get("resource_type", "raw")),
        format=upload_result.get("format") if isinstance(upload_result.get("format"), str) else None,
        version=upload_result.get("version") if isinstance(upload_result.get("version"), int) else None,
        size_bytes=total_size,
        checksum_sha256=checksum.hexdigest(),
        original_filename=file.filename or safe_filename,
    )
