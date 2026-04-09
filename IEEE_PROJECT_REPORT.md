# Design and Implementation of a Web-Based Exam Portal for Secure Computer-Based Testing

**Author:** _[Student Name]_  
**Department:** _[Department Name]_  
**Institution:** _[Institution Name]_  
**Academic Year:** 2025-2026  

## Abstract

This project report presents the design and implementation of a full-stack Exam Portal intended for secure, role-based, computer-based testing in academic and coaching environments. The system is designed to support competitive examination workflows such as JEE Main, JEE Advanced, and NEET while also allowing custom test creation, question-bank management, batch-based assignment, live test delivery, result analytics, and proctor-assisted monitoring. The project follows a monorepo architecture with a React frontend, a NestJS backend, MongoDB for persistence, and a shared TypeScript package for common types and validation models. Key functional capabilities include JWT-based authentication, role-driven access for super administrators, administrators, teachers, and students, real-time answer saving, post-exam solution review, and administrative dashboards. The report also evaluates the project from a software engineering and security perspective. A structured security review and test-case design exercise identified several strengths, including modular design and baseline authentication controls, along with critical hardening areas related to answer-key exposure, batch authorization enforcement, and unsafe HTML rendering. The report concludes that the project is a strong, extensible prototype for digital examination management, with clear pathways for production hardening and academic deployment.

**Keywords:** Exam Portal, Computer-Based Testing, React, NestJS, MongoDB, Role-Based Access Control, Proctoring, Security Testing

## I. Introduction

The increasing adoption of online and hybrid learning environments has accelerated the need for reliable computer-based testing platforms. Institutions that prepare students for competitive entrance examinations require systems that can manage large question banks, deliver time-bound assessments, monitor examination conduct, and generate timely analytics. Traditional manual examination processes are often difficult to scale, prone to administrative overhead, and weak in real-time monitoring.

The Exam Portal project was developed to address these limitations through a centralized, web-based testing system. The platform targets coaching centers, schools, and training institutes that need to conduct secure examinations with role-based administration and student-specific access. In addition to supporting standard exam creation and result generation, the system introduces proctoring-oriented controls such as fullscreen enforcement, violation recording, watermarking, and live status monitoring.

## II. Problem Statement

Many small and mid-scale academic organizations lack an integrated platform that combines:

1. user management for multiple academic roles,
2. a reusable question bank,
3. configurable test creation workflows,
4. controlled student access to examinations,
5. exam-session monitoring,
6. result analytics, and
7. administrative reporting.

Existing generic form-based assessment tools often do not provide sufficient control over exam structure, role hierarchy, anti-malpractice measures, or batch-specific delivery. The problem addressed by this project is therefore the development of a secure, modular, and maintainable examination management platform that supports the full lifecycle of test administration.

## III. Objectives

The major objectives of the project are:

1. To design a web-based examination platform with separate interfaces for administrators, teachers, and students.
2. To implement secure authentication and role-based authorization.
3. To provide question-bank creation, update, filtering, and bulk-import capabilities.
4. To support test creation for JEE, NEET, and custom patterns with flexible sections and marking schemes.
5. To deliver live examinations with autosave, timing, and structured navigation.
6. To support result publication, analytics, leaderboard generation, and solution review.
7. To incorporate baseline security and anti-malpractice measures suitable for controlled assessments.

## IV. System Overview

The Exam Portal is organized as a monorepo with three major application layers:

1. `packages/frontend` implements the user interface using React, Vite, and TypeScript.
2. `packages/backend` implements the REST API and business logic using NestJS and MongoDB.
3. `packages/shared` provides reusable types, enums, constants, and validation logic shared between the frontend and backend.

This structure improves maintainability by separating concerns while still enabling strong type consistency across the stack.

## V. Proposed System Architecture

The proposed system follows a client-server architecture.

### A. Frontend Layer

The frontend is responsible for:

1. user authentication and route handling,
2. dashboard rendering for different roles,
3. question, test, batch, and user management interfaces,
4. exam-session rendering and client-side monitoring,
5. student result views and analytics pages.

The route layer includes dedicated views for authentication, admin/teacher dashboards, student workflows, and a fullscreen exam interface.

### B. Backend Layer

The backend exposes a versioned REST API under `/api/v1` and provides:

1. authentication and refresh-token workflows,
2. role-aware resource access,
3. CRUD services for users, questions, tests, and batches,
4. test-attempt lifecycle control,
5. scoring and analytics generation,
6. exception handling, response transformation, and validation.

