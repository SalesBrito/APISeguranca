from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta, timezone
import jwt
from passlib.context import CryptContext
import secrets
import shutil
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
SECRET_KEY = os.environ.get('SECRET_KEY', secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 horas para plantões

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app
app = FastAPI(
    title="Sistema de Segurança & Gestão de Ocorrências",
    description="Sistema completo para gestão de segurança, vigilância e ocorrências",
    version="2.0.0"
)

# Create uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Serve static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class UserRole(str, Enum):
    VIGILANTE = "vigilante"
    SUPERVISOR = "supervisor"
    ADMINISTRADOR = "administrador"

class OccurrenceType(str, Enum):
    ROUBO = "roubo"
    VANDALISMO = "vandalismo"
    INCENDIO = "incendio"
    ACIDENTE = "acidente"
    SUSPEITO = "suspeito"
    EMERGENCIA_MEDICA = "emergencia_medica"
    ACESSO_NAO_AUTORIZADO = "acesso_nao_autorizado"
    OUTROS = "outros"

class RoundStatus(str, Enum):
    INICIADA = "iniciada"
    EM_ANDAMENTO = "em_andamento"
    CONCLUIDA = "concluida"
    INTERROMPIDA = "interrompida"

class ShiftStatus(str, Enum):
    ATIVO = "ativo"
    INATIVO = "inativo"
    PAUSA = "pausa"

class Priority(str, Enum):
    BAIXA = "baixa"
    MEDIA = "media"
    ALTA = "alta"
    CRITICA = "critica"

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    email: EmailStr
    role: UserRole
    telefone: Optional[str] = None
    setor: Optional[str] = None
    ativo: bool = True
    ultimo_login: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    role: UserRole
    telefone: Optional[str] = None
    setor: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    senha: str

class PasswordChange(BaseModel):
    senha_atual: str
    nova_senha: str
    confirmar_senha: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Shift(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vigilante_id: str
    vigilante_nome: str
    inicio: datetime
    fim: Optional[datetime] = None
    status: ShiftStatus
    local_responsavel: str
    observacoes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ShiftCreate(BaseModel):
    local_responsavel: str
    observacoes: Optional[str] = None

class Location(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    descricao: Optional[str] = None
    camera_ip: Optional[str] = None
    camera_url: Optional[str] = None
    coordenadas: Optional[str] = None
    ativo: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LocationCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    camera_ip: Optional[str] = None
    camera_url: Optional[str] = None
    coordenadas: Optional[str] = None

class Occurrence(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    local: str
    tipo: OccurrenceType
    prioridade: Priority
    descricao: str
    fotos: List[str] = []
    usuario_id: str
    usuario_nome: str
    resolvida: bool = False
    data_resolucao: Optional[datetime] = None
    observacoes_resolucao: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OccurrenceCreate(BaseModel):
    local: str
    tipo: OccurrenceType
    prioridade: Priority = Priority.MEDIA
    descricao: str

class OccurrenceResolve(BaseModel):
    observacoes_resolucao: str

class Round(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vigilante_id: str
    vigilante_nome: str
    inicio: datetime
    fim: Optional[datetime] = None
    status: RoundStatus
    locais_visitados: List[str] = []
    observacoes: Optional[str] = None
    incidentes_encontrados: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RoundCreate(BaseModel):
    locais_visitados: List[str]
    observacoes: Optional[str] = None

class AuditLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    usuario_id: str
    usuario_nome: str
    acao: str
    recurso: str
    detalhes: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Report(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    titulo: str
    tipo: str
    periodo_inicio: datetime
    periodo_fim: datetime
    dados: dict
    gerado_por: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Utility functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def log_audit(user_id: str, user_name: str, action: str, resource: str, details: Optional[str] = None, ip: Optional[str] = None):
    """Log de auditoria para rastrear ações dos usuários"""
    audit_log = AuditLog(
        usuario_id=user_id,
        usuario_nome=user_name,
        acao=action,
        recurso=resource,
        detalhes=details,
        ip_address=ip
    )
    await db.audit_logs.insert_one(audit_log.dict())

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise credentials_exception
    return User(**user)

def require_role(required_roles: List[UserRole]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissão insuficiente"
            )
        return current_user
    return role_checker

# Auth Routes
@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate, current_user: User = Depends(require_role([UserRole.ADMINISTRADOR]))):
    # Verificar se usuário já existe
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já está sendo usado"
        )
    
    # Criar usuário
    hashed_password = get_password_hash(user_data.senha)
    user = User(
        nome=user_data.nome,
        email=user_data.email,
        role=user_data.role,
        telefone=user_data.telefone,
        setor=user_data.setor
    )
    
    user_dict = user.dict()
    user_dict["senha"] = hashed_password
    
    await db.users.insert_one(user_dict)
    
    # Log de auditoria
    await log_audit(
        current_user.id, 
        current_user.nome, 
        "CREATE_USER", 
        "users", 
        f"Criado usuário: {user.nome} ({user.role})"
    )
    
    return user

@api_router.post("/auth/login", response_model=Token)
async def login(user_credentials: UserLogin):
    user = await db.users.find_one({"email": user_credentials.email})
    if not user or not verify_password(user_credentials.senha, user["senha"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.get("ativo", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário desativado"
        )
    
    # Atualizar último login
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"ultimo_login": datetime.now(timezone.utc)}}
    )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["id"]}, expires_delta=access_token_expires
    )
    
    user_obj = User(**user)
    
    # Log de auditoria
    await log_audit(user["id"], user["nome"], "LOGIN", "auth", "Login realizado")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_obj
    }

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.put("/auth/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user)
):
    # Verificar se nova senha e confirmação coincidem
    if password_data.nova_senha != password_data.confirmar_senha:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nova senha e confirmação não coincidem"
        )
    
    # Buscar usuário no banco
    user = await db.users.find_one({"id": current_user.id})
    if not user or not verify_password(password_data.senha_atual, user["senha"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha atual incorreta"
        )
    
    # Atualizar senha
    new_hashed_password = get_password_hash(password_data.nova_senha)
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"senha": new_hashed_password}}
    )
    
    # Log de auditoria
    await log_audit(
        current_user.id,
        current_user.nome,
        "CHANGE_PASSWORD",
        "users",
        "Senha alterada pelo usuário"
    )
    
    return {"message": "Senha alterada com sucesso"}

