"""Configurazione email: SMTP e toggle notifiche per evento."""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from database import get_db
from models import EmailSmtpConfig, EmailNotificaEvento
from auth import get_current_user, get_active_org_id, require_admin_or_above, require_proprietario

router = APIRouter(prefix="/api/email-config", tags=["email-config"])

# ── Definizione eventi ─────────────────────────────────────────────────────────

EVENTI_DEFINITI = [
    {
        "key": "ticket_creato",
        "label": "Nuovo ticket creato",
        "desc": "Invia email quando viene aperto un nuovo ticket di assistenza",
        "gruppo": "Ticket",
    },
    {
        "key": "ticket_assegnato",
        "label": "Ticket assegnato a tecnico",
        "desc": "Invia email quando un ticket viene assegnato o riassegnato a un tecnico",
        "gruppo": "Ticket",
    },
    {
        "key": "ticket_chiuso",
        "label": "Ticket chiuso",
        "desc": "Invia email quando un ticket viene portato allo stato Chiuso",
        "gruppo": "Ticket",
    },
    {
        "key": "ticket_annullato",
        "label": "Ticket annullato",
        "desc": "Invia email quando un ticket viene annullato",
        "gruppo": "Ticket",
    },
    {
        "key": "sla_in_scadenza",
        "label": "SLA in scadenza (entro 24h)",
        "desc": "Avviso anticipato per ticket con SLA che scade nelle prossime 24 ore",
        "gruppo": "SLA",
    },
    {
        "key": "sla_scaduta",
        "label": "SLA scaduta",
        "desc": "Notifica immediata quando la scadenza SLA di un ticket viene superata",
        "gruppo": "SLA",
    },
    {
        "key": "abbonamento_in_scadenza",
        "label": "Abbonamento in scadenza",
        "desc": "Avviso quando un contratto/abbonamento sta per scadere (soglia configurabile)",
        "gruppo": "Abbonamenti",
    },
    {
        "key": "abbonamento_scaduto",
        "label": "Abbonamento scaduto",
        "desc": "Notifica quando un contratto/abbonamento risulta scaduto",
        "gruppo": "Abbonamenti",
    },
    {
        "key": "opportunita_vinta",
        "label": "Opportunità vinta",
        "desc": "Notifica quando un'opportunità di vendita viene spostata in fase Vinto",
        "gruppo": "Funnel",
    },
    {
        "key": "opportunita_persa",
        "label": "Opportunità persa",
        "desc": "Notifica quando un'opportunità di vendita viene spostata in fase Perso",
        "gruppo": "Funnel",
    },
]


# ── Schemas ────────────────────────────────────────────────────────────────────

class SmtpConfigIn(BaseModel):
    enabled: bool = False
    host: Optional[str] = None
    port: int = 587
    username: Optional[str] = None
    password: Optional[str] = None
    from_email: Optional[str] = None
    from_name: Optional[str] = None
    use_tls: bool = True
    use_ssl: bool = False


class SmtpConfigOut(BaseModel):
    enabled: bool
    host: Optional[str]
    port: int
    username: Optional[str]
    from_email: Optional[str]
    from_name: Optional[str]
    use_tls: bool
    use_ssl: bool
    has_password: bool   # true se la password è salvata (non la esportiamo mai)
    model_config = ConfigDict(from_attributes=True)


class EventoConfigIn(BaseModel):
    key: str
    abilitato: bool = False
    destinatari: str = ""     # email separate da virgola


class EventoConfigOut(BaseModel):
    key: str
    label: str
    desc: str
    gruppo: str
    abilitato: bool
    destinatari: str


class NotificheConfigOut(BaseModel):
    eventi: List[EventoConfigOut]


class TestEmailIn(BaseModel):
    to_email: str


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_or_create_smtp(org_id: int, db: Session) -> EmailSmtpConfig:
    cfg = db.query(EmailSmtpConfig).filter(
        EmailSmtpConfig.organizzazione_id == org_id
    ).first()
    if not cfg:
        cfg = EmailSmtpConfig(organizzazione_id=org_id, enabled=False, port=587, use_tls=True, use_ssl=False)
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg


def _cfg_to_out(cfg: EmailSmtpConfig) -> SmtpConfigOut:
    return SmtpConfigOut(
        enabled=cfg.enabled or False,
        host=cfg.host,
        port=cfg.port or 587,
        username=cfg.username,
        from_email=cfg.from_email,
        from_name=cfg.from_name,
        use_tls=cfg.use_tls if cfg.use_tls is not None else True,
        use_ssl=cfg.use_ssl or False,
        has_password=bool(cfg.password),
    )


# ── SMTP ───────────────────────────────────────────────────────────────────────

@router.get("/smtp", response_model=SmtpConfigOut)
def get_smtp(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin_or_above),
    org_id: int = Depends(get_active_org_id),
):
    return _cfg_to_out(_get_or_create_smtp(org_id, db))


