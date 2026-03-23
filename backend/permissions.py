"""Matrice dei permessi per ruolo — condivisa tra router e business logic."""
import copy
from typing import Dict
from sqlalchemy.orm import Session
from models import PermessoRuolo

DEFAULT_PERMISSIONS: Dict[str, Dict[str, bool]] = {
    "amministratore": {
        "ticket.view":                  True,
        "ticket.view_all":              True,
        "ticket.create":                True,
        "ticket.edit":                  True,
        "ticket.delete":                True,
        "ticket.close":                 True,
        "ticket.export":                True,
        "storico.view":                 True,
        "anagrafiche.view":             True,
        "anagrafiche.create":           True,
        "anagrafiche.edit":             True,
        "anagrafiche.delete":           True,
        "listini.view":                 True,
        "listini.manage":               True,
        "magazzino.view":               True,
        "magazzino.articoli.view":      True,
        "magazzino.articoli.edit":      True,
        "magazzino.articoli.delete":    True,
        "magazzino.movimenti":          True,
        "stats.view":                   True,
        "utenti.view":                  True,
        "utenti.manage":                True,
        "clienti.view":                 True,
        "clienti.create":               True,
        "clienti.edit":                 True,
        "clienti.delete":               True,
        "servizi.view":                 True,
        "servizi.manage":               True,
        "abbonamenti.view":             True,
        "abbonamenti.manage":           True,
        "funnel.view":                  True,
        "funnel.manage":                True,
        "contabilita.view":             True,
        "contabilita.manage":           True,
        "vendite.view":                 True,
        "vendite.manage":               True,
    },
    "commerciale": {
        "ticket.view":                  True,
        "ticket.view_all":              True,
        "ticket.create":                True,
        "ticket.edit":                  True,
        "ticket.delete":                False,
        "ticket.close":                 False,
        "ticket.export":                True,
        "storico.view":                 True,
        "anagrafiche.view":             True,
        "anagrafiche.create":           True,
        "anagrafiche.edit":             True,
        "anagrafiche.delete":           False,
        "listini.view":                 True,
        "listini.manage":               False,
        "magazzino.view":               True,
        "magazzino.articoli.view":      True,
        "magazzino.articoli.edit":      False,
        "magazzino.articoli.delete":    False,
        "magazzino.movimenti":          False,
        "stats.view":                   True,
        "utenti.view":                  False,
        "utenti.manage":                False,
        "clienti.view":                 True,
        "clienti.create":               True,
        "clienti.edit":                 True,
        "clienti.delete":               False,
        "servizi.view":                 True,
        "servizi.manage":               True,
        "abbonamenti.view":             True,
        "abbonamenti.manage":           True,
        "funnel.view":                  True,
        "funnel.manage":                True,
        "contabilita.view":             True,
        "contabilita.manage":           False,
        "vendite.view":                 True,
        "vendite.manage":               True,
    },
    "tecnico": {
        "ticket.view":                  True,
        "ticket.view_all":              False,
        "ticket.create":                True,
        "ticket.edit":                  True,
        "ticket.delete":                False,
        "ticket.close":                 True,
        "ticket.export":                False,
        "storico.view":                 True,
        "anagrafiche.view":             False,
        "anagrafiche.create":           False,
        "anagrafiche.edit":             False,
        "anagrafiche.delete":           False,
        "listini.view":                 True,
        "listini.manage":               False,
        "magazzino.view":               True,
        "magazzino.articoli.view":      True,
        "magazzino.articoli.edit":      False,
        "magazzino.articoli.delete":    False,
        "magazzino.movimenti":          True,
        "stats.view":                   False,
        "utenti.view":                  False,
        "utenti.manage":                False,
        "clienti.view":                 False,
        "clienti.create":               False,
        "clienti.edit":                 False,
        "clienti.delete":               False,
        "servizi.view":                 False,
        "servizi.manage":               False,
        "abbonamenti.view":             False,
        "abbonamenti.manage":           False,
        "funnel.view":                  False,
        "funnel.manage":                False,
        "contabilita.view":             False,
        "contabilita.manage":           False,
        "vendite.view":                 False,
        "vendite.manage":               False,
    },
}


def get_effective_matrix(org_id: int, db: Session) -> Dict[str, Dict[str, bool]]:
    """Default + eventuali override salvati nel DB per questa org."""
    matrix = copy.deepcopy(DEFAULT_PERMISSIONS)
    overrides = db.query(PermessoRuolo).filter(
        PermessoRuolo.organizzazione_id == org_id
    ).all()
    for ov in overrides:
        if ov.ruolo in matrix:
            matrix[ov.ruolo][ov.permesso] = ov.abilitato
    return matrix


def check_permission(ruolo: str, permesso: str, org_id: int, db: Session) -> bool:
    """Restituisce True se il ruolo ha il permesso nell'org (considerando gli override)."""
    matrix = get_effective_matrix(org_id, db)
    return matrix.get(ruolo, {}).get(permesso, False)
