# Security Test Case Matrix

## Metadata

| Field | Value |
| --- | --- |
| Suite ID | EP-SEC-TC-2026-04-09 |
| Related Report | `IEEE_829_SECURITY_TEST_REPORT.md` |
| Test Type | Security functional, negative, abuse-case |
| Design Status | Created from static review |
| Execution Status | Not executed in this assessment |

## Test Cases

| TC ID | Priority | Objective | Preconditions | Procedure | Expected Secure Result | Maps To |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-AUTH-001 | P2 | Verify login throttling blocks brute-force attempts | Valid username known | Submit 6 invalid login attempts within 60 seconds from same client | First 5 attempts fail normally; further attempts are throttled | Baseline control |
| SEC-AUTH-002 | P2 | Verify refresh-token rotation and replay resistance | User logged in with valid refresh cookie | Call refresh once, store old cookie, then attempt refresh again using the old token | First refresh succeeds and rotates token; replay of old refresh token fails with 401 | Baseline control |
| SEC-AUTH-003 | P1 | Verify password reset flow never reveals secrets in logs | Logging enabled in test environment | Trigger `POST /auth/forgot-password` for an existing account and inspect application logs | Logs contain no plaintext reset token and no full reset URL secret | F-04 |
| SEC-AUTH-004 | P2 | Verify password reset endpoint does not allow token reuse | Valid issued reset token available | Reset password once, then retry with the same token | First reset succeeds; second reset fails as invalid or expired | Baseline control |
| SEC-AUTH-005 | P1 | Verify backend enforcement of `mustChangePassword` | User account has `mustChangePassword=true` and valid JWT | Call protected business endpoints directly with bearer token, without using the frontend | API blocks access except allowed auth endpoints such as change-password/logout | F-05 |
| SEC-AUTH-006 | P2 | Verify logout revokes current refresh token | User logged in | Call logout, then call refresh with prior cookie | Refresh after logout fails with 401 | Baseline control |
| SEC-AUTH-007 | P2 | Verify create-user password policy matches reset/change policy | Admin token available | Submit `POST /users` with weak but length-valid password such as `password1` | Request is rejected with validation error | F-07 |
| SEC-ACCESS-001 | P1 | Verify student cannot list tests outside assigned batch | Student belongs to batch A; published test assigned only to batch B exists | Call `GET /test-attempts/available-tests` as the student | Test assigned only to batch B is absent | F-02 |
| SEC-ACCESS-002 | P1 | Verify student cannot start unassigned test directly by ID | Student belongs to batch A; known test ID assigned only to batch B exists | Call `POST /test-attempts/start` with that test ID | API returns 403 Forbidden and no attempt is created | F-02 |
| SEC-ACCESS-003 | P1 | Verify live exam payload does not expose answer-key fields | Student has an active attempt | Fetch `GET /test-attempts/:id` and inspect returned question objects | Response excludes `correctAnswer`, `options.isCorrect`, and `explanation` until submission | F-01 |
| SEC-ACCESS-004 | P1 | Verify student cannot infer correct answers from frontend state | Active attempt loaded in browser | Inspect network traffic, React state, and rendered DOM during exam | No client-visible object exposes answer keys prior to submission | F-01 |
| SEC-ACCESS-005 | P2 | Verify leaderboard access is restricted to authorized students | Student has not been assigned the target test and has not attempted it | Call `GET /test-attempts/leaderboard/test/:testId` | API rejects access or returns a minimized dataset according to policy | F-08 |
| SEC-ACCESS-006 | P2 | Verify leaderboard response omits unnecessary PII | Authorized student or teacher account available | Call leaderboard endpoint and inspect fields | Response excludes email and unnecessary identity data for student-facing views | F-08 |
| SEC-INPUT-001 | P1 | Verify question text is sanitized against stored XSS | Teacher or admin account available | Create or import a question containing `<script>alert(1)</script>` in `questionText`, then open student/admin rendering views | Script does not execute; payload is removed or neutralized | F-03 |
| SEC-INPUT-002 | P1 | Verify option text is sanitized against stored XSS | Teacher or admin account available | Create a question with an option containing `<img src=x onerror=alert(1)>` | Script does not execute in question preview, exam page, or result page | F-03 |
| SEC-INPUT-003 | P1 | Verify explanation field is sanitized against stored XSS | Teacher or admin account available | Create a question with `javascript:` links or SVG event handlers in explanation content | Malicious markup is stripped or rendered inert | F-03 |
| SEC-INPUT-004 | P2 | Verify nested test sections are strictly validated | Admin or teacher account available | Submit `POST /tests` with malformed sections such as negative marks, missing fields, oversized arrays, or extra unexpected properties | Request is rejected with structured validation errors | F-06 |
| SEC-INPUT-005 | P2 | Verify question creation validates `correctAnswer` structure | Admin or teacher account available | Submit malformed `correctAnswer` values for each question type | Request is rejected with validation error | F-06 |
| SEC-INPUT-006 | P2 | Verify save-response rejects invalid status and time data | Student has active attempt | Submit `PATCH /test-attempts/:id/response` with invalid `status`, negative `timeSpent`, or non-numeric payloads | Request is rejected; attempt state remains unchanged | F-06 |
| SEC-INPUT-007 | P3 | Verify navigation update enforces numeric bounds | Student has active attempt | Submit negative or very large `sectionIndex` and `questionIndex` values | Request is rejected; server does not persist invalid navigation state | F-06 |
| SEC-INPUT-008 | P3 | Verify violation logging input is validated and bounded | Student has active attempt | Submit excessively long `type`/`message` strings and non-string payloads to violation endpoint | Request is rejected or safely normalized | F-06 |
| SEC-CRED-001 | P1 | Verify bulk-imported users do not share a predictable default password | Admin account available | Bulk import multiple users, inspect onboarding credentials or login behavior | Each imported user gets a unique one-time credential or secure activation flow | F-07 |
| SEC-CRED-002 | P1 | Verify first-login enforcement blocks direct API use with temporary password | Bulk-imported user exists with temporary password | Log in, obtain JWT, then call protected endpoints without changing password | Protected endpoints are denied until password change is complete | F-05, F-07 |
| SEC-PRIV-001 | P3 | Verify result and leaderboard responses do not expose peer data beyond policy | Student account available | Inspect student-accessible analytics and leaderboard responses | Peer identity and batch data are minimized according to privacy requirements | F-08 |
| SEC-LOG-001 | P2 | Verify operational logs redact secrets and credential material | Test logging sink available | Exercise login, refresh, forgot-password, and reset flows while collecting logs | No plaintext credentials, tokens, cookies, or reset secrets appear in logs | F-04 |

## Execution Notes

1. Execute `P1` tests before any production release candidate.
2. Convert `P1` and `P2` cases into automated API or browser-based regression tests where feasible.
3. For XSS verification, test both direct form submission and bulk import paths.
4. For authorization tests, include both UI-driven and direct API invocation paths.
