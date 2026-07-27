import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

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


def _invite_email_html(company_name: str, invite_link: str) -> str:
    return f"""
    <div style="font-family: 'Poppins', Arial, sans-serif; background:#0a0e17; padding:32px;">
      <div style="max-width:480px;margin:0 auto;background:#111827;border-radius:14px;
                  padding:32px;border:1px solid rgba(255,255,255,0.08);">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
          <div style="width:32px;height:32px;border-radius:9px;
                      background:linear-gradient(135deg,#2563eb,#7c3aed);
                      display:inline-block;text-align:center;line-height:32px;
                      color:white;font-weight:700;">B</div>
          <span style="color:#f1f5f9;font-size:18px;font-weight:600;">BGalaxy</span>
        </div>
        <h2 style="color:#f1f5f9;font-size:20px;margin:0 0 12px;">
          Sizni {company_name} kompaniyasiga taklif qilishdi
        </h2>
        <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px;">
          BGalaxy — jamoangiz bilan yagona virtual makonda ishlash uchun platforma.
          Taklifni qabul qilish uchun quyidagi tugmani bosing.
        </p>
        <a href="{invite_link}"
           style="display:inline-block;background:linear-gradient(135deg,#2563eb,#7c3aed);
                  color:white;text-decoration:none;padding:12px 24px;border-radius:10px;
                  font-weight:600;font-size:14px;">
          Taklifni ko'rish
        </a>
        <p style="color:#5b6478;font-size:12px;margin-top:28px;">
          Agar tugma ishlamasa, quyidagi havolani brauzeringizga nusxalang:<br/>
          <span style="color:#94a3b8;">{invite_link}</span>
        </p>
      </div>
    </div>
    """


def _verification_email_html(full_name: str, verify_link: str) -> str:
    return f"""
    <div style="font-family: 'Poppins', Arial, sans-serif; background:#0a0e17; padding:32px;">
      <div style="max-width:480px;margin:0 auto;background:#111827;border-radius:14px;
                  padding:32px;border:1px solid rgba(255,255,255,0.08);">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
          <div style="width:32px;height:32px;border-radius:9px;
                      background:linear-gradient(135deg,#2563eb,#7c3aed);
                      display:inline-block;text-align:center;line-height:32px;
                      color:white;font-weight:700;">B</div>
          <span style="color:#f1f5f9;font-size:18px;font-weight:600;">BGalaxy</span>
        </div>
        <h2 style="color:#f1f5f9;font-size:20px;margin:0 0 12px;">
          Xush kelibsiz, {full_name}!
        </h2>
        <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px;">
          Ro'yxatdan o'tishni yakunlash uchun email manzilingizni tasdiqlang.
        </p>
        <a href="{verify_link}"
           style="display:inline-block;background:linear-gradient(135deg,#2563eb,#7c3aed);
                  color:white;text-decoration:none;padding:12px 24px;border-radius:10px;
                  font-weight:600;font-size:14px;">
          Emailni tasdiqlash
        </a>
        <p style="color:#5b6478;font-size:12px;margin-top:28px;">
          Agar tugma ishlamasa, quyidagi havolani brauzeringizga nusxalang:<br/>
          <span style="color:#94a3b8;">{verify_link}</span>
        </p>
      </div>
    </div>
    """


def send_verification_email(to_email: str, full_name: str, verify_link: str) -> bool:
    """Sends the email-verification link. Same never-raises contract as
    send_invite_email — registration should succeed even if sending fails."""
    return _send_email(
        to_email,
        "Emailingizni tasdiqlang — BGalaxy",
        _verification_email_html(full_name, verify_link),
    )


