# SURNA Complete File Index

## 📁 Project Structure Overview

This document lists every file in the SURNA codebase with descriptions.

### 🔧 Configuration Files
```
package.json                    - Dependencies and scripts
tsconfig.json                  - TypeScript configuration
vite.config.ts                 - Vite build configuration
tailwind.config.ts             - Tailwind CSS configuration
drizzle.config.ts              - Database configuration
components.json                - UI components configuration
postcss.config.js              - PostCSS configuration
playwright.config.ts           - E2E testing configuration
docker-compose.yml             - Development containers
docker-compose.production.yml  - Production containers
Dockerfile                     - Container build instructions
```

### 🗄️ Database & Shared Code
```
shared/
├── schema.ts                  - Complete database schema (1400+ lines)
└── sportsData.ts             - Sports categories and data
```

### 🖥️ Server Code (Backend)
```
server/
├── index.ts                  - Main server entry point
├── db.ts                     - Database connection
├── storage.ts                - Database operations layer
├── routes.ts                 - API routes (3500+ lines)
├── replitAuth.ts             - Authentication system
├── vite.ts                   - Development server setup
├── gamificationInit.ts       - Gamification initialization

├── ai/
│   └── skillAnalysisService.ts
├── analytics/
│   ├── analyticsService.ts
│   ├── realTimeAnalytics.ts
│   └── scheduledJobs.ts
├── cache/
│   └── redisWrapper.ts
├── gamification/
│   ├── challengesService.ts
│   ├── gamificationService.ts
│   └── rewardsService.ts
├── media/
│   ├── mediaRoutes.ts
│   └── mediaStorage.ts
├── middleware/
│   ├── analyticsMiddleware.ts
│   ├── rateLimiter.ts
│   └── validate.ts
├── monitoring/
│   └── healthCheck.ts
├── notifications/
│   └── pushService.ts
├── performance/
│   ├── caching.ts
│   ├── compression.ts
│   ├── database.ts
│   ├── monitoring.ts
│   └── pagination.ts
├── realtime/
│   └── socketServer.ts
├── routes/
│   ├── adminRoutes.ts
│   ├── analytics.ts
│   ├── analyticsRoutes.ts
│   ├── locationRoutes.ts
│   ├── marketingRoutes.ts
│   ├── paymentRoutes.ts
│   ├── profile.ts
│   └── webhookRoutes.ts
├── security/
│   ├── auditLogging.ts
│   ├── backupRecovery.ts
│   ├── complianceReporting.ts
│   ├── dataEncryption.ts
│   ├── gdprCompliance.ts
│   ├── inputValidation.ts
│   ├── mfaService.ts
│   ├── parentalConsent.ts
│   ├── passwordPolicy.ts
│   ├── passwordSecurity.ts
│   ├── privacyControls.ts
│   ├── roleBasedAccess.ts
│   ├── securityDashboard.ts
│   ├── securityHeaders.ts
│   ├── securityMiddleware.ts
│   ├── securityMonitoring.ts
│   ├── securityRoutes.ts
│   └── twoFactorAuth.ts
└── services/
    ├── adminService.ts
    ├── aiChatService.ts
    ├── aiRecommendationService.ts
    ├── analyticsService.ts
    ├── calendarService.ts
    ├── challengeService.ts
    ├── communicationService.ts
    ├── emailCampaignService.ts
    ├── eventManagementService.ts
    ├── gamificationService.ts
    ├── growthAnalyticsService.ts
    ├── inventoryService.ts
    ├── locationService.ts
    ├── marketplaceRecommendationService.ts
    ├── moderationService.ts
    ├── notificationService.ts
    ├── paymentService.ts
    ├── predictiveEngagementService.ts
    ├── pricingService.ts
    ├── promotionService.ts
    ├── recommendationService.ts
    ├── referralService.ts
    ├── searchService.ts
    ├── smartMatchingService.ts
    ├── socialSharingService.ts
    ├── teamManagementService.ts
    └── videoUploadService.ts
```