@router.put("/smtp", response_model=SmtpConfigOut)
def update_smtp(
    data: SmtpConfigIn,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin_or_above),
    org_id: int = Depends(get_active_org_id),
):
    cfg = _get_or_create_smtp(org_id, db)
    cfg.enabled = data.enabled
    cfg.host = data.host or None
    cfg.port = data.port
    cfg.username = data.username or None
    if data.password:
        cfg.password = data.password
    cfg.from_email = data.from_email or None
    cfg.from_name = data.from_name or None
    cfg.use_tls = data.use_tls
    cfg.use_ssl = data.use_ssl
    db.commit()
    db.refresh(cfg)
    return _cfg_to_out(cfg)


# ── Notifiche eventi ───────────────────────────────────────────────────────────

@router.get("/notifiche", response_model=NotificheConfigOut)
def get_notifiche(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin_or_above),
    org_id: int = Depends(get_active_org_id),
):
    db_map = {
        r.evento: r
        for r in db.query(EmailNotificaEvento).filter(
            EmailNotificaEvento.organizzazione_id == org_id
        ).all()
    }
    eventi = []
    for ev in EVENTI_DEFINITI:
        row = db_map.get(ev["key"])
        eventi.append(EventoConfigOut(
            key=ev["key"],
            label=ev["label"],
            desc=ev["desc"],
            gruppo=ev["gruppo"],
            abilitato=row.abilitato if row else False,
            destinatari=row.destinatari or "" if row else "",
        ))
    return {"eventi": eventi}


@router.put("/notifiche")
def update_notifiche(
    data: List[EventoConfigIn],
    db: Session = Depends(get_db),
    current_user=Depends(require_admin_or_above),
    org_id: int = Depends(get_active_org_id),
):
    for ev_data in data:
        existing = db.query(EmailNotificaEvento).filter(
            EmailNotificaEvento.organizzazione_id == org_id,
            EmailNotificaEvento.evento == ev_data.key,
        ).first()
        if existing:
            existing.abilitato = ev_data.abilitato
            existing.destinatari = ev_data.destinatari or None
        else:
            db.add(EmailNotificaEvento(
                organizzazione_id=org_id,
                evento=ev_data.key,
                abilitato=ev_data.abilitato,
                destinatari=ev_data.destinatari or None,
            ))
    db.commit()
    return {"ok": True}


# ── Test email ─────────────────────────────────────────────────────────────────

@router.post("/test")
def send_test_email(
    data: TestEmailIn,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin_or_above),
    org_id: int = Depends(get_active_org_id),
):
    cfg = _get_or_create_smtp(org_id, db)
    if not cfg.host or not cfg.from_email:
        raise HTTPException(400, "Configurazione SMTP incompleta: imposta almeno host e indirizzo mittente.")
    if not cfg.enabled:
        raise HTTPException(400, "Le notifiche email non sono abilitate. Attiva il toggle prima di testare.")

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Test email — Morpheus HUB"
        msg["From"] = f"{cfg.from_name or 'Morpheus HUB'} <{cfg.from_email}>"
        msg["To"] = data.to_email

        html = f"""
        <html>
        <body style="font-family:system-ui,sans-serif;color:#1e293b;background:#f8fafc;margin:0;padding:0">
          <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;
                      border:1px solid #e2e8f0;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,.06)">
            <div style="width:48px;height:48px;background:#2563eb;border-radius:12px;
                        display:flex;align-items:center;justify-content:center;margin-bottom:20px">
              <span style="color:#fff;font-size:24px;line-height:1">✓</span>
            </div>
            <h2 style="margin:0 0 8px;font-size:20px;font-weight:700">Email di test riuscita</h2>
            <p style="margin:0 0 20px;color:#64748b;font-size:14px">
              La configurazione SMTP di <strong>Morpheus HUB</strong> è funzionante.
            </p>
            <div style="background:#f1f5f9;border-radius:8px;padding:16px;font-size:13px;color:#475569">
              <div><strong>Server:</strong> {cfg.host}:{cfg.port}</div>
              <div style="margin-top:4px"><strong>Mittente:</strong> {cfg.from_email}</div>
              <div style="margin-top:4px"><strong>TLS:</strong> {'Sì' if cfg.use_tls else 'No'} &nbsp;
                <strong>SSL:</strong> {'Sì' if cfg.use_ssl else 'No'}</div>
            </div>
            <p style="margin:24px 0 0;font-size:11px;color:#94a3b8;text-align:center">
              Morpheus HUB · Sistema Notifiche
            </p>
          </div>
        </body>
        </html>
        """
        msg.attach(MIMEText(html, "html"))

        if cfg.use_ssl:
            smtp = smtplib.SMTP_SSL(cfg.host, cfg.port, timeout=10)
        else:
            smtp = smtplib.SMTP(cfg.host, cfg.port, timeout=10)
            if cfg.use_tls:
                smtp.ehlo()
                smtp.starttls()
                smtp.ehlo()

        if cfg.username and cfg.password:
            smtp.login(cfg.username, cfg.password)

        smtp.sendmail(cfg.from_email, data.to_email, msg.as_string())
        smtp.quit()

        return {"ok": True, "message": f"Email inviata correttamente a {data.to_email}"}

    except smtplib.SMTPAuthenticationError:
        raise HTTPException(400, "Autenticazione SMTP fallita: verifica username e password.")
    except (smtplib.SMTPConnectError, ConnectionRefusedError, OSError):
        raise HTTPException(400, f"Impossibile connettersi a {cfg.host}:{cfg.port}. Verifica host e porta.")
    except Exception as e:
        raise HTTPException(500, f"Errore SMTP: {str(e)}")


