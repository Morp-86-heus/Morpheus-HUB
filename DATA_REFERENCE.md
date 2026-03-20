# Dati di riferimento — Estratti dal file Excel

## Statistiche dataset

- **Totale ticket**: 4.640
- **Periodo**: Aprile 2024 – Luglio 2025
- **Ticket con SLA potenzialmente violata**: 605

---

## Valori STATO (enum esatto)

```python
STATI = ["In gestione", "Attesa parti", "Sospesa", "Chiusa", "Annullata"]
```

Distribuzione attuale:
- Chiusa: 4.467
- Annullata: 101
- In gestione: 38
- Attesa parti: 21
- Sospesa: 13

---

## Lookup COMMITENTI

```python
COMMITENTI = [
    "BPP",
    "FaTi",
    "Intranet",
    "MaintSystem",
    "Pugliamaint",
    "SaciGroup",
    "IROS",
    "EnterpriseElectric",
    "ITech",
    "Erdtech",
    "PCM",
    "Infoservizi",
    "NuoviOrizzonti",
    "NBDServiceSolution",
]
```

---

## Lookup TECNICI

```python
TECNICI = [
    "Antonio Sp",
    "Pierluigi",
    "Carlo",
    "Riccardo",
    "Fabio",
    "Germano",
    "Paolo",
    "Cripezzi",
    "Mauro",
    "Stefano",
    "I-Tech",
    "Antonio Si",
    "Pugliamaint",
    "Nino",
    "Francesco",
    "Montagna",
]
```

---

## Lookup CLIENTI per COMMITENTE

```python
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
    "PCM": [
        "Infordata", "Italware", "Solari", "Nolecom", "Ingram_Micro",
        "Bassilichi", "MPS", "GEKO",
    ],
    "Infoservizi": [],
    "NuoviOrizzonti": ["DieboldNixdorf"],
    "NBDServiceSolution": ["NCR"],
}
```

---

## Campioni di NR INT (campo misto)

Il campo `NR INT` può contenere:

```
7000266205          ← numero intero (Lottomatica)
INC016853355        ← stringa alfanumerica (Intesa)
WRK2024/49075/1     ← con slash (BDF)
Attesa WO           ← testo libero
24/01626-2          ← con trattino
TT647793            ← con prefisso TT
BR01371             ← con prefisso BR
```

→ **Salvare sempre come VARCHAR(100), mai come INTEGER**

---

## Campioni campo LDV

Il campo LDV contiene note operative miste:

```
"IN CONSEGNA 16/04 https://www.gls-italy.com/tracktraceuser/M1/642646530"
"CONSEGNA OK 19/04 CONCORDATO CON UTENTE PER IL 22/04"
"Sosp In attesa NB. Contattato l'utente in data..."
"URGENTE ORARI 8-17:30"
"Roller Pick up già in filiale"
```

→ **TEXT**, può contenere URL GLS e note operative

---

## Top CITTÀ (riferimento geografico)

```
Bari, Lecce, Bitonto, Martina Franca, Brindisi, Monopoli,
Lecce Piazza Mazzini, Taranto Via Calamandrei, Modugno, Massafra,
Maglie, Fasano, Molfetta, San Giorgio Jonico, Gioia del Colle,
Galatina, Cavallino Zona PIP, Acquaviva delle Fonti, Altamura...
```

Area geografica prevalente: **Puglia e Basilicata**

---

## Script import — Logica conversione

```python
# NR INT: converti da float a str se numerico
def clean_nr_int(val):
    if pd.isna(val):
        return None
    if isinstance(val, float):
        return str(int(val))
    return str(val).strip()

# REGISTRATA: "SI" → True, tutto il resto → False
def clean_registrata(val):
    return str(val).strip().upper() == "SI" if pd.notna(val) else False

# DATE: gestisci NaT
def clean_date(val):
    if pd.isna(val) or val is pd.NaT:
        return None
    return val

# STATO: normalizza maiuscole/minuscole
STATI_VALIDI = {"in gestione", "attesa parti", "sospesa", "chiusa", "annullata"}
def clean_stato(val):
    if pd.isna(val):
        return "In gestione"
    s = str(val).strip()
    # trova il match case-insensitive
    for stato in ["In gestione", "Attesa parti", "Sospesa", "Chiusa", "Annullata"]:
        if s.lower() == stato.lower():
            return stato
    return s  # fallback al valore originale
```
