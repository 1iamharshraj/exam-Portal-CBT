# Exam Portal - Implementation Plan

> CBT (Computer-Based Testing) platform for JEE/NEET exam preparation.
> Monorepo: `packages/frontend`, `packages/backend`, `packages/shared`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS + shadcn/ui + Zustand |
| Backend | NestJS + Mongoose + Passport JWT |
| Shared | TypeScript types + Zod validation schemas |
| Database | MongoDB Atlas |
| Monorepo | Turborepo + npm workspaces |

---

## Sprint 1: Project Setup + Auth (Foundation)

**Status: COMPLETED**

### Phase 1 — Monorepo Scaffold
- [x] Root `package.json` with npm workspaces `["packages/*"]`
- [x] `turbo.json` — pipelines: build, dev, lint
- [x] `tsconfig.base.json` — strict mode, ES2022
- [x] `.gitignore`, `.prettierrc`, `.env.example`

### Phase 2 — Shared Package
- [x] `src/types/user.types.ts` — `IUser`, `UserRole` enum (SUPER_ADMIN, ADMIN, TEACHER, STUDENT)
- [x] `src/types/auth.types.ts` — `ILoginRequest`, `ILoginResponse`, `IAuthTokens`, `IForgotPasswordRequest`, `IResetPasswordRequest`, `IChangePasswordRequest`
- [x] `src/types/api.types.ts` — `IApiResponse<T>`, `IApiError`, `IPaginatedResponse<T>`
- [x] `src/validation/auth.validation.ts` — Zod schemas: login, forgotPassword, resetPassword, changePassword
- [x] `src/validation/user.validation.ts` — createUserSchema, updateUserSchema
- [x] `src/constants/` — roles, api-routes, app constants
- [x] Barrel exports via `src/index.ts`

### Phase 3 — Backend Scaffold + Database
- [x] `main.ts` — global prefix `/api/v1`, CORS, cookie-parser, helmet, ValidationPipe
- [x] `app.module.ts` — ConfigModule, MongooseModule, ThrottlerModule
- [x] User schema (email, passwordHash, firstName, lastName, role, phone, batch, isActive, mustChangePassword)
- [x] Users service + controller
- [x] Common decorators: `@Roles()`, `@CurrentUser()`, `@Public()`
- [x] Guards: JwtAuthGuard (global), RolesGuard
- [x] Filters: HttpExceptionFilter, MongoExceptionFilter
- [x] Interceptors: TransformInterceptor, LoggingInterceptor

### Phase 4 — Auth Module (Backend)
- [x] Refresh token schema (userId, token, expiresAt, isRevoked, userAgent, ipAddress)
- [x] Passport strategies: JWT (Bearer) + JWT-Refresh (httpOnly cookie)
- [x] `POST /auth/login` — validate creds → generate tokens → set refresh cookie
- [x] `POST /auth/logout` — revoke refresh token → clear cookie
- [x] `POST /auth/refresh` — validate cookie → rotate tokens
- [x] `GET /auth/me` — return current user
- [x] `POST /auth/forgot-password` — generate reset token (logged to console)
- [x] `POST /auth/reset-password` — validate token → hash new password
- [x] `POST /auth/change-password` — verify old → update → clear mustChangePassword
- [x] Rate limiting: login 5/60s, forgot-password 3/300s

### Phase 5 — Seed Script
- [x] 1 ADMIN: `admin@examportal.com` / `Admin@123`
- [x] 1 TEACHER: `teacher@examportal.com` / `Teacher@123`
- [x] 5 STUDENTS: `student1-5@examportal.com` / `Student@123`
- [x] bcrypt 12 rounds, students have `mustChangePassword: true`

### Phase 6 — Frontend Scaffold
- [x] Vite config with `@` alias, dev proxy to backend
- [x] Tailwind theme: primary navy `#1B2A4A`, accent blue `#3B82F6`, NTA palette
- [x] shadcn/ui base components installed
- [x] Axios instance with Bearer token + silent 401 refresh interceptor
- [x] Zustand auth store (user, accessToken, login, logout, checkAuth)
- [x] Router: PublicRoute, ProtectedRoute, RoleGuard
- [x] Layouts: AuthLayout, DashboardLayout (placeholder)

