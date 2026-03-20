"""Imposta organizzazione_id = 1 su tutti i record che ce l'hanno NULL."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import sqlalchemy as sa

db = SessionLocal()
try:
    tables = ['tickets', 'lookup_commitenti', 'lookup_clienti',
              'articoli', 'listini', 'clienti_diretti']
    for t in tables:
        r = db.execute(sa.text(f'UPDATE {t} SET organizzazione_id = 1 WHERE organizzazione_id IS NULL'))
        print(f'{t}: {r.rowcount} righe aggiornate')
    db.commit()
    print('OK - tutti i record aggiornati')
finally:
    db.close()
