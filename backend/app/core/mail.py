import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from html import escape

import requests

from app.core.config import settings

logger = logging.getLogger(__name__)

RESEND_URL = "https://api.resend.com/emails"


def _send_email(to_email: str, subject: str, html: str) -> bool:
    """Sends one HTML email. Tries Resend (HTTPS API) first — this is what
    actually works on hosts like Render's free tier, which blocks outbound
    SMTP ports entirely. Falls back to SMTP if RESEND_API_KEY isn't set
    (handy for local development). Never raises — a failed/unconfigured
    email should never break the calling request."""
    if settings.resend_api_key:
        try:
            response = requests.post(
                RESEND_URL,
                headers={"Authorization": f"Bearer {settings.resend_api_key}"},
                json={"from": settings.smtp_from, "to": [to_email], "subject": subject, "html": html},
                timeout=10,
            )
            response.raise_for_status()
            return True
        except Exception:
            logger.exception("Failed to send email via Resend to %s", to_email)
            return False

    if not settings.smtp_host:
        logger.info("Neither RESEND_API_KEY nor SMTP configured — skipping email to %s", to_email)
        return False

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = settings.smtp_from
    message["To"] = to_email
    message.attach(MIMEText(html, "html"))
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_from, [to_email], message.as_string())
        return True
    except Exception:
        logger.exception("Failed to send email via SMTP to %s", to_email)
        return False


def _email_shell(
    *,
    title: str,
    body_html: str,
    cta_label: str | None = None,
    cta_link: str | None = None,
    footer_note: str | None = None,
) -> str:
    """Shared BG / cyan-galaxy HTML wrapper for transactional mail."""
    safe_title = escape(title)
    cta_block = ""
    if cta_label and cta_link:
        safe_label = escape(cta_label)
        safe_link = escape(cta_link, quote=True)
        cta_block = f"""
        <a href="{safe_link}"
           style="display:inline-block;background:linear-gradient(135deg,#06b6d4,#2563eb 55%,#4f46e5);
                  color:#ffffff;text-decoration:none;padding:14px 26px;border-radius:12px;
                  font-weight:700;font-size:14px;letter-spacing:0.01em;
                  box-shadow:0 10px 28px rgba(37,99,235,0.35);">
          {safe_label}
        </a>
        <p style="color:#64748b;font-size:12px;line-height:1.55;margin:22px 0 0;">
          Agar tugma ishlamasa, quyidagi havolani brauzeringizga nusxalang:<br/>
          <span style="color:#94a3b8;word-break:break-all;">{escape(cta_link)}</span>
        </p>
        """

    note_block = ""
    if footer_note:
        note_block = f"""
        <p style="color:#64748b;font-size:12px;line-height:1.55;margin:24px 0 0;">
          {escape(footer_note)}
        </p>
        """

    home = escape(settings.frontend_url.rstrip("/"), quote=True)

    return f"""
<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{safe_title}</title>
</head>
<body style="margin:0;padding:0;background:#030712;">
  <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#030712;padding:40px 16px;">
    <div style="max-width:520px;margin:0 auto;">
      <a href="{home}" style="display:inline-flex;align-items:center;gap:12px;text-decoration:none;margin:0 0 22px;">
        <span style="width:40px;height:40px;border-radius:12px;
                     background:radial-gradient(circle at 30% 30%,#67e8f9,#2563eb 55%,#0f172a);
                     display:inline-block;text-align:center;line-height:40px;
                     color:#ffffff;font-weight:800;font-size:18px;
                     box-shadow:0 0 24px rgba(34,211,238,0.35);">B</span>
        <span>
          <span style="display:block;color:#f8fafc;font-size:20px;font-weight:800;letter-spacing:-0.03em;line-height:1.1;">BG</span>
          <span style="display:block;color:#67e8f9;font-size:11px;font-weight:600;letter-spacing:0.04em;">
            One Galaxy. Endless Business.
          </span>
        </span>
      </a>

      <div style="background:linear-gradient(165deg,#0b1224,#07101f);
                  border:1px solid rgba(34,211,238,0.22);border-radius:20px;
                  padding:32px 28px;
                  box-shadow:0 24px 60px rgba(0,0,0,0.45),0 0 40px rgba(34,211,238,0.08);">
        <div style="height:3px;width:72px;border-radius:999px;
                    background:linear-gradient(90deg,#22d3ee,#2563eb);margin:0 0 20px;"></div>
        <h2 style="color:#f8fafc;font-size:22px;font-weight:800;letter-spacing:-0.02em;margin:0 0 12px;">
          {safe_title}
        </h2>
        <div style="color:#94a3b8;font-size:14px;line-height:1.65;">
          {body_html}
        </div>
        <div style="margin-top:26px;">
          {cta_block}
          {note_block}
        </div>
      </div>

      <p style="color:#475569;font-size:11px;text-align:center;margin:22px 0 0;line-height:1.5;">
        BG (Business Galaxy) · Virtual ofis · AI Ziyo · Hamkorlik
      </p>
    </div>
  </div>
</body>
</html>
    """


