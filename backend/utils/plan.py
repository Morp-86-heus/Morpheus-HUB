from fastapi import HTTPException
from sqlalchemy.orm import Session

PLAN_FEATURES = {
    'base':         {'magazzino': False, 'listini': False, 'calendario': False, 'funnel': False, 'servizi': False, 'contabilita': False},
    'professional': {'magazzino': True,  'listini': True,  'calendario': True,  'funnel': True,  'servizi': True,  'contabilita': True},
    'enterprise':   {'magazzino': True,  'listini': True,  'calendario': True,  'funnel': True,  'servizi': True,  'contabilita': True},
}

MAX_USERS = {'base': 5, 'professional': 15, 'enterprise': None}


def get_plan(org) -> str:
    return (org.piano or 'enterprise').lower()


def check_feature(org, feature: str):
    plan = get_plan(org)
    features = PLAN_FEATURES.get(plan, PLAN_FEATURES['enterprise'])
    if not features.get(feature, True):
        raise HTTPException(status_code=403, detail=f"Funzionalità non disponibile nel piano {plan}. Esegui l'upgrade.")


def check_user_limit(org, current_user_count: int):
    plan = get_plan(org)
    limit = MAX_USERS.get(plan)
    if limit is not None and current_user_count >= limit:
        raise HTTPException(status_code=403, detail=f"Limite utenti raggiunto per il piano {plan} (max {limit}). Esegui l'upgrade.")