### C. Data Layer

MongoDB stores the main application entities:

1. users,
2. questions,
3. tests,
4. test attempts,
5. refresh tokens,
6. batches.

Mongoose schemas are used to define collections, indexes, and typed persistence models.

## VI. Technology Stack

The project uses the following technologies:

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | React 18, TypeScript, Vite | Component-based UI and build tooling |
| Styling | Tailwind CSS, Radix/shadcn UI | UI design and accessible components |
| State and Networking | Zustand, Axios | Client state and API communication |
| Backend | NestJS | Modular REST API and business logic |
| Database | MongoDB with Mongoose | Document persistence and schema modeling |
| Security | JWT, Passport, Helmet, Throttler, bcrypt | Authentication, headers, rate limiting, password hashing |
| Shared Layer | TypeScript shared package, Zod | Shared models and validation helpers |

## VII. Functional Modules

The implemented system is divided into the following major modules.

### A. Authentication and Authorization Module

This module supports login, logout, token refresh, password reset, and password change workflows. Access tokens are sent as bearer tokens, while refresh tokens are stored in HTTP-only cookies. Role information is used to restrict access to business endpoints.

### B. User Management Module

Administrative users can create, update, activate, deactivate, bulk import, and delete users. Roles include:

1. Super Admin,
2. Admin,
3. Teacher,
4. Student.

This module also supports batch assignment for students.

### C. Question Bank Module

Teachers and administrators can maintain a question bank containing:

1. subject and topic metadata,
2. difficulty levels,
3. question types such as MCQ single, MCQ multiple, numerical, and assertion-reason,
4. explanations and tags,
5. search and filtering support.

### D. Test Builder Module

This module enables creation of:

1. JEE Main tests,
2. JEE Advanced tests,
3. NEET tests,
4. custom tests.

Sections, marking schemes, question counts, durations, publication state, and assigned batches can be configured. Questions may be selected manually or auto-picked using filters.

### E. Exam Delivery Module

Students can:

1. view available tests,
2. start assigned exams,
3. navigate section-wise questions,
4. save responses,
5. mark questions for review,
6. submit or auto-submit on time expiry.

The exam interface is designed to reduce distractions and maintain continuity through autosave behavior.

### F. Proctoring and Monitoring Module

The project includes browser-side monitoring features such as:

1. fullscreen checks,
2. focus-loss and tab-switch detection,
3. devtools detection,
4. watermark overlay,
5. webcam-assisted monitoring hooks,
6. violation tracking and force-submit support.

### G. Result and Analytics Module

After submission, the system provides:

1. section-wise score breakdown,
2. correctness metrics,
3. student performance analytics across tests,
4. test-level analytics for administrators and teachers,
5. leaderboard and ranking views,
6. solution review and report-card generation.

## VIII. Database Design

The project uses document-oriented storage to model flexible academic workflows.

### A. User Entity

The user model stores email, password hash, role, profile data, active status, batch affiliation, and password-reset attributes.

### B. Question Entity

The question model stores question text, options, correct answer data, subject classification, difficulty, explanation, tags, and creator information.

### C. Test Entity

The test model stores title, exam type, sections, marking scheme, duration, publication status, assigned batches, and creator reference.

### D. Test Attempt Entity

The test-attempt model stores student responses, current navigation state, timestamps, submission status, scores, and proctoring violations.

This schema design supports both live delivery and post-exam analytics.

## IX. API Design and Workflow

The API is structured into modular backend domains:

1. `auth`
2. `users`
3. `questions`
4. `tests`
5. `test-attempts`
6. `batches`

The workflow can be summarized as follows:

1. An authenticated administrator or teacher creates questions and tests.
2. Tests are published and optionally assigned to specific batches.
3. Students authenticate and request available tests.
4. A test attempt is created when the student starts an exam.
5. Responses are saved incrementally and graded after submission.
6. Results, analytics, and review pages become available after completion.

## X. User Interface Design

The frontend uses lazy-loaded routes and role-aware layouts:

1. authentication pages for login and password recovery,
2. an admin/teacher layout for management dashboards,
3. a student layout for tests, results, analytics, and profile pages,
4. a dedicated fullscreen exam page without normal application chrome.

The interface prioritizes separation of duties and task-specific screens rather than a single overloaded dashboard.

## XI. Security Considerations

Security is a critical aspect of any examination platform because compromise affects both academic fairness and user trust. The current project includes important baseline controls:

