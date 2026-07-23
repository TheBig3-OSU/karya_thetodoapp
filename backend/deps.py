"""FastAPI dependencies: authenticated user + team-membership guards."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models import Team, TeamMember, UserProfile
from security import decode_token

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> UserProfile:
    if credentials is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Missing bearer token"
        )
    user_id = decode_token(credentials.credentials)
    if user_id is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    user = await db.get(UserProfile, user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Unknown user")
    return user


async def get_team_or_404(db: AsyncSession, team_id: int) -> Team:
    team = await db.get(Team, team_id)
    if team is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Gana not found")
    return team


async def require_member(db: AsyncSession, team_id: int, user_id: int) -> TeamMember:
    member = await db.get(TeamMember, (team_id, user_id))
    if member is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a member of this gana")
    return member
