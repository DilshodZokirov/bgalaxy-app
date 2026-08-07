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
    if not settings.email_enabled:
        logger.info("EMAIL_ENABLED=false — skipping email to %s (%s)", to_email, subject)
        return False

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


def _asset_url(path: str) -> str:
    base = settings.frontend_url.rstrip("/")
    return f"{base}/{path.lstrip('/')}"


def _email_shell(
    *,
    title: str,
    body_html: str,
    cta_label: str | None = None,
    cta_link: str | None = None,
    footer_note: str | None = None,
) -> str:
    """Shared BG galaxy HTML wrapper — new logo mark + small Ziyo avatar."""
    safe_title = escape(title)
    home = escape(settings.frontend_url.rstrip("/"), quote=True)
    logo_src = escape(_asset_url("bg-logo-mark.png"), quote=True)
    ziyo_src = escape(_asset_url("ziyo-avatar-email.jpg"), quote=True)

    cta_block = ""
    if cta_label and cta_link:
        safe_label = escape(cta_label)
        safe_link = escape(cta_link, quote=True)
        cta_block = f"""
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">
          <tr>
            <td style="border-radius:12px;background:linear-gradient(135deg,#06b6d4,#2563eb 55%,#0ea5e9);">
              <a href="{safe_link}"
                 style="display:inline-block;color:#ffffff;text-decoration:none;padding:14px 26px;
                        font-weight:700;font-size:14px;letter-spacing:0.01em;">
                {safe_label}
              </a>
            </td>
          </tr>
        </table>
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

    return f"""
<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>{safe_title}</title>
</head>
<body style="margin:0;padding:0;background:#030712;">
  <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#030712;padding:40px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;margin:0 auto;">
      <tr>
        <td style="padding:0 0 20px;">
          <a href="{home}" style="text-decoration:none;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align:middle;padding-right:12px;">
                  <img src="{logo_src}" width="44" height="44" alt="BG"
                       style="display:block;border:0;border-radius:12px;" />
                </td>
                <td style="vertical-align:middle;">
                  <div style="color:#f8fafc;font-size:22px;font-weight:800;letter-spacing:-0.03em;line-height:1.1;">BG</div>
                  <div style="color:#67e8f9;font-size:11px;font-weight:600;letter-spacing:0.03em;margin-top:2px;">
                    One Galaxy. Endless Business.
                  </div>
                </td>
              </tr>
            </table>
          </a>
        </td>
      </tr>
      <tr>
        <td style="background:linear-gradient(165deg,#0b1224,#07101f);
                   border:1px solid rgba(34,211,238,0.28);border-radius:20px;padding:28px 26px;
                   box-shadow:0 24px 60px rgba(0,0,0,0.45);">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px;">
            <tr>
              <td style="vertical-align:middle;width:56px;">
                <img src="{ziyo_src}" width="52" height="52" alt="AI Ziyo"
                     style="display:block;border:0;border-radius:50%;
                            border:2px solid rgba(34,211,238,0.45);" />
              </td>
              <td style="vertical-align:middle;padding-left:12px;">
                <div style="color:#f8fafc;font-size:15px;font-weight:700;">AI Ziyo</div>
                <div style="color:#34d399;font-size:12px;font-weight:600;margin-top:2px;">● Onlayn</div>
              </td>
            </tr>
          </table>

          <div style="height:3px;width:72px;border-radius:999px;
                      background:linear-gradient(90deg,#22d3ee,#2563eb);margin:0 0 18px;"></div>

          <h2 style="color:#f8fafc;font-size:22px;font-weight:800;letter-spacing:-0.02em;margin:0 0 12px;">
            {safe_title}
          </h2>
          <div style="color:#94a3b8;font-size:14px;line-height:1.65;">
            {body_html}
          </div>
          <div style="margin-top:24px;">
            {cta_block}
            {note_block}
          </div>
        </td>
      </tr>
      <tr>
        <td style="color:#475569;font-size:11px;text-align:center;padding:22px 8px 0;line-height:1.5;">
          BG (Business Galaxy) · Virtual ofis · AI Ziyo · Hamkorlik
        </td>
      </tr>
    </table>
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
