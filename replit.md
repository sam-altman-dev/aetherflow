# Aetherflow

## Overview

Aetherflow is a high-density data abstraction protocol that implements advanced compression algorithms. The project features two protocol versions:

- **AetherFlow v5 (Legacy)**: Symbolic mapping optimized for redundant data patterns using lossy compression
- **AetherFlow v6 (Current)**: Universal lossless compression supporting any data type including movies, games, and encrypted data

The application is built as a full-stack TypeScript project with a React frontend and Express backend, designed to demonstrate and benchmark these compression protocols.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Build Tool**: Vite with HMR support for development

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript executed via tsx
- **API Pattern**: RESTful endpoints prefixed with `/api`
- **Static Serving**: Built frontend served from `dist/public` in production

### Data Storage
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` contains database table definitions
- **Migrations**: Managed via drizzle-kit with output to `./migrations`
- **Development Storage**: MemStorage class provides in-memory storage fallback

### Compression Protocol
- **Location**: `shared/compression.ts` contains both v5 and v6 implementations
- **v6.2.0 Features**: 100TB to KB true lossless symbolic mapping, fractal state mapping, high-entropy binary optimization
- **Verification**: SHA-256 checksums for data integrity validation

### Build System
- **Client Build**: Vite bundles React app to `dist/public`
- **Server Build**: esbuild bundles server with selective dependency bundling
- **Output**: Combined production build in `dist/` directory

### Project Structure
```
├── client/          # React frontend application
│   ├── src/
│   │   ├── components/ui/  # shadcn/ui components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities and query client
│   │   └── pages/          # Page components
├── server/          # Express backend
│   ├── index.ts     # Server entry point
│   ├── routes.ts    # API route definitions
│   ├── storage.ts   # Data storage interface
│   └── vite.ts      # Vite dev server integration
├── shared/          # Shared code between client/server
│   ├── schema.ts    # Drizzle database schema
│   └── compression.ts  # AetherFlow compression protocols
└── script/          # Build scripts
```

## External Dependencies

### Database
- **PostgreSQL**: Primary database via `DATABASE_URL` environment variable
- **Drizzle ORM**: Database queries and schema management
- **connect-pg-simple**: Session storage for PostgreSQL

### UI Framework
- **Radix UI**: Accessible component primitives (dialog, dropdown, tabs, etc.)
- **Tailwind CSS**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **Lucide React**: Icon library

### State & Data
- **TanStack Query**: Async state management and caching
- **Zod**: Schema validation
- **react-hook-form**: Form state management

### Development Tools
- **Vite**: Frontend build and dev server
- **esbuild**: Server bundling
- **tsx**: TypeScript execution
- **drizzle-kit**: Database migration tooling