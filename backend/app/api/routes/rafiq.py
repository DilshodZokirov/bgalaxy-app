import asyncio
import re
import uuid as uuid_lib

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy import update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.database import get_db
from app.models.chat import Message
from app.models.channel import ChatChannel, ChatChannelMember
from app.models.company import Company, MemberRole, TeamMembership
from app.models.invite import Invite
from app.models.rafiq import RafiqMessage
from app.models.role import DEFAULT_ROLE_PERMISSIONS, Role
from app.models.user import User
from app.schemas.rafiq import RafiqChatRequest, RafiqChatResponse, RafiqMessageOut
from app.services.connection_manager import chat_manager, signaling_manager
from app.services.permissions import get_permissions

router = APIRouter(prefix="/rafiq", tags=["rafiq"])

HISTORY_LIMIT = 20  # messages of context sent to Gemini on each turn
MAX_TOOL_ROUNDS = 4

SYSTEM_PROMPT = """Sizning ismingiz Ziyo — BGalaxy platformasining AI yordamchisisiz.
BGalaxy — kompaniyalar, jamoalar va frilanserlar uchun yagona virtual makon: \
u yerda chat, video uchrashuvlar va (kelajakda) virtual ofis birlashtirilgan.

Rolingiz: foydalanuvchiga ishlarini tashkil qilishda, savollariga javob berishda, \
va platformadan qanday foydalanishni tushuntirishda yordam berish. Sizda platforma \
bo'ylab ko'plab amallarni to'g'ridan-to'g'ri bajarish imkoniyati bor: kompaniya \
yaratish/o'chirish/almashtirish, jamoa a'zolarini ko'rish, a'zo taklif qilish, \
uchrashuv boshlash/holatini tekshirish, chatga xabar yuborish, profil ismini \
yangilash, va istalgan sahifaga o'tkazish. Foydalanuvchi shunday so'rasa, mos \
vositadan (function) foydalaning — imkon qadar ko'proq narsani o'zingiz bajarishga \
harakat qiling, faqat vositangiz yo'q ishlarda "buni hali qila olmayman" deng.

Ohang: **juda qisqa** (odatda 1-2 gap, imkon qadar), aniq, do'stona va professional \
— javoblaringiz ovozli o'qilishi mumkinligini yodda tuting, shuning uchun cho'zilib \
ketmang. Foydalanuvchi qaysi tilda yozsa, o'sha tilda javob bering (odatda o'zbek tilida)."""

FUNCTION_DECLARATIONS = [
    {
        "name": "create_company",
        "description": "Foydalanuvchi uchun yangi kompaniya yaratadi va uni admin qilib qo'shadi.",
        "parameters": {
            "type": "object",
            "properties": {"name": {"type": "string", "description": "Kompaniya nomi"}},
            "required": ["name"],
        },
    },
    {
        "name": "start_meeting",
        "description": "Foydalanuvchining hozirgi faol kompaniyasi uchun guruh video uchrashuv sahifasini ochadi.",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "send_chat_message",
        "description": "Foydalanuvchining hozirgi faol kompaniyasi umumiy chatiga xabar yuboradi.",
        "parameters": {
            "type": "object",
            "properties": {"content": {"type": "string", "description": "Xabar matni"}},
            "required": ["content"],
        },
    },
    {
        "name": "list_companies",
        "description": "Foydalanuvchi a'zo bo'lgan barcha kompaniyalar ro'yxatini qaytaradi.",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "delete_company",
        "description": "Foydalanuvchiga tegishli (u yaratgan) kompaniyani nomi bo'yicha butunlay o'chiradi.",
        "parameters": {
            "type": "object",
            "properties": {"name": {"type": "string", "description": "O'chiriladigan kompaniya nomi"}},
            "required": ["name"],
        },
    },
    {
        "name": "switch_active_company",
        "description": "Foydalanuvchining faol kompaniyasini nomi bo'yicha boshqasiga almashtiradi.",
        "parameters": {
            "type": "object",
            "properties": {"name": {"type": "string", "description": "Faol qilinadigan kompaniya nomi"}},
            "required": ["name"],
        },
    },
    {
        "name": "list_team_members",
        "description": "Foydalanuvchining hozirgi faol kompaniyasidagi barcha jamoa a'zolarini ro'yxatini qaytaradi.",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "invite_member",
        "description": "Faol kompaniyaga, ro'yxatdan o'tgan foydalanuvchi emaili orqali taklif yuboradi.",
        "parameters": {
            "type": "object",
            "properties": {"email": {"type": "string", "description": "Taklif qilinuvchi email"}},
            "required": ["email"],
        },
    },
    {
        "name": "update_my_name",
        "description": "Foydalanuvchining o'z profilidagi to'liq ismini yangilaydi.",
        "parameters": {
            "type": "object",
            "properties": {"new_name": {"type": "string", "description": "Yangi to'liq ism"}},
            "required": ["new_name"],
        },
    },
    {
        "name": "get_meeting_status",
        "description": "Faol kompaniyada hozir video uchrashuv ketayotganini va kim boshlaganini tekshiradi.",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "navigate_to",
        "description": "Foydalanuvchini platformaning boshqa sahifasiga o'tkazadi.",
        "parameters": {
            "type": "object",
            "properties": {
                "page": {
                    "type": "string",
                    "description": "Sahifa nomi",
                    "enum": ["dashboard", "companies", "chat", "office", "profile"],
                }
            },
            "required": ["page"],
        },
    },
]


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "company"


