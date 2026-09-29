import hashlib
import logging
import os
import re
import tempfile
from io import BytesIO
from pathlib import Path
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from cloudinary import uploader
from cloudinary.exceptions import Error as CloudinaryError

from app.core.config import get_settings


settings = get_settings()
logger = logging.getLogger(__name__)
DOCUMENT_ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}
ATTACHMENT_ALLOWED_EXTENSIONS = {
    ".csv",
    ".doc",
    ".docx",
    ".gif",
    ".jpeg",
    ".jpg",
    ".pdf",
    ".png",
    ".txt",
    ".webp",
    ".xls",
    ".xlsx",
}
IMAGE_EXTENSIONS = {".gif", ".jpeg", ".jpg", ".png", ".webp"}
ALLOWED_EXTENSIONS = DOCUMENT_ALLOWED_EXTENSIONS

def _upload_to_cloudinary(path: str, **options) -> dict:
    if not all((settings.cloudinary_cloud_name, settings.cloudinary_api_key, settings.cloudinary_api_secret)):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="File storage is not configured. Set CLOUDINARY_CLOUD_NAME, "
            "CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in backend/.env, then restart the backend.",
        )
    try:
        return uploader.upload(
            path,
            cloud_name=settings.cloudinary_cloud_name,
            api_key=settings.cloudinary_api_key,
            api_secret=settings.cloudinary_api_secret,
            secure=True,
            **options,
        )
    except (CloudinaryError, ValueError) as exc:
        message = str(exc)
        for secret in (settings.cloudinary_api_key, settings.cloudinary_api_secret):
            if secret:
                message = message.replace(secret, "[redacted]")
        http_code = getattr(exc, "http_code", None)
        logger.error(
            "Cloudinary upload failed type=%s http_code=%s detail=%s",
            type(exc).__name__,
            http_code,
            message[:1000],
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=_cloudinary_error_detail(exc),
        ) from exc


def _cloudinary_error_detail(exc: Exception) -> str:
    message = str(exc).lower()
    http_code = getattr(exc, "http_code", None)
    if http_code == 401 or "invalid signature" in message or "unknown api key" in message:
        return "Cloudinary rejected the credentials. Verify the cloud name, API key and API secret, then restart the backend."
    if http_code == 403 or "not allowed" in message or "disabled" in message:
        return "Cloudinary rejected this asset type or upload operation. Check the account security and PDF/raw-file delivery settings."
    if http_code == 429 or "rate limit" in message or "quota" in message:
        return "Cloudinary upload limits have been reached. Check account usage and retry after the limit resets."
    if "too large" in message or "maximum" in message and "size" in message:
        return "Cloudinary rejected the file because it exceeds the account's upload-size limit."
    if "timeout" in message or "timed out" in message or "connection" in message:
        return "Cloudinary could not be reached while uploading. Check the backend network connection and retry."
    if http_code == 400:
        return "Cloudinary rejected the upload request. Check the file name, file type and account upload settings."
    return "Cloudinary accepted the account connection but rejected this upload. Retry once; the backend log now contains the safe provider error."


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


def validate_upload(
    file: UploadFile,
    allowed_extensions: set[str] | None = None,
    error_message: str = "Only PDF and Word documents are supported",
) -> str:
    filename = file.filename or ""
    extension = Path(filename).suffix.lower()
    allowed = allowed_extensions or DOCUMENT_ALLOWED_EXTENSIONS
    if extension not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message,
        )
    return extension


def validate_attachment_upload(file: UploadFile) -> str:
    return validate_upload(
        file,
        ATTACHMENT_ALLOWED_EXTENSIONS,
        "Only PDF, Word, spreadsheet, text, and image attachments are supported",
    )


async def store_document_version(
    file: UploadFile,
    organization_id: UUID,
    project_id: UUID,
    document_id: UUID,
    version_number: int,
) -> StoredFile:
    safe_filename = sanitize_filename(file.filename or "document")
    return await _store_upload(
        file=file,
        folder=_document_folder(organization_id, project_id, document_id, version_number),
        resource_type="raw",
        safe_filename=safe_filename,
        allowed_extensions=DOCUMENT_ALLOWED_EXTENSIONS,
        error_message="Only PDF and Word documents are supported",
    )


