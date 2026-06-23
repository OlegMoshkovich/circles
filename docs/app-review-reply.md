# Reply to App Review

Paste this into the resolution thread in App Store Connect (Submission ID
3c8a8c30-e2bd-4f42-8a52-b840f7ba4aa4). It addresses Guideline 1.2 and Guideline 2.3.
Replace the bracketed placeholders before sending.

---

Hello, and thank you for the detailed review.

We have addressed both guidelines in the build now submitted (version 1.0.1). A screen
recording captured on a physical device is linked in **App Review Information → Notes**,
and it demonstrates each precaution end to end. Summary of what we implemented:

**Guideline 1.2 — User-Generated Content**

All four required precautions are in place:

1. **Filtering objectionable content.** Notes are checked against a profanity/hate-term
   filter both in the app and again at the database level, so objectionable content is
   rejected before it can be posted — it cannot be bypassed by a modified client.

2. **A way to flag objectionable content.** Every piece of user-generated content
   (events, circles, individual notes, and user profiles) has a "•••" menu that opens a
   "Report content" sheet with reasons (Spam or scam / Harassment or abuse / Offensive or
   inappropriate). Harassment reports hide the reported content immediately, pending review.

3. **A way to block abusive users.** Any user profile has a "Block" button. Blocking
   removes that user's circles, events, and notes from the blocker's feed instantly, and
   simultaneously files a report that notifies our moderation team by email so we can act on it.

4. **Acting on reports within 24 hours.** Reports flow into a moderation dashboard our team
   monitors. We remove the offending content and ban (eject) the responsible user; a banned
   user's content is removed from the app for everyone, and the user loses access. We commit
   to acting on reports within 24 hours.

In addition, users must accept our **EULA / Terms of Use** — which include a zero-tolerance
clause for objectionable content and abusive behavior — during onboarding, before they can
view or post any community content. The full terms are available at
https://valmia.ch/terms-and-conditions.

**Guideline 2.3 — Accurate Metadata**

We have revised the app's description in App Store Connect so it accurately reflects the
app's core functionality: creating small communities ("circles"), organizing real-world
events with a location, and sharing notes with members.

**Demo account for testing**

Email: [DEMO_EMAIL]
Password: [DEMO_PASSWORD]
(Or sign in with Apple — the app never asks for a name or email after Apple sign-in.)

Please let us know if any further detail would help. Thank you for your time.

---
```
Checklist before you send:
[ ] Build 1.0.1 uploaded and selected for this submission
[ ] Video recorded on a physical device, link added to App Review Information → Notes
[ ] App description updated in App Store Connect (Guideline 2.3)
[ ] Demo credentials filled in above and in App Review Information
[ ] Edge Function configured in Supabase so report/block emails actually send
```
