import uuid
from datetime import date, datetime

from pydantic import BaseModel


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    priority: str = "medium"  # hard | medium | easy
    due_date: date
    target_type: str  # "users" | "role" | "everyone"
    target_ids: list[uuid.UUID] = []  # user ids (target_type=users) or [role_id] (target_type=role)


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: str | None = None
    due_date: date | None = None
    status: str | None = None  # employee: todo|in_progress|testing ; PM: accepted|rejected too


class TaskOut(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    priority: str
    status: str
    assignee_id: uuid.UUID
    assignee_name: str | None = None
    created_by: uuid.UUID
    created_by_name: str | None = None
    checked_by: uuid.UUID | None
    checked_by_name: str | None = None
    start_date: date
    due_date: date
    completed_at: date | None
    points: int = 0
    comment_count: int = 0
    file_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TaskCommentOut(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    author_id: uuid.UUID
    author_name: str | None = None
    content: str | None = None
    file_url: str | None = None
    file_name: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True
