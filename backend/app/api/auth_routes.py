from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["Authentication Context"])

class DevTokenResponse(BaseModel):
    user_id: str
    access_token: str
    token_type: str = "bearer"
    message: str

@router.post("/dev-token", response_model=DevTokenResponse)
def generate_dev_token(user_id: str = "user_demo_123"):
    """
    Helper route for testing authenticated requests.
    Pass returned access_token in Authorization: Bearer <access_token>
    """
    return DevTokenResponse(
        user_id=user_id,
        access_token=user_id,
        token_type="bearer",
        message="Dev token generated. Pass in Authorization header as Bearer token."
    )
