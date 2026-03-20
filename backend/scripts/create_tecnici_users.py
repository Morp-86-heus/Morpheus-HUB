#!/usr/bin/env python3
"""
Crea un utente con ruolo 'tecnico' per ogni tecnico della lista lookup.
Email placeholder = nome.cognome@tecnici.local (da aggiornare poi)
Password di default = stessa dell'email (da cambiare al primo accesso)

Uso: python scripts/create_tecnici_users.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, SessionLocal
from models import Base, User, RuoloEnum
from auth import hash_password

# Formato: (nome, cognome)  — cognome vuoto se il tecnico ha solo un nome
TECNICI = [
    ("Antonio", "Sp"),
    ("Germano",  ""),
    ("Mauro",    ""),
    ("Riccardo", ""),
    ("I-Tech",   ""),
    ("Cripezzi", ""),
    ("Paolo",    ""),
    ("Pierluigi",""),
    ("Carlo",    ""),
    ("Fabio",    ""),
    ("Stefano",  ""),
    ("Antonio",  "Si"),
    ("Pugliamaint",""),
    ("Nino",     ""),
    ("Francesco",""),
    ("Montagna", ""),
]

def make_email(nome: str, cognome: str) -> str:
    parte = f"{nome}.{cognome}" if cognome else nome
    return parte.lower().replace(" ", ".").replace("-", ".") + "@tecnici.local"

Base.metadata.create_all(bind=engine)
db = SessionLocal()

print("Creazione utenti tecnici...\n")
created = []
skipped = []

try:
    for nome, cognome in TECNICI:
        email = make_email(nome, cognome)
        if db.query(User).filter(User.email == email).first():
            skipped.append(email)
            continue

        user = User(
            email=email,
            nome=nome,
            cognome=cognome,
            telefono=None,
            password_hash=hash_password(email),   # password = email
            ruolo=RuoloEnum.tecnico,
            attivo=True,
        )
        db.add(user)
        created.append((nome, cognome, email))

    db.commit()

    if created:
        print(f"{'NOME':<12} {'COGNOME':<12} {'EMAIL (= PASSWORD)'}")
        print("-" * 60)
        for nome, cognome, email in created:
            print(f"{nome:<12} {cognome:<12} {email}")

    if skipped:
        print(f"\nGià esistenti (saltati): {', '.join(skipped)}")

    print(f"\nCreati: {len(created)}  |  Saltati: {len(skipped)}")
    print("\nNOTA: aggiorna le email reali e i numeri di telefono dalla pagina Utenti.")

finally:
    db.close()
