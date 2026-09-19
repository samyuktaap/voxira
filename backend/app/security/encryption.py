import base64
import hashlib
import logging
from typing import Optional
from cryptography.fernet import Fernet
from app.config import settings

logger = logging.getLogger("blindpay.encryption")

def _get_fernet_key() -> bytes:
    """Derives a deterministic 32-byte url-safe Fernet key from SECRET_KEY."""
    raw_secret = settings.SECRET_KEY or "dev-secret-key-change-in-production-32bytes"
    key_bytes = hashlib.sha256(raw_secret.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(key_bytes)

class FieldEncryptionService:
    """
    AES-256 (Fernet) Encryption & Decryption Service for sensitive data protection.
    Provides symmetric encryption/decryption for payment metadata, recipient tokens, or sensitive strings.
    """
    _fernet: Optional[Fernet] = None

    @classmethod
    def get_cipher(cls) -> Fernet:
        if cls._fernet is None:
            cls._fernet = Fernet(_get_fernet_key())
        return cls._fernet

    @classmethod
    def encrypt(cls, plaintext: str) -> str:
        """Encrypts plaintext string into AES-256 Fernet ciphertext string."""
        if not plaintext:
            return plaintext
        try:
            cipher = cls.get_cipher()
            encrypted_bytes = cipher.encrypt(plaintext.encode("utf-8"))
            return encrypted_bytes.decode("utf-8")
        except Exception as e:
            logger.error(f"Encryption error: {e}")
            raise RuntimeError(f"Field encryption failed: {e}")

    @classmethod
    def decrypt(cls, ciphertext: str) -> str:
        """Decrypts ciphertext string back into plaintext string."""
        if not ciphertext:
            return ciphertext
        try:
            cipher = cls.get_cipher()
            decrypted_bytes = cipher.decrypt(ciphertext.encode("utf-8"))
            return decrypted_bytes.decode("utf-8")
        except Exception as e:
            logger.error(f"Decryption error: {e}")
            raise ValueError(f"Field decryption failed or invalid key: {e}")
