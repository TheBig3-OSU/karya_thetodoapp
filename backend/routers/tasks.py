"""Sadhana / quests (spec §3.3), threads (§3.4), complete + vouch (§3.5).

Sadhana is the source of truth for all task mutations; Loka only reads.
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models import Task, TaskAttachment, TaskCategory, TaskReaction, Thread, UserProfile
from deps import get_current_user, require_member
from schemas import (
    AttachmentCreate,
    AttachmentOut,
    ReactionCreate,
    ReactionOut,
    TaskActionOut,
    TaskCreate,
    TaskOut,
    TaskUpdate,
    ThreadPostIn,
    ThreadPostOut,
)
from services import grant_task_xp

router = APIRouter(prefix="/tasks", tags=["tasks"])


async def get_task_or_404(db: AsyncSession, task_id: int) -> Task:
    task = await db.get(Task, task_id)
    if task is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Quest not found")
    return task


async def check_category(db: AsyncSession, category_id: int, team_id: int) -> None:
    category = await db.get(TaskCategory, category_id)
    if category is None or category.team_id != team_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Category does not belong to this gana"
        )


@router.get("", response_model=list[TaskOut])
async def list_tasks(
    team_id: Optional[int] = None,
    user_id: Optional[int] = None,
    completed: Optional[bool] = None,
    current: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Quest list. With no filters you get your own quests (Sadhana);
    team_id requires membership in that gana."""
    if team_id is not None:
        await require_member(db, team_id, current.id)
    elif user_id is None:
        user_id = current.id

    query = select(Task).order_by(Task.created_at.desc())
    if team_id is not None:
        query = query.where(Task.team_id == team_id)
    if user_id is not None:
        query = query.where(Task.user_id == user_id)
    if completed is not None:
        query = query.where(Task.is_completed == completed)
    return (await db.execute(query)).scalars().all()


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    body: TaskCreate,
    current: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_member(db, body.team_id, current.id)
    if body.category_id is not None:
        await check_category(db, body.category_id, body.team_id)

    task = Task(**body.model_dump(), user_id=current.id)
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(
    task_id: int,
    current: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = await get_task_or_404(db, task_id)
    await require_member(db, task.team_id, current.id)
    return task


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: int,
    body: TaskUpdate,
    current: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = await get_task_or_404(db, task_id)
    if task.user_id != current.id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only the quest's hero can edit it"
        )

    changes = body.model_dump(exclude_unset=True)
    if changes.get("category_id") is not None:
        await check_category(db, changes["category_id"], task.team_id)
    if "xp" in changes and task.is_completed:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Cannot change XP of a completed quest"
        )
    for field, value in changes.items():
        setattr(task, field, value)
    await db.commit()
    await db.refresh(task)
    return task


@router.post("/{task_id}/complete", response_model=TaskActionOut)
async def complete_task(
    task_id: int,
    current: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark done. XP is granted here in one transaction — unless the quest
    requires a vouch that hasn't happened yet, in which case XP waits for it."""
    task = await get_task_or_404(db, task_id)
    if task.user_id != current.id:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only the quest's hero can complete it"
        )
    if task.is_completed:
        return TaskActionOut(task=TaskOut.model_validate(task), xp_granted=False)

    task.is_completed = True
    if task.intermediary_progress is not None:
        task.intermediary_progress = 100

    xp_granted = False
    if not task.requires_vouch or task.vouched_by is not None:
        xp_granted = await grant_task_xp(db, task)
    await db.commit()
    await db.refresh(task)
    return TaskActionOut(task=TaskOut.model_validate(task), xp_granted=xp_granted)


