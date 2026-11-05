# KIVORA Security & Red Team Audit Specification

## 1. Data Invariants
1. **Strict PII Isolation**: Email addresses, ID-Austria bPK identity tokens, and birth years live exclusively in `/users/{userId}/private/{docId}` and are readable/writable only by `request.auth.uid == userId` or verified `isAdmin()`.
2. **Strict 18+ Youth Separation**: `/posts`, `/reels`, and `/stories` enforce `isAdultOnly == false` on all list queries so minors (`ageGroup == 'minor'`) or unauthenticated visitors can never list or fetch 18+ documents. Adult-only (18+) discussions are gated behind ID-Austria 18+ age verification (`birthYear <= 2008`).
3. **No Self-Assigned Privileges**: New user documents in `/users/{userId}` must initialize with `verifiedBadge == 'none'`, `idAustriaVerified == false`, `ageGroup == 'minor'`, and `subscriptionTier == 'free'`. Upgrades to `idAustriaVerified` / `adult` require atomic batch proof in `/users/{userId}/private/identity` (`existsAfter` + `getAfter`).
4. **Master Gate Subcollections**: Comments (`/posts/{postId}/comments/{commentId}`) and Encrypted Messages (`/chats/{chatId}/messages/{messageId}`) verify parent existence and membership via `exists()` / `get()`.
5. **Terminal State Locking**: Once a `safety_reports/{reportId}` reaches `status == 'resolved'` or a `verification_requests/{requestId}` reaches `status == 'approved'` / `'rejected'`, non-admins cannot mutate it.

## 2. Dirty Dozen Attack Payloads (Expected: PERMISSION_DENIED)
1. **Shadow Field Injection on User Create**: `{ uid: "u1", displayName: "Max", handle: "max", verifiedBadge: "id_austria", idAustriaVerified: true, ageGroup: "adult", subscriptionTier: "schutz_pro", ... }` -> Rejected (`verifiedBadge != 'none'`, `ageGroup != 'minor'`).
2. **Ghost Field Injection on Post Update**: Updating `posts/p1` with `{ title: "New", isOfficialState: true }` -> Rejected (`affectedKeys().hasOnly(...)` & `keys().hasOnly(...)`).
3. **Email Spoofing Attack**: Auth token with `email: "ice.ragotti@gmail.com"` and `email_verified: false` attempting admin write -> Rejected (`request.auth.token.email_verified == true` check in `isAdmin()`).
4. **Cross-User PII Read**: User `u2` calling `get(/users/u1/private/identity)` -> Rejected (`request.auth.uid == userId`).
5. **Client Timestamp Forgery**: Creating a post with `createdAt: Timestamp(2020, 1, 1)` instead of `request.time` -> Rejected (`incoming().createdAt == request.time`).
6. **18+ Content Leakage via List Query**: Querying `/posts` without `where('isAdultOnly', '==', false)` -> Rejected (`allow list: if resource.data.visibility == 'public' && resource.data.isAdultOnly == false`).
7. **Orphaned Comment Write**: Creating `/posts/nonexistent_id/comments/c1` -> Rejected (`exists(/databases/$(database)/documents/posts/$(postId))`).
8. **Unauthorized Chat Eavesdropping**: User `u3` reading `/chats/chat_u1_u2/messages/m1` -> Rejected (Master Gate `get()` checks `ownerId` / `peerId`).
9. **ID Poisoning**: Creating `/posts/../../../etc/passwd` -> Rejected (`isValidId(postId)` regex `^[a-zA-Z0-9_\-]+$`).
10. **Denial-of-Wallet 1MB String Injection**: Creating a post with `body` length `50000` chars -> Rejected (`data.body.size() <= 3000`).
11. **Immutable Owner Tampering**: Updating `video_projects/vp1` with `{ ownerId: "u2" }` -> Rejected (`incoming().ownerId == existing().ownerId`).
12. **Terminal State Reopening**: Reporter updating `safety_reports/r1` from `status: "resolved"` back to `status: "submitted"` -> Rejected (`existing().status != 'resolved'`).
13. **Beta Preregistration PII Scraping**: Unauthenticated or non-admin user calling `get` or `list` on `/beta_preregistrations` -> Rejected (`isAdmin() || (isSignedIn() && resource.data.userId == request.auth.uid)`), while `create` strictly requires `dsgvoConsent == true` and valid email format.
14. **Minor (<18) Access to 18+ Dating Collections**: Minor account (`ageGroup == 'minor'`) attempting to create or update `/dating_profiles/{id}`, `/dating_swipes/{id}`, or `/dating_matches/{id}` -> Rejected (`isAdultUser()` enforces `users/$(request.auth.uid).data.ageGroup == 'adult'`).
15. **Underage Dating Profile Age Injection**: User submitting `/dating_profiles/p1` with `age: 16` or `adultAgeConfirmed: false` -> Rejected (`data.age >= 18 && data.adultAgeConfirmed == true`).
16. **Orphaned Match Message Write**: User attempting to write `/dating_matches/nonexistent/messages/m1` -> Rejected (`exists(/databases/$(database)/documents/dating_matches/$(matchId))` and Master Gate `userAId`/`userBId` verification).

