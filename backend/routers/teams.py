"""Gana / teams (spec §3.2), Loka feed (§3.4), leaderboard (§3.5)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models import (
    Task,
    TaskCategory,
    TaskReaction,
    Team,
    TeamMember,
    Thread,
    UserProfile,
    UserTeamXp,
)
from deps import get_current_user, get_team_or_404, require_member
from schemas import (
    CategoryCreate,
    CategoryOut,
    FeedItemOut,
    LeaderboardEntryOut,
    MemberOut,
    MemberPatchIn,
    ReactionSummaryOut,
    TeamCreate,
    TeamDetailOut,
    TeamJoinIn,
    TeamOut,
)
from services import compute_level, generate_invite_code

router = APIRouter(prefix="/teams", tags=["teams"])


@router.post("", response_model=TeamOut, status_code=status.HTTP_201_CREATED)
async def create_team(
    body: TeamCreate,
    current: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Retry on the (unlikely) invite-code collision — unique constraint is the arbiter.
    for _ in range(5):
        team = Team(
            name=body.name,
            owner_id=current.id,
            invite_code=generate_invite_code(body.name),
        )
        db.add(team)
        try:
            await db.flush()
            break
        except IntegrityError:
            await db.rollback()
    else:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Could not allocate an invite code"
        )

    db.add(TeamMember(team_id=team.id, user_id=current.id, role="admin"))
    db.add(UserTeamXp(user_id=current.id, team_id=team.id))
    await db.commit()
    await db.refresh(team)
    return team


@router.post("/join", response_model=TeamOut)
async def join_team(
    body: TeamJoinIn,
    current: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    team = (
        await db.execute(
            select(Team).where(Team.invite_code == body.invite_code.strip().upper())
        )
    ).scalar_one_or_none()
    if team is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invalid invite code")

    if await db.get(TeamMember, (team.id, current.id)) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Already a member of this gana")

    db.add(TeamMember(team_id=team.id, user_id=current.id, role="member"))
    db.add(UserTeamXp(user_id=current.id, team_id=team.id))
    await db.commit()
    return team


@router.get("/{team_id}", response_model=TeamDetailOut)
async def get_team(
    team_id: int,
    current: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    team = await get_team_or_404(db, team_id)
    await require_member(db, team_id, current.id)

    member_count = (
        await db.execute(
            select(func.count()).select_from(TeamMember).where(TeamMember.team_id == team_id)
        )
    ).scalar_one()
    total_xp = (
        await db.execute(
            select(func.coalesce(func.sum(UserTeamXp.current_xp), 0)).where(
                UserTeamXp.team_id == team_id
            )
        )
    ).scalar_one()
    return TeamDetailOut(
        **TeamOut.model_validate(team).model_dump(),
        member_count=member_count,
        total_xp=total_xp,
        team_level=await compute_level(db, total_xp),
    )


@router.get("/{team_id}/members", response_model=list[MemberOut])
async def list_members(
    team_id: int,
    current: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_team_or_404(db, team_id)
    await require_member(db, team_id, current.id)

    rows = await db.execute(
        select(
            TeamMember.user_id,
            UserProfile.username,
            TeamMember.role,
            TeamMember.joined_at,
            func.coalesce(UserTeamXp.current_xp, 0).label("current_xp"),
            func.coalesce(UserTeamXp.level, 1).label("level"),
        )
        .join(UserProfile, UserProfile.id == TeamMember.user_id)
        .outerjoin(
            UserTeamXp,
            (UserTeamXp.user_id == TeamMember.user_id)
            & (UserTeamXp.team_id == TeamMember.team_id),
        )
        .where(TeamMember.team_id == team_id)
        .order_by(func.coalesce(UserTeamXp.current_xp, 0).desc())
    )
    return [MemberOut(**row._mapping) for row in rows]


@router.patch("/{team_id}/members/{user_id}", response_model=list[MemberOut] | dict)
async def patch_member(
    team_id: int,
    user_id: int,
    body: MemberPatchIn,
    current: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Promote/demote (role) or remove a member. Admins only; the owner's
    membership is untouchable."""
    team = await get_team_or_404(db, team_id)
    acting = await require_member(db, team_id, current.id)
    if acting.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin role required")

    target = await db.get(TeamMember, (team_id, user_id))
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    if user_id == team.owner_id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "The gana owner's membership cannot be changed"
        )

    if body.remove:
        await db.delete(target)
        await db.commit()
        return {"removed": user_id}
    if body.role is not None:
        target.role = body.role
    await db.commit()
    return await list_members(team_id, current, db)


