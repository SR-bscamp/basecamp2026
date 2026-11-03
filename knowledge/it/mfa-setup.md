# Multi-factor authentication (MFA) setup

Owner: IT Helpdesk (ext 4000). Checklist item id: `mfa`. This is a Day 1 task.

## Deadline
You must enroll in MFA **within 24 hours of your start date**. Accounts that are not enrolled after 24 hours are locked until IT verifies your identity. Enroll first, before VPN, timesheets or benefits: those systems all need MFA.

## Enroll with the Northwind Authenticator app
1. Install **Northwind Authenticator** from your phone's app store (iOS or Android).
2. On your laptop open https://mfa.northwind-advisory.example and sign in with your Northwind email and the temporary password from your welcome email.
3. Choose **Enroll a device**. A QR code appears.
4. In the app tap **Add account**, then **Scan QR code**, and scan the code.
5. Type the 6-digit code shown in the app into the web page and click **Verify**. Codes refresh every 30 seconds.
6. Download your **8 backup codes** and store them in a safe place (not in an email). Each backup code works once.
7. Set your permanent password when asked: at least 14 characters, not reused from your last 5 passwords.

## Enrollment prompt screen
The page titled "Set up multi-factor authentication" with a QR code and the text "Scan this code with the Northwind Authenticator app" is the enrollment step. If you see it, follow the steps above.

## Problems
- **Code rejected:** check the phone's clock is set to automatic; codes are time-based. Wait for the next code and retry.
- **New phone:** before wiping the old one, open the portal and choose **Move device**. If the old phone is gone, call ext 4000; IT verifies you by video call with your manager present (about 15 minutes).
- **Locked out after 5 wrong codes:** the account unlocks automatically after 30 minutes, or ask IT.
- SMS codes are not supported. Never share a code with anyone, including IT.

## FAQ
**Why is MFA required?** Northwind handles confidential client data, and client contracts require two-factor sign-in for every system.

**What is the first thing I must do on Day 1?** Enroll in MFA. It is the first checklist item because every other system depends on it.

**Which app do I use?** Only Northwind Authenticator. Other authenticator apps are not supported.

**What if I never got the welcome email?** Call IT Helpdesk on ext 4000 or email helpdesk@northwind-advisory.example from a personal address and ask for a resend. IT will verify you with your manager.

**How many backup codes do I get?** 8, each usable once. You can generate a new set on the MFA portal under **Backup codes**; this invalidates the old set.

**How long does the 6-digit code last?** 30 seconds. The app shows a countdown ring.

**Can IT read me my code?** No. IT never asks for or reads out codes.

## Quick facts
- Deadline: 24 hours from start date.
- Portal: https://mfa.northwind-advisory.example
- App: Northwind Authenticator. Backup codes: 8.
- Password rule: at least 14 characters, not one of your last 5.
- Lockout: 5 wrong codes, auto-unlock after 30 minutes.
