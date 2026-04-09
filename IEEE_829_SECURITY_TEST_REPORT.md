# IEEE 829-Aligned Security Test Report

## Document Control

| Field | Value |
| --- | --- |
| Document ID | EP-SEC-IEEE829-2026-04-09 |
| System Under Test | Exam Portal |
| Repository | `d:\project\Exam-portal` |
| Assessment Date | April 9, 2026 |
| Assessment Type | Static security review and test design |
| Standard Alignment | IEEE 829-style test report structure |
| Prepared By | Codex Security Review |
| Execution Status | Test cases designed; live execution not performed in this review |

## 1. Purpose

This report documents a security-focused review of the Exam Portal monorepo and defines a corresponding security test pack. The objective was to evaluate authentication, authorization, data exposure, input handling, and exam-integrity controls across the frontend and backend.

## 2. Scope

The review covered:

1. `packages/backend`
2. `packages/frontend`
3. `packages/shared`
4. Route protection, DTO validation, exam delivery flows, and result/proctoring flows

The review did not include:

1. Live penetration testing against a deployed environment
2. Dependency CVE scanning of `node_modules`
3. Infrastructure review of Vercel, MongoDB Atlas, DNS, WAF, or CI/CD secrets

## 3. Reference Documents

1. Project source code under `packages/backend`, `packages/frontend`, and `packages/shared`
2. `README.md`
3. `IMPLEMENTATION_PLAN.md`
4. Test-case companion document: `SECURITY_TEST_CASE_MATRIX.md`

## 4. Method

The assessment used static code review and threat-oriented trace analysis:

1. Identified trust boundaries: login, refresh, password reset, question authoring, test publishing, attempt lifecycle, analytics, and student exam delivery.
2. Reviewed controller-to-service flows for missing authorization, unsafe data exposure, and weak validation.
3. Reviewed frontend rendering and session handling for stored XSS and token-handling risks.
4. Derived reproducible security test cases mapped to each finding.

## 5. Executive Summary

The application has a solid baseline in some areas, including JWT-based access control, refresh-token hashing, Helmet, CORS restrictions, and rate limiting on login/reset initiation. However, the review found several high-impact weaknesses that materially affect exam integrity and account security.

The most serious issue is that student exam payloads appear to expose answer-key data before submission. A second major issue is that test assignment boundaries are modeled in the schema but not enforced during test discovery or start. In addition, stored XSS is currently possible through question content, password reset tokens are logged in plaintext, and mandatory password change is enforced only in the frontend.

## 6. Summary of Findings

| ID | Severity | Title | Status |
| --- | --- | --- | --- |
| F-01 | Critical | Exam payload exposes answer keys to students before submission | Open |
| F-02 | High | Assigned batch restrictions are not enforced for student test access | Open |
| F-03 | High | Stored XSS via unsanitized HTML rendering in question content | Open |
| F-04 | High | Password reset tokens are written to application logs | Open |
| F-05 | Medium | Forced password change is enforced only by the frontend | Open |
| F-06 | Medium | Privileged and student request bodies lack complete backend validation | Open |
| F-07 | Medium | Bulk-imported users receive a predictable default password | Open |
| F-08 | Medium | Student-accessible leaderboard exposes peer identity and batch data broadly | Open |

## 7. Detailed Findings

### F-01: Exam payload exposes answer keys to students before submission

**Severity:** Critical

**Evidence**

1. `packages/backend/src/modules/test-attempts/test-attempts.service.ts` populates full question documents in `getAttempt()`.
2. `packages/backend/src/modules/questions/schemas/question.schema.ts` stores `correctAnswer` and `options.isCorrect`.
3. `packages/shared/src/types/question.types.ts` exposes `correctAnswer` and `isCorrect` in the shared client type.
4. `packages/frontend/src/pages/student/tests/exam-page.tsx` consumes the populated attempt payload during an active exam session.

**Risk**

Any student who inspects the browser network response, React state, or DOM-side objects can infer correct options or numerical answers before submitting the exam. This directly compromises exam integrity.

**Recommendation**

1. Introduce a student-safe exam DTO that strips `correctAnswer`, `options.isCorrect`, and `explanation` until the attempt is submitted.
2. Separate authoring/result models from live-exam delivery models.
3. Add automated regression tests asserting that exam-start and exam-fetch responses never include answer-key fields.

### F-02: Assigned batch restrictions are not enforced for student test access

**Severity:** High

**Evidence**

1. `packages/backend/src/modules/tests/schemas/test.schema.ts` defines `assignedBatches`.
2. `packages/backend/src/modules/test-attempts/test-attempts.service.ts` method `getAvailableTests()` returns published or active tests without checking the student batch.
3. `packages/backend/src/modules/test-attempts/test-attempts.service.ts` method `startTest()` does not verify whether the requesting student belongs to an allowed batch.

**Risk**

Any authenticated student may be able to view or start tests intended for another batch, creating unauthorized participation and potential information leakage.

**Recommendation**

1. Load the student profile during test discovery and start.
2. Enforce `assignedBatches` on both discovery and direct-start endpoints.
3. Return `403 Forbidden` when the student batch is not authorized.

### F-03: Stored XSS via unsanitized HTML rendering in question content

**Severity:** High

**Evidence**

1. `packages/frontend/src/components/common/math-renderer.tsx` assigns `containerRef.current.innerHTML = html`.
2. Question text, option text, and explanation fields are rendered through `MathRenderer` in student and admin views.
3. Question creation and import flows accept rich text and do not sanitize on the backend.

**Risk**

