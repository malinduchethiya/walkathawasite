# Security Specification — KathaGrid Firestore Rules

## 1. Data Invariants

1. **Identity & Email Verification**: All write operations require an authenticated user with `request.auth.token.email_verified == true`.
2. **PII Isolation (Split Collection)**: Public author profiles in `/users/{userId}` contain zero PII (no email, phone, or address). Private email PII is isolated in `/userPrivate/{userId}` with strict `isOwner(userId)` read/write rules and zero `list` access.
3. **Immutable Ownership & Timestamps**: `uid`, `authorId`, `storyId`, and `createdAt` can never be altered after document creation. All `createdAt` and `updatedAt` timestamps must strictly equal `request.time`.
4. **Master Gate Relational Sync**: Chapters (`/stories/{storyId}/chapters/{chapterId}`) and Comments (`/stories/{storyId}/comments/{commentId}`) verify the parent story document exists via `get()` on `get`/`create`/`update`/`delete` (or `getAfter()` for atomic batch creation of a story + its initial chapters).
5. **Action-Based Updates & Anti-Update-Gap**: Every `allow update` validates the full incoming payload with `isValid[Entity]()` and restricts mutated fields via `incoming().diff(existing()).affectedKeys().hasOnly([...])`.
6. **Secure O(1) List Queries**: Every `allow list` checks `resource.data` directly (`resource.data.status == 'published'` or `resource.data.authorId == request.auth.uid` or `resource.data.uid == request.auth.uid`) with zero `get()`/`exists()` calls inside `list`.
7. **Self-Verification & Privilege Escalation Prevention**: Users cannot set `isVerified: true` on their own profile or `authorVerified: true` on stories unless their profile is already verified; no role/admin self-assignment fields exist.

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Attack Class | Target Path | Adversarial Payload / Action | Expected Result |
|---|---|---|---|---|
| 1 | Shadow Field Injection | `/stories/{storyId}` (create) | Valid story + `{ "isAdmin": true }` | `PERMISSION_DENIED` |
| 2 | Identity Spoofing | `/stories/{storyId}` (create) | `{ "authorId": "other_user_uid", ... }` | `PERMISSION_DENIED` |
| 3 | Unverified Email Write | `/stories/{storyId}` (create) | Auth token with `email_verified: false` | `PERMISSION_DENIED` |
| 4 | PII Blanket Read | `/userPrivate/{otherUid}` (get) | Authenticated non-owner reads another user's private PII doc | `PERMISSION_DENIED` |
| 5 | Timestamp Forgery | `/stories/{storyId}` (create) | `{ "createdAt": "2020-01-01T00:00:00Z" }` (not `request.time`) | `PERMISSION_DENIED` |
| 6 | View Count Manipulation | `/stories/{storyId}` (update) | Non-author jumps `views` by `+9999` instead of `+1` | `PERMISSION_DENIED` |
| 7 | Self-Verification Escalation | `/users/{uid}` (create/update) | User sets `isVerified: true` on own profile | `PERMISSION_DENIED` |
| 8 | Path ID Poisoning | `/stories/bad id with spaces!!!` (create) | Document ID fails `^[a-zA-Z0-9_\-]+$` or >128 chars | `PERMISSION_DENIED` |
| 9 | Value Poisoning (Oversized Body) | `/stories/{id}/chapters/{cid}` (create) | Chapter `content` string length `> 25000` | `PERMISSION_DENIED` |
| 10 | Orphaned Chapter Creation | `/stories/nonexistent/chapters/ch1` (create) | Parent story does not exist in Firestore | `PERMISSION_DENIED` |
| 11 | Cross-Owner Chapter Edit | `/stories/{id}/chapters/{cid}` (update) | Authenticated non-author tries to edit another author's chapter | `PERMISSION_DENIED` |
| 12 | Unauthorized Draft Listing | `/stories` (list) | Unauthenticated or non-owner queries draft stories (`status == 'draft'`) | `PERMISSION_DENIED` |
