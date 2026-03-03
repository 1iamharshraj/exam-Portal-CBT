# Building a CBT system for JEE/NEET exam preparation in schools

**A Computer-Based Testing platform for 50–200 students can be built in 8–12 months for ₹36–53 lakhs using React, NestJS, PostgreSQL, and Electron.js, with full lockdown browser, AI proctoring, and JEE/NEET-pattern exam delivery.** This plan covers every dimension — from exam-pattern fidelity and anti-malpractice security to database schema design, question bank management, and deployment strategy. The system uses a hybrid architecture (on-premise exam server + cloud management portal) to ensure zero-downtime exam delivery even when internet connectivity fails — a critical concern for Indian schools. What follows is a complete six-phase development blueprint with timelines, costs, team requirements, and technical specifications for each component.

---

## JEE/NEET exam patterns the system must replicate

The platform must faithfully replicate three distinct exam formats with pixel-level accuracy to the NTA CBT interface. Getting these patterns wrong undermines the product's core value proposition.

### JEE Main (Paper 1 — B.E./B.Tech)

**75 questions, 300 marks, 3 hours.** Three subjects — Physics, Chemistry, Mathematics — each with 25 questions. Section A has **20 MCQs (single correct, +4/−1)** and Section B has **5 numerical value questions (+4/−1)**. Starting 2025, negative marking applies to numerical questions too — a change from previous years. There are **no section-wise time limits**; candidates navigate freely. No calculator is permitted (NTA confirmed this for 2026 after a typographical error in the bulletin initially suggested otherwise). Students receive blank scratch paper at the center.

### JEE Advanced

**Two papers, 3 hours each, ~54 questions per paper.** Conducted by a rotating IIT (IIT Roorkee for 2026). The question types are more diverse: single-correct MCQ (+3/−1), **multiple-correct MCQ with partial marking** (+4 for all correct, +3/+2/+1 for partially correct with no wrong selections, −2 if any wrong option selected), numerical answer type (+4/0, typically no negative marking), and matrix match/matching list (+3/−1). The marking scheme changes annually and is disclosed on exam day. Only the top 2,50,000 JEE Main qualifiers are eligible.

### NEET (2025–2026 revised pattern)

**180 compulsory questions, 720 marks, 3 hours.** The task's reference to "200 questions, 180 to attempt" reflects the 2022–2024 pattern that has been discontinued. The current format has 45 questions each in Physics, Chemistry, Botany, and Zoology — all single-correct MCQs with **+4/−1 marking**. Notably, NEET is actually an offline OMR-based exam, but coaching centers use CBT mock tests to train students, making this platform's use case valid despite the offline actual exam.

### NTA CBT interface elements to replicate

The NTA interface uses a **five-color question palette**: grey (not visited), red (not answered but viewed), green (answered), purple (marked for review, no answer), and **purple with green tick** (answered AND marked for review — critically, this IS evaluated). Navigation uses "Save & Next," "Mark for Review & Next," and "Clear Response" buttons. Sections appear as tabs along the top. A countdown timer in HH:MM:SS format auto-submits at zero. The physical keyboard is disabled — only mouse interaction is allowed, with a virtual numeric keypad for numerical answers.

---

## Recommended technology stack and architecture

### The full-stack recommendation

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | React 18+ (Vite build) | Largest ecosystem, best hiring pool in India, virtual DOM handles real-time timer/navigation efficiently |
| **State Management** | Zustand | ~1KB, minimal boilerplate, persist middleware for auto-save to IndexedDB |
| **Math Rendering** | KaTeX (student-facing), MathJax (authoring) | KaTeX renders synchronously with no reflows — critical when displaying 200 equations per exam |
| **CSS** | Tailwind CSS | Utility-first, small purged bundle, rapid UI development |
| **Backend** | NestJS (Node.js/TypeScript) | Unified TypeScript stack with frontend, built-in WebSocket gateway, modular architecture with DI |
| **ORM** | Prisma | Type-safe, auto-generated client, excellent migration system |
| **Database** | PostgreSQL 16 | ACID compliance for exam responses, JSONB for flexible question schemas, window functions for analytics |
| **Cache/Queue** | Redis 7 | BullMQ job queues, session cache, real-time heartbeat state |
| **Real-time** | Socket.io via @nestjs/platform-socket.io | Auto-fallback to HTTP long-polling (important for unreliable school networks), room-based broadcasting |
| **Lockdown Client** | Electron.js | Kiosk mode, globalShortcut blocking, OS-level hooks for true lockdown |
| **AI Proctoring** | face-api.js + MediaPipe FaceMesh + Web Audio API | Runs entirely client-side in browser — zero cloud API cost for real-time monitoring |
| **Containerization** | Docker + Docker Compose | Single-command deployment on both local server and cloud |

