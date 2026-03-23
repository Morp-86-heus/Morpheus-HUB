import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from database import init_db, SessionLocal
from routers import tickets, tecnici, lookup, stats
from routers.clienti_diretti import router as clienti_diretti_router
from routers.auth_router import router as auth_router
from routers.listini import router as listini_router
from routers.magazzino import router as magazzino_router
from routers.organizzazioni import router as organizzazioni_router
from routers.permessi import router as permessi_router
from routers.notifiche import router as notifiche_router
from routers.contabilita import router as contabilita_router
from routers.servizi import router as servizi_router
from routers.contratti_servizi import router as contratti_servizi_router
from routers.opportunita import router as opportunita_router
from routers.email_config import router as email_config_router
from routers.admin_db import router as admin_db_router
from routers.eventi import router as eventi_router
from routers.contabilita_org import router as contabilita_org_router
from routers.vendite_prodotti import router as vendite_prodotti_router
from auth import create_default_admin

app = FastAPI(title="Ticket Management API", version="2.0.0")

ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()] or [
    "http://localhost:3000",
    "http://localhost:13000",
    "http://morpheusrmm.tplinkdns.com:13000",
    "http://morpheusrmm.tplinkdns.com",
    "https://app.morpheushub.cloud",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Organization-Id"],
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

app.add_middleware(SecurityHeadersMiddleware)

app.include_router(auth_router)
app.include_router(organizzazioni_router)
app.include_router(tickets.router)
app.include_router(tecnici.router)
app.include_router(lookup.router)
app.include_router(stats.router)
app.include_router(clienti_diretti_router)
app.include_router(listini_router)
app.include_router(magazzino_router)
app.include_router(permessi_router)
app.include_router(notifiche_router)
app.include_router(contabilita_router)
app.include_router(servizi_router)
app.include_router(contratti_servizi_router)
app.include_router(opportunita_router)
app.include_router(email_config_router)
app.include_router(admin_db_router)
app.include_router(eventi_router)
app.include_router(contabilita_org_router)
app.include_router(vendite_prodotti_router)


def create_default_org(db):
    from models import Organizzazione
    if db.query(Organizzazione).count() == 0:
        org = Organizzazione(nome="Morpheus Hub", attivo=True, licenza_attiva=True)
        db.add(org)
        db.commit()
        print("✓ Organizzazione 'Morpheus Hub' creata")


@app.on_event("startup")
def on_startup():
    init_db()
    db = SessionLocal()
    try:
        create_default_org(db)
        create_default_admin(db)
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok"}
