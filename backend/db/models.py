"""SQLAlchemy ORM models for Karya (mirrors db/schema.sql, design revision 5).

These classes map 1:1 to the tables created by schema.sql. The DDL remains the
source of truth for the live database; these models are what the FastAPI app
uses to query and mutate that data.

Conventions match the DDL:
  • Surrogate PKs are BIGINT GENERATED ALWAYS AS IDENTITY.
  • Timestamps are TIMESTAMPTZ defaulting to now().
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    Integer,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.database import Base


# ---------- User Profile ----------
class UserProfile(Base):
    __tablename__ = "user_profile"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    username: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    salted_password: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    owned_teams: Mapped[list["Team"]] = relationship(back_populates="owner")
    memberships: Mapped[list["TeamMember"]] = relationship(back_populates="user")
    tasks: Mapped[list["Task"]] = relationship(
        back_populates="doer", foreign_keys="Task.user_id"
    )


# ---------- Teams ----------
class Team(Base):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    owner_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("user_profile.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    owner: Mapped["UserProfile"] = relationship(back_populates="owned_teams")
    members: Mapped[list["TeamMember"]] = relationship(back_populates="team")
    categories: Mapped[list["TaskCategory"]] = relationship(back_populates="team")
    tasks: Mapped[list["Task"]] = relationship(back_populates="team")

    __table_args__ = (Index("idx_teams_owner", "owner_id"),)


# ---------- Team membership (junction) ----------
class TeamMember(Base):
    __tablename__ = "team_members"

    team_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("user_profile.id", ondelete="CASCADE"), primary_key=True
    )
    role: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("'member'")
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    team: Mapped["Team"] = relationship(back_populates="members")
    user: Mapped["UserProfile"] = relationship(back_populates="memberships")

    __table_args__ = (
        CheckConstraint("role IN ('member', 'admin')", name="team_members_role_check"),
        Index("idx_team_members_user", "user_id"),
    )


# ---------- Task categories (per-team, member-defined) ----------
class TaskCategory(Base):
    __tablename__ = "task_categories"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    team_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)

    team: Mapped["Team"] = relationship(back_populates="categories")
    tasks: Mapped[list["Task"]] = relationship(back_populates="category")

    __table_args__ = (
        UniqueConstraint("team_id", "name", name="task_categories_team_id_name_key"),
        Index("idx_task_categories_team", "team_id"),
    )


# ---------- Level thresholds (global) ----------
class Level(Base):
    __tablename__ = "levels"

    level: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    xp_upper_bound: Mapped[int] = mapped_column(Integer, nullable=False)

    __table_args__ = (
        CheckConstraint("xp_upper_bound >= 0", name="levels_xp_upper_bound_check"),
    )


# ---------- Tasks ----------
class Task(Base):
    __tablename__ = "tasks"

    task_id: Mapped[int] = mapped_column(
        BigInteger, Identity(always=True), primary_key=True
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    team_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(  # the doer/assignee
        BigInteger, ForeignKey("user_profile.id", ondelete="RESTRICT"), nullable=False
    )
    category_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("task_categories.id", ondelete="RESTRICT")
    )
    xp: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    is_completed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    intermediary_progress: Mapped[Optional[int]] = mapped_column(Integer)
    requires_vouch: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    vouched_by: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("user_profile.id", ondelete="SET NULL")
    )
    vouched_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    team: Mapped["Team"] = relationship(back_populates="tasks")
    doer: Mapped["UserProfile"] = relationship(
        back_populates="tasks", foreign_keys=[user_id]
    )
    voucher: Mapped[Optional["UserProfile"]] = relationship(foreign_keys=[vouched_by])
    category: Mapped[Optional["TaskCategory"]] = relationship(back_populates="tasks")
    attachments: Mapped[list["TaskAttachment"]] = relationship(back_populates="task")
    posts: Mapped[list["Thread"]] = relationship(back_populates="task")

    __table_args__ = (
        CheckConstraint("xp >= 0", name="tasks_xp_check"),
        CheckConstraint(
            "intermediary_progress BETWEEN 0 AND 100",
            name="tasks_intermediary_progress_check",
        ),
        CheckConstraint(
            "vouched_by IS NULL OR vouched_by <> user_id", name="no_self_vouch"
        ),
        CheckConstraint(
            "(vouched_by IS NULL AND vouched_at IS NULL) "
            "OR (vouched_by IS NOT NULL AND vouched_at IS NOT NULL)",
            name="vouch_consistency",
        ),
        Index("idx_tasks_team", "team_id"),
        Index("idx_tasks_user", "user_id"),
        Index("idx_tasks_category", "category_id"),
    )


# ---------- Task attachments ----------
class TaskAttachment(Base):
    __tablename__ = "task_attachments"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    task_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("tasks.task_id", ondelete="CASCADE"), nullable=False
    )
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    filename: Mapped[str] = mapped_column(Text, nullable=False)
    uploaded_by: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("user_profile.id", ondelete="RESTRICT"), nullable=False
    )
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    task: Mapped["Task"] = relationship(back_populates="attachments")
    uploader: Mapped["UserProfile"] = relationship()

    __table_args__ = (Index("idx_task_attachments_task", "task_id"),)


# ---------- Per-team XP standing (one row per user per team) ----------
class UserTeamXp(Base):
    __tablename__ = "user_team_xp"

    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("user_profile.id", ondelete="CASCADE"), primary_key=True
    )
    team_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True
    )
    current_xp: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    level: Mapped[int] = mapped_column(
        Integer, ForeignKey("levels.level"), nullable=False, server_default=text("1")
    )

    user: Mapped["UserProfile"] = relationship()
    team: Mapped["Team"] = relationship()
    level_ref: Mapped["Level"] = relationship()

    __table_args__ = (
        CheckConstraint("current_xp >= 0", name="user_team_xp_current_xp_check"),
    )


# ---------- XP ledger (append-only) ----------
class XpEvent(Base):
    __tablename__ = "xp_events"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("user_profile.id", ondelete="CASCADE"), nullable=False
    )
    team_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )
    task_id: Mapped[Optional[int]] = mapped_column(  # keep event even if task deleted
        BigInteger, ForeignKey("tasks.task_id", ondelete="SET NULL")
    )
    xp_awarded: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    user: Mapped["UserProfile"] = relationship()
    team: Mapped["Team"] = relationship()
    task: Mapped[Optional["Task"]] = relationship()

    __table_args__ = (
        Index("idx_xp_events_user_team", "user_id", "team_id"),
        Index("idx_xp_events_task", "task_id"),
    )


# ---------- Threads (comments on tasks) ----------
class Thread(Base):
    __tablename__ = "threads"

    task_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("tasks.task_id", ondelete="CASCADE"), primary_key=True
    )
    posted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        primary_key=True,
        nullable=False,
        server_default=func.now(),
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("user_profile.id", ondelete="CASCADE"), primary_key=True
    )
    reply: Mapped[str] = mapped_column(Text, nullable=False)

    task: Mapped["Task"] = relationship(back_populates="posts")
    user: Mapped["UserProfile"] = relationship()

    __table_args__ = (Index("idx_threads_user", "user_id"),)