# Users Routes
@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(require_role([UserRole.SUPERVISOR, UserRole.ADMINISTRADOR]))):
    users = await db.users.find().to_list(1000)
    return [User(**user) for user in users]

# Shifts Routes
@api_router.post("/shifts", response_model=Shift)
async def start_shift(
    shift_data: ShiftCreate,
    current_user: User = Depends(get_current_user)
):
    # Verificar se já existe um plantão ativo
    active_shift = await db.shifts.find_one({
        "vigilante_id": current_user.id,
        "status": ShiftStatus.ATIVO
    })
    
    if active_shift:
        raise HTTPException(
            status_code=400,
            detail="Você já possui um plantão ativo. Finalize-o antes de iniciar um novo."
        )
    
    shift = Shift(
        vigilante_id=current_user.id,
        vigilante_nome=current_user.nome,
        inicio=datetime.now(timezone.utc),
        status=ShiftStatus.ATIVO,
        local_responsavel=shift_data.local_responsavel,
        observacoes=shift_data.observacoes
    )
    
    await db.shifts.insert_one(shift.dict())
    
    # Log de auditoria
    await log_audit(
        current_user.id,
        current_user.nome,
        "START_SHIFT",
        "shifts",
        f"Plantão iniciado - Local: {shift_data.local_responsavel}"
    )
    
    return shift

@api_router.put("/shifts/{shift_id}/finish")
async def finish_shift(
    shift_id: str,
    current_user: User = Depends(get_current_user)
):
    shift = await db.shifts.find_one({"id": shift_id})
    if not shift:
        raise HTTPException(status_code=404, detail="Plantão não encontrado")
    
    # Verificar permissão
    if shift["vigilante_id"] != current_user.id and current_user.role not in [UserRole.SUPERVISOR, UserRole.ADMINISTRADOR]:
        raise HTTPException(status_code=403, detail="Sem permissão para finalizar este plantão")
    
    # Atualizar plantão
    await db.shifts.update_one(
        {"id": shift_id},
        {
            "$set": {
                "fim": datetime.now(timezone.utc),
                "status": ShiftStatus.INATIVO
            }
        }
    )
    
    # Log de auditoria
    await log_audit(
        current_user.id,
        current_user.nome,
        "FINISH_SHIFT",
        "shifts",
        f"Plantão {shift_id} finalizado"
    )
    
    return {"message": "Plantão finalizado com sucesso"}

@api_router.get("/shifts", response_model=List[Shift])
async def get_shifts(current_user: User = Depends(get_current_user)):
    query = {}
    # Vigilantes só veem seus próprios plantões
    if current_user.role == UserRole.VIGILANTE:
        query["vigilante_id"] = current_user.id
    
    shifts = await db.shifts.find(query).sort("created_at", -1).to_list(1000)
    return [Shift(**shift) for shift in shifts]

