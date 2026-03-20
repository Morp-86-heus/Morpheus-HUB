#!/usr/bin/env python3
"""
Script di importazione dati da Interventi_Tecnici.xlsm al database PostgreSQL.
Eseguire con: python scripts/import_excel.py
"""
import os
import sys
import pandas as pd
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine
from models import Base, Ticket, LookupCommitente, LookupCliente, LookupTecnico

try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False

EXCEL_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "Interventi_Tecnici.xlsm")

# Foglio ticket: prova prima 'Attivita', poi 'Foglio1' come fallback
SHEET_TICKETS_CANDIDATES = ["Attivita", "Foglio1", "Sheet1"]
# Foglio lookup: prova 'DB', poi 'Foglio2'
SHEET_DB_CANDIDATES = ["DB", "Foglio2", "Sheet2"]

COMMITENTI = [
    "BPP", "FaTi", "Intranet", "MaintSystem", "Pugliamaint", "SaciGroup",
    "IROS", "EnterpriseElectric", "ITech", "Erdtech", "PCM", "Infoservizi",
    "NuoviOrizzonti", "NBDServiceSolution",
]

TECNICI = [
    "Antonio Sp", "Germano", "Mauro", "Riccardo", "I-Tech", "Cripezzi",
    "Paolo", "Pierluigi", "Carlo", "Fabio", "Stefano", "Antonio Si",
    "Pugliamaint", "Nino", "Francesco", "Montagna",
]

CLIENTI_PER_COMMITENTE = {
    "BPP": [],
    "FaTi": ["SOGEI", "VARGroup", "Generali"],
    "Intranet": ["Global Starnet", "Romagna Giochi", "4Infinity"],
    "MaintSystem": [
        "Brother", "Konica", "Lexmark", "Toshiba", "GBR Rossetto",
        "Massinelli", "Moro Informatica", "Copying", "Land", "Brevi",
        "Prink", "Sapi", "Pace", "MPF", "Proced", "InRete", "Kratos",
        "FastRent", "Xerox", "Altinia", "ComputerGross", "Myo",
        "Giustacchini", "Npo Sistemi",
    ],
    "Pugliamaint": ["Coop", "Iliad", "Intesa", "Canon", "BPM"],
    "SaciGroup": [
        "BDF", "Fastweb", "Goldbet", "HBG", "Lottomatica",
        "Westpole", "Novomatic", "Orange", "MaticMind", "Cegeka",
        "Fenice", "Asus", "Banca Sella", "SMI",
    ],
    "IROS": ["Pia Fondazione"],
    "EnterpriseElectric": ["CSC"],
    "ITech": ["Enterprise"],
    "Erdtech": ["RFI"],
    "PCM": ["Infordata", "Italware", "Solari", "Nolecom", "Ingram_Micro", "Bassilichi", "MPS", "GEKO"],
    "Infoservizi": [],
    "NuoviOrizzonti": ["DieboldNixdorf"],
    "NBDServiceSolution": ["NCR"],
}

STATI_VALIDI = ["In gestione", "Attesa parti", "Sospesa", "Chiusa", "Annullata"]


def clean_nr_int(val):
    if pd.isna(val):
        return None
    if isinstance(val, float):
        return str(int(val))
    return str(val).strip() or None


def clean_registrata(val):
    if pd.isna(val):
        return False
    return str(val).strip().upper() in ("SI", "S", "1", "TRUE", "YES")


def clean_date(val):
    if val is None:
        return None
    try:
        if pd.isna(val):
            return None
    except (TypeError, ValueError):
        pass
    return val


def clean_stato(val):
    if pd.isna(val):
        return "In gestione"
    s = str(val).strip()
    for stato in STATI_VALIDI:
        if s.lower() == stato.lower():
            return stato
    return s


def clean_str(val, maxlen=None):
    if pd.isna(val):
        return None
    s = str(val).strip()
    if maxlen:
        s = s[:maxlen]
    return s or None


def find_sheet(xl, candidates):
    sheets = xl.sheet_names
    for name in candidates:
        if name in sheets:
            return name
    return sheets[0]


def seed_lookups(db):
    print("Seeding lookup tables...")
    for nome in COMMITENTI:
        if not db.query(LookupCommitente).filter_by(nome=nome).first():
            db.add(LookupCommitente(nome=nome))
    for tecnico in TECNICI:
        if not db.query(LookupTecnico).filter_by(nome=tecnico).first():
            db.add(LookupTecnico(nome=tecnico))
    for commitente, clienti in CLIENTI_PER_COMMITENTE.items():
        for cliente in clienti:
            if not db.query(LookupCliente).filter_by(nome=cliente).first():
                db.add(LookupCliente(nome=cliente, commitente=commitente))
    db.commit()
    print("Lookup tables seeded.")


