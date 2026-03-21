import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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
from auth import create_default_admin

app = FastAPI(title="Ticket Management API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:13000",
        "http://morpheusrmm.tplinkdns.com:13000",
        "http://morpheusrmm.tplinkdns.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# Serve file statici (immagini chiusure ticket)
os.makedirs("/app/uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="/app/uploads"), name="uploads")


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
