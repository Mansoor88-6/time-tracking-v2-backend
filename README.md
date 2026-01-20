# Multi-Tenant Backend API

A robust, production-ready multi-tenant backend application built with NestJS, TypeORM, and PostgreSQL. This template provides complete tenant isolation, role-based access control, and a comprehensive authentication system.

## Features

- **Multi-Tenant Architecture**: Complete tenant isolation with row-level security
- **JWT Authentication**: Secure token-based authentication with tenant context
- **Role-Based Access Control**: Three-tier role system (SuperAdmin, Tenant Admin, Tenant User)
- **Tenant Management**: Public registration with SuperAdmin approval workflow
- **User Management**: Tenant-scoped user management with role assignment
- **Password Security**: Bcrypt hashing for all passwords
- **Request Validation**: Class-validator for DTO validation
- **TypeScript**: Full type safety throughout the application

## Architecture Overview

### Tenant Isolation Strategy

This application uses **row-level isolation** where each tenant's data is isolated using a `tenant_id` foreign key. All user queries are automatically filtered by tenant context, ensuring complete data separation.

### Authentication Flow

1. **Tenant Registration**: Organizations register publicly via `/tenants/register`
2. **SuperAdmin Approval**: SuperAdmin approves pending tenants
3. **User Creation**: Approved tenants can create users (Admin/User roles)
4. **JWT Token**: Contains tenant context for automatic data filtering

### Role Hierarchy

- **SUPER_ADMIN**: Full platform access, can manage all tenants
- **TENANT_ADMIN**: Can manage users within their tenant
- **TENANT_USER**: Limited access within their tenant

## Tech Stack

- **Framework**: NestJS 11.x
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Authentication**: Passport.js + JWT
- **Validation**: class-validator
- **Language**: TypeScript

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd backend
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=pki_multi_tenant

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# Application
PORT=4000
FRONTEND_URL=http://localhost:4000
```

4. **Create the database**

```bash
createdb pki_multi_tenant
```

5. **Run database seed** (creates initial SuperAdmin)

```bash
npm run seed
```

Default SuperAdmin credentials:

- Email: `admin@example.com`
- Password: `Admin@123`

6. **Start the application**

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The API will be available at `http://localhost:4000`

## API Endpoints

### Authentication

#### Login (User or SuperAdmin)

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "userType": "user" | "superadmin"
}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "tenantId": 1,
    "role": "TENANT_ADMIN"
  }
}
```

#### Get Current User

```http
GET /auth/me
Authorization: Bearer <token>
```

### Tenant Management

#### Register Tenant (Public)

```http
POST /tenants/register
Content-Type: application/json

{
  "name": "Acme Corporation",
  "email": "contact@acme.com"
}
```

#### List All Tenants (SuperAdmin only)

```http
GET /tenants
Authorization: Bearer <superadmin_token>
```

#### Approve Tenant (SuperAdmin only)

```http
POST /tenants/:id/approve
Authorization: Bearer <superadmin_token>
```

#### Suspend Tenant (SuperAdmin only)

```http
POST /tenants/:id/suspend
Authorization: Bearer <superadmin_token>
```

#### Activate Tenant (SuperAdmin only)

```http
POST /tenants/:id/activate
Authorization: Bearer <superadmin_token>
```

### User Management

#### Create User (Tenant Admin only)

```http
POST /users
Authorization: Bearer <tenant_admin_token>
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securepassword123",
  "role": "TENANT_USER" // Optional, defaults to TENANT_USER
}
```

#### List Users (Tenant Admin only)

```http
GET /users
Authorization: Bearer <tenant_admin_token>
```

#### Get User Profile

```http
GET /users/me
Authorization: Bearer <token>
```

#### Update User (Tenant Admin only)

```http
PATCH /users/:id
Authorization: Bearer <tenant_admin_token>
Content-Type: application/json

{
  "name": "Updated Name",
  "email": "updated@example.com"
}
```

#### Change User Role (Tenant Admin only)

```http
PATCH /users/:id/role
Authorization: Bearer <tenant_admin_token>
Content-Type: application/json

{
  "role": "TENANT_ADMIN"
}
```

#### Delete User (Tenant Admin only)

```http
DELETE /users/:id
Authorization: Bearer <tenant_admin_token>
```

### SuperAdmin Management

#### Create SuperAdmin (SuperAdmin only)

```http
POST /super-admin
Authorization: Bearer <superadmin_token>
Content-Type: application/json

