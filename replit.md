# Enterprise Asset Management System

## Overview

This is an Enterprise Asset Management System built for tracking hardware, software, and equipment with comprehensive audit trails. The application provides asset lifecycle management, Active Directory user integration, spreadsheet import capabilities, and complete audit logging for compliance requirements.

The system follows a monorepo structure with a React frontend and Express backend, using PostgreSQL for data persistence. It's designed for enterprise environments where asset tracking, user assignment, and change auditing are critical.

**Self-Hosted Ready**: This application uses local username/password authentication and can be deployed on any server with Node.js and PostgreSQL.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Build Tool**: Vite with HMR support

The frontend follows a page-based architecture under `client/src/pages/` with shared components in `client/src/components/`. Path aliases are configured (`@/` for client source, `@shared/` for shared code).

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Authentication**: Local authentication with Passport.js (username/password with bcrypt hashing)
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple
- **API Design**: RESTful endpoints under `/api/` prefix

The server uses a storage abstraction layer (`server/storage.ts`) that implements an interface for all database operations, making it easy to modify or mock data access.

### Database Schema
Located in `shared/schema.ts`, the schema includes:
- **users**: Application users with hashed passwords for authentication
- **sessions**: Session storage for authentication persistence
- **categories**: Asset categorization with hierarchical parent-child relationships
- **assets**: Core asset records with status tracking, category and user assignments
- **adUsers**: Active Directory user records for asset assignment
- **auditLogs**: Comprehensive change tracking with entity references
- **importTemplates**: Saved column mappings for spreadsheet imports

### Authentication Flow
Uses local authentication with Passport.js:
- Session-based authentication stored in PostgreSQL
- Password hashing with bcrypt (12 rounds)
- Protected routes via `isAuthenticated` middleware
- User registration and login endpoints

## Self-Hosting Deployment

### Environment Variables

**Required** environment variables for production:
```
DATABASE_URL=postgresql://user:password@host:5432/database
SESSION_SECRET=your-random-secret-key-here  # REQUIRED - see below
NODE_ENV=production
PORT=5000 (optional, defaults to 5000)
```

**IMPORTANT: SESSION_SECRET**
- This variable is **mandatory** for production deployments
- The application will refuse to start in production mode without it
- Generate a secure random string of at least 32 characters:
  ```bash
  # Linux/macOS:
  openssl rand -base64 32
  
  # Or use any password generator
  ```
- Never reuse secrets between environments
- Keep this secret safe - if compromised, regenerate immediately

### Production Build

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Build for production
npm run build

# Start production server
npm start
```

### Docker Deployment (optional)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 5000
CMD ["npm", "start"]
```

## External Dependencies

### Database
- **PostgreSQL**: Primary data store (configured via `DATABASE_URL` environment variable)
- **Drizzle ORM**: Type-safe database queries and schema management

### Third-Party Libraries
- **bcryptjs**: Password hashing for secure authentication
- **passport-local**: Local authentication strategy
- **date-fns**: Date formatting and manipulation
- **zod**: Schema validation for API inputs
- **Radix UI**: Accessible UI component primitives
- **Lucide React**: Icon library

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout current user
- `GET /api/auth/user` - Get current authenticated user

### Assets
- `GET /api/assets` - List all assets with relations
- `GET /api/assets/:id` - Get single asset
- `POST /api/assets` - Create new asset
- `PATCH /api/assets/:id` - Update asset
- `DELETE /api/assets/:id` - Delete asset

### Categories
- `GET /api/categories` - List all categories
- `POST /api/categories` - Create category
- `PATCH /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### AD Users
- `GET /api/ad-users` - List all AD users
- `POST /api/ad-users` - Create AD user
- `PATCH /api/ad-users/:id` - Update AD user
- `DELETE /api/ad-users/:id` - Delete AD user
- `POST /api/ad-users/sync` - Trigger AD sync (simulated)

### Audit Logs
- `GET /api/audit-logs` - List all audit logs
- `GET /api/audit-logs?limit=100` - Get limited audit logs

### Import
- `POST /api/import` - Import assets from spreadsheet data

### Stats
- `GET /api/stats` - Get dashboard statistics
