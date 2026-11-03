# VPN setup (stub)
Install the Northwind VPN client from the Software Center. Sign in with your work email and approve the MFA prompt.
Error 809 ("The network connection between your computer and the VPN server could not be established") means
UDP ports 500 and 4500 are blocked: switch the client protocol to "SSL (TCP 443)" in Settings > Connection, then reconnect.
If it still fails, open an IT ticket with a screenshot of the error.