@router.post("/{task_id}/vouch", response_model=TaskActionOut)
async def vouch_task(
    task_id: int,
    current: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """A teammate vouches for the quest. If it's already completed, the
    withheld XP is granted now (same transaction)."""
    task = await get_task_or_404(db, task_id)
    if not task.requires_vouch:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "This quest does not require a vouch"
        )
    if task.user_id == current.id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "You cannot vouch for your own quest"
        )
    await require_member(db, task.team_id, current.id)
    if task.vouched_by is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Quest is already vouched")

    task.vouched_by = current.id
    task.vouched_at = datetime.now(timezone.utc)

    xp_granted = False
    if task.is_completed:
        xp_granted = await grant_task_xp(db, task)
    await db.commit()
    await db.refresh(task)
    return TaskActionOut(task=TaskOut.model_validate(task), xp_granted=xp_granted)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    current: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Abandon a quest. The doer (or a gana admin) may delete; any granted XP
    stays in the ledger (xp_events.task_id becomes NULL)."""
    task = await get_task_or_404(db, task_id)
    if task.user_id != current.id:
        member = await require_member(db, task.team_id, current.id)
        if member.role != "admin":
            raise HTTPException(
                status.HTTP_403_FORBIDDEN, "Only the quest's hero or an admin can delete it"
            )
    await db.delete(task)
    await db.commit()


@router.get("/{task_id}/thread", response_model=list[ThreadPostOut])
async def get_thread(
    task_id: int,
    current: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = await get_task_or_404(db, task_id)
    await require_member(db, task.team_id, current.id)
    rows = await db.execute(
        select(
            Thread.task_id,
            Thread.user_id,
            UserProfile.username,
            Thread.posted_at,
            Thread.reply,
        )
        .join(UserProfile, UserProfile.id == Thread.user_id)
        .where(Thread.task_id == task_id)
        .order_by(Thread.posted_at)
    )
    return [ThreadPostOut(**row._mapping) for row in rows]


@router.post(
    "/{task_id}/thread",
    response_model=ThreadPostOut,
    status_code=status.HTTP_201_CREATED,
)
async def post_reply(
    task_id: int,
    body: ThreadPostIn,
    current: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = await get_task_or_404(db, task_id)
    await require_member(db, task.team_id, current.id)
    post = Thread(task_id=task_id, user_id=current.id, reply=body.reply)
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return ThreadPostOut(
        task_id=post.task_id,
        user_id=post.user_id,
        username=current.username,
        posted_at=post.posted_at,
        reply=post.reply,
    )


@router.get("/{task_id}/attachments", response_model=list[AttachmentOut])
async def list_attachments(
    task_id: int,
    current: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = await get_task_or_404(db, task_id)
    await require_member(db, task.team_id, current.id)
    rows = await db.execute(
        select(TaskAttachment)
        .where(TaskAttachment.task_id == task_id)
        .order_by(TaskAttachment.uploaded_at)
    )
    return rows.scalars().all()


@router.post(
    "/{task_id}/attachments",
    response_model=AttachmentOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_attachment(
    task_id: int,
    body: AttachmentCreate,
    current: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Attach a file by URL (direct upload comes with Supabase Storage)."""
    task = await get_task_or_404(db, task_id)
    await require_member(db, task.team_id, current.id)
    attachment = TaskAttachment(
        task_id=task_id,
        file_url=body.file_url,
        filename=body.filename,
        uploaded_by=current.id,
    )
    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)
    return attachment


@router.delete(
    "/{task_id}/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_attachment(
    task_id: int,
    attachment_id: int,
    current: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = await get_task_or_404(db, task_id)
    attachment = await db.get(TaskAttachment, attachment_id)
    if attachment is None or attachment.task_id != task_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Attachment not found")
    if attachment.uploaded_by != current.id:
        member = await require_member(db, task.team_id, current.id)
        if member.role != "admin":
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "Only the uploader or a gana admin can delete an attachment",
            )
    await db.delete(attachment)
    await db.commit()


@router.get("/{task_id}/reactions", response_model=list[ReactionOut])
async def list_reactions(
    task_id: int,
    current: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = await get_task_or_404(db, task_id)
    await require_member(db, task.team_id, current.id)
    rows = await db.execute(
        select(
            TaskReaction.task_id,
            TaskReaction.user_id,
            UserProfile.username,
            TaskReaction.emoji,
            TaskReaction.reacted_at,
        )
        .join(UserProfile, UserProfile.id == TaskReaction.user_id)
        .where(TaskReaction.task_id == task_id)
        .order_by(TaskReaction.reacted_at)
    )
    return [ReactionOut(**row._mapping) for row in rows]


@router.post(
    "/{task_id}/reactions",
    response_model=ReactionOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_reaction(
    task_id: int,
    body: ReactionCreate,
    current: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = await get_task_or_404(db, task_id)
    await require_member(db, task.team_id, current.id)
    reaction = TaskReaction(task_id=task_id, user_id=current.id, emoji=body.emoji)
    db.add(reaction)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "You already reacted with this emoji"
        )
    await db.refresh(reaction)
    return ReactionOut(
        task_id=reaction.task_id,
        user_id=reaction.user_id,
        username=current.username,
        emoji=reaction.emoji,
        reacted_at=reaction.reacted_at,
    )


@router.delete("/{task_id}/reactions/{emoji}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_reaction(
    task_id: int,
    emoji: str,
    current: UserProfile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove your own reaction (un-react)."""
    reaction = await db.get(TaskReaction, (task_id, current.id, emoji))
    if reaction is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reaction not found")
    await db.delete(reaction)
    await db.commit()
