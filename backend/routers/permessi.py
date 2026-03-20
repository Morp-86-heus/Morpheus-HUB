"""Gestione permessi per ruolo — per organizzazione."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict
from database import get_db
from models import PermessoRuolo, User, RuoloEnum
from auth import get_current_user, get_active_org_id
from permissions import DEFAULT_PERMISSIONS, get_effective_matrix

router = APIRouter(prefix="/api/permessi", tags=["permessi"])


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/default")
def get_default():
    """Restituisce i permessi predefiniti (usati dal frontend per il reset)."""
    return DEFAULT_PERMISSIONS


@router.get("/miei")
def get_miei_permessi(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Elenco dei codici permesso abilitati per l'utente corrente."""
    if current_user.ruolo == RuoloEnum.proprietario:
        # Proprietario ha sempre tutto
        all_perms = {p for role in DEFAULT_PERMISSIONS.values() for p in role}
        return list(all_perms)

    if current_user.organizzazione_id is None:
        return []

    ruolo = current_user.ruolo.value
    matrix = get_effective_matrix(current_user.organizzazione_id, db)
    role_perms = matrix.get(ruolo, {})
    return [code for code, enabled in role_perms.items() if enabled]


@router.get("/matrice")
def get_matrice(
    org_id: int = Depends(get_active_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Matrice completa dei permessi per l'organizzazione (admin/proprietario)."""
    if current_user.ruolo not in (RuoloEnum.proprietario, RuoloEnum.amministratore):
        raise HTTPException(status_code=403, detail="Accesso negato")
    return get_effective_matrix(org_id, db)


@router.put("/matrice")
def update_matrice(
    payload: Dict[str, Dict[str, bool]],
    org_id: int = Depends(get_active_org_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Salva la matrice dei permessi per l'organizzazione."""
    if current_user.ruolo not in (RuoloEnum.proprietario, RuoloEnum.amministratore):
        raise HTTPException(status_code=403, detail="Accesso negato")

    # Sostituisce tutti gli override esistenti
    db.query(PermessoRuolo).filter(
        PermessoRuolo.organizzazione_id == org_id
    ).delete()

    for ruolo, perms in payload.items():
        if ruolo not in DEFAULT_PERMISSIONS:
            continue
        for permesso, abilitato in perms.items():
            if permesso not in DEFAULT_PERMISSIONS[ruolo]:
                continue
            db.add(PermessoRuolo(
                organizzazione_id=org_id,
                ruolo=ruolo,
                permesso=permesso,
                abilitato=abilitato,
            ))

    db.commit()
    return get_effective_matrix(org_id, db)