@router.get("/{team_id}/categories", response_model=list[CategoryOut])
async def list_categories(
    team_id: int,
    current: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_team_or_404(db, team_id)
    await require_member(db, team_id, current.id)
    rows = await db.execute(
        select(TaskCategory).where(TaskCategory.team_id == team_id).order_by(TaskCategory.name)
    )
    return rows.scalars().all()


@router.post(
    "/{team_id}/categories",
    response_model=CategoryOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_category(
    team_id: int,
    body: CategoryCreate,
    current: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_team_or_404(db, team_id)
    await require_member(db, team_id, current.id)
    category = TaskCategory(team_id=team_id, name=body.name)
    db.add(category)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "A category with this name already exists"
        )
    await db.refresh(category)
    return category


@router.get("/{team_id}/feed", response_model=list[FeedItemOut])
async def team_feed(
    team_id: int,
    limit: int = 50,
    current: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Loka: the gana's task cards, newest first."""
    await get_team_or_404(db, team_id)
    await require_member(db, team_id, current.id)

    reply_count = (
        select(func.count())
        .where(Thread.task_id == Task.task_id)
        .correlate(Task)
        .scalar_subquery()
    )
    rows = await db.execute(
        select(
            Task.task_id,
            Task.title,
            Task.user_id.label("doer_id"),
            UserProfile.username.label("doer_username"),
            TaskCategory.name.label("category_name"),
            Task.xp,
            Task.is_completed,
            Task.intermediary_progress,
            Task.requires_vouch,
            Task.vouched_by.is_not(None).label("vouched"),
            reply_count.label("reply_count"),
            Task.created_at,
        )
        .join(UserProfile, UserProfile.id == Task.user_id)
        .outerjoin(TaskCategory, TaskCategory.id == Task.category_id)
        .where(Task.team_id == team_id)
        .order_by(Task.created_at.desc())
        .limit(min(limit, 200))
    )

    reaction_rows = await db.execute(
        select(
            TaskReaction.task_id,
            TaskReaction.emoji,
            func.count().label("count"),
            func.bool_or(TaskReaction.user_id == current.id).label("reacted_by_me"),
        )
        .join(Task, Task.task_id == TaskReaction.task_id)
        .where(Task.team_id == team_id)
        .group_by(TaskReaction.task_id, TaskReaction.emoji)
        .order_by(func.count().desc())
    )
    reactions_by_task: dict[int, list[ReactionSummaryOut]] = {}
    for row in reaction_rows:
        reactions_by_task.setdefault(row.task_id, []).append(
            ReactionSummaryOut(
                emoji=row.emoji, count=row.count, reacted_by_me=row.reacted_by_me
            )
        )

    return [
        FeedItemOut(**row._mapping, reactions=reactions_by_task.get(row.task_id, []))
        for row in rows
    ]


@router.get("/{team_id}/leaderboard", response_model=list[LeaderboardEntryOut])
async def leaderboard(
    team_id: int,
    current: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_team_or_404(db, team_id)
    await require_member(db, team_id, current.id)
    rows = await db.execute(
        select(
            UserTeamXp.user_id,
            UserProfile.username,
            UserTeamXp.current_xp,
            UserTeamXp.level,
        )
        .join(UserProfile, UserProfile.id == UserTeamXp.user_id)
        .where(UserTeamXp.team_id == team_id)
        .order_by(UserTeamXp.current_xp.desc())
    )
    return [LeaderboardEntryOut(**row._mapping) for row in rows]
