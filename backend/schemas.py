"""Pydantic request/response schemas — the API edge of Karya.

Validation happens here (lengths, ranges, enums); the SQLAlchemy models in
db/models.py stay a pure persistence layer. Field constraints mirror the DB
CHECKs so bad data is rejected with a 422 before it ever reaches Postgres.
"""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------- Auth ----------
class RegisterIn(BaseModel):
    username: str = Field(min_length=3, max_length=30, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Teams / Gana ----------
class TeamCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)


class TeamJoinIn(BaseModel):
    invite_code: str = Field(min_length=1, max_length=20)


class TeamOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    invite_code: str
    owner_id: int
    created_at: datetime


class TeamDetailOut(TeamOut):
    member_count: int
    total_xp: int
    team_level: int


class MemberOut(BaseModel):
    user_id: int
    username: str
    role: str
    joined_at: datetime
    current_xp: int
    level: int


class MemberPatchIn(BaseModel):
    role: Optional[Literal["member", "admin"]] = None
    remove: bool = False


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=40)


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    team_id: int
    name: str


# ---------- Tasks / Sadhana ----------
class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    team_id: int
    category_id: Optional[int] = None
    xp: int = Field(default=0, ge=0)
    # None = simple quest (checkbox); 0–100 = measurable quest (progress bar)
    intermediary_progress: Optional[int] = Field(default=None, ge=0, le=100)
    requires_vouch: bool = False


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    category_id: Optional[int] = None
    xp: Optional[int] = Field(default=None, ge=0)
    intermediary_progress: Optional[int] = Field(default=None, ge=0, le=100)
    requires_vouch: Optional[bool] = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    task_id: int
    title: str
    description: Optional[str]
    team_id: int
    user_id: int
    category_id: Optional[int]
    xp: int
    is_completed: bool
    intermediary_progress: Optional[int]
    requires_vouch: bool
    vouched_by: Optional[int]
    vouched_at: Optional[datetime]
    created_at: datetime


class TaskActionOut(BaseModel):
    """Result of /complete or /vouch: the task plus whether XP was granted now."""

    task: TaskOut
    xp_granted: bool


# ---------- Attachments ----------
class AttachmentCreate(BaseModel):
    # URL-based for now; direct upload arrives with Supabase Storage.
    file_url: str = Field(min_length=1, max_length=2000)
    filename: str = Field(min_length=1, max_length=255)


class AttachmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    file_url: str
    filename: str
    uploaded_by: int
    uploaded_at: datetime


# ---------- Reactions ----------
class ReactionCreate(BaseModel):
    emoji: str = Field(min_length=1, max_length=8)


class ReactionOut(BaseModel):
    task_id: int
    user_id: int
    username: str
    emoji: str
    reacted_at: datetime


class ReactionSummaryOut(BaseModel):
    emoji: str
    count: int
    reacted_by_me: bool


# ---------- Loka feed + threads ----------
class FeedItemOut(BaseModel):
    task_id: int
    title: str
    doer_id: int
    doer_username: str
    category_name: Optional[str]
    xp: int
    is_completed: bool
    intermediary_progress: Optional[int]
    requires_vouch: bool
    vouched: bool
    reply_count: int
    reactions: list[ReactionSummaryOut] = []
    created_at: datetime


class ThreadPostIn(BaseModel):
    reply: str = Field(min_length=1, max_length=1000)


class ThreadPostOut(BaseModel):
    task_id: int
    user_id: int
    username: str
    posted_at: datetime
    reply: str


# ---------- XP / Atma ----------
class LeaderboardEntryOut(BaseModel):
    user_id: int
    username: str
    current_xp: int
    level: int


class UserXpOut(BaseModel):
    team_id: int
    current_xp: int
    level: int
    level_floor: int      # cumulative XP where the current level began
    next_level_at: int    # cumulative XP needed to advance


class UserProfileOut(UserOut):
    quests_completed: int
    streak_days: int


class UserPatchIn(BaseModel):
    username: Optional[str] = Field(
        default=None, min_length=3, max_length=30, pattern=r"^[a-zA-Z0-9_]+$"
    )
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)