@api_router.get("/shifts/active", response_model=List[Shift])
async def get_active_shifts(current_user: User = Depends(require_role([UserRole.SUPERVISOR, UserRole.ADMINISTRADOR]))):
    shifts = await db.shifts.find({"status": ShiftStatus.ATIVO}).sort("inicio", -1).to_list(100)
    return [Shift(**shift) for shift in shifts]

# Locations Routes
@api_router.post("/locations", response_model=Location)
async def create_location(
    location_data: LocationCreate,
    current_user: User = Depends(require_role([UserRole.SUPERVISOR, UserRole.ADMINISTRADOR]))
):
    location = Location(**location_data.dict())
    await db.locations.insert_one(location.dict())
    
    # Log de auditoria
    await log_audit(
        current_user.id,
        current_user.nome,
        "CREATE_LOCATION",
        "locations",
        f"Local criado: {location_data.nome}"
    )
    
    return location

@api_router.get("/locations", response_model=List[Location])
async def get_locations(current_user: User = Depends(get_current_user)):
    locations = await db.locations.find({"ativo": True}).sort("nome", 1).to_list(1000)
    return [Location(**location) for location in locations]

# Occurrences Routes
@api_router.post("/occurrences", response_model=Occurrence)
async def create_occurrence(
    occurrence_data: OccurrenceCreate,
    current_user: User = Depends(get_current_user)
):
    occurrence = Occurrence(
        **occurrence_data.dict(),
        usuario_id=current_user.id,
        usuario_nome=current_user.nome
    )
    
    await db.occurrences.insert_one(occurrence.dict())
    
    # Log de auditoria
    await log_audit(
        current_user.id,
        current_user.nome,
        "CREATE_OCCURRENCE",
        "occurrences",
        f"Ocorrência criada: {occurrence_data.tipo} em {occurrence_data.local} - Prioridade: {occurrence_data.prioridade}"
    )
    
    return occurrence

@api_router.put("/occurrences/{occurrence_id}/resolve")
async def resolve_occurrence(
    occurrence_id: str,
    resolve_data: OccurrenceResolve,
    current_user: User = Depends(get_current_user)
):
    occurrence = await db.occurrences.find_one({"id": occurrence_id})
    if not occurrence:
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada")
    
    # Atualizar ocorrência
    await db.occurrences.update_one(
        {"id": occurrence_id},
        {
            "$set": {
                "resolvida": True,
                "data_resolucao": datetime.now(timezone.utc),
                "observacoes_resolucao": resolve_data.observacoes_resolucao
            }
        }
    )
    
    # Log de auditoria
    await log_audit(
        current_user.id,
        current_user.nome,
        "RESOLVE_OCCURRENCE",
        "occurrences",
        f"Ocorrência {occurrence_id} resolvida"
    )
    
    return {"message": "Ocorrência marcada como resolvida"}