1. JWT-based authentication,
2. refresh-token hashing,
3. HTTP-only cookie usage for refresh tokens,
4. server-side validation pipe configuration,
5. Helmet headers,
6. throttling on selected sensitive endpoints,
7. role-based route protection.

However, a focused review also identified several important hardening gaps:

1. live exam payloads currently appear to expose answer-key information before submission,
2. batch assignment is modeled but not fully enforced during student test access,
3. unsafe HTML rendering creates stored XSS risk,
4. password reset tokens are logged in plaintext,
5. forced password change is currently enforced only at the frontend level.

These findings do not reduce the architectural value of the project, but they are important for production readiness and must be addressed before high-stakes deployment.

## XII. Testing and Validation

Testing for this project can be understood in three layers.

### A. Functional Validation

The source code demonstrates structured support for:

1. DTO validation with NestJS validation pipes,
2. shared frontend validation through Zod,
3. route guards for authenticated and public pages,
4. error filters and response shaping.

### B. Security Test Design

A dedicated security review was converted into an IEEE-style security report and a detailed test-case matrix. The security test suite covers:

1. authentication resilience,
2. authorization boundaries,
3. input validation,
4. stored XSS behavior,
5. credential handling,
6. logging hygiene,
7. privacy exposure.

### C. Current Status

The present report is based on source-code analysis and test design. It does not claim that full automated or deployment-level execution has already been completed. Therefore, the project should be described as functionally well-structured but still undergoing security hardening and verification.

## XIII. Results and Discussion

From a software engineering standpoint, the project achieves the core goals of a modern web-based examination system:

1. it centralizes administration and student workflows,
2. it uses a clean modular backend,
3. it maintains shared types across the stack,
4. it supports multiple exam patterns and role-based operations,
5. it includes richer-than-average student analytics and monitoring features.

The strongest design qualities are modularity, practical feature coverage, and a clear separation between management and student workflows. The main limitation is not lack of functionality, but the need for stricter production-grade security controls around exam confidentiality and content rendering.

## XIV. Limitations

The current implementation has the following limitations:

1. some endpoints rely on inline body types instead of fully validated DTOs,
2. security-sensitive exam delivery flows still require hardening,
3. the current assessment did not include performance benchmarking under real concurrent load,
4. no formal deployment audit of infrastructure or secrets management was included in this report,
5. the application should not yet be treated as security-complete for high-stakes examinations.

## XV. Future Enhancements

The following enhancements are recommended:

1. create student-safe exam DTOs that strip answer-key data until submission,
2. enforce batch authorization in all student test-access paths,
3. sanitize or strictly whitelist question HTML content,
4. strengthen backend DTO validation for all nested and student-controlled payloads,
5. replace predictable temporary passwords with one-time onboarding credentials,
6. add automated API, integration, and browser security regression tests,
7. introduce audit logging, observability, and secret-redaction controls,
8. extend proctoring with server-side event correlation and anomaly scoring,
9. benchmark concurrency and optimize for larger examination cohorts.

## XVI. Conclusion

The Exam Portal project is a comprehensive and technically strong implementation of a digital examination management platform. It successfully combines user administration, question-bank management, test creation, controlled exam delivery, analytics, and proctoring-aware features within a modern full-stack architecture. The use of React, NestJS, MongoDB, and shared TypeScript models provides a maintainable foundation for future extension.

At the same time, the project illustrates an important engineering lesson: feature completeness alone is not sufficient for production readiness in high-trust systems. For an examination platform, confidentiality of questions and correctness data, strict authorization boundaries, and safe content handling are equally important. With the hardening steps identified in the associated security review, the project can evolve from a strong academic prototype into a deployment-ready examination platform.

## References

[1] Exam Portal Repository, `README.md`, Exam Portal project workspace, 2026.  
[2] Exam Portal Repository, `IMPLEMENTATION_PLAN.md`, Exam Portal project workspace, 2026.  
[3] Exam Portal Repository, `packages/backend`, NestJS backend source modules, 2026.  
[4] Exam Portal Repository, `packages/frontend`, React frontend source modules, 2026.  
[5] Exam Portal Repository, `packages/shared`, shared types and validation modules, 2026.  
[6] Codex Security Review, `IEEE_829_SECURITY_TEST_REPORT.md`, Exam Portal project workspace, Apr. 9, 2026.  
[7] Codex Security Review, `SECURITY_TEST_CASE_MATRIX.md`, Exam Portal project workspace, Apr. 9, 2026.