A malicious teacher or compromised admin account could inject script-bearing HTML that executes in student browsers, admin dashboards, or result-review screens. Impact includes session theft, defacement, exam manipulation, and credential harvesting.

**Recommendation**

1. Sanitize stored HTML on input and/or output using a strict allowlist.
2. Prefer KaTeX/math parsing over raw HTML where possible.
3. Add regression tests for script tags, event handlers, SVG payloads, and `javascript:` URLs.

### F-04: Password reset tokens are written to application logs

**Severity:** High

**Evidence**

1. `packages/backend/src/modules/auth/auth.service.ts` logs the plaintext reset token inside `forgotPassword()`.

**Risk**

Anyone with log access can reset user passwords. This remains dangerous even in staging because logs are often forwarded, retained, or visible to multiple operators.

**Recommendation**

1. Remove plaintext token logging entirely.
2. If temporary development diagnostics are required, gate them behind an explicit non-production flag and redact most of the token.
3. Add a test asserting reset flows do not emit secret-bearing log lines.

### F-05: Forced password change is enforced only by the frontend

**Severity:** Medium

**Evidence**

1. `packages/frontend/src/routes/protected-route.tsx` redirects users with `mustChangePassword`.
2. `packages/frontend/src/components/auth/login-form.tsx` also redirects on login.
3. No backend guard blocks access to protected business endpoints when `mustChangePassword` is true.

**Risk**

Users with default or temporary passwords can bypass the UI by calling APIs directly with a valid bearer token.

**Recommendation**

1. Add a backend guard or middleware enforcing password change before non-auth endpoints.
2. Allow only `/auth/change-password`, `/auth/logout`, and profile retrieval while the flag is set.

### F-06: Privileged and student request bodies lack complete backend validation

**Severity:** Medium

**Evidence**

1. `packages/backend/src/modules/tests/dto/create-test.dto.ts` validates `sections` only as an array; nested section fields are not class-validated.
2. `packages/backend/src/modules/questions/dto/create-question.dto.ts` leaves `correctAnswer` structurally unvalidated.
3. Several controllers accept inline object bodies instead of DTO classes, including bulk import, test start, section update, auto-pick, save response, navigation, and violation recording.

**Risk**

Malformed or malicious payloads may bypass validation, leading to inconsistent persisted state, weak integrity controls, and unstable behavior under adversarial input.

**Recommendation**

1. Replace inline object bodies with DTO classes.
2. Add `@ValidateNested()`, `@Type()`, numeric bounds, enum checks, and `@IsMongoId()` where applicable.
3. Add negative and oversized payload tests for all student-controlled write endpoints.

### F-07: Bulk-imported users receive a predictable default password

**Severity:** Medium

**Evidence**

1. `packages/backend/src/modules/users/users.service.ts` sets the bulk-import default password to `Student@123`.
2. The create-user DTO also accepts any password of length 8 or greater, without the stronger complexity checks used in reset/change flows.

**Risk**

Predictable credentials increase account takeover risk, especially when backend enforcement of `mustChangePassword` is absent.

**Recommendation**

1. Generate random one-time passwords per imported user.
2. Enforce the same password-complexity rules across create, reset, and change flows.
3. Require first-login password change on the backend.

### F-08: Student-accessible leaderboard exposes peer identity and batch data broadly

**Severity:** Medium

**Evidence**

1. `packages/backend/src/modules/test-attempts/test-attempts.controller.ts` allows students to call `GET /leaderboard/test/:testId`.
2. `packages/backend/src/modules/test-attempts/test-attempts.service.ts` returns rank, first name, last name, batch, and score data for all participants.

**Risk**

Depending on policy, this may disclose unnecessary peer identity and cohort data to students. Combined with missing batch enforcement, it amplifies privacy exposure.

**Recommendation**

1. Restrict student leaderboard access to assigned or attempted tests only.
2. Minimize returned identity fields, for example using pseudonymous display names or self-only detailed views.

## 8. Priority Remediation Plan

### Immediate

1. Fix F-01 by stripping answer-key fields from live exam payloads.
2. Fix F-02 by enforcing batch authorization on test listing and start.
3. Fix F-03 by sanitizing question HTML before rendering.
4. Fix F-04 by removing reset token logging.

### Short Term

1. Fix F-05 by moving password-change enforcement to the backend.
2. Fix F-06 by converting inline request bodies to DTOs with nested validation.
3. Fix F-07 by removing predictable default credentials.

### Medium Term

1. Revisit leaderboard privacy rules and student visibility.
2. Add a dedicated security regression suite covering the attached test cases.
3. Add audit logging and security telemetry with secret redaction.

## 9. Pass/Fail Criteria

The security hardening effort should be considered complete when:

1. Critical and high findings are remediated and regression-tested.
2. All test cases in `SECURITY_TEST_CASE_MATRIX.md` with priority `P1` or `P2` pass.
3. Live exam endpoints return no answer-key data prior to submission.
4. Unauthorized students cannot discover or start tests outside their assignment scope.
5. Stored XSS payloads are neutralized in both admin and student rendering paths.

## 10. Residual Risk

If the current implementation is deployed without remediation, residual risk remains high because the identified issues affect:

1. Examination confidentiality
2. Examination integrity
3. Account recovery security
4. Student authorization boundaries

## 11. Conclusion

The Exam Portal codebase is structurally sound enough to harden, but it is not yet ready for a security-sensitive exam environment without remediation of the critical and high-severity findings above. The attached test-case matrix provides an execution-ready baseline for QA, development, and release gating.

## Appendix A

Detailed security test cases are provided in `SECURITY_TEST_CASE_MATRIX.md`.
