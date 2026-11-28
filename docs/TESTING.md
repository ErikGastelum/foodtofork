# Testing accounts and permissions

Owner: Jacob. For how accounts work, see ACCOUNTS.md. This page covers how to test them.

## 1. Test accounts

From the backend folder (after the setup steps in ACCOUNTS.md):

    python scripts/seed_test_accounts.py

This creates three accounts in the local database (backend/foodtofork.db). Running it again is safe: existing accounts are skipped, not changed.

    username      role    starts with
    test_user     user    an empty kitchen
    test_cook     user    one pantry item, one grocery item, one saved recipe
    test_admin    admin   an empty kitchen

All three use the password: test-pass-123

Notes:
- The script refuses to run if DATABASE_URL is set (for example Neon on Vercel), because these accounts have a public password. Never create them on the deployed database.
- test_admin is separate from the real admin, which comes from ADMIN_USERNAME and ADMIN_PASSWORD in backend/.env.
- To start over, stop the server, delete backend/foodtofork.db, and run the script again.

## 2. Automated tests

From the backend folder:

    pytest

Tests use an in-memory database, so they never touch foodtofork.db. Files and what they check:

    test_accounts.py          sign up, sign in, names, per-account kitchens, admin powers
    test_shares.py            recipe shares, claims, undo, refresh
    test_permissions.py       admin routes need an admin, signup cannot pick a role,
                              users cannot reset or delete other accounts,
                              deleted or expired sessions stop working
    test_share_permissions.py only the owner can manage a share, an ingredient only
                              works on its own share, links show only safe fields
    test_security.py          password hashing, session tokens, share ids

## 3. Who can do what

    Action                                   Guest   Account   Share link   Admin
    Keep a kitchen                           browser  server   no           server
    Save recipes and create share links      no      yes       no           yes
    View a shared recipe                     yes     yes       yes          yes
    Claim an ingredient on a shared recipe   yes     yes       yes          yes
    Edit or stop your own share              no      yes       no           yes
    Edit or stop someone else's share        no      no        no           no
    List accounts, reset passwords, delete   no      no        no           yes

## 4. Manual checklist

Use the app, or the API page at http://localhost:8000/docs (sign in, copy the token, click Authorize, paste it).

Roles
1. Sign in as test_user. The Admin page must not open, and GET /admin/users must return 403.
2. Sign in as test_admin. Account, then Manage accounts, lists every account including the seeded ones.
3. As test_admin, reset a throwaway account's password. That account must be signed out everywhere and able to sign in with the new password.
4. As test_admin, try to delete yourself. It must be refused. Deleting another account must work.

Kitchens
5. Sign in as test_cook on one browser and a second browser. Both show the same kitchen.
6. Sign in as test_user. It must not show test_cook's pantry.
7. Continue as guest, add an item, then sign up. The item must carry over to the new account.

Sharing
8. As test_cook, save any recipe from the Recipes page, then open Recipes, then My recipes, and share it with a title.
9. Open the share link in a private window without signing in. The page shows the title, the owner as first name plus last initial, and the ingredient list.
10. In the private window, type a name and claim a missing ingredient. Back as test_cook, the claim shows up.
11. Claim the same ingredient with a different name. It must be refused. Undo with the same name. It must work.
12. As test_user, try to edit or stop test_cook's share through the API. It must return 404.
13. As test_cook, stop sharing. The link must stop working.

Sessions
14. Sign out, then reuse the old token on /auth/me. It must return 401.
15. Change a password on one device. Other devices must be signed out.

Delete accounts only for throwaway accounts you created yourself, not the seeded ones.

## 5. Not covered yet

Login rate limiting, email verification, and password reset by email (see the security notes in ACCOUNTS.md).