{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "securepassword123"
}
```

#### List SuperAdmins (SuperAdmin only)

```http
GET /super-admin
Authorization: Bearer <superadmin_token>
```

## Project Structure

```
src/
├── auth/                    # Authentication module
│   ├── decorators/         # Custom decorators (@Public, @Roles)
│   ├── dto/               # Data transfer objects
│   ├── guards/            # Auth guards (JWT, Roles, Tenant)
│   ├── strategies/        # Passport strategies (JWT, Local)
│   ├── auth.controller.ts # Auth endpoints
│   ├── auth.service.ts    # Auth business logic
│   └── auth.module.ts     # Auth module configuration
├── common/                 # Shared utilities
│   ├── entities/          # Base entity
│   ├── enums/             # Enums (Roles, TenantStatus)
│   └── utils/             # Utility functions (password hashing)
├── config/                # Configuration files
│   ├── configuration.ts   # Environment configuration
│   └── data-source.ts     # TypeORM data source
├── database/              # Database related
│   └── seeds/            # Seed scripts
├── super-admin/          # SuperAdmin module
│   ├── dto/              # SuperAdmin DTOs
│   ├── entities/         # SuperAdmin entity
│   ├── super-admin.controller.ts
│   ├── super-admin.service.ts
│   └── super-admin.module.ts
├── tenants/              # Tenant module
│   ├── dto/              # Tenant DTOs
│   ├── entities/         # Tenant entity
│   ├── middleware/       # Tenant context middleware
│   ├── services/         # Tenant services
│   ├── tenants.controller.ts
│   ├── tenants.service.ts
│   └── tenants.module.ts
├── users/                # User module
│   ├── dto/              # User DTOs
│   ├── entities/         # User entity
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
├── types/                # TypeScript type definitions
│   └── express.d.ts      # Express Request type extensions
├── app.module.ts         # Root module
└── main.ts               # Application entry point
```

## Database Schema

### Tenant Entity

- `id`: Primary key
- `name`: Tenant organization name
- `slug`: Unique URL-friendly identifier
- `email`: Contact email
- `status`: Enum (pending, active, suspended)
- `createdAt`, `updatedAt`: Timestamps

### User Entity

- `id`: Primary key
- `name`: User full name
- `email`: User email (unique per tenant)
- `password`: Hashed password
- `tenantId`: Foreign key to Tenant
- `role`: Enum (TENANT_ADMIN, TENANT_USER)
- `isActive`: Boolean flag
- `createdAt`, `updatedAt`: Timestamps

### SuperAdmin Entity

- `id`: Primary key
- `name`: Admin full name
- `email`: Unique email
- `password`: Hashed password
- `createdAt`, `updatedAt`: Timestamps

## Security Features

1. **Password Hashing**: All passwords are hashed using bcrypt (10 rounds)
2. **JWT Tokens**: Secure token-based authentication with expiration
3. **Row-Level Isolation**: Automatic tenant filtering prevents cross-tenant data access
4. **Role-Based Guards**: Endpoint-level authorization enforcement
5. **Input Validation**: DTO validation using class-validator
6. **CORS Protection**: Configurable CORS settings

## Usage Examples

### Complete Flow: Tenant Registration to User Creation

1. **Register a tenant**

```bash
curl -X POST http://localhost:4000/tenants/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "email": "contact@acme.com"
  }'
```

2. **SuperAdmin approves tenant**

```bash
curl -X POST http://localhost:4000/tenants/1/approve \
  -H "Authorization: Bearer <superadmin_token>"
```

3. **SuperAdmin creates first tenant admin**

```bash
curl -X POST http://localhost:4000/users \
  -H "Authorization: Bearer <superadmin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@acme.com",
    "password": "SecurePass123",
    "role": "TENANT_ADMIN"
  }'
```

4. **Tenant admin logs in**

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@acme.com",
    "password": "SecurePass123",
    "userType": "user"
  }'
```

5. **Tenant admin creates users**

```bash
curl -X POST http://localhost:4000/users \
  -H "Authorization: Bearer <tenant_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Regular User",
    "email": "user@acme.com",
    "password": "UserPass123"
  }'
```

## Environment Variables

| Variable         | Description           | Default                                |
| ---------------- | --------------------- | -------------------------------------- |
| `DB_HOST`        | PostgreSQL host       | `localhost`                            |
| `DB_PORT`        | PostgreSQL port       | `5432`                                 |
| `DB_USERNAME`    | Database username     | `postgres`                             |
| `DB_PASSWORD`    | Database password     | `1234`                                 |
| `DB_NAME`        | Database name         | `pki_multi_tenant`                     |
| `JWT_SECRET`     | JWT signing secret    | `your-secret-key-change-in-production` |
| `JWT_EXPIRES_IN` | Token expiration      | `24h`                                  |
| `PORT`           | Application port      | `4000`                                 |
| `FRONTEND_URL`   | Frontend URL for CORS | `*`                                    |

## Scripts

```bash
# Development
npm run start:dev          # Start in watch mode
npm run start:debug         # Start in debug mode

# Production
npm run build              # Build for production
npm run start:prod        # Start production server

# Database
npm run seed              # Seed initial SuperAdmin
npm run migration:generate # Generate migration
npm run migration:run      # Run migrations
npm run migration:revert   # Revert last migration

# Code Quality
npm run lint              # Run ESLint
npm run format            # Format code with Prettier
npm run test              # Run unit tests
npm run test:e2e          # Run e2e tests
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue on the GitHub repository.

## Acknowledgments

- Built with [NestJS](https://nestjs.com/)
- Database powered by [PostgreSQL](https://www.postgresql.org/)
- Authentication using [Passport.js](http://www.passportjs.org/)
