import pytest
from app.security.encryption import FieldEncryptionService

def test_aes_256_encryption_and_decryption():
    original_text = "Sensitive Payment Recipient Token 12345"
    
    # 1. Encrypt
    encrypted = FieldEncryptionService.encrypt(original_text)
    assert encrypted != original_text
    assert len(encrypted) > 0

    # 2. Decrypt
    decrypted = FieldEncryptionService.decrypt(encrypted)
    assert decrypted == original_text

def test_encryption_empty_string():
    assert FieldEncryptionService.encrypt("") == ""
    assert FieldEncryptionService.decrypt("") == ""
