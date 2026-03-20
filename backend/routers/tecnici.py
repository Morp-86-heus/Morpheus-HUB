from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import LookupTecnico
import schemas

router = APIRouter(prefix="/api/tecnici", tags=["tecnici"])


@router.get("", response_model=List[schemas.LookupTecnico])
def list_tecnici(db: Session = Depends(get_db)):
    return db.query(LookupTecnico).order_by(LookupTecnico.nome).all()


@router.post("", response_model=schemas.LookupTecnico, status_code=201)
def create_tecnico(nome: str, db: Session = Depends(get_db)):
    existing = db.query(LookupTecnico).filter(LookupTecnico.nome == nome).first()
    if existing:
        raise HTTPException(status_code=409, detail="Tecnico già esistente")
    obj = LookupTecnico(nome=nome)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{tecnico_id}", status_code=204)
def delete_tecnico(tecnico_id: int, db: Session = Depends(get_db)):
    obj = db.query(LookupTecnico).filter(LookupTecnico.id == tecnico_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Tecnico non trovato")
    db.delete(obj)
    db.commit()
