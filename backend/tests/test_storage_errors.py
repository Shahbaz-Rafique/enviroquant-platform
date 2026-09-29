from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient
from cloudinary.exceptions import Error

from app.utils.storage import _upload_to_cloudinary
from app.utils.storage import _compact_public_id, _subsection_folder
from uuid import uuid4


@pytest.mark.parametrize('missing', ['cloudinary_cloud_name', 'cloudinary_api_key', 'cloudinary_api_secret'])
def test_missing_storage_configuration_returns_readable_cors_error(missing):
    config = dict(cloudinary_cloud_name='test', cloudinary_api_key='test', cloudinary_api_secret='test')
    config[missing] = None
    app = FastAPI()
    app.add_middleware(CORSMiddleware, allow_origins=['http://localhost:3000'])

    @app.post('/upload')
    def upload():
        return _upload_to_cloudinary('unused.pdf')

    with patch('app.utils.storage.settings', SimpleNamespace(**config)), patch('app.utils.storage.uploader.upload') as upload_mock:
        response = TestClient(app).post('/upload', headers={'Origin': 'http://localhost:3000'})
    assert response.status_code == 503
    assert response.headers['access-control-allow-origin'] == 'http://localhost:3000'
    assert 'File storage is not configured' in response.json()['detail']
    upload_mock.assert_not_called()


def test_upload_passes_credentials_explicitly():
    settings = SimpleNamespace(cloudinary_cloud_name='cloud', cloudinary_api_key='key', cloudinary_api_secret='secret')
    with patch('app.utils.storage.settings', settings), patch('app.utils.storage.uploader.upload', return_value={'secure_url': 'https://example.test/file'}) as upload:
        result = _upload_to_cloudinary('file.pdf', resource_type='raw')
    assert result['secure_url'] == 'https://example.test/file'
    upload.assert_called_once_with('file.pdf', cloud_name='cloud', api_key='key', api_secret='secret', secure=True, resource_type='raw')


@pytest.mark.parametrize('error', [Error('provider secret details'), ValueError('Must supply api_key')])
def test_storage_errors_are_sanitized(error):
    settings = SimpleNamespace(cloudinary_cloud_name='cloud', cloudinary_api_key='key', cloudinary_api_secret='secret')
    with patch('app.utils.storage.settings', settings), patch('app.utils.storage.uploader.upload', side_effect=error), pytest.raises(HTTPException) as caught:
        _upload_to_cloudinary('file.pdf')
    assert caught.value.status_code == 502
    assert 'secret' not in caught.value.detail


def test_subsection_cloudinary_public_id_stays_below_provider_limit():
    folder = _subsection_folder(uuid4(), uuid4(), uuid4(), uuid4())
    public_id = _compact_public_id('EnviroQuant_EIA_Export_Template_Prototype.docx', 'a' * 64)
    assert len(f'{folder}/{public_id}') < 255
    assert 'EnviroQuant_EIA_Export_Template' in public_id