### Phase 7 — Auth Pages (Frontend)
- [x] LoginPage — split-screen 60/40 with BrandingPanel + LoginForm
- [x] ForgotPasswordPage — centered card, success state transition
- [x] ResetPasswordPage — token from URL, PasswordStrengthMeter
- [x] ChangePasswordPage — old + new + confirm
- [x] DashboardRedirect — role-based redirect
- [x] NotFoundPage — 404

---

## Sprint 2: Dashboard Layout + Navigation

**Status: COMPLETED**

### Tasks
- [x] `AdminLayout` — collapsible sidebar + topbar + main content area
- [x] `Sidebar` — role-filtered nav items (Dashboard, Users, Questions, Tests, Results, Settings)
- [x] `MobileSidebar` — slide-in drawer for responsive
- [x] `Topbar` — page title, mobile menu toggle, user avatar dropdown
- [x] `StudentLayout` — top-nav layout for students
- [x] `AdminDashboard` — stat cards + placeholder charts
- [x] `TeacherDashboard` — placeholder
- [x] `StudentDashboard` — placeholder
- [x] Zustand `uiStore` — sidebar collapsed state
- [x] Route structure: `/admin/dashboard`, `/teacher/dashboard`, `/student/dashboard`

---

## Sprint 3: User Management Module

**Status: COMPLETED**

### Backend
- [x] `BulkActionDto` — ids array + optional isActive
- [x] `users.service.ts` — added `bulkUpdateStatus()`, `bulkDelete()`, `bulkCreate()`
- [x] `users.controller.ts` — 3 new endpoints:
  - `POST /users/bulk-import` — create multiple users from CSV data
  - `PATCH /users/bulk-status` — toggle active status for multiple users
  - `DELETE /users/bulk-delete` — delete multiple users

### Frontend
- [x] `user.service.ts` — getAll, getById, create, update, delete, bulkUpdateStatus, bulkDelete, bulkImport
- [x] `UserListPage` — filters bar, bulk actions bar, pagination, create/edit/import dialogs
- [x] `UserTable` — data table with checkbox selection, role/status badges, row action dropdown
- [x] `UserFilters` — search + role + status selects with clear button
- [x] `UserDialog` — add/edit dialog with react-hook-form + Zod validation
- [x] `BulkImportDialog` — CSV file upload with parsing, preview table, error reporting
- [x] `Pagination` — reusable component with smart page number display
- [x] Route: `/users` → UserListPage

### shadcn/ui Components Added
- dialog, table, select, badge, dropdown-menu, checkbox, separator, avatar, tooltip

---

## Sprint 4: Question Bank Module

**Status: COMPLETED**

### Shared Types
- [x] `QuestionType` enum — MCQ_SINGLE, MCQ_MULTIPLE, NUMERICAL, ASSERTION_REASON
- [x] `DifficultyLevel` enum — EASY, MEDIUM, HARD
- [x] `IQuestion` interface, `ICreateQuestionRequest`, `IUpdateQuestionRequest`
- [x] `SUBJECTS` constant — Physics, Chemistry, Mathematics, Botany, Zoology
- [x] `SUBJECT_TOPICS` taxonomy — topics per subject (e.g., Physics: Mechanics, Optics, etc.)
- [x] Zod schemas: `createQuestionSchema`, `updateQuestionSchema`

### Backend
- [x] `question.schema.ts` — Mongoose schema with indexes (subject+topic, difficulty, type, text search)
- [x] `create-question.dto.ts` — NestJS DTO with class-validator
- [x] `update-question.dto.ts` — explicit optional fields
- [x] `questions.service.ts` — CRUD, filtering, search ($regex), pagination, bulkCreate, getStats (aggregation)
- [x] `questions.controller.ts` — 7 endpoints:
  - `POST /questions` — create single
  - `POST /questions/bulk-import` — create bulk
  - `GET /questions/stats` — aggregation by subject/difficulty/type
  - `GET /questions` — list with filters + pagination
  - `GET /questions/:id` — get by ID
  - `PATCH /questions/:id` — update
  - `DELETE /questions/:id` — delete

