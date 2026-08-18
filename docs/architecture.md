Frontend
React
   ↓
Micro Frontend
   ↓
API Gateway

///////////
Backend
Lambda
   ↓
Handlers
   ↓
Use Cases
   ↓
Domain
   ↓
Repositories
   ↓
DynamoDB

/////////
Eventos
Approval signed
      ↓
Check 3 approvals
      ↓
EventBridge
      ↓
PDF Lambda
      ↓
S3

/////////
Seguridad
Approval UUID
      ↓
Token
      ↓
SHA-256
      ↓
DynamoDB


OTP
 ↓
hash
 ↓
expiration 3 min



Glosary
GSI (GSI para el panel del solicitante typescript)
DTO
ESM
Why ramdonInt sobre Math.random
que es Scan y GSI y Dynamo?
Mapper (distribuciones de las carpetas en general)


Application
     ↓
Domain Repository Interface
     ↓
Infrastructure Repository
     ↓
DynamoDB Client
     ↓
AWS DynamoDB