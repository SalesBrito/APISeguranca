import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from dotenv import load_dotenv
from pathlib import Path

# Load environment
ROOT_DIR = Path(__file__).parent / 'backend'
load_dotenv(ROOT_DIR / '.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def reset_admin_password():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Delete existing admin user
    result = await db.users.delete_one({"email": "admin@sistema.com"})
    print(f"Usuário admin existente removido: {result.deleted_count}")
    
    # Create new admin user with correct password
    admin_user = {
        "id": "admin-001",
        "nome": "Administrador do Sistema",
        "email": "admin@sistema.com",
        "role": "administrador",
        "setor": "TI",
        "ativo": True,
        "senha": pwd_context.hash("sales761")
    }
    
    await db.users.insert_one(admin_user)
    print("Novo usuário admin criado com senha: sales761")
    
    # Close connection
    client.close()

if __name__ == "__main__":
    asyncio.run(reset_admin_password())