@api_router.post("/occurrences/{occurrence_id}/photos")
async def upload_occurrence_photo(
    occurrence_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    # Verificar se a ocorrência existe
    occurrence = await db.occurrences.find_one({"id": occurrence_id})
    if not occurrence:
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada")
    
    # Verificar se o usuário pode editar
    if occurrence["usuario_id"] != current_user.id and current_user.role not in [UserRole.SUPERVISOR, UserRole.ADMINISTRADOR]:
        raise HTTPException(status_code=403, detail="Sem permissão para editar esta ocorrência")
    
    # Salvar arquivo
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{occurrence_id}_{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Atualizar ocorrência com nova foto
    photo_url = f"/uploads/{filename}"
    await db.occurrences.update_one(
        {"id": occurrence_id},
        {"$push": {"fotos": photo_url}}
    )
    
    # Log de auditoria
    await log_audit(
        current_user.id,
        current_user.nome,
        "UPLOAD_PHOTO",
        "occurrences",
        f"Foto adicionada à ocorrência {occurrence_id}"
    )
    
    return {"message": "Foto enviada com sucesso", "photo_url": photo_url}

@api_router.get("/occurrences", response_model=List[Occurrence])
async def get_occurrences(current_user: User = Depends(get_current_user)):
    query = {}
    # Vigilantes só veem suas próprias ocorrências
    if current_user.role == UserRole.VIGILANTE:
        query["usuario_id"] = current_user.id
    
    occurrences = await db.occurrences.find(query).sort("created_at", -1).to_list(1000)
    return [Occurrence(**occurrence) for occurrence in occurrences]

@api_router.get("/occurrences/priority/{priority}")
async def get_occurrences_by_priority(
    priority: Priority,
    current_user: User = Depends(require_role([UserRole.SUPERVISOR, UserRole.ADMINISTRADOR]))
):
    occurrences = await db.occurrences.find({
        "prioridade": priority,
        "resolvida": False
    }).sort("created_at", -1).to_list(100)
    
    return [Occurrence(**occurrence) for occurrence in occurrences]

# Rounds Routes
@api_router.post("/rounds", response_model=Round)
async def start_round(
    round_data: RoundCreate,
    current_user: User = Depends(get_current_user)
):
    # Verificar se já existe uma ronda ativa
    active_round = await db.rounds.find_one({
        "vigilante_id": current_user.id,
        "status": {"$in": [RoundStatus.INICIADA, RoundStatus.EM_ANDAMENTO]}
    })
    
    if active_round:
        raise HTTPException(
            status_code=400,
            detail="Você já possui uma ronda ativa. Finalize-a antes de iniciar uma nova."
        )
    
    round_obj = Round(
        vigilante_id=current_user.id,
        vigilante_nome=current_user.nome,
        inicio=datetime.now(timezone.utc),
        status=RoundStatus.INICIADA,
        locais_visitados=round_data.locais_visitados,
        observacoes=round_data.observacoes
    )
    
    await db.rounds.insert_one(round_obj.dict())
    
    # Log de auditoria
    await log_audit(
        current_user.id,
        current_user.nome,
        "START_ROUND",
        "rounds",
        f"Ronda iniciada - Locais: {', '.join(round_data.locais_visitados)}"
    )
    
    return round_obj

@api_router.put("/rounds/{round_id}/finish")
async def finish_round(
    round_id: str,
    current_user: User = Depends(get_current_user)
):
    round_obj = await db.rounds.find_one({"id": round_id})
    if not round_obj:
        raise HTTPException(status_code=404, detail="Ronda não encontrada")
    
    # Verificar permissão
    if round_obj["vigilante_id"] != current_user.id and current_user.role not in [UserRole.SUPERVISOR, UserRole.ADMINISTRADOR]:
        raise HTTPException(status_code=403, detail="Sem permissão para finalizar esta ronda")
    
    # Atualizar ronda
    await db.rounds.update_one(
        {"id": round_id},
        {
            "$set": {
                "fim": datetime.now(timezone.utc),
                "status": RoundStatus.CONCLUIDA
            }
        }
    )
    
    # Log de auditoria
    await log_audit(
        current_user.id,
        current_user.nome,
        "FINISH_ROUND",
        "rounds",
        f"Ronda {round_id} finalizada"
    )
    
    return {"message": "Ronda finalizada com sucesso"}

@api_router.get("/rounds", response_model=List[Round])
async def get_rounds(current_user: User = Depends(get_current_user)):
    query = {}
    # Vigilantes só veem suas próprias rondas
    if current_user.role == UserRole.VIGILANTE:
        query["vigilante_id"] = current_user.id
    
    rounds = await db.rounds.find(query).sort("created_at", -1).to_list(1000)
    return [Round(**round_obj) for round_obj in rounds]

# Dashboard Stats
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    stats = {}
    
    if current_user.role == UserRole.VIGILANTE:
        # Stats para vigilante
        stats["minhas_ocorrencias_hoje"] = await db.occurrences.count_documents({
            "usuario_id": current_user.id,
            "created_at": {"$gte": today}
        })
        stats["minhas_rondas_hoje"] = await db.rounds.count_documents({
            "vigilante_id": current_user.id,
            "created_at": {"$gte": today}
        })
        stats["plantao_ativo"] = await db.shifts.find_one({
            "vigilante_id": current_user.id,
            "status": ShiftStatus.ATIVO
        }) is not None
        stats["ronda_ativa"] = await db.rounds.find_one({
            "vigilante_id": current_user.id,
            "status": {"$in": [RoundStatus.INICIADA, RoundStatus.EM_ANDAMENTO]}
        }) is not None
    else:
        # Stats para supervisor/admin
        stats["total_ocorrencias_hoje"] = await db.occurrences.count_documents({
            "created_at": {"$gte": today}
        })
        stats["ocorrencias_abertas"] = await db.occurrences.count_documents({
            "resolvida": False
        })
        stats["total_rondas_hoje"] = await db.rounds.count_documents({
            "created_at": {"$gte": today}
        })
        stats["vigilantes_em_plantao"] = await db.shifts.count_documents({
            "status": ShiftStatus.ATIVO
        })
        stats["total_usuarios"] = await db.users.count_documents({"ativo": True})
        stats["rondas_ativas"] = await db.rounds.count_documents({
            "status": {"$in": [RoundStatus.INICIADA, RoundStatus.EM_ANDAMENTO]}
        })
        stats["ocorrencias_criticas"] = await db.occurrences.count_documents({
            "prioridade": Priority.CRITICA,
            "resolvida": False
        })
    
    return stats

# System Info
@api_router.get("/system/info")
async def get_system_info():
    return {
        "sistema": "Sistema de Segurança & Gestão de Ocorrências",
        "versao": "2.0.0",
        "desenvolvedor": "Sistemas de Segurança Empresarial",
        "contato": "suporte@sistemaseguranca.com.br",
        "recursos": [
            "Gestão completa de ocorrências",
            "Sistema de plantões e rondas",
            "Integração com câmeras CFTV", 
            "Relatórios automáticos",
            "Logs de auditoria",
            "Controle de acesso por roles",
            "Upload de fotos",
            "Dashboard em tempo real"
        ],
        "tecnologias": ["FastAPI", "React", "MongoDB", "JWT Authentication"]
    }

# Audit Logs (apenas para admin)
@api_router.get("/audit-logs", response_model=List[AuditLog])
async def get_audit_logs(current_user: User = Depends(require_role([UserRole.ADMINISTRADOR]))):
    logs = await db.audit_logs.find().sort("timestamp", -1).limit(1000).to_list(1000)
    return [AuditLog(**log) for log in logs]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Criar dados iniciais
@app.on_event("startup")
async def create_initial_data():
    # Criar usuário admin padrão
    admin_exists = await db.users.find_one({"role": UserRole.ADMINISTRADOR})
    if not admin_exists:
        admin_user = User(
            nome="Administrador do Sistema",
            email="admin@sistema.com",
            role=UserRole.ADMINISTRADOR,
            setor="TI"
        )
        admin_dict = admin_user.dict()
        admin_dict["senha"] = get_password_hash("sales761")
        
        await db.users.insert_one(admin_dict)
        logger.info("Usuário administrador padrão criado: admin@sistema.com / sales761")
    
    # Criar alguns usuários de exemplo
    supervisor_exists = await db.users.find_one({"email": "supervisor@sistema.com"})
    if not supervisor_exists:
        supervisor_user = User(
            nome="João Silva - Supervisor",
            email="supervisor@sistema.com",
            role=UserRole.SUPERVISOR,
            telefone="(11) 99999-1234",
            setor="Segurança"
        )
        supervisor_dict = supervisor_user.dict()
        supervisor_dict["senha"] = get_password_hash("supervisor123")
        
        await db.users.insert_one(supervisor_dict)
        logger.info("Usuário supervisor criado: supervisor@sistema.com / supervisor123")
    
    vigilante_exists = await db.users.find_one({"email": "vigilante@sistema.com"})
    if not vigilante_exists:
        vigilante_user = User(
            nome="Maria Santos - Vigilante",
            email="vigilante@sistema.com",
            role=UserRole.VIGILANTE,
            telefone="(11) 88888-5678",
            setor="Segurança"
        )
        vigilante_dict = vigilante_user.dict()
        vigilante_dict["senha"] = get_password_hash("vigilante123")
        
        await db.users.insert_one(vigilante_dict)
        logger.info("Usuário vigilante criado: vigilante@sistema.com / vigilante123")
    
    # Criar locais padrão
    locations_exist = await db.locations.count_documents({})
    if locations_exist == 0:
        default_locations = [
            {
                "nome": "Portaria Principal",
                "descricao": "Entrada principal do edifício",
                "camera_ip": "192.168.1.100",
                "camera_url": "rtsp://192.168.1.100:554/stream1",
                "coordenadas": "-23.5505, -46.6333"
            },
            {
                "nome": "Estacionamento",
                "descricao": "Área de estacionamento coberto",
                "camera_ip": "192.168.1.101",
                "camera_url": "rtsp://192.168.1.101:554/stream1",
                "coordenadas": "-23.5506, -46.6334"
            },
            {
                "nome": "Área Externa",
                "descricao": "Perímetro externo do edifício",
                "camera_ip": "192.168.1.102",
                "camera_url": "rtsp://192.168.1.102:554/stream1",
                "coordenadas": "-23.5507, -46.6335"
            },
            {
                "nome": "Recepção",
                "descricao": "Hall de entrada e recepção",
                "camera_ip": "192.168.1.103",
                "camera_url": "rtsp://192.168.1.103:554/stream1",
                "coordenadas": "-23.5508, -46.6336"
            }
        ]
        
        for loc_data in default_locations:
            location = Location(**loc_data)
            await db.locations.insert_one(location.dict())
        
        logger.info("Locais padrão criados")