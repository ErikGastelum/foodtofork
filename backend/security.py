"""Password hashing and session tokens (owner: Jonathan).

Uses only Python's standard library, so there's nothing extra to install.
Passwords are hashed with PBKDF2-SHA256 and a random salt per user; we never
store or log a plain password.
"""

import base64
import hashlib
import hmac
import secrets

ITERATIONS = 600_000  # OWASP's 2023+ recommendation for PBKDF2-SHA256. Tests lower this.


def _b64(raw: bytes) -> str:
    return base64.b64encode(raw).decode()


def hash_password(password: str) -> str:
    """'pbkdf2_sha256$<iterations>$<salt>$<hash>' — everything needed to check it later."""
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, ITERATIONS)
    return f"pbkdf2_sha256${ITERATIONS}${_b64(salt)}${_b64(digest)}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iterations, salt, expected = stored.split("$")
    except ValueError:
        return False
    if algo != "pbkdf2_sha256":
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), base64.b64decode(salt), int(iterations))
    return hmac.compare_digest(_b64(digest), expected)  # constant-time compare


def new_token() -> str:
    """Random session token sent to the browser (43 characters)."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """What we store in the database instead of the token itself."""
    return hashlib.sha256(token.encode()).hexdigest()


def new_share_id() -> str:
    """Random id for a recipe share link."""
    return secrets.token_urlsafe(12)