# ── Helper riusabile per invio email ───────────────────────────────────────────

def send_email(to_email: str, subject: str, html: str, cfg: EmailSmtpConfig) -> None:
    """Invia un'email usando la configurazione SMTP fornita. Solleva eccezioni in caso di errore."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{cfg.from_name or 'Morpheus HUB'} <{cfg.from_email}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    if cfg.use_ssl:
        smtp = smtplib.SMTP_SSL(cfg.host, cfg.port, timeout=10)
    else:
        smtp = smtplib.SMTP(cfg.host, cfg.port, timeout=10)
        if cfg.use_tls:
            smtp.ehlo()
            smtp.starttls()
            smtp.ehlo()

    if cfg.username and cfg.password:
        smtp.login(cfg.username, cfg.password)

    smtp.sendmail(cfg.from_email, to_email, msg.as_string())
    smtp.quit()


def get_system_smtp(db: Session) -> Optional[EmailSmtpConfig]:
    """Restituisce la configurazione SMTP di sistema (organizzazione_id IS NULL)."""
    return db.query(EmailSmtpConfig).filter(EmailSmtpConfig.organizzazione_id == None).first()  # noqa: E711


# ── Endpoint SMTP di sistema (proprietario) ────────────────────────────────────

@router.get("/system/smtp", response_model=SmtpConfigOut)
def get_system_smtp_endpoint(
    db: Session = Depends(get_db),
    _current_user=Depends(require_proprietario),
):
    cfg = get_system_smtp(db)
    if not cfg:
        cfg = EmailSmtpConfig(organizzazione_id=None, enabled=False, port=587, use_tls=True, use_ssl=False)
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return _cfg_to_out(cfg)


@router.put("/system/smtp", response_model=SmtpConfigOut)
def update_system_smtp_endpoint(
    data: SmtpConfigIn,
    db: Session = Depends(get_db),
    _current_user=Depends(require_proprietario),
):
    cfg = get_system_smtp(db)
    if not cfg:
        cfg = EmailSmtpConfig(organizzazione_id=None)
        db.add(cfg)

    cfg.enabled = data.enabled
    cfg.host = data.host or None
    cfg.port = data.port
    cfg.username = data.username or None
    if data.password:
        cfg.password = data.password
    cfg.from_email = data.from_email or None
    cfg.from_name = data.from_name or None
    cfg.use_tls = data.use_tls
    cfg.use_ssl = data.use_ssl
    db.commit()
    db.refresh(cfg)
    return _cfg_to_out(cfg)


@router.post("/system/test")
def test_system_smtp_endpoint(
    data: TestEmailIn,
    db: Session = Depends(get_db),
    _current_user=Depends(require_proprietario),
):
    cfg = get_system_smtp(db)
    if not cfg or not cfg.host or not cfg.from_email:
        raise HTTPException(400, "Configurazione SMTP di sistema incompleta: imposta almeno host e indirizzo mittente.")
    if not cfg.enabled:
        raise HTTPException(400, "Le notifiche email non sono abilitate. Attiva il toggle prima di testare.")

    html = f"""
    <html>
    <body style="font-family:system-ui,sans-serif;color:#1e293b;background:#f8fafc;margin:0;padding:0">
      <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;
                  border:1px solid #e2e8f0;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,.06)">
        <div style="width:48px;height:48px;background:#2563eb;border-radius:12px;
                    display:flex;align-items:center;justify-content:center;margin-bottom:20px">
          <span style="color:#fff;font-size:24px;line-height:1">✓</span>
        </div>
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:700">Email di test riuscita</h2>
        <p style="margin:0 0 20px;color:#64748b;font-size:14px">
          La configurazione SMTP di sistema di <strong>Morpheus HUB</strong> è funzionante.
        </p>
        <div style="background:#f1f5f9;border-radius:8px;padding:16px;font-size:13px;color:#475569">
          <div><strong>Server:</strong> {cfg.host}:{cfg.port}</div>
          <div style="margin-top:4px"><strong>Mittente:</strong> {cfg.from_email}</div>
        </div>
        <p style="margin:24px 0 0;font-size:11px;color:#94a3b8;text-align:center">
          Morpheus HUB · SMTP di Sistema
        </p>
      </div>
    </body>
    </html>
    """
    try:
        send_email(data.to_email, "Test email di sistema — Morpheus HUB", html, cfg)
        return {"ok": True, "message": f"Email inviata correttamente a {data.to_email}"}
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(400, "Autenticazione SMTP fallita: verifica username e password.")
    except (smtplib.SMTPConnectError, ConnectionRefusedError, OSError):
        raise HTTPException(400, f"Impossibile connettersi a {cfg.host}:{cfg.port}. Verifica host e porta.")
    except Exception as e:
        raise HTTPException(500, f"Errore SMTP: {str(e)}")
