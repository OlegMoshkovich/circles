# App Review — Screen Recording Script

Record on a **physical device** (App Review requires it), in one continuous take if you
can. Total length ~3–4 minutes. Put the final video link in **App Store Connect →
App Review Information → Notes**, and reference it in your reply to the reviewer.

Cover four things the reviewer raised across the last two rejections:

1. Sign in with Apple no longer asks for name/email (Guideline 4)
2. EULA / Terms shown before accessing user-generated content (Guideline 1.2)
3. Flag / report objectionable content (Guideline 1.2)
4. Block an abusive user — content disappears instantly (Guideline 1.2)
5. Account deletion (Guideline 5.1.1(v)) — include again so the reviewer sees it in this build

Tip: turn on **Settings → Accessibility → Touch → Show Taps** (or the simulator's touch
indicator) so the reviewer can see where you press.

---

## Scene 1 — Sign in with Apple (Guideline 4)

**Goal: prove the app does NOT ask for name or email after Apple sign-in.**

1. Launch the app on the sign-in screen.
2. Tap **"Continue with Apple"**.
3. Complete the native Apple sheet (Face ID / confirm).
4. Onboarding begins. Walk through the steps **without typing a name or email anywhere**:
   - Welcome → Community → Community Guidelines → Terms (see Scene 2) → User type →
     Interests → Location → **Your profile**.
5. On the **"Your profile"** step, point out: the **Name is already filled from Apple and
   shown read-only** — there is no required name field, and email is never requested. Tap
   **Continue** straight through.
6. Land on the home screen.

> Caption / note to reviewer: "Name comes from Sign in with Apple and is shown read-only.
> The app never asks the user to type a name or email."

---

## Scene 2 — EULA / Terms before user-generated content (Guideline 1.2)

**Goal: show the EULA is presented and must be accepted during onboarding.**

1. During onboarding (first run), stop on the **Terms** step.
2. Show the on-screen text: zero tolerance for objectionable content and abusive users.
3. Tap the link to open the full Terms & Conditions (valmia.ch/terms-and-conditions).
4. Return, tick **"I have read and agree to the Terms…"**, and tap Continue.

> Caption: "Users must accept the EULA/Terms (with a zero-tolerance clause) during
> onboarding, before they can post or view community content."

---

## Scene 3 — Flag / report objectionable content (Guideline 1.2)

**Goal: show how a user reports content.**

1. Open a **Circle** (or an Event) that has another member.
2. Open the member's profile (tap their name/avatar) **or** open the content item.
3. Tap the **••• (three dots)** in the top-right.
4. The **Report content** sheet appears with reasons: Spam or scam / Harassment or abuse /
   Offensive or inappropriate.
5. Select **Harassment or abuse**, type a short reason, tap **Submit report**.
6. Show the confirmation: "This content is now hidden while our team reviews it."

> Caption: "Any user can flag content. Harassment reports hide the content immediately and
> notify our team, who act within 24 hours."

---

## Scene 4 — Block an abusive user (Guideline 1.2)

**Goal: show blocking, and that the blocked user's content disappears instantly.**

1. Open the abusive user's **profile** (e.g. as the creator of a circle/event).
2. Tap the white **"Block [name]"** button at the bottom of the profile.
3. Confirm in the dialog ("Block").
4. The profile closes and you return to the feed.
5. Show that the blocked user's **circles, events, and notes are no longer visible** — scroll
   the feed to demonstrate their content is gone.

> Caption: "Blocking removes the user's content from the feed instantly and notifies our team
> to review them."

---

## Scene 5 — Account deletion (Guideline 5.1.1(v))

**Goal: full delete flow from initiation to confirmation.**

1. Go to **Profile** (your own).
2. Scroll to **Delete account** and tap it.
3. Read the warning: permanent, cannot be undone.
4. Tap **Delete Account**, then **type `DELETE`** in the confirmation field.
5. Tap the final confirm button.
6. Show the app returning to the signed-out / sign-in screen — the account and its data are
   gone.

> Caption: "Account creation requires account deletion. Deletion is permanent and removes the
> user's account and all their data."

---

## Reviewer reply checklist

- [ ] Recording captured on a physical device, taps visible
- [ ] Shows: Apple sign-in with no name/email prompt
- [ ] Shows: EULA acceptance during onboarding
- [ ] Shows: report flow
- [ ] Shows: block flow + content disappearing
- [ ] Shows: full account deletion
- [ ] Video link added to App Review Information → Notes
- [ ] Demo account credentials provided (so the reviewer can reproduce)
