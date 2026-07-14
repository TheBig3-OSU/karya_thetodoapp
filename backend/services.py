"""Shared domain logic — chiefly the XP-granting transaction (API spec §3.5).

grant_task_xp is called from BOTH /tasks/{id}/complete and /tasks/{id}/vouch:
for requires_vouch quests XP is withheld at completion and granted when a
teammate vouches. All mutations join the caller's session/transaction, so the
xp_events insert, user_team_xp increment, and level recompute commit (or roll
back) atomically.
"""

import re
import secrets

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import Level, Task, UserTeamXp, XpEvent

INVITE_SUFFIX_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no 0/O/1/I/L


async def compute_level(session: AsyncSession, current_xp: int) -> int:
    """Level for a cumulative XP total: smallest level whose upper bound is
    still ahead of the XP (levels.xp_upper_bound = XP at which you advance).
    Beyond the top of the curve you stay at the max level."""
    level = (
        await session.execute(
            select(Level.level)
            .where(Level.xp_upper_bound > current_xp)
            .order_by(Level.level)
            .limit(1)
        )
    ).scalar_one_or_none()
    if level is None:
        level = (await session.execute(select(func.max(Level.level)))).scalar_one()
    return level


async def grant_task_xp(session: AsyncSession, task: Task) -> bool:
    """Award a task's XP to its doer exactly once.

    Inserts the xp_events ledger row, increments the doer's user_team_xp
    standing, and recomputes their level. Returns False (and does nothing)
    if this task already has a ledger entry.
    """
    already_granted = (
        await session.execute(
            select(XpEvent.id).where(XpEvent.task_id == task.task_id).limit(1)
        )
    ).scalar_one_or_none()
    if already_granted is not None:
        return False

    session.add(
        XpEvent(
            user_id=task.user_id,
            team_id=task.team_id,
            task_id=task.task_id,
            xp_awarded=task.xp,
        )
    )

    standing = await session.get(UserTeamXp, (task.user_id, task.team_id))
    if standing is None:
        standing = UserTeamXp(user_id=task.user_id, team_id=task.team_id, current_xp=0)
        session.add(standing)
        standing.current_xp = 0
    standing.current_xp += task.xp
    standing.level = await compute_level(session, standing.current_xp)
    return True


def generate_invite_code(team_name: str) -> str:
    """Codes like VAJRA-7K2: up-to-5-char name prefix + 3 unambiguous chars."""
    prefix = re.sub(r"[^a-zA-Z0-9]", "", team_name).upper()[:5] or "GANA"
    suffix = "".join(secrets.choice(INVITE_SUFFIX_ALPHABET) for _ in range(3))
    return f"{prefix}-{suffix}"