async def _is_member(db: AsyncSession, company_id: str, user_id) -> bool:
    result = await db.execute(
        select(TeamMembership).where(
            TeamMembership.company_id == company_id, TeamMembership.user_id == user_id
        )
    )
    if result.scalar_one_or_none() is not None:
        return True
    company_result = await db.execute(select(Company).where(Company.id == company_id))
    company = company_result.scalar_one_or_none()
    return bool(company and str(company.owner_id) == str(user_id))


async def _get_history(db: AsyncSession, user_id) -> list[RafiqMessage]:
    result = await db.execute(
        select(RafiqMessage)
        .where(RafiqMessage.user_id == user_id)
        .order_by(RafiqMessage.created_at.desc())
        .limit(HISTORY_LIMIT)
    )
    return list(reversed(result.scalars().all()))


@router.get("/messages", response_model=list[RafiqMessageOut])
async def get_messages(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await _get_history(db, current_user.id)


async def _execute_tool(
    name: str, tool_input: dict, active_company_id: str | None, db: AsyncSession, current_user: User
) -> tuple[str, dict | None]:
    """Runs a tool call and returns (result_text_for_gemini, client_action_for_frontend)."""
    if name == "create_company":
        company_name = (tool_input.get("name") or "").strip()
        if not company_name:
            return "Kompaniya nomi berilmadi.", None

        existing_owned = await db.execute(
            select(Company).where(
                Company.owner_id == current_user.id, Company.name.ilike(company_name)
            )
        )
        already = existing_owned.scalar_one_or_none()
        if already:
            return (
                f"'{company_name}' nomli kompaniya sizda allaqachon mavjud edi — uni faol qildim.",
                {"type": "navigate", "path": "/companies", "set_active_company_id": str(already.id)},
            )

        slug = _slugify(company_name)
        existing = await db.execute(select(Company).where(Company.slug == slug))
        if existing.scalar_one_or_none():
            slug = f"{slug}-{uuid_lib.uuid4().hex[:6]}"
        company = Company(name=company_name, slug=slug, owner_id=current_user.id)
        db.add(company)
        await db.flush()

        admin_role = None
        for role_name, permissions in DEFAULT_ROLE_PERMISSIONS.items():
            role = Role(company_id=company.id, name=role_name, permissions=permissions)
            db.add(role)
            if role_name == "Admin":
                admin_role = role
        await db.flush()

        db.add(
            TeamMembership(
                company_id=company.id,
                user_id=current_user.id,
                role=MemberRole.admin,
                role_id=admin_role.id,
            )
        )
        await db.commit()
        return (
            f"'{company_name}' kompaniyasi muvaffaqiyatli yaratildi.",
            {"type": "navigate", "path": "/companies", "set_active_company_id": str(company.id)},
        )

    if name == "start_meeting":
        if not active_company_id:
            return "Uchrashuv boshlash uchun avval kompaniya tanlanishi kerak.", None
        if not await _is_member(db, active_company_id, current_user.id):
            return "Siz bu kompaniya a'zosi emassiz.", None
        perms = await get_permissions(db, active_company_id, current_user.id)
        if not perms["permissions"].get("start_meeting", False):
            return "Sizda uchrashuv boshlash ruxsati yo'q.", None
        return (
            "Guruh uchrashuvi sahifasi ochilmoqda.",
            {"type": "navigate", "path": "/group-meeting"},
        )

    if name == "send_chat_message":
        if not active_company_id:
            return "Xabar yuborish uchun avval kompaniya tanlanishi kerak.", None
        if not await _is_member(db, active_company_id, current_user.id):
            return "Siz bu kompaniya a'zosi emassiz.", None
        content = (tool_input.get("content") or "").strip()
        if not content:
            return "Xabar matni berilmadi.", None

        channel_result = await db.execute(
            select(ChatChannel)
            .join(ChatChannelMember, ChatChannelMember.channel_id == ChatChannel.id)
            .where(
                ChatChannel.company_id == active_company_id,
                ChatChannelMember.user_id == current_user.id,
                ChatChannelMember.approved == True,  # noqa: E712
            )
            .order_by(ChatChannel.created_at)
        )
        channel = channel_result.scalars().first()
        if channel is None:
            return "Sizda hali kanal yo'q — avval bir kanal yarating.", None

        message = Message(
            company_id=active_company_id,
            channel_id=channel.id,
            sender_id=current_user.id,
            content=content,
        )
        db.add(message)
        await db.commit()
        await db.refresh(message)
        await chat_manager.broadcast(
            str(channel.id),
            {
                "id": str(message.id),
                "channel_id": str(channel.id),
                "sender_id": str(message.sender_id),
                "sender_name": current_user.full_name,
                "content": message.content,
                "reply_to_id": None,
                "reply_sender_name": None,
                "reply_preview": None,
                "forwarded_from": None,
                "edited": False,
                "deleted": False,
                "created_at": message.created_at.isoformat(),
            },
        )
        return "Xabar chatga yuborildi.", {"type": "navigate", "path": f"/chat/{active_company_id}/{channel.id}"}

    if name == "list_companies":
        result = await db.execute(
            select(Company)
            .join(TeamMembership, TeamMembership.company_id == Company.id)
            .where(TeamMembership.user_id == current_user.id)
        )
        companies = result.scalars().all()
        if not companies:
            return "Foydalanuvchining hali kompaniyasi yo'q.", {"type": "navigate", "path": "/companies"}
        names = ", ".join(c.name for c in companies)
        return f"Kompaniyalar: {names}.", {"type": "navigate", "path": "/companies"}

    if name == "delete_company":
        company_name = (tool_input.get("name") or "").strip()
        result = await db.execute(
            select(Company).where(Company.owner_id == current_user.id, Company.name.ilike(company_name))
        )
        company = result.scalar_one_or_none()
        if not company:
            return f"'{company_name}' nomli, sizga tegishli kompaniya topilmadi.", None
        cid = str(company.id)
        await db.execute(sa_update(Message).where(Message.company_id == cid).values(reply_to_id=None))
        await db.execute(sa_delete(Message).where(Message.company_id == cid))
        await db.execute(sa_delete(Invite).where(Invite.company_id == cid))
        await db.execute(sa_delete(TeamMembership).where(TeamMembership.company_id == cid))
        await db.execute(sa_delete(Company).where(Company.id == cid))
        await db.commit()
        return f"'{company_name}' kompaniyasi o'chirildi.", {"type": "navigate", "path": "/companies"}

    if name == "switch_active_company":
        company_name = (tool_input.get("name") or "").strip()
        result = await db.execute(
            select(Company)
            .join(TeamMembership, TeamMembership.company_id == Company.id)
            .where(TeamMembership.user_id == current_user.id, Company.name.ilike(company_name))
        )
        company = result.scalar_one_or_none()
        if not company:
            return f"'{company_name}' nomli kompaniya topilmadi.", None
        return (
            f"'{company_name}' faol kompaniya qilib belgilandi.",
            {"type": "navigate", "path": "/dashboard", "set_active_company_id": str(company.id)},
        )

    if name == "list_team_members":
        if not active_company_id:
            return "Avval kompaniya tanlanishi kerak.", None
        if not await _is_member(db, active_company_id, current_user.id):
            return "Siz bu kompaniya a'zosi emassiz.", None
        result = await db.execute(
            select(User.full_name)
            .join(TeamMembership, TeamMembership.user_id == User.id)
            .where(TeamMembership.company_id == active_company_id)
        )
        names = [row[0] for row in result.all()]
        names_text = ", ".join(names) if names else "hali hech kim yo'q"
        return f"Jamoa a'zolari: {names_text}.", None

    if name == "invite_member":
        if not active_company_id:
            return "Avval kompaniya tanlanishi kerak.", None
        perms = await get_permissions(db, active_company_id, current_user.id)
        if not perms["permissions"].get("invite_members", False):
            return "Sizda a'zo taklif qilish ruxsati yo'q.", None
        email = (tool_input.get("email") or "").strip()
        target = await db.execute(select(User).where(User.email == email))
        if target.scalar_one_or_none() is None:
            return f"'{email}' bilan ro'yxatdan o'tgan foydalanuvchi topilmadi.", None
        invite = Invite(company_id=active_company_id, email=email, invited_by=current_user.id)
        db.add(invite)
        await db.commit()
        return f"{email} uchun taklif yaratildi.", {"type": "navigate", "path": "/companies"}

    if name == "update_my_name":
        new_name = (tool_input.get("new_name") or "").strip()
        if not new_name:
            return "Yangi ism berilmadi.", None
        current_user.full_name = new_name
        await db.commit()
        return f"Ismingiz '{new_name}' deb yangilandi.", {"type": "navigate", "path": "/profile"}

    if name == "get_meeting_status":
        if not active_company_id:
            return "Avval kompaniya tanlanishi kerak.", None
        if not await _is_member(db, active_company_id, current_user.id):
            return "Siz bu kompaniya a'zosi emassiz.", None
        room_id = f"{active_company_id}-call"
        participants = len(signaling_manager.rooms.get(room_id, []))
        if participants == 0:
            return "Hozir hech qanday uchrashuv ketayotgani yo'q.", None
        return f"Hozir uchrashuv ketmoqda ({participants} kishi).", None

    if name == "navigate_to":
        page = (tool_input.get("page") or "").strip()
        paths = {
            "dashboard": "/dashboard",
            "companies": "/companies",
            "chat": f"/chat/{active_company_id}" if active_company_id else "/chat",
            "office": "/office",
            "profile": "/profile",
        }
        path = paths.get(page, "/dashboard")
        return f"{page} sahifasiga o'tilmoqda.", {"type": "navigate", "path": path}

    return f"Noma'lum vosita: {name}", None


@router.post("/chat", response_model=RafiqChatResponse)
async def chat(
    payload: RafiqChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not settings.gemini_api_key:
        raise HTTPException(
            status_code=503,
            detail="Ziyo hali sozlanmagan — backend .env fayliga GEMINI_API_KEY qo'shing.",
        )

    user_message = RafiqMessage(user_id=current_user.id, role="user", content=payload.message)
    db.add(user_message)
    await db.commit()

    history = await _get_history(db, current_user.id)
    # Gemini uses "user"/"model" roles; the current message is sent separately
    # via send_message, so history excludes the just-added last entry.
    gemini_history = [
        {"role": "user" if m.role == "user" else "model", "parts": [m.content]}
        for m in history[:-1]
    ]

    client_action = None
    reply_text = ""

    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(
            model_name=settings.rafiq_model,
            system_instruction=SYSTEM_PROMPT,
            tools=[{"function_declarations": FUNCTION_DECLARATIONS}],
        )
        chat_session = model.start_chat(history=gemini_history)
        response = await asyncio.to_thread(chat_session.send_message, payload.message)

        current_active_company_id = payload.active_company_id

        for _ in range(MAX_TOOL_ROUNDS):
            function_call = None
            for part in response.parts:
                if getattr(part, "function_call", None) and part.function_call.name:
                    function_call = part.function_call
                    break

            if function_call is None:
                reply_text = (response.text or "").strip()
                break

            result_text, action = await _execute_tool(
                function_call.name, dict(function_call.args), current_active_company_id, db, current_user
            )
            if action:
                client_action = action
                if action.get("set_active_company_id"):
                    current_active_company_id = action["set_active_company_id"]

            response = await asyncio.to_thread(
                chat_session.send_message,
                genai.protos.Content(
                    parts=[
                        genai.protos.Part(
                            function_response=genai.protos.FunctionResponse(
                                name=function_call.name,
                                response={"result": result_text},
                            )
                        )
                    ]
                ),
            )
        else:
            reply_text = "Kechirasiz, so'rovni bajarishda muammo bo'ldi."

        if not reply_text:
            reply_text = "Amal bajarildi."
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Ziyo bilan bog'lanishda xatolik: {exc}")

    assistant_message = RafiqMessage(user_id=current_user.id, role="assistant", content=reply_text)
    db.add(assistant_message)
    await db.commit()
    await db.refresh(assistant_message)

    return RafiqChatResponse(
        id=assistant_message.id,
        role=assistant_message.role,
        content=assistant_message.content,
        created_at=assistant_message.created_at,
        client_action=client_action,
    )
