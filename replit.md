# Enterprise Asset Management System

## Overview

This is an Enterprise Asset Management System built for tracking hardware, software, and equipment with comprehensive audit trails. The application provides asset lifecycle management, Active Directory user integration, spreadsheet import capabilities, and complete audit logging for compliance requirements.

The system follows a monorepo structure with a React frontend and Express backend, using PostgreSQL for data persistence. It's designed for enterprise environments where asset tracking, user assignment, and change auditing are critical.

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
- **Authentication**: Replit Auth integration (OpenID Connect)
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple
- **API Design**: RESTful endpoints under `/api/` prefix

The server uses a storage abstraction layer (`server/storage.ts`) that implements an interface for all database operations, making it easy to modify or mock data access.

### Database Schema
Located in `shared/schema.ts`, the schema includes:
- **categories**: Asset categorization with hierarchical parent-child relationships
- **assets**: Core asset records with status tracking, category and user assignments
- **adUsers**: Active Directory user records for asset assignment
- **auditLogs**: Comprehensive change tracking with entity references
- **importTemplates**: Saved column mappings for spreadsheet imports
- **sessions/users**: Authentication tables required for Replit Auth

### Authentication Flow
Uses Replit Auth (OpenID Connect) with:
- Session-based authentication stored in PostgreSQL
- Protected routes via `isAuthenticated` middleware
- User data stored in the `users` table with automatic upsert on login

### Build System
- Development: Vite dev server with Express backend proxy
- Production: Vite builds static assets to `dist/public`, esbuild bundles server to `dist/index.cjs`
- Database migrations: Drizzle Kit with `db:push` command

## External Dependencies

### Database
- **PostgreSQL**: Primary data store (configured via `DATABASE_URL` environment variable)
- **Drizzle ORM**: Type-safe database queries and schema management

### Authentication
- **Replit Auth**: OpenID Connect provider for user authentication
- Required environment variables: `REPL_ID`, `ISSUER_URL`, `SESSION_SECRET`

### Third-Party Libraries
- **xlsx**: Spreadsheet parsing for asset import functionality
- **date-fns**: Date formatting and manipulation
- **zod**: Schema validation for API inputs
- **Radix UI**: Accessible UI component primitives
- **Lucide React**: Icon library

### External Services
The application is designed to run on Replit with:
- Replit's PostgreSQL database provisioning
- Replit Auth for authentication
- Replit-specific Vite plugins for development experience