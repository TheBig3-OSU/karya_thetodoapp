"""Auth & session (spec §3.1): register, login, me."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models import UserProfile
from deps import get_current_user
from schemas import LoginIn, RegisterIn, TokenOut, UserOut
from security import create_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterIn, db: AsyncSession = Depends(get_db)):
    taken = (
        await db.execute(
            select(UserProfile.id).where(UserProfile.username == body.username)
        )
    ).scalar_one_or_none()
    if taken is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Username already taken")

    user = UserProfile(
        username=body.username, salted_password=hash_password(body.password)
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return TokenOut(access_token=create_token(user.id), user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
async def login(body: LoginIn, db: AsyncSession = Depends(get_db)):
    user = (
        await db.execute(
            select(UserProfile).where(UserProfile.username == body.username)
        )
    ).scalar_one_or_none()
    if user is None or not verify_password(body.password, user.salted_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid username or password")
    return TokenOut(access_token=create_token(user.id), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def me(current: UserProfile = Depends(get_current_user)):
    return current