def _invite_email_html(company_name: str, invite_link: str) -> str:
    name = escape(company_name)
    return _email_shell(
        title=f"Sizni {company_name} kompaniyasiga taklif qilishdi",
        body_html=f"""
        <p style="margin:0 0 12px;">
          <strong style="color:#e2e8f0;">{name}</strong> jamoasi sizni Business Galaxy stansiyasiga chaqiryapti.
        </p>
        <p style="margin:0;">
          Virtual ofis, vazifalar va AI Ziyo — barchasi bitta galaktikada. Taklifni qabul qilish uchun tugmani bosing.
        </p>
        """,
        cta_label="Taklifni ko'rish",
        cta_link=invite_link,
    )


def _verification_email_html(full_name: str, verify_link: str) -> str:
    name = escape(full_name)
    return _email_shell(
        title=f"Xush kelibsiz, {full_name}!",
        body_html=f"""
        <p style="margin:0 0 12px;">Salom, <strong style="color:#e2e8f0;">{name}</strong>.</p>
        <p style="margin:0;">
          Galaktikaga kirishni yakunlash uchun email manzilingizni tasdiqlang — bir bosish kifoya.
        </p>
        """,
        cta_label="Emailni tasdiqlash",
        cta_link=verify_link,
    )


def send_verification_email(to_email: str, full_name: str, verify_link: str) -> bool:
    """Sends the email-verification link. Same never-raises contract as
    send_invite_email — registration should succeed even if sending fails."""
    return _send_email(
        to_email,
        "Emailingizni tasdiqlang — BG",
        _verification_email_html(full_name, verify_link),
    )


def _password_reset_email_html(full_name: str, reset_link: str) -> str:
    name = escape(full_name)
    return _email_shell(
        title="Parolni tiklash",
        body_html=f"""
        <p style="margin:0 0 12px;">Salom, <strong style="color:#e2e8f0;">{name}</strong>.</p>
        <p style="margin:0;">
          Parolingizni tiklash so'rovi keldi. Quyidagi tugma orqali yangi parol o'rnating.
          Havola 1 soat amal qiladi. Agar bu siz bo'lmasangiz — xatni e'tiborsiz qoldiring.
        </p>
        """,
        cta_label="Yangi parol o'rnatish",
        cta_link=reset_link,
    )


def send_password_reset_email(to_email: str, full_name: str, reset_link: str) -> bool:
    return _send_email(
        to_email,
        "Parolni tiklash — BG",
        _password_reset_email_html(full_name, reset_link),
    )


def _pin_reset_email_html(full_name: str, reset_link: str) -> str:
    name = escape(full_name)
    return _email_shell(
        title="PIN-kodni tiklash",
        body_html=f"""
        <p style="margin:0 0 12px;">Salom, <strong style="color:#e2e8f0;">{name}</strong>.</p>
        <p style="margin:0;">
          PIN-kodni tiklash so'rovi keldi. Quyidagi tugma orqali yangi PIN o'rnating.
          Havola 1 soat amal qiladi. Agar bu siz bo'lmasangiz — xatni e'tiborsiz qoldiring.
        </p>
        """,
        cta_label="Yangi PIN o'rnatish",
        cta_link=reset_link,
    )


def send_pin_reset_email(to_email: str, full_name: str, reset_link: str) -> bool:
    return _send_email(
        to_email,
        "PIN-kodni tiklash — BG",
        _pin_reset_email_html(full_name, reset_link),
    )


def send_password_changed_email(to_email: str, full_name: str) -> bool:
    name = escape(full_name)
    html = _email_shell(
        title="Parolingiz almashtirildi",
        body_html=f"""
        <p style="margin:0 0 12px;">Salom, <strong style="color:#e2e8f0;">{name}</strong>.</p>
        <p style="margin:0;">
          Parolingiz hozirgina muvaffaqiyatli yangilandi. Agar bu siz bo'lmasangiz,
          darhol hisobingiz xavfsizligini tekshiring.
        </p>
        """,
        footer_note="Bu xabar avtomatik yuboriladi — javob yozish shart emas.",
    )
    return _send_email(to_email, "Parolingiz almashtirildi — BG", html)


def send_invite_email(to_email: str, company_name: str, invite_link: str) -> bool:
    """Sends the branded invite email. Returns True if sent, False if
    nothing is configured or sending failed (never raises — invite creation
    should still succeed and the link is always returned to the caller)."""
    return _send_email(
        to_email,
        f"{company_name} kompaniyasiga taklif — BG",
        _invite_email_html(company_name, invite_link),
    )
