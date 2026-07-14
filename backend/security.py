"""Password hashing and API tokens for Karya — stdlib only (no extra deps).

Passwords: PBKDF2-HMAC-SHA256 stored as "pbkdf2_sha256$<iterations>$<salt>$<hash>"
(fits the existing user_profile.salted_password TEXT column).

Tokens: HMAC-signed payload "<base64url(json)>.<base64url(sig)>" — a minimal
JWT-alike. Swap for Supabase Auth later without touching the routers (only
create_token/decode_token change).
"""

import base64
import hashlib
import hmac
import json
import os
import secrets
import time

PBKDF2_ITERATIONS = 390_000
TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60  # one week

SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-secret-not-for-production")


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), bytes.fromhex(salt), PBKDF2_ITERATIONS
    )
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, iterations, salt, expected = stored.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), bytes.fromhex(salt), int(iterations)
        )
    except (ValueError, TypeError):
        return False  # malformed hash (e.g. seed-data placeholders)
    return hmac.compare_digest(digest.hex(), expected)


def _b64encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _b64decode(encoded: str) -> bytes:
    return base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4))


def _sign(payload_b64: str) -> str:
    sig = hmac.new(SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256).digest()
    return _b64encode(sig)


def create_token(user_id: int) -> str:
    payload = {"uid": user_id, "exp": int(time.time()) + TOKEN_TTL_SECONDS}
    payload_b64 = _b64encode(json.dumps(payload).encode())
    return f"{payload_b64}.{_sign(payload_b64)}"


def decode_token(token: str) -> int | None:
    """Return the user id if the token is valid and unexpired, else None."""
    try:
        payload_b64, signature = token.split(".")
        if not hmac.compare_digest(signature, _sign(payload_b64)):
            return None
        payload = json.loads(_b64decode(payload_b64))
        if payload["exp"] < time.time():
            return None
        return int(payload["uid"])
    except (ValueError, KeyError, TypeError):
        return None