def store_document_version_bytes(
    content: bytes,
    filename: str,
    organization_id: UUID,
    project_id: UUID,
    document_id: UUID,
    version_number: int,
) -> StoredFile:
    safe_filename = sanitize_filename(filename or "document")
    return _store_bytes(
        content=content,
        original_filename=filename or safe_filename,
        folder=_document_folder(organization_id, project_id, document_id, version_number),
        resource_type="raw",
        safe_filename=safe_filename,
        allowed_extensions=DOCUMENT_ALLOWED_EXTENSIONS,
        error_message="Only PDF and Word documents are supported",
    )


async def store_subsection_attachment(
    file: UploadFile,
    organization_id: UUID,
    project_id: UUID,
    eia_document_id: UUID,
    subsection_id: UUID,
) -> StoredFile:
    extension = validate_attachment_upload(file)
    safe_filename = sanitize_filename(file.filename or "document")
    resource_type = "image" if extension in IMAGE_EXTENSIONS else "raw"
    return await _store_upload(
        file=file,
        folder=_subsection_folder(organization_id, project_id, eia_document_id, subsection_id),
        resource_type=resource_type,
        safe_filename=safe_filename,
        allowed_extensions=ATTACHMENT_ALLOWED_EXTENSIONS,
        error_message="Only PDF, Word, spreadsheet, text, and image attachments are supported",
    )


async def _store_upload(
    file: UploadFile,
    folder: str,
    resource_type: str,
    safe_filename: str,
    allowed_extensions: set[str],
    error_message: str,
) -> StoredFile:
    validate_upload(file, allowed_extensions, error_message)
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

        upload_result = _upload_to_cloudinary(
            temp_file_path,
            resource_type=resource_type,
            folder=folder,
            public_id=_compact_public_id(safe_filename, checksum.hexdigest()),
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


def _store_bytes(
    content: bytes,
    original_filename: str,
    folder: str,
    resource_type: str,
    safe_filename: str,
    allowed_extensions: set[str],
    error_message: str,
) -> StoredFile:
    extension = Path(original_filename).suffix.lower()
    if extension not in allowed_extensions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_message)

    total_size = len(content)
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if total_size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Upload exceeds {settings.max_upload_size_mb} MB limit",
        )

    checksum = hashlib.sha256(content).hexdigest()
    temp_file_path: str | None = None
    upload_result: dict[str, object] = {}

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(safe_filename).suffix) as temp_file:
            temp_file_path = temp_file.name
            temp_file.write(content)

        upload_result = _upload_to_cloudinary(
            temp_file_path,
            resource_type=resource_type,
            folder=folder,
            public_id=_compact_public_id(safe_filename, checksum),
            overwrite=True,
            filename_override=original_filename or safe_filename,
        )
    except Exception:
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        raise
    finally:
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
        checksum_sha256=checksum,
        original_filename=original_filename or safe_filename,
    )


def _document_folder(organization_id: UUID, project_id: UUID, document_id: UUID, version_number: int) -> str:
    return (
        f"{settings.cloudinary_folder}/o/{organization_id.hex}/p/{project_id.hex}/"
        f"d/{document_id.hex}/v{version_number}"
    )


def _subsection_folder(organization_id: UUID, project_id: UUID, eia_document_id: UUID, subsection_id: UUID) -> str:
    return (
        f"{settings.cloudinary_folder}/o/{organization_id.hex}/p/{project_id.hex}/"
        f"e/{eia_document_id.hex}/s/{subsection_id.hex}"
    )


def _compact_public_id(filename: str, checksum: str) -> str:
    stem = re.sub(r"[^A-Za-z0-9_-]+", "-", Path(filename).stem).strip("-")[:36] or "file"
    return f"{checksum[:20]}-{stem}"
