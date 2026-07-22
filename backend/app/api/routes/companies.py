from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.chat import Message
from app.models.company import Company, MemberRole, TeamMembership
from app.models.role import DEFAULT_ROLE_PERMISSIONS, Role
from app.models.invite import Invite
from app.models.user import User
from app.schemas.company import CompanyCreate, CompanyOut, TeamMemberOut

router = APIRouter(prefix="/companies", tags=["companies"])


@router.post("", response_model=CompanyOut, status_code=201)
async def create_company(
    payload: CompanyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await db.execute(select(Company).where(Company.slug == payload.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Slug already taken")

    company = Company(name=payload.name, slug=payload.slug, owner_id=current_user.id)
    db.add(company)
    await db.flush()

    # Seed the 4 default roles for this company.
    admin_role = None
    for role_name, permissions in DEFAULT_ROLE_PERMISSIONS.items():
        role = Role(company_id=company.id, name=role_name, permissions=permissions)
        db.add(role)
        if role_name == "Admin":
            admin_role = role
    await db.flush()

    # Owner is automatically an admin member
    membership = TeamMembership(
        company_id=company.id, user_id=current_user.id, role=MemberRole.admin, role_id=admin_role.id
    )
    db.add(membership)
    await db.commit()
    await db.refresh(company)
    return company


@router.get("/mine", response_model=list[CompanyOut])
async def my_companies(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Company)
        .join(TeamMembership, TeamMembership.company_id == Company.id)
        .where(
            TeamMembership.user_id == current_user.id,
            or_(TeamMembership.approved == True, Company.owner_id == current_user.id),  # noqa: E712
        )
    )
    return result.scalars().all()


@router.get("/{company_id}/members", response_model=list[TeamMemberOut])
async def list_members(
    company_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company_result = await db.execute(select(Company).where(Company.id == company_id))
    company = company_result.scalar_one_or_none()

    result = await db.execute(
        select(TeamMembership, User, Role)
        .join(User, User.id == TeamMembership.user_id)
        .outerjoin(Role, Role.id == TeamMembership.role_id)
        .where(TeamMembership.company_id == company_id)
    )
    members = []
    for membership, user, role in result.all():
        members.append(
            TeamMemberOut(
                user_id=membership.user_id,
                role=membership.role,
                full_name=user.full_name,
                role_name=role.name if role else None,
                approved=membership.approved,
                is_owner=bool(company and str(company.owner_id) == str(membership.user_id)),
                is_head_admin=bool(company and str(company.head_admin_id or "") == str(membership.user_id)),
            )
        )
    return members


@router.delete("/{company_id}", status_code=204)
async def delete_company(
    company_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if company is None:
        raise HTTPException(status_code=404, detail="Kompaniya topilmadi")
    if str(company.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Faqat kompaniya egasi uni o'chira oladi")

    # Clear self-referencing reply links first, then remove dependent rows,
    # then the company itself.
    await db.execute(
        update(Message).where(Message.company_id == company_id).values(reply_to_id=None)
    )
    await db.execute(delete(Message).where(Message.company_id == company_id))
    await db.execute(delete(Invite).where(Invite.company_id == company_id))
    await db.execute(delete(TeamMembership).where(TeamMembership.company_id == company_id))
    await db.execute(delete(Company).where(Company.id == company_id))
    await db.commit()