### Frontend
- [x] `question.service.ts` — API service layer
- [x] `QuestionBankPage` — search, multi-filter bar, card list, pagination, dialogs
- [x] `QuestionCard` — HTML-stripped preview, subject/difficulty/type/marks badges, action dropdown
- [x] `QuestionFilters` — subject → topic cascading selects, type, difficulty
- [x] `QuestionDialog` — dynamic form (MCQ options w/ checkboxes vs Numerical value+tolerance)
- [x] `QuestionPreview` — preview dialog with correct answer highlighting, explanation
- [x] `QuestionImportDialog` — CSV import with template download, preview, error display
- [x] Route: `/questions` → QuestionBankPage

---

## Sprint 5: Test Creation Module

**Status: COMPLETED**

### Shared Types
- [x] `ExamType` enum — JEE_MAIN, JEE_ADVANCED, NEET, CUSTOM
- [x] `TestStatus` enum — DRAFT, PUBLISHED, ACTIVE, COMPLETED
- [x] `IMarkingScheme`, `ITestSection`, `ITest` interfaces
- [x] `ICreateTestRequest`, `IUpdateTestRequest`
- [x] `EXAM_PRESETS` — preset configs for JEE Main (3 sections × 25Q), NEET (4 sections × 45Q), JEE Advanced (3 sections × 18Q)

### Backend
- [x] `test.schema.ts` — Mongoose schema with embedded MarkingScheme + TestSection subdocuments
- [x] `create-test.dto.ts`, `update-test.dto.ts`
- [x] `tests.service.ts` — CRUD, totalMarks calculation, publish validation (checks section question counts)
- [x] `tests.controller.ts` — 6 endpoints:
  - `POST /tests` — create
  - `GET /tests` — list with filters + pagination
  - `GET /tests/:id` — get by ID
  - `PATCH /tests/:id` — update
  - `PATCH /tests/:id/publish` — publish (validates questions)
  - `DELETE /tests/:id` — delete
- [x] `tests.module.ts` — registered in AppModule

### Frontend
- [x] `test.service.ts` — API service (getAll, getById, create, update, publish, delete)
- [x] `TestCard` — status badge, metadata (time, questions, marks, sections), action dropdown
- [x] `CreateTestDialog` — exam type presets, dynamic section management, marking scheme per section
- [x] `TestListPage` — list with status/type filters, pagination, create/publish/delete actions
- [x] Route: `/tests` → TestListPage
- [x] TypeScript check + fix errors

---

## Sprint 6: Test Builder (Question Assignment)

**Status: NOT STARTED**

### Planned Tasks
- [ ] `TestBuilderPage` — full-page editor for assigning questions to test sections
- [ ] Section tabs — switch between sections
- [ ] Question picker — filter from question bank, add to section
- [ ] Drag-and-drop reordering within sections
- [ ] Section summary — question count, marks, time allocation
- [ ] Auto-pick: randomly select N questions by subject/topic/difficulty
- [ ] Preview mode — see test as student would
- [ ] Save draft / publish workflow

---

## Sprint 7: Test Taking Engine (Student Side)

**Status: NOT STARTED**

### Planned Tasks
- [ ] `TestAttemptPage` — full-screen exam interface
- [ ] Question palette — NTA-style color coding:
  - Grey: Not visited
  - Red: Not answered
  - Green: Answered
  - Purple: Marked for review
  - Purple+Green: Answered and marked
- [ ] Section navigation tabs
- [ ] Timer — overall + section-wise countdown
- [ ] Question display with option selection (MCQ) / numerical input
- [ ] Mark for review toggle
- [ ] Clear response button
- [ ] Auto-save answers periodically
- [ ] Submit confirmation dialog
- [ ] Auto-submit on time expiry
- [ ] `StudentTestListPage` — available/upcoming/completed tests
- [ ] Test instructions page before starting

