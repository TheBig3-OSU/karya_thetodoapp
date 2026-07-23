"""Atma / profile (spec §3.6) + per-team XP standing (§3.5)."""

from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import cast, func, select, Date
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models import Level, Task, UserProfile, UserTeamXp, XpEvent
from deps import get_current_user
from schemas import UserOut, UserPatchIn, UserProfileOut, UserXpOut
from security import hash_password

router = APIRouter(prefix="/users", tags=["users"])


async def get_user_or_404(db: AsyncSession, user_id: int) -> UserProfile:
    user = await db.get(UserProfile, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hero not found")
    return user


def count_streak(days: list[date]) -> int:
    """Consecutive days with XP activity, ending today or yesterday.

    Days are UTC dates (Postgres casts timestamptz to date in the session's
    UTC timezone), so "today" must be UTC too — date.today() is local and
    lags behind around midnight.
    """
    if not days:
        return 0
    today = datetime.now(timezone.utc).date()
    if days[0] not in (today, today - timedelta(days=1)):
        return 0
    streak = 1
    for previous, current in zip(days, days[1:]):
        if previous - current == timedelta(days=1):
            streak += 1
        else:
            break
    return streak


@router.get("/{user_id}", response_model=UserProfileOut)
async def get_profile(
    user_id: int,
    _: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = await get_user_or_404(db, user_id)

    quests_completed = (
        await db.execute(
            select(func.count())
            .select_from(Task)
            .where(Task.user_id == user_id, Task.is_completed.is_(True))
        )
    ).scalar_one()

    activity_days = (
        (
            await db.execute(
                select(cast(XpEvent.created_at, Date).label("day"))
                .where(XpEvent.user_id == user_id)
                .distinct()
                .order_by(cast(XpEvent.created_at, Date).desc())
            )
        )
        .scalars()
        .all()
    )

    return UserProfileOut(
        **UserOut.model_validate(user).model_dump(),
        quests_completed=quests_completed,
        streak_days=count_streak(activity_days),
    )


@router.patch("/{user_id}", response_model=UserOut)
async def update_profile(
    user_id: int,
    body: UserPatchIn,
    current: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id != current.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only edit your own profile")
    user = await get_user_or_404(db, user_id)

    if body.username is not None and body.username != user.username:
        taken = (
            await db.execute(
                select(UserProfile.id).where(UserProfile.username == body.username)
            )
        ).scalar_one_or_none()
        if taken is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Username already taken")
        user.username = body.username
    if body.password is not None:
        user.salted_password = hash_password(body.password)

    await db.commit()
    await db.refresh(user)
    return user


@router.get("/{user_id}/xp", response_model=UserXpOut)
async def get_xp(
    user_id: int,
    team_id: int,
    _: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Atma 'YOUR XP' card: standing plus the current level's XP window."""
    await get_user_or_404(db, user_id)
    standing = await db.get(UserTeamXp, (user_id, team_id))
    if standing is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "No XP standing for this hero in this gana"
        )

    next_level_at = (
        await db.execute(select(Level.xp_upper_bound).where(Level.level == standing.level))
    ).scalar_one()
    level_floor = (
        await db.execute(
            select(Level.xp_upper_bound).where(Level.level == standing.level - 1)
        )
    ).scalar_one_or_none() or 0

    return UserXpOut(
        team_id=team_id,
        current_xp=standing.current_xp,
        level=standing.level,
        level_floor=level_floor,
        next_level_at=next_level_at,
    )
