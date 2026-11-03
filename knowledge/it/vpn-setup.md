# VPN setup (Northwind Secure Connect)

Owner: IT Helpdesk (helpdesk@northwind-advisory.example, ext 4000, Mon-Fri 7am-7pm ET). Checklist item id: `vpn`.

## What you need
- A Northwind laptop with the Northwind Secure Connect client already installed (it is pre-installed by IT).
- Your Northwind login and an enrolled MFA device. Enroll in MFA first: see `it/mfa-setup.md`. VPN sign-in will not work before MFA is enrolled.

## Connect for the first time
1. Open **Northwind Secure Connect** from the system tray or Start menu.
2. In the Gateway field choose **NW-Gateway-Primary** (address vpn.northwind-advisory.example). Do not type any other address.
3. Sign in with your Northwind email and password.
4. Approve the 6-digit prompt in the Northwind Authenticator app. The status turns green and shows "Connected".
5. Keep the client connected whenever you use the timesheet app, the benefits portal or any client file share.

The session times out after 12 hours. Reconnect each morning.

## Error 809: "Connection failed (809)"
Error 809 means the client could not reach the gateway. It is almost always a home router or hotel network blocking the VPN ports (UDP 500 and UDP 4500). Try these steps in order:
1. Check you can open any public website. If not, fix your internet first.
2. Disconnect, then switch the Gateway to **NW-Gateway-Alt**. It uses TCP 443, which most networks allow. Click Connect again.
3. Restart the Northwind Secure Connect client, then restart the laptop.
4. Try a different network, such as a phone hotspot.
5. If all four steps fail, open an IT ticket (queue IT) and include the error code 809, the gateway you tried and your location. Do not ask a colleague to share their login.

## Other common errors
- **Error 691 (login failed):** your password is wrong or expired. Reset it at https://account.northwind-advisory.example/reset.
- **"MFA not enrolled":** complete `it/mfa-setup.md`, then retry.
- **Connected but nothing loads:** disconnect and reconnect; if it persists, ticket the IT queue.

## Rules
- Never install a personal VPN on a Northwind laptop.
- Public Wi-Fi is allowed only while connected to NW-Gateway-Primary or NW-Gateway-Alt.
- Lost or stolen laptop: call ext 4000 immediately, any hour (after 7pm leave a voicemail; it is monitored).

## FAQ
**Which gateway should I use?** Start with NW-Gateway-Primary. Use NW-Gateway-Alt only when Primary fails with error 809.

**Can I use the VPN on my phone?** No. The client is supported on Northwind laptops (Windows and macOS) only.

**Do I need the VPN in the office?** No. Office Wi-Fi ("NW-Corp") connects directly. You need the VPN everywhere else.

**How do I know I am connected?** The tray icon is green and the client shows "Connected" with the gateway name and a session timer counting up to 12:00:00.

**How fast will IT answer a ticket?** Tickets in the IT queue get a first response within 4 business hours. Phone calls to ext 4000 are answered during support hours.

**What should an IT ticket include?** The exact error text or code, the time it happened, your network type (home, hotel, office, hotspot), and what you already tried.

**The client asks for an update.** Accept it. Updates install in about 3 minutes and keep the connection secure. Do not postpone more than twice.

## Quick facts
- Gateways: NW-Gateway-Primary (UDP 500/4500), NW-Gateway-Alt (TCP 443).
- Session length: 12 hours. Support hours: Mon-Fri 7am-7pm ET.
- Error 809: connection failed (ports blocked). Error 691: login failed.
- Prerequisite: MFA enrolled (checklist item `mfa`).
