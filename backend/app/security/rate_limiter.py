import time
from collections import defaultdict
from typing import Dict, List
from fastapi import HTTPException, status

class RateLimiter:
    """In-memory rate limiter tracking request counts per key within time windows."""
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, List[float]] = defaultdict(list)

    def check(self, key: str):
        now = time.time()
        cutoff = now - self.window_seconds
        # Keep timestamps inside the window
        timestamps = [ts for ts in self.requests[key] if ts > cutoff]
        self.requests[key] = timestamps

        if len(timestamps) >= self.max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error_code": "RATE_LIMITED",
                    "message": "Too many requests. Please wait before retrying."
                }
            )
        self.requests[key].append(now)

auth_rate_limiter = RateLimiter(max_requests=5, window_seconds=60)
confirm_rate_limiter = RateLimiter(max_requests=5, window_seconds=60)
intent_rate_limiter = RateLimiter(max_requests=20, window_seconds=60)
