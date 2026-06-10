# Overview

SURNA is a comprehensive sports social platform designed for the sports community, integrating social networking, team management, messaging, and e-commerce. It allows athletes to connect, share their journeys, discover equipment, find coaches, and manage teams via an integrated web platform. The platform aims to be a central hub for all sports-related activities and interactions, with a vision to become the central digital ecosystem for global sports.

# User Preferences

Preferred communication style: Simple, everyday language.

Main Page Preference: MobileHome.tsx is the preferred main page and must be preserved without changes. This is the user's chosen home interface that should never be modified.

# System Architecture

## Frontend Architecture
The client-side is built with React and TypeScript, utilizing a modern component-based architecture. UI components are developed using shadcn/ui on top of Radix UI primitives, styled with Tailwind CSS and CSS variables for theming (including light/dark mode). Wouter handles client-side routing, and React Query (TanStack Query) manages server state and caching. The platform adheres to responsive design principles with a mobile-first approach.

## Backend Architecture
The server uses a Node.js/Express.js architecture with TypeScript within a monorepo structure. It provides RESTful API endpoints, with session management handled by express-session with PostgreSQL storage. Middleware is used for logging, error handling, and authentication. The backend incorporates a robust infrastructure layer with 12 production-grade modules including background job queues (BullMQ), Redis cache-aside patterns, structured JSON logging, centralized RBAC authorization, Stripe entitlements, enhanced rate limiting with bot protection, media service with file validation/signed URLs, PostgreSQL full-text universal search, feature flags with gradual rollout, messaging delivery receipts/cursors, and platform algorithms (feed ranking, map clustering, trust scoring).

## Authentication System
Authentication is implemented via Replit's OpenID Connect (OIDC) system, integrated using Passport.js, supporting automatic user provisioning and persistent authentication. It features JWT access/refresh token rotation with Redis jti tracking, extended RBAC with 8 roles and resource-level ownership checks, comprehensive input validation with Zod schemas, field-level PII encryption, login anomaly detection, and frontend security guards. Two-factor authentication (2FA) is enforced for administrative roles.

## Database Architecture
PostgreSQL is the primary database, accessed using Drizzle ORM for type-safe operations. The schema supports users, posts, teams, messages, events, coaches, products, and their relationships. Database migrations are managed by Drizzle Kit, with Neon's serverless PostgreSQL driver providing the connection. GDPR compliance is integrated with dedicated tables for `gdpr_requests` and `consent_records`.

## API Design
The REST API follows conventional patterns with clear JSON-formatted responses, proper HTTP status codes, and structured error handling. Endpoints cover user management, social feeds, team management, real-time messaging, event management, coach marketplace, shopping functionality, and administrative actions. Zod validation is used extensively across all write routes.

## UI/UX Decisions
The platform features comprehensive person and team profiles with Facebook-style layouts. A map system supports 6 entity types with color-coded SVG pins and entity-specific actions. Accessibility (WCAG 2.1 AA compliant) and inclusive design are core, with ARIA helpers, focus management, screen reader support, high contrast mode, reduced motion, and responsive design for assistive devices. SURNA Pro, a standalone application, features a pure black dark mode with green (#34C759) accent, providing a premium aesthetic.

## Feature Specifications
Key features include:
- **Comprehensive Profiles:** Detailed person and team profiles, including photo gallery (`user_photos`), peer reviews/ratings (`user_reviews`), and post comments thread.
- **Marketplace:** Full e-commerce system with Stripe integration.
- **Gyms/Facilities (Places):** Management and booking system.
- **Messenger:** Real-time messaging with Socket.IO integration.
- **Map System:** Interactive map with various entity types.
- **Sports Hub Consolidation:** Unified `/discover` interface.
- **Payments & Wallet System:** Production-ready wallet management with atomic transactions, escrow holds, and overdraft protection.
- **Performance & Analytics:** Fact-based event logging, hourly rollup aggregation for all entity types, secured REST API, and dedicated analytics dashboards.
- **Admin Control System:** Production-ready admin panel with 5-role RBAC, 23 granular permissions, immutable audit logging, 2FA enforcement, and moderation capabilities.
- **Instant Teams:** System for creating and joining teams on-demand with real-time listings and map integration.

# External Dependencies

## Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL database.
- **Drizzle ORM**: Type-safe database operations.

## Authentication Services
- **Replit OIDC**: Primary OpenID Connect provider.
- **Passport.js**: Authentication middleware.

## UI Framework
- **Radix UI**: Accessible component primitives.
- **shadcn/ui**: Pre-built components with Tailwind CSS.
- **Tailwind CSS**: Utility-first CSS framework.

## State Management
- **TanStack React Query**: Server state management and caching.
- **React Hook Form**: Form state management and validation.

## Development Tools
- **Vite**: Build tool and development server.
- **TypeScript**: Type safety across the stack.
- **ESBuild**: Fast JavaScript bundler.

## Runtime Environment
- **Node.js**: Server runtime.
- **Express.js**: Backend web framework.
- **WebSocket (ws)**: Real-time communication.

## DevOps and Infrastructure
- **Docker**: Containerization.
- **GitHub Actions**: CI/CD pipeline.
- **Nginx**: Load balancer and reverse proxy.
- **Prometheus & Grafana**: Monitoring and alerting.
- **ELK Stack**: Centralized logging.
- **Playwright**: End-to-end testing.
- **Redis**: Caching and session storage.
- **BullMQ**: Robust queue system.
- **Stripe**: Payment processing and entitlements.

## Scaling Operations
See `docs/SCALING.md` for the full scaling playbook. Highlights:
- Deployment target: Replit Autoscale (multi-instance).
- Socket.IO uses **WebSocket-only** transport with the Redis adapter — no sticky sessions required.
- Sessions are Postgres-backed (`connect-pg-simple`), safe across instances.
- Postgres pool size is env-configurable: `DB_POOL_MAX` (default 10). Logged at startup.
- Graceful shutdown handles `SIGTERM`/`SIGINT` for clean Autoscale rotations: closes Socket.IO, drains the HTTP server, ends the DB pool, hard-exit after 15s.
- Load test script: `scripts/loadtest.k6.js` (k6).
- Targets: 1.5k–3k concurrent users, p95 < 400ms on reads, error rate < 1%.