**NestJS over Django or Spring Boot** is the key architectural decision. A unified TypeScript stack means one language across frontend, backend, and Electron client — reducing hiring complexity and enabling code sharing (validation schemas, type definitions, utility functions). NestJS's built-in WebSocket gateway handles live proctoring alerts and exam monitoring without additional infrastructure. For a 50–200 student school, Spring Boot's JVM memory overhead is unnecessary, and Django loses the TypeScript unification advantage.

### Hybrid deployment architecture

The recommended deployment uses an **on-premise Ubuntu server for exam delivery** (eliminating internet dependency during exams) and a **DigitalOcean cloud instance for management, analytics, and backup**. During exams, all 200 student machines connect to the local server via LAN at sub-10ms latency. The cloud component handles practice tests, result viewing, parent portals, and daily database syncing.

**On-premise hardware requirements for 200 concurrent users**: Intel Xeon/i7 (8 cores), **32 GB RAM**, 512 GB NVMe SSD, dual Gigabit NIC, Ubuntu 24.04 LTS. Network needs a managed 48-port Gigabit switch and 4–6 WiFi access points (Ubiquiti UniFi recommended). The entire local infrastructure costs **₹4–9 lakhs** (without student terminals). Monthly cloud costs on DigitalOcean's Bangalore datacenter run approximately **₹5,000/month** ($59) for a 2-vCPU/4GB droplet, managed PostgreSQL, managed Redis, and 250GB Spaces storage.

---

## Database schema design

The schema uses PostgreSQL with JSONB columns to handle variable question structures while maintaining relational integrity for exam responses. Key design decisions: separate Response table (not embedded in attempts) for efficient auto-save via UPSERT; proctoring events in a dedicated high-write table with composite indexes; PostgreSQL array types with GIN indexes for tag-based question filtering; and soft deletes throughout.

### Core models

**Users**: `id (UUID)`, `email`, `passwordHash`, `firstName`, `lastName`, `role (SUPER_ADMIN|ADMIN|TEACHER|STUDENT)`, `phone`, `batch`, `parentPhone`, `isActive`, timestamps. Role-based access control with JWT (15-min access tokens + 7-day refresh tokens).

**Questions**: `id`, `questionText (HTML with LaTeX delimiters)`, `questionType (MCQ_SINGLE|MCQ_MULTIPLE|NUMERICAL|ASSERTION_REASON)`, `options (JSONB array)`, `correctAnswer (JSONB — ["B"] for single, ["A","C"] for multiple, {"value": 4.5, "tolerance": 0.01} for numerical)`, `subject`, `topic`, `subtopic`, `difficultyLevel`, `marks`, `negativeMarks`, `explanation`, `images (JSONB)`, `tags (text array with GIN index)`, `createdBy (FK)`. Indexes on `(subject, topic)` and `(difficultyLevel)`.

**Tests**: `id`, `title`, `examType (JEE_MAIN|JEE_ADVANCED|NEET|CUSTOM)`, `sections (JSONB — [{name, questionCount, totalMarks, timeLimit, markingScheme}])`, `totalTimeMinutes`, `hasSectionTimeLimit`, `randomizeQuestions`, `randomizeOptions`, `startTime`, `endTime`, `status (DRAFT|PUBLISHED|ACTIVE|COMPLETED)`.

**TestAttempts**: `id`, `studentId (FK)`, `testId (FK)`, `startTime`, `endTime`, `questionOrder (JSONB — randomized question ID sequence)`, `status (IN_PROGRESS|SUBMITTED|AUTO_SUBMITTED|TERMINATED)`, `ipAddress`, `userAgent`. Unique constraint on `(studentId, testId)`.

**Responses**: `id`, `attemptId (FK)`, `questionId (FK)`, `selectedOptions (JSONB)`, `timeSpentSecs`, `markedForReview`, `visited`, `answeredAt`. Unique constraint on `(attemptId, questionId)` for efficient UPSERT auto-save.

**ProctoringEvents**: `id`, `attemptId (FK)`, `eventType (FACE_NOT_DETECTED|MULTIPLE_FACES|TAB_SWITCH|FULLSCREEN_EXIT|COPY_PASTE_ATTEMPT|...)`, `timestamp`, `confidenceScore (Float)`, `screenshotUrl`, `details (JSONB)`. Indexes on `(attemptId, timestamp)` and `(eventType)`.

**Results**: `id`, `attemptId (FK, unique)`, `totalScore`, `maxScore`, `percentage`, `sectionWiseScores (JSONB)`, `correctCount`, `incorrectCount`, `unattemptedCount`, `rank`, `percentile`.

---

## Phase 1: Foundation and core platform (weeks 1–6)

### Objectives
Establish the application foundation — authentication, user management, role-based access control, admin dashboard shell, and basic student portal. This phase produces the scaffolding upon which all subsequent features are built.

### Features and deliverables

**Authentication system** with JWT (access + refresh tokens), login/logout, password reset via email, and session management. **User management CRUD** with bulk CSV import for students (name, email, phone, batch, parent phone). **Role-based access**: Super Admin (full system), Admin (school-level), Teacher (question bank + tests), Student (take tests + view results). **Admin dashboard** skeleton with sidebar navigation, user listing with search/filter, batch management. **Student portal** shell with upcoming tests view, past test history, and profile page. **Responsive layout** built with Tailwind CSS matching NTA's interface aesthetics — dark header, clean question area, collapsible right panel.

### Technical implementation

Initialize the project with a monorepo structure (Nx or Turborepo) containing `packages/frontend` (React + Vite), `packages/backend` (NestJS), `packages/shared` (TypeScript types and validation schemas), and `packages/electron` (lockdown client, added in Phase 3). Set up PostgreSQL with Prisma ORM, Redis for session cache, Docker Compose for local development, and CI/CD pipeline (GitHub Actions). Implement Passport.js authentication with `@nestjs/passport`, guards for role-based route protection, and rate limiting on auth endpoints.

### Tech stack for this phase
React 18, Vite, Tailwind CSS, React Router v6, Zustand, NestJS, Prisma, PostgreSQL, Redis, Docker, JWT/Passport.js

### Team requirements
2 full-stack developers, 1 UI/UX designer (part-time)

### Timeline: 4–6 weeks

### Milestones
- Week 2: Auth system complete, database migrations running, Docker environment operational
- Week 4: Admin dashboard with user CRUD functional, CSV bulk import working
- Week 6: Student portal shell live, role-based routing enforced, CI/CD pipeline deployed

---

## Phase 2: Question bank and test creation engine (weeks 7–14)

### Objectives
Build the question bank management system with import capabilities, rich text editor for manual entry, and a test builder that accurately configures JEE Main, JEE Advanced, and NEET exam patterns. Deliver the complete exam-taking interface.

### Question bank management

**Rich text editor**: CKEditor 5 with MathType/ChemType plugin (commercial, ~$500–2,000/year) for WYSIWYG math and chemistry equation editing. Alternative free path: TipTap editor with custom KaTeX extension. Questions stored as HTML with LaTeX delimiters (`\(...\)` for inline, `\[...\]` for display math). Chemistry equations use `mhchem` notation (`\ce{H2SO4 + 2NaOH -> Na2SO4 + 2H2O}`).

**Excel/CSV import**: Design a standardized Excel template with columns for question_type, question_text, options A–D, correct_answer, subject, topic, subtopic, difficulty, positive_marks, negative_marks, explanation, tags. Parse with SheetJS (`xlsx` npm package). Validate every row: required fields present, correct_answer matches question_type (single letter for MCQ_SINGLE, comma-separated for MCQ_MULTIPLE, numeric for NUMERICAL), subject/topic matches taxonomy. Return row-level error reports.

**DOCX import**: Use `mammoth.js` for HTML conversion. Math equations in Word (stored as OMML internally) require a pipeline: OMML → MathML (via XSLT or `omml2mathml`) → LaTeX. The `docxlatex` Python library handles this well if a Python microservice is acceptable. Always show a preview/correction step before final import.

**PDF import** (beta feature): Convert PDF pages to images → send to GPT-4o Vision API with structured extraction prompt → return JSON → human review. This is the lowest-ROI feature due to PDF's layout-based nature; prioritize Excel import.

