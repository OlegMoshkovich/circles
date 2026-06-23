# App Review — Screen Recording Script

Record this on a **physical device** (App Review requires it), ideally in one continuous
take. Target length **3–4 minutes**. Upload it somewhere with a stable link and put that
link in **App Store Connect → App Review Information → Notes**, then reference it in your
reply to the reviewer.

Apple's reply asked specifically to see three things: the **EULA/Terms before registering**,
the **flag** mechanism, and the **block** mechanism. This script shows those plus the
**content filter** and the **moderation/eject** step, so the reviewer sees the full picture.

**Before you start recording:**

- Use a fresh / signed-out account so onboarding (and the EULA step) appears.
- Have a **second test account** that has created a circle, an event, and posted a note —
  this is the "abusive user" you will report and block. Note its display name.
- Turn on **Settings → Accessibility → Touch → Show Taps** so the reviewer sees each press.
- Keep one hand free to narrate, or add the captions below as on-screen text in editing.

---

## Scene 1 — EULA / Terms before any content (Guideline 1.2)  · ~40s

**Goal: prove the user must accept Terms/EULA with a zero-tolerance clause before reaching content.**

1. Launch the app on the **sign-in** screen.
2. Tap **"Continue with Apple"** and complete the native Apple sheet.
   - (Note for narration: the app does **not** ask for a name or email afterwards — the name
     comes from Apple and is shown read-only.)
3. Onboarding begins. Move through the steps until the **"Terms & community rules"** step.
4. Show the on-screen text: **"no tolerance for objectionable content or abusive behaviour."**
5. Tap **"Read full terms →"** to open https://valmia.ch/terms-and-conditions, then come back.
6. Point out that **Continue is disabled** until you tick the box.
7. Tick **"I have read and agree to the Terms… including zero tolerance…"**, then tap **Continue**.

> Caption: "Every user must accept the EULA/Terms — with a zero-tolerance clause — during
> onboarding, before they can view or post any community content."

---

## Scene 2 — Content filter blocks objectionable text (Guideline 1.2)  · ~30s

**Goal: show objectionable content is filtered before it can be saved — in titles AND notes.**

1. Tap **+** to create a new **Event** (or Circle).
2. In the **Title** field, type an obvious slur / objectionable word, fill the rest, and tap
   **Create Event**.
3. Show the rejection: a "Can't post this" alert appears and the event is **not** created.
4. (Optional, to show it's everywhere) Open a circle/event, compose a **note** with an
   objectionable word, tap send, and show the same block.

> Caption: "Objectionable content is filtered on every user-entered field — event/circle
> titles, descriptions, notes, and profile bios — in the app and again on the server, so it
> cannot be saved even from a modified client."

---

## Scene 3 — Flag / report objectionable content (Guideline 1.2)  · ~45s

**Goal: show how any user reports content.**

1. Open the **circle**, **event**, or **note** created by your second (abusive) account.
2. Tap the **"•••" (three dots)** on that item — or open the user's profile and tap "•••".
3. The **"Report content"** sheet opens with reasons:
   **Spam or scam / Harassment or abuse / Offensive or inappropriate.**
4. Select **"Harassment or abuse"**, type a short description (required for harassment),
   and tap **"Submit report."**
5. Show the confirmation: **"This content is now hidden while our team reviews it."**
6. Show that the reported item is now **gone from the feed**.

> Caption: "Any user can flag content. A harassment report hides the content immediately
> and notifies our moderation team."

---

## Scene 4 — Block an abusive user, content disappears instantly (Guideline 1.2)  · ~40s

**Goal: show blocking, and that the blocked user's content vanishes immediately.**

1. Open the **profile** of the abusive user (tap their name/avatar on a circle, event, or note).
2. Tap **"Block [name]"** at the bottom of the profile.
3. Confirm in the dialog — note the text: *"You won't see their circles, events, or notes
   anymore, and our team will be notified to review them."* Tap **Block**.
4. The profile closes and you return to the feed.
5. **Scroll the feed** and show that the blocked user's circles, events, and notes are all
   **gone**.

> Caption: "Blocking removes the user's content from the feed instantly and notifies our
> team to review them."

---

## Scene 5 — Moderation & ejecting the user within 24h (Guideline 1.2)  · ~30s

**Goal: show the developer-side action that removes content and ejects the user.**

1. On a laptop/second screen, open the **moderation dashboard** (valmia.ch/admin/moderation),
   signed in as an admin.
2. Show the new report from Scene 3/4 in the list.
3. Tap **Ban user** (eject). Show the report move to "action taken."
4. (Optional) Back in the app, show that the banned user's account is no longer available.

> Caption: "Reports reach our moderation dashboard. We remove offending content and eject
> the user within 24 hours; a banned user's content is removed for everyone."

---

## Scene 6 — Account deletion (Guideline 5.1.1(v))  · ~25s  · optional but recommended

**Goal: include the in-app delete flow so the reviewer sees it in this build.**

1. Go to your own **Profile → Delete account**.
2. Read the permanent-deletion warning, type **`DELETE`** to confirm, tap the final button.
3. Show the app returning to the signed-out screen.

> Caption: "Account deletion is available in-app and permanently removes the account and its data."

---

## Reviewer-reply checklist

- [ ] Recording captured on a physical device, taps visible
- [ ] Shows: EULA/Terms acceptance during onboarding (gated by checkbox)
- [ ] Shows: content filter rejecting objectionable text
- [ ] Shows: report/flag flow + content hidden
- [ ] Shows: block flow + content disappearing instantly
- [ ] Shows: moderation dashboard ban/eject
- [ ] (Optional) Shows: account deletion
- [ ] Video link added to App Review Information → Notes
- [ ] Demo account credentials provided