def import_tickets(db):
    if not os.path.exists(EXCEL_PATH):
        print(f"ERRORE: File Excel non trovato in {EXCEL_PATH}")
        return

    print(f"Lettura file Excel: {EXCEL_PATH}")
    xl = pd.ExcelFile(EXCEL_PATH, engine="openpyxl")
    print(f"Fogli disponibili: {xl.sheet_names}")

    sheet_name = find_sheet(xl, SHEET_TICKETS_CANDIDATES)
    print(f"Uso foglio: '{sheet_name}'")

    df = xl.parse(sheet_name)
    df.columns = [str(c).strip() for c in df.columns]
    print(f"Righe: {len(df)} — Colonne: {list(df.columns)}")

    # Mappa flessibile colonne → campo DB
    # Supporta sia vecchia (NR INT, REGISTRATA) che nuova struttura (NR INT 1, REGi)
    col_map = {
        "COMMITENTE":       ("commitente",      "str100"),
        "CLIENTE":          ("cliente",         "str100"),
        "NR INT 1":         ("nr_intervento",   "nrint"),
        "NR INT":           ("nr_intervento",   "nrint"),   # vecchio formato
        "NR INT 2":         ("nr_int_2",        "nrint"),   # secondario
        "UTENTE":           ("utente",          "str200"),
        "CITTA'":           ("citta",           "str200"),
        "CITTA":            ("citta",           "str200"),
        "SLA":              ("sla_scadenza",    "date"),
        "LDV":              ("ldv",             "text"),
        "STATO":            ("stato",           "stato"),
        "NOTE":             ("note",            "text"),
        "DATA GESTIONE":    ("data_gestione",   "date"),
        "TECNICO":          ("tecnico",         "str100"),
        "REGISTRATA":       ("registrata",      "bool"),
        "REGi":             ("registrata",      "bool"),
        "DISPOSITIVO":      ("dispositivo",     "str200"),
        "NOTE INTERVENTO":  ("note_intervento", "text"),
        "IMPORTO":          ("importo",         "str50"),
    }

    # Costruisci mappa effettiva solo con colonne presenti nel file
    active_map = {}
    for col in df.columns:
        if col in col_map:
            db_field, tipo = col_map[col]
            # Non sovrascrivere nr_intervento se già mappato (NR INT 1 ha priorità)
            if db_field not in active_map:
                active_map[col] = (db_field, tipo)

    print(f"Colonne mappate: {list(active_map.keys())}")

    imported = 0
    skipped = 0
    errors = 0

    iterable = tqdm(df.iterrows(), total=len(df)) if HAS_TQDM else df.iterrows()

    for idx, row in iterable:
        try:
            data = {}
            for col, (db_field, tipo) in active_map.items():
                if col not in row.index:
                    continue
                val = row[col]
                if tipo == "nrint":
                    data[db_field] = clean_nr_int(val)
                elif tipo == "bool":
                    data[db_field] = clean_registrata(val)
                elif tipo == "date":
                    data[db_field] = clean_date(val)
                elif tipo == "stato":
                    data[db_field] = clean_stato(val)
                elif tipo == "text":
                    data[db_field] = clean_str(val)
                elif tipo == "str100":
                    data[db_field] = clean_str(val, 100)
                elif tipo == "str200":
                    data[db_field] = clean_str(val, 200)
                elif tipo == "str50":
                    data[db_field] = clean_str(val, 50)

            # NR INT 2: se presente e NR INT 1 è vuoto, usalo come nr_intervento
            if "nr_int_2" in data:
                if not data.get("nr_intervento") and data["nr_int_2"]:
                    data["nr_intervento"] = data["nr_int_2"]
                del data["nr_int_2"]

            # Salta righe senza commitente (righe vuote)
            if not data.get("commitente"):
                continue

            # Idempotenza
            if data.get("nr_intervento") and data.get("commitente"):
                existing = db.query(Ticket).filter_by(
                    nr_intervento=data.get("nr_intervento"),
                    commitente=data.get("commitente"),
                    data_gestione=data.get("data_gestione"),
                ).first()
                if existing:
                    skipped += 1
                    continue

            db.add(Ticket(**data))
            imported += 1

            if imported % 500 == 0:
                db.commit()
                print(f"  Importati {imported}...")

        except Exception as e:
            errors += 1
            if errors <= 5:
                print(f"  Errore riga {idx}: {e}")
            db.rollback()

    db.commit()
    print(f"\nImportazione completata:")
    print(f"  Importati:  {imported}")
    print(f"  Saltati:    {skipped}")
    print(f"  Errori:     {errors}")


def main():
    print("=== Import Interventi Tecnici ===")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_lookups(db)
        import_tickets(db)
    finally:
        db.close()
    print("Done!")


if __name__ == "__main__":
    main()