---

## Sprint 8: Results & Analytics

**Status: NOT STARTED**

### Planned Tasks
- [ ] Auto-grading on submission (MCQ + Numerical)
- [ ] `TestResult` schema — per-student result with section-wise breakdown
- [ ] `ResultPage` (Student) — score, section analysis, question-wise review
- [ ] `TestResultsPage` (Admin) — all student results for a test
- [ ] Analytics dashboard:
  - Score distribution chart
  - Section-wise performance
  - Difficulty-wise accuracy
  - Time spent per question
  - Comparison with average
- [ ] Leaderboard per test
- [ ] Export results as CSV

---

## Sprint 9: Advanced Features

**Status: NOT STARTED**

### Planned Tasks
- [ ] Question image support (S3/Cloudinary upload)
- [ ] Rich text editor for question text (math equations via KaTeX)
- [ ] Batch management CRUD
- [ ] Student profile page
- [ ] Test scheduling with auto-start/end
- [ ] Email notifications (SendGrid / Resend)
- [ ] Activity logs / audit trail

---

## Sprint 10: Polish & Deployment (Vercel)

**Status: NOT STARTED**

### Deployment Architecture
- **Frontend**: Vercel (static SPA build)
- **Backend**: Vercel Serverless Functions (NestJS adapter)
- **Database**: MongoDB Atlas (already configured)

### Vercel Setup
- [ ] `vercel.json` at project root — monorepo config, routes, rewrites
- [ ] NestJS Vercel adapter — `@vendia/serverless-express` or `@nestjs/platform-express` for serverless
- [ ] `packages/backend/api/index.ts` — serverless entry point wrapping NestJS app
- [ ] Frontend `vite.config.ts` — update API base URL for production (env-based)
- [ ] Environment variables in Vercel dashboard (MONGODB_URI, JWT secrets, FRONTEND_URL)
- [ ] CORS config — allow Vercel production domain
- [ ] Build commands in Vercel project settings:
  - Frontend: `cd packages/frontend && npm run build` → output `packages/frontend/dist`
  - Backend: `cd packages/backend && npm run build` → serverless functions

### Performance & Polish
- [ ] Performance optimization (React.memo, virtualization for large lists)
- [ ] Error boundaries everywhere
- [ ] Loading skeletons for all pages
- [ ] Dark mode support
- [ ] SEO meta tags + favicon

### CI/CD
- [ ] GitHub Actions workflow — lint + type-check + build on PR
- [ ] Vercel GitHub integration — auto-deploy on push to main
- [ ] Preview deployments on PRs

### Monitoring
- [ ] Sentry integration (frontend + backend error tracking)
- [ ] Vercel Analytics (Web Vitals)

---

## Key Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth tokens | JWT access (15m) + refresh (7d httpOnly cookie) | Secure, stateless, auto-refresh |
| State management | Zustand | Lightweight, no boilerplate |
| Form validation | Zod (shared) + react-hook-form | Shared schemas between FE/BE |
| Styling | Tailwind + shadcn/ui | Consistent design, easy theming |
| API layer | Axios with interceptors | Auto token refresh on 401 |
| Database | MongoDB Atlas | Flexible schema for questions/tests |
| Deployment | Vercel (FE + BE serverless) | Zero-config, auto-deploy from GitHub |

---

## Environment Variables

```env
MONGODB_URI=mongodb+srv://...
JWT_ACCESS_SECRET=<secret>
JWT_REFRESH_SECRET=<secret>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
FRONTEND_URL=http://localhost:5173
PORT=3000
```

---

## Commands

```bash
# Development
npm run dev              # Start all packages (Turborepo)
npm run build            # Build all packages
npm run seed -w @exam-portal/backend  # Seed database

# Individual packages
npm run dev -w @exam-portal/frontend  # Frontend only
npm run dev -w @exam-portal/backend   # Backend only
npm run build -w @exam-portal/shared  # Build shared types
```