### 🎨 Client Code (Frontend)
```
client/
├── index.html                - Main HTML template
├── public/
│   ├── manifest.json         - PWA manifest
│   ├── offline.html          - Offline page
│   └── sw.js                 - Service worker
└── src/
    ├── main.tsx              - React entry point
    ├── App.tsx               - Main app component
    ├── index.css             - Global styles (900+ lines)
    ├── surna-theme.css       - Theme variables
    
    ├── components/           - Reusable components
    │   ├── accessibility/    - Accessibility components
    │   ├── ai/              - AI-powered components
    │   ├── gamification/    - Gamification UI
    │   ├── performance/     - Performance optimized components
    │   ├── pwa/             - PWA components
    │   ├── ui/              - Base UI components (40+ files)
    │   └── [50+ component files]
    
    ├── contexts/             - React contexts
    │   ├── SurnaThemeContext.tsx
    │   └── ThemeContext.tsx
    
    ├── hooks/                - Custom React hooks
    │   ├── use-mobile.tsx
    │   ├── use-toast.ts
    │   ├── useAnalytics.ts
    │   ├── useAuth.ts
    │   ├── useConnectivity.ts
    │   └── [15+ hook files]
    
    ├── i18n/                 - Internationalization
    │   ├── config.ts
    │   └── locales/          - Translation files
    │       ├── ar.json
    │       ├── de.json
    │       ├── en.json
    │       ├── es.json
    │       ├── fr.json
    │       ├── hi.json
    │       ├── ja.json
    │       ├── ko.json
    │       ├── pt.json
    │       └── zh.json
    
    ├── lib/                  - Utility libraries
    │   ├── accessibility.ts
    │   ├── auth.ts
    │   ├── authUtils.ts
    │   ├── csrf.ts
    │   ├── i18n.ts
    │   ├── localization.ts
    │   ├── media.ts
    │   ├── mediaUtils.ts
    │   ├── offlineStorage.ts
    │   ├── performance.ts
    │   ├── queryClient.ts
    │   ├── serviceWorker.ts
    │   ├── serviceWorkerRegistration.ts
    │   └── utils.ts
    
    ├── pages/                - Page components
    │   ├── analytics/
    │   │   └── admin-dashboard.tsx
    │   ├── monetization/
    │   │   ├── AffiliateProgram.tsx
    │   │   ├── CoachSignup.tsx
    │   │   ├── GymListing.tsx
    │   │   └── TeamRegistration.tsx
    │   └── [70+ page files]
    
    ├── services/
    │   └── offlineService.ts
    
    ├── styles/
    │   └── rtl.css
    
    └── utils/
        └── formatting.ts
```

### 🚀 DevOps & Infrastructure
```
config/
└── nginx.conf

docker-compose.yml
docker-compose.production.yml
Dockerfile

logging/
└── logstash/
    └── pipeline/
        └── logstash.conf

monitoring/
├── alert_rules.yml
└── prometheus.yml

nginx/
└── nginx.conf

scripts/
├── backup.sh
├── deploy.sh
├── healthcheck.js
└── restore.sh
```

### 🧪 Testing
```
tests/
├── e2e/
│   ├── auth.spec.ts
│   └── navigation.spec.ts
├── integration/
│   └── api.test.ts
├── load_test.js
├── stage3_media_test.js
├── stage4_realtime_test.js
├── stage5_analytics_test.js
└── stress_test.js
```

### 📁 Storage & Assets
```
uploads/
├── images/
├── thumbnails/
└── videos/

attached_assets/
└── [Various user uploaded files and assets]
```

## 📊 Code Statistics
- **Total Files**: 300+ files
- **Lines of Code**: 50,000+ lines
- **Languages**: TypeScript, CSS, JSON, YAML, Bash
- **Frameworks**: React, Express, Drizzle ORM
- **Database**: PostgreSQL with 35+ tables

## 🏗️ Architecture Overview
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Replit OIDC integration
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: TanStack Query for server state
- **Build**: Vite for frontend, esbuild for backend
- **PWA**: Service Worker + Manifest + Offline support

Would you like me to show you specific files or sections? Just ask for any file from this index!