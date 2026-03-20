#!/usr/bin/env python3
"""
Crea o resetta l'utente admin.
Uso: python scripts/reset_admin.py [email] [password]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, SessionLocal
from models import Base, User, RuoloEnum
from auth import hash_password

Base.metadata.create_all(bind=engine)

email    = sys.argv[1] if len(sys.argv) > 1 else "admin@admin.local"
password = sys.argv[2] if len(sys.argv) > 2 else "admin123"

db = SessionLocal()
try:
    user = db.query(User).filter(User.email == email).first()
    if user:
        user.password_hash = hash_password(password)
        user.ruolo = RuoloEnum.proprietario
        user.attivo = True
        db.commit()
        print(f"✓ Password aggiornata per '{email}'")
    else:
        user = User(
            email=email,
            nome="Admin",
            cognome="",
            password_hash=hash_password(password),
            ruolo=RuoloEnum.proprietario,
            attivo=True,
        )
        db.add(user)
        db.commit()
        print(f"✓ Utente creato: {email}")

    print(f"  Email:    {email}")
    print(f"  Password: {password}")
finally:
    db.close()