def _password_reset_email_html(full_name: str, reset_link: str) -> str:
    return f"""
    <div style="font-family: 'Poppins', Arial, sans-serif; background:#0a0e17; padding:32px;">
      <div style="max-width:480px;margin:0 auto;background:#111827;border-radius:14px;
                  padding:32px;border:1px solid rgba(255,255,255,0.08);">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
          <div style="width:32px;height:32px;border-radius:9px;
                      background:linear-gradient(135deg,#2563eb,#7c3aed);
                      display:inline-block;text-align:center;line-height:32px;
                      color:white;font-weight:700;">B</div>
          <span style="color:#f1f5f9;font-size:18px;font-weight:600;">BGalaxy</span>
        </div>
        <h2 style="color:#f1f5f9;font-size:20px;margin:0 0 12px;">
          Salom, {full_name}
        </h2>
        <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px;">
          Parolingizni tiklash uchun so'rov yubordingiz. Quyidagi tugmani bosib yangi parol o'rnating.
          Havola 1 soat davomida amal qiladi. Agar bu siz bo'lmasangiz, bu xatni e'tiborsiz qoldiring.
        </p>
        <a href="{reset_link}"
           style="display:inline-block;background:linear-gradient(135deg,#2563eb,#7c3aed);
                  color:white;text-decoration:none;padding:12px 24px;border-radius:10px;
                  font-weight:600;font-size:14px;">
          Yangi parol o'rnatish
        </a>
        <p style="color:#5b6478;font-size:12px;margin-top:28px;">
          Agar tugma ishlamasa, quyidagi havolani brauzeringizga nusxalang:<br/>
          <span style="color:#94a3b8;">{reset_link}</span>
        </p>
      </div>
    </div>
    """


def send_password_reset_email(to_email: str, full_name: str, reset_link: str) -> bool:
    return _send_email(
        to_email,
        "Parolni tiklash — BGalaxy",
        _password_reset_email_html(full_name, reset_link),
    )


def _pin_reset_email_html(full_name: str, reset_link: str) -> str:
    return f"""
    <div style="font-family: 'Poppins', Arial, sans-serif; background:#0a0e17; padding:32px;">
      <div style="max-width:480px;margin:0 auto;background:#111827;border-radius:14px;
                  padding:32px;border:1px solid rgba(255,255,255,0.08);">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
          <div style="width:32px;height:32px;border-radius:9px;
                      background:linear-gradient(135deg,#2563eb,#22d3ee);
                      display:inline-block;text-align:center;line-height:32px;
                      color:white;font-weight:700;">B</div>
          <span style="color:#f1f5f9;font-size:18px;font-weight:600;">BGalaxy</span>
        </div>
        <h2 style="color:#f1f5f9;font-size:20px;margin:0 0 12px;">
          Salom, {full_name}
        </h2>
        <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px;">
          PIN-kodni tiklash uchun so'rov yubordingiz. Quyidagi tugmani bosib yangi PIN o'rnating.
          Havola 1 soat davomida amal qiladi. Agar bu siz bo'lmasangiz, bu xatni e'tiborsiz qoldiring.
        </p>
        <a href="{reset_link}"
           style="display:inline-block;background:linear-gradient(135deg,#0ea5e9,#22d3ee);
                  color:#0f172a;text-decoration:none;padding:12px 24px;border-radius:10px;
                  font-weight:600;font-size:14px;">
          Yangi PIN o'rnatish
        </a>
        <p style="color:#5b6478;font-size:12px;margin-top:28px;">
          Agar tugma ishlamasa, quyidagi havolani brauzeringizga nusxalang:<br/>
          <span style="color:#94a3b8;">{reset_link}</span>
        </p>
      </div>
    </div>
    """


def send_pin_reset_email(to_email: str, full_name: str, reset_link: str) -> bool:
    return _send_email(
        to_email,
        "PIN-kodni tiklash — BGalaxy",
        _pin_reset_email_html(full_name, reset_link),
    )


def send_password_changed_email(to_email: str, full_name: str) -> bool:
    html = f"""
    <div style="font-family: 'Poppins', Arial, sans-serif; background:#0a0e17; padding:32px;">
      <div style="max-width:480px;margin:0 auto;background:#111827;border-radius:14px;
                  padding:32px;border:1px solid rgba(255,255,255,0.08);">
        <h2 style="color:#f1f5f9;font-size:18px;margin:0 0 12px;">Salom, {full_name}</h2>
        <p style="color:#94a3b8;font-size:14px;line-height:1.6;">
          Parolingiz hozirgina muvaffaqiyatli almashtirildi. Agar bu siz bo'lmasangiz,
          darhol hisobingiz xavfsizligini tekshiring.
        </p>
      </div>
    </div>
    """
    return _send_email(to_email, "Parolingiz almashtirildi — BGalaxy", html)


def send_invite_email(to_email: str, company_name: str, invite_link: str) -> bool:
    """Sends the branded invite email. Returns True if sent, False if
    nothing is configured or sending failed (never raises — invite creation
    should still succeed and the link is always returned to the caller)."""
    return _send_email(
        to_email,
        f"{company_name} kompaniyasiga taklif — BGalaxy",
        _invite_email_html(company_name, invite_link),
    )