**Categorization system**: Hierarchical subject → topic → subtopic tree (Physics → Mechanics → Newton's Laws). Difficulty levels (Easy/Medium/Hard). Bloom's taxonomy tagging (Remember through Evaluate). Free-form tags for flexible filtering (`previous_year:JEE_2024`, `source:HC_Verma`, `NCERT_chapter:5`). Full-text search via PostgreSQL `tsvector` or Elasticsearch.

### Exam-taking interface

Build the student exam interface as a faithful replica of the NTA CBT system:

- **Question palette** (right panel): Numbered boxes with five-color status coding — grey (not visited), red (viewed, no answer), green (answered), purple (marked for review), purple with green tick (answered + marked for review)
- **Navigation**: "Save & Next," "Mark for Review & Next," "Clear Response" buttons. Section tabs along the top. Click any palette number to jump directly
- **Timer**: Countdown in HH:MM:SS, auto-submit at zero, optional section-wise timers
- **Virtual numeric keypad**: For numerical answer questions (physical keyboard disabled for these)
- **Question rendering**: HTML with KaTeX for math, inline images for diagrams, scroll within question area
- **Auto-save**: Debounced 2-second save after each response change via Socket.io, with IndexedDB fallback

### Test builder (admin/teacher interface)

Create test configuration screens for each exam type:

- **JEE Main preset**: Auto-configures 3 sections × (20 MCQ + 5 Numerical), 300 marks, 180 minutes, +4/−1 marking
- **JEE Advanced preset**: 2 papers, configurable question types per section (single MCQ, multiple MCQ, numerical, matrix match), partial marking rules
- **NEET preset**: 4 sections × 45 MCQs, 720 marks, 180 minutes, +4/−1
- **Custom**: Full manual configuration of sections, question types, marks, time limits
- **Question selection**: Choose from bank by filter (subject, topic, difficulty) or random selection with constraints ("10 easy, 10 medium, 5 hard from Physics → Mechanics")
- **Test scheduling**: Set start/end windows, publish to specific batches

### Supporting all question types

- **Single Correct MCQ**: Radio buttons, +4/−1 scoring
- **Multiple Correct MCQ**: Checkboxes with partial marking engine — compute intersection of selected with correct, check for wrong selections, apply JEE Advanced partial marking formula
- **Numerical Value**: Text input + virtual keypad, range-based validation (min/max tolerance), configurable decimal precision
- **Assertion-Reason**: Two statement boxes + standard 4-option radio selection with pre-defined option templates
- **Matrix Match**: Two-column display with either dropdown matching or MCQ-combination format
- **Paragraph-based**: Sticky passage display with sub-questions below, each scored independently

### Tech stack additions
SheetJS, mammoth.js, CKEditor 5 or TipTap, KaTeX, MathJax, react-window (virtualized lists), React Hook Form

### Team requirements
2 full-stack developers, 1 frontend developer (exam interface specialist), 1 UI/UX designer (part-time)

### Timeline: 6–8 weeks

### Milestones
- Week 9: Question CRUD with rich text editor and math support operational
- Week 11: Excel import pipeline with validation complete, test builder functional
- Week 13: Full exam-taking interface with NTA-style palette, timer, and navigation working
- Week 14: All question types (MCQ single, multiple, numerical, assertion-reason) rendering and scoring correctly

---

## Phase 3: Anti-malpractice and security layer (weeks 15–20)

### Objectives
Implement browser-level cheating detection, full-screen lockdown browser, question/option randomization, and comprehensive event logging — transforming a basic test platform into a secure examination environment.

### Full-screen lockdown browser with Electron.js

The Electron client is the security backbone. Core implementation:

**Kiosk mode configuration**: `BrowserWindow` with `kiosk: true`, `frame: false`, `fullscreen: true`, `resizable: false`, `minimizable: false`, `closable: false`, `devTools: false`, `contextIsolation: true`, `sandbox: true`. This creates a frameless, full-screen window that hides the taskbar.

**Keyboard shortcut blocking**: Use Electron's `globalShortcut` module to intercept Alt+F4, Ctrl+C/V/P, Ctrl+Shift+I, PrintScreen, and F12. Use `webContents.on('before-input-event')` to block additional key combinations at the renderer level. Use `webContents.setWindowOpenHandler()` to deny all new window requests.

**OS-level lockdown (Windows)**: True Alt+Tab and Windows key blocking requires a native C++ addon using `SetWindowsHookEx` with `WH_KEYBOARD_LL` — a low-level keyboard hook. This is how Safe Exam Browser achieves real lockdown. Implement via N-API addon. Additionally, disable Task Manager via registry key (`HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Policies\System → DisableTaskMgr = 1`), reversed on exam completion.

**macOS**: Electron's kiosk mode is more effective natively on macOS — it truly traps the user without requiring additional hooks.

**Process monitoring**: Use Node.js `child_process` to periodically scan running processes and flag/terminate suspicious applications (TeamViewer, AnyDesk, screen recording software, virtual machines).

**Limitations acknowledged**: Second-device cheating (using a phone) remains undetectable by lockdown browsers alone. This is why AI proctoring (Phase 4) is essential as a complementary layer.

### Tab-switch and copy-paste detection (browser-level fallback)

For students using the web browser version (practice tests, low-stakes assessments), implement browser-level detection:

**Page Visibility API**: `document.addEventListener('visibilitychange', ...)` fires when a tab becomes hidden. Log every tab switch with timestamp and duration. The `window.blur`/`focus` events supplement this by detecting when the browser window loses focus (including Alt+Tab to another app).

**Fullscreen API**: Request fullscreen at exam start via `document.documentElement.requestFullscreen()`. Monitor `fullscreenchange` event — if the student exits fullscreen (via Escape), log the violation, display a warning, and re-request fullscreen after 2 seconds. Limitation: the Escape key cannot be blocked in browsers.

**Clipboard prevention**: Intercept `copy`, `cut`, `paste`, `selectstart`, `dragstart`, `drop` events with `e.preventDefault()`. Disable context menu (right-click). Apply CSS `user-select: none` to the entire exam interface. Block keyboard shortcuts (Ctrl+C/V/X/P, F12, Ctrl+Shift+I) via `keydown` event listener in capture phase.

**Mouse leave detection**: `document.addEventListener('mouseleave', ...)` tracks when the cursor exits the exam window.

**Window resize monitoring**: `window.addEventListener('resize', ...)` detects attempts to shrink the browser window for side-by-side viewing.

**Comprehensive event logging**: Build an `ExamSecurityMonitor` class that initializes all listeners, logs events with timestamps/metadata to an in-memory array, and batch-syncs to the server every 30 seconds. Events include: `TAB_SWITCH`, `FULLSCREEN_EXIT`, `CLIPBOARD_COPY`, `CLIPBOARD_PASTE`, `RIGHT_CLICK`, `KEYBOARD_SHORTCUT`, `WINDOW_BLUR`, `BROWSER_RESIZE`, `MOUSE_LEAVE`.

### Question and option randomization

**Algorithm**: Fisher-Yates shuffle (O(n), unbiased — every permutation equally likely) with **seed-based deterministic randomization**. JavaScript's `Math.random()` cannot be seeded, so use Mulberry32 PRNG or the `seedrandom` library. Seed generated from `hash(studentId + examId)` — ensuring the same student always gets the same randomized order for a given exam, even on page refresh.

**Option randomization**: Shuffle options A–D independently per question, build a mapping (new label → original ID), compute new correct answer label. Store both the `questionOrder` array and `optionMappings` JSON on the `TestAttempt` record for answer key reconstruction during grading.

**Difficulty-stratified shuffling**: Group questions by difficulty before shuffling to ensure all students face the same difficulty distribution (easy questions first, then medium, then hard — or any configured pattern). This prevents one student getting 10 hard questions at the start while another gets 10 easy ones.

**Server-side execution**: All randomization happens server-side. The client never sees the original order or the seed. When a student starts an exam, the server generates the randomized instance and returns only the shuffled questions.

### Tech stack additions
Electron.js, electron-builder (packaging), N-API native addons (Windows keyboard hooks), seedrandom

### Team requirements
2 full-stack developers, 1 systems developer (Electron/native), 1 QA engineer (part-time, security testing)

### Timeline: 4–6 weeks

### Milestones
- Week 16: Browser-level detection (tab switch, clipboard, fullscreen) operational with event logging
- Week 18: Electron lockdown client packaged for Windows/macOS with kiosk mode and shortcut blocking
- Week 19: Question/option randomization with seed-based determinism working, verified with 1000-permutation fairness test
- Week 20: Complete security event dashboard for administrators showing per-student violation logs

---

## Phase 4: AI proctoring and advanced monitoring (weeks 21–32)

### Objectives
Build client-side AI proctoring using webcam and microphone — face detection, multi-face detection, identity verification, gaze/head-pose tracking, and audio anomaly detection. All ML runs in the browser via TensorFlow.js to eliminate cloud API costs.

### Face detection and identity verification

**Library**: `face-api.js` (vladmandic's updated fork supporting TensorFlow.js 4.x+). Load the Tiny Face Detector model (~190KB, optimized for real-time) for continuous monitoring, and SSD MobileNet V1 (~5.4MB, higher accuracy) for identity verification at exam start.

**Multi-face detection**: Use `faceapi.detectAllFaces()` which returns all detected faces. If `detections.length > 1`, log a `MULTIPLE_FACES` event with confidence scores. If `detections.length === 0` for more than 5 consecutive seconds, log `FACE_NOT_DETECTED`.

**Identity verification**: At exam registration, capture and store a reference face descriptor (128-dimensional float array). At exam start, capture live face, compute descriptor, and compare using `FaceMatcher` with a **threshold of 0.6** (Euclidean distance). Flag `IDENTITY_MISMATCH` if the match score exceeds threshold.

**Sampling rate**: Run detection every **2 seconds** (0.5 FPS) to balance accuracy with CPU usage. On detection of an anomaly, temporarily increase to 1 FPS for confirmation before flagging.

### Head pose estimation and gaze tracking

**Library**: MediaPipe FaceMesh — provides **468 3D facial landmarks** in real-time, including iris landmarks when `refineLandmarks: true`.

**Head pose**: Extract 6 key landmarks (nose tip, chin, left/right eye corners, left/right mouth corners), define corresponding 3D model points from a canonical face model, use OpenCV.js `solvePnP()` to compute rotation vector, apply `Rodrigues()` for Euler angles (yaw, pitch, roll). Threshold: if **yaw > 30° or pitch > 25°** for more than 3 seconds continuously, flag `GAZE_AWAY`.

**Iris-based gaze tracking**: With MediaPipe's iris landmarks, compute iris center position relative to eye corners. Normalize to a 0–1 range within eye bounds. Apply head-pose compensation (subtract head rotation from gaze vector). Apply temporal smoothing (1-euro filter) to reduce jitter. If gaze point falls outside the screen region for extended periods, flag as suspicious.

**Calibration**: Optional 5-point calibration at exam start (student looks at 5 screen positions) improves accuracy from ±5° to ±2°.

### Audio anomaly detection

**Web Audio API pipeline**: `getUserMedia({audio: true})` → `AudioContext` → `MediaStreamSource` → `BiquadFilterNode` (bandpass 300–3400 Hz to isolate human speech) → `AnalyserNode`. Compute RMS volume from time-domain data every 200ms. If RMS exceeds the speech threshold for more than 2 seconds, log `AUDIO_SPEECH_DETECTED`.

**Enhanced detection**: Use the Web Speech API's `SpeechRecognition` interface for real-time transcription to detect actual speech content (keyword spotting). For speaker counting, server-side analysis can be performed on recorded audio segments using speaker diarization models.

### Live monitoring dashboard

**WebSocket architecture**: Three Socket.io namespaces — `/exam` (student events), `/proctoring` (AI events), `/admin` (monitoring dashboard). When a teacher joins the monitoring room for a test, the server broadcasts aggregated student states from Redis every 5 seconds: current question number, answered count, active status, violation count. Proctoring alerts (multi-face, gaze-away, audio) are pushed immediately.

**Dashboard UI**: Grid view showing all students with color-coded status (green = normal, yellow = minor violation, red = critical alert). Click any student card to see their webcam snapshot, violation timeline, and live proctoring metrics. Sortable by violation severity.

**Heartbeat mechanism**: Client sends heartbeat every 10 seconds via Socket.io. Server stores `SET heartbeat:{attemptId} {timestamp} EX 30` in Redis. Background job checks for missing heartbeats every 15 seconds. No heartbeat for 30 seconds → `CONNECTION_LOST` alert to admin dashboard.

### Privacy considerations

All face detection and gaze tracking runs **client-side in the browser** via TensorFlow.js — raw video never leaves the student's machine. Only event metadata (timestamps, event types, confidence scores) and occasional screenshot thumbnails (compressed, stored temporarily) are sent to the server. Implement explicit consent dialogs before enabling webcam/mic. Store minimal PII with defined retention periods (delete proctoring data 90 days after exam). The DPDP Act 2023 requires **verifiable parental consent** for minor students (under 18) — implement a consent workflow with parent/guardian signature.

### Tech stack additions
face-api.js (vladmandic fork), @mediapipe/face_mesh, OpenCV.js, TensorFlow.js (WebGL backend), Web Audio API, Web Speech API, WebRTC (getUserMedia)

### Team requirements
1 ML/AI engineer (primary), 1 full-stack developer (dashboard + WebSocket), 1 frontend developer (proctoring UI integration)

### Timeline: 8–12 weeks (longest phase — AI/ML consistently takes 1.5–2× estimated time)

### Milestones
- Week 24: Face detection + multi-face detection working in browser at 0.5 FPS with <200ms latency
- Week 27: Head pose estimation + gaze tracking operational with calibration flow
- Week 29: Audio anomaly detection pipeline complete, integrated with event logging
- Week 31: Live monitoring dashboard with real-time student status grid and proctoring alerts
- Week 32: Full proctoring system integrated with exam interface, privacy consent workflow complete

---

## Phase 5: Analytics, reporting, and optimization (weeks 33–38)

### Objectives
Build comprehensive result analytics, performance dashboards, question quality metrics, and exportable reports — turning raw exam data into actionable insights for teachers and students.

### Result calculation engine

**Background job processing**: When a student submits (or auto-submits on timer expiry), a BullMQ job calculates the result. For each response, look up the question's correct answer, apply the marking scheme based on question type, compute section-wise scores, total score, and percentage. For multiple-correct MCQs, implement the JEE Advanced partial marking formula: count correct selections and wrong selections separately, apply the appropriate partial/penalty score.

**Ranking and percentile**: After all students in a test have submitted, a batch job computes ranks (sorted by total score, then by fewer incorrect answers as tiebreaker) and percentiles using the formula `percentile = (number of students scored below / total students) × 100`.

### Student-facing analytics

- **Score card**: Section-wise breakdown showing correct, incorrect, unattempted counts and scores — matching NTA's result format
- **Question-level review**: Show each question with the student's response, correct answer, explanation, and time spent. Color-code correct (green), incorrect (red), unattempted (grey)
- **Time analysis**: Time spent per question and per section vs. optimal time allocation. Identify questions where the student spent >3 minutes (potential difficulty areas)
- **Performance trends**: Line charts showing score progression across multiple tests. Subject-wise trend analysis
- **Comparison metrics**: Student's score vs. class average, top 10%, and top scorer per section
- **Strength/weakness mapping**: Topic-wise accuracy heatmap. "You scored 85% in Thermodynamics but only 40% in Electrostatics"

### Teacher/admin analytics

- **Test overview**: Distribution histogram of scores, mean/median/mode, standard deviation
- **Question quality metrics**: Auto-computed after each test using Item Response Theory principles:
  - **Difficulty Index (p-value)**: Proportion answering correctly. Target 0.25–0.75 for discriminating questions
  - **Discrimination Index (D)**: Top 27% vs. bottom 27% correct rate difference. Target ≥0.30
  - **Distractor analysis**: For each wrong option, what percentage selected it. Non-functional distractors (<5% selection) flagged for revision
- **Batch comparison**: Compare performance across batches, identify if one batch consistently underperforms
- **Proctoring summary**: Per-test violation statistics, students ranked by violation severity, flagged attempts for manual review

### Report generation

PDF report generation using Puppeteer (headless Chrome) or `@react-pdf/renderer` for server-side PDF creation. Individual student reports, batch reports, test analysis reports. CSV/Excel export of all result data. Schedule automated report emails to parents after each test.

### Tech stack additions
Chart.js or Recharts (React charting), Puppeteer or @react-pdf/renderer (PDF generation), BullMQ (batch processing)

### Team requirements
1 full-stack developer (analytics backend + jobs), 1 frontend developer (dashboard UI + charts)

### Timeline: 4–6 weeks

### Milestones
- Week 34: Result calculation engine complete with correct scoring for all question types including partial marking
- Week 36: Student analytics dashboard with score cards, time analysis, and performance trends
- Week 37: Teacher analytics with question quality metrics and batch comparison
- Week 38: PDF report generation and CSV export functional

---

## Phase 6: Testing, deployment, training, and launch (weeks 39–44)

### Objectives
Comprehensive quality assurance, production deployment on hybrid infrastructure, staff training, documentation, and pilot testing with real students.

### Quality assurance

**Functional testing**: Test every exam pattern (JEE Main, JEE Advanced, NEET, Custom) end-to-end. Verify marking schemes — especially partial marking for multiple-correct MCQs. Test all question types with edge cases (numerical answers at tolerance boundaries, assertion-reason option templates). Verify randomization produces different orders for different students but identical orders for the same student on refresh.

**Load testing**: Simulate 200 concurrent students using k6 or Artillery. Target metrics: response time <200ms for auto-save, <500ms for page navigation, zero data loss during concurrent submissions. Test the on-premise server under full load with simultaneous proctoring events.

**Security testing**: Attempt to bypass the lockdown browser (Alt+Tab, Ctrl+Alt+Del, Windows key, force quit). Test browser-level detection — use a "Disable Page Visibility" browser extension to verify the system detects spoofing. Penetration testing on API endpoints (attempt to access other students' responses, submit after time expiry, manipulate scores).

**Cross-platform testing**: Electron client on Windows 10/11, macOS 12+. Web interface on Chrome, Firefox, Edge. Test with low-quality webcams and varying lighting conditions for AI proctoring.

### Deployment

**On-premise server setup**: Install Ubuntu 24.04 LTS, Docker, Docker Compose. Deploy the full stack with `docker-compose up -d`. Configure Nginx as reverse proxy with SSL (Let's Encrypt). Set up automatic daily `pg_dump` backups synced to DigitalOcean Spaces via cron. Configure the server as a DHCP server for the exam LAN to simplify network management.

**Cloud deployment**: Deploy the management portal on a DigitalOcean droplet (2 vCPU, 4GB RAM, $24/month) with managed PostgreSQL ($15/month) and managed Redis ($15/month). Set up database replication between on-premise and cloud.

**Electron client distribution**: Package with `electron-builder` for Windows (.exe installer) and macOS (.dmg). Create a shared network drive or USB-based installer for quick deployment across 50–200 student machines. Configure auto-update mechanism via `electron-updater`.

### Training and documentation

- **Admin training** (4 hours): System setup, user management, test scheduling, result review, proctoring dashboard
- **Teacher training** (6 hours): Question bank management, rich text editor with math equations, Excel import, test creation, analytics interpretation
- **Student orientation** (2 hours): Login, exam interface walkthrough using a practice test, understanding the question palette, lockdown browser installation
- **Technical documentation**: API documentation (Swagger/OpenAPI), deployment guide, troubleshooting guide, database backup/restore procedures
- **User manuals**: Illustrated PDF guides for admin, teacher, and student roles

### Pilot testing

Run 3 pilot exams with increasing complexity:
1. **Pilot 1** (20 students): Basic MCQ test, no proctoring — validate exam flow, timer, submission
2. **Pilot 2** (50 students): JEE Main pattern with lockdown browser and basic anti-cheat — validate security layer
3. **Pilot 3** (100–200 students): Full NEET pattern with AI proctoring — validate at scale under production conditions

### Team requirements
1 QA engineer (full-time), 1 DevOps engineer (part-time), 1 full-stack developer (bug fixes), 1 trainer/documentation writer

### Timeline: 4–6 weeks

### Milestones
- Week 40: All functional and load tests passing, security audit complete
- Week 42: Production deployment on hybrid infrastructure operational
- Week 43: Staff training complete, student orientation done, Pilot 1 and 2 successful
- Week 44: Pilot 3 at full scale successful — system ready for production use

---

## Complete cost breakdown

### Development costs (realistic scenario)

| Phase | Duration | Cost (₹) |
|---|---|---|
| Phase 1: Foundation & Core | 4–6 weeks | 5,00,000 |
| Phase 2: Question Bank & Tests | 6–8 weeks | 7,50,000 |
| Phase 3: Anti-Malpractice | 4–6 weeks | 5,00,000 |
| Phase 4: AI Proctoring | 8–12 weeks | 10,00,000 |
| Phase 5: Analytics & Reports | 4–6 weeks | 5,00,000 |
| Phase 6: Testing & Deployment | 4–6 weeks | 3,50,000 |
| **Development subtotal** | **30–44 weeks** | **₹36,00,000** |
| Contingency (30%) | — | ₹10,80,000 |
| **Total development** | **~10 months** | **₹46,80,000** |

### Infrastructure costs (Year 1)

| Item | Cost (₹) |
|---|---|
| On-premise server hardware | 2,50,000–5,00,000 |
| Network infrastructure (switches, APs, cabling) | 75,000–1,80,000 |
| UPS/power backup | 30,000–80,000 |
| Cloud hosting (12 months) | 60,000–96,000 |
| SSL, domain, email services | 5,000–15,000 |
| **Infrastructure subtotal** | **₹4,20,000–8,71,000** |

### Annual recurring costs (Year 2+)

| Category | Annual cost (₹) |
|---|---|
| Part-time developer (maintenance, updates) | 2,00,000–5,00,000 |
| Cloud hosting | 60,000–1,00,000 |
| Server AMC | 50,000–1,50,000 |
| SMS/Email services | 10,000–30,000 |
| **Annual recurring total** | **₹3,20,000–7,80,000** |

### Total Year 1 investment: **₹52–56 lakhs** (realistic) | ~$63,000

An **MVP covering Phases 1–2 plus basic anti-cheat** (no AI proctoring) can be delivered in **3–4 months for ₹12–18 lakhs**, providing a functional product for market validation before committing to the full build. This MVP includes the exam interface, question bank, Excel import, JEE/NEET patterns, tab-switch detection, and result generation — sufficient for most coaching center needs.

---

## Compliance with DPDP Act and accessibility standards

The **Digital Personal Data Protection Act 2023** (enforcement expected mid-2025 to 2026) imposes specific requirements for this system. Student data (especially for minors under 18, which is the majority of JEE/NEET aspirants) requires **verifiable parental consent** before collection. The system must implement data minimization — collect only what's necessary for exam delivery. Provide students the right to access, correct, and delete their data. Webcam/proctoring data must have defined retention limits (**90 days recommended**, then auto-delete). Privacy notices must be clear, bilingual (English + Hindi minimum), and easily understandable. Penalties under DPDP can reach **₹250 crore** for severe violations.

**Accessibility features** matching NTA's standards: dark mode toggle, screen magnifier with up to **4× zoom**, adjustable font size and cursor size, **20 minutes compensatory time per hour** for PwD candidates (4 hours for a 3-hour exam), and scribe assistance configuration. The exam interface must work with screen readers where possible and support keyboard-only navigation for accessibility.

---

## Conclusion: what makes this plan work

Three design decisions distinguish this plan from generic CBT architectures. First, the **hybrid on-premise/cloud deployment** solves India's connectivity problem — the single biggest risk for CBT in schools — while still providing cloud-powered analytics and remote access. Second, running **all AI proctoring client-side via TensorFlow.js** eliminates what would otherwise be a ₹50,000+/month cloud API cost, making the system viable for price-sensitive coaching centers. Third, the **seed-based deterministic randomization** ensures exam integrity (every student sees different question orders) while enabling perfect reproducibility for dispute resolution.

The six-phase approach deliberately front-loads value: an MVP from Phases 1–2 is deployable in 3–4 months and already delivers 80% of what most coaching centers need. Phases 3–4 add the security moat that differentiates this from free alternatives. Phase 5's analytics create retention through actionable insights that teachers cannot get from paper-based testing. At **₹1–2.5 lakhs per school per year** pricing, the system breaks even with 5 schools in the first year post-launch, with Kota's 5,000+ coaching centers representing a massive addressable market.