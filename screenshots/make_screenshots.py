"""Generate the three mock screenshots (fictional UIs). Run: python screenshots/make_screenshots.py"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).parent
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf"
def font(n, bold=False): return ImageFont.truetype(F % ("-Bold" if bold else ""), n)
W, H = 1100, 700

def window(title):
    im = Image.new("RGB", (W, H), "#e9edf2"); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 44], fill="#1f3a5f")
    d.text((20, 10), title, font=font(20, True), fill="white")
    for i, c in enumerate(("#ff5f56", "#ffbd2e", "#27c93f")):
        d.ellipse([W - 110 + i * 30, 14, W - 94 + i * 30, 30], fill=c)
    return im, d

def button(d, xy, label, fill="#1f6feb", fg="white"):
    d.rounded_rectangle(xy, 8, fill=fill)
    f = font(20, True); w = d.textlength(label, font=f)
    d.text(((xy[0] + xy[2]) / 2 - w / 2, (xy[1] + xy[3]) / 2 - 12), label, font=f, fill=fg)

def vpn():
    im, d = window("Northwind Secure Connect")
    d.rounded_rectangle([60, 90, W - 60, H - 60], 14, fill="white", outline="#c5ccd6", width=2)
    d.ellipse([100, 130, 180, 210], fill="#d93025")
    d.text((124, 143), "!", font=font(48, True), fill="white")
    d.text((210, 135), "Connection failed (809)", font=font(36, True), fill="#b3261e")
    d.text((210, 190), "Status: Disconnected", font=font(22), fill="#444")
    d.text((100, 260), "The VPN client could not reach the gateway.", font=font(24), fill="#222")
    d.text((100, 300), "Error code 809. The remote gateway did not respond.", font=font(24), fill="#222")
    d.text((100, 360), "Gateway:", font=font(22, True), fill="#222")
    d.rounded_rectangle([230, 352, 700, 396], 6, fill="#f4f6f8", outline="#9aa5b1")
    d.text((244, 360), "NW-Gateway-Primary", font=font(22), fill="#222")
    d.text((100, 420), "Network: Home Wi-Fi", font=font(20), fill="#666")
    button(d, (100, 500, 300, 560), "Retry")
    button(d, (320, 500, 520, 560), "Details", fill="#e3e8ee", fg="#222")
    im.save(OUT / "vpn-error.png")

def mfa():
    im, d = window("Northwind Account Portal")
    d.rounded_rectangle([60, 90, W - 60, H - 60], 14, fill="white", outline="#c5ccd6", width=2)
    d.text((100, 120), "Set up multi-factor authentication", font=font(34, True), fill="#1f3a5f")
    d.text((100, 180), "Scan this code with the Northwind Authenticator app", font=font(22), fill="#222")
    import random; random.seed(7)
    x0, y0, s, n = 130, 240, 14, 25
    d.rectangle([x0 - 14, y0 - 14, x0 + n * s + 14, y0 + n * s + 14], fill="white", outline="#222", width=3)
    for i in range(n):
        for j in range(n):
            corner = (i < 7 and j < 7) or (i < 7 and j > n - 8) or (i > n - 8 and j < 7)
            if corner:
                edge = i in (0, 6, n - 7, n - 1) or j in (0, 6, n - 7, n - 1) or (2 <= i % (n - 7) + 0 <= 4 and False)
                inner = (2 <= (i if i < 7 else i - (n - 7)) <= 4) and (2 <= (j if j < 7 else j - (n - 7)) <= 4)
                on = edge or inner
            else: on = random.random() < 0.5
            if on: d.rectangle([x0 + j * s, y0 + i * s, x0 + j * s + s - 1, y0 + i * s + s - 1], fill="#111")
    d.text((580, 250), "Step 1 of 3: Add this account in the app", font=font(22, True), fill="#222")
    d.text((580, 300), "1. Open Northwind Authenticator", font=font(20), fill="#333")
    d.text((580, 335), "2. Tap Add account, then Scan QR code", font=font(20), fill="#333")
    d.text((580, 370), "3. Enter the 6-digit code below", font=font(20), fill="#333")
    for i in range(6):
        d.rounded_rectangle([580 + i * 62, 430, 628 + i * 62, 490], 8, fill="#f4f6f8", outline="#9aa5b1", width=2)
    button(d, (580, 530, 780, 590), "Verify")
    im.save(OUT / "mfa-enrollment.png")

def timesheet():
    im, d = window("Northwind Timesheets - Week of Mon 3 Nov")
    d.rounded_rectangle([40, 70, W - 40, H - 40], 14, fill="white", outline="#c5ccd6", width=2)
    d.rounded_rectangle([60, 90, W - 60, 150], 8, fill="#fde7e9", outline="#d93025", width=2)
    d.text((80, 105), "Invalid booking code: line not saved", font=font(26, True), fill="#b3261e")
    cols = [("Booking code", 60), ("Description", 330), ("Mon", 640), ("Tue", 710), ("Wed", 780), ("Thu", 850), ("Fri", 920), ("Total", 985)]
    d.rectangle([60, 180, W - 60, 220], fill="#1f3a5f")
    for t, x in cols: d.text((x + 8, 188), t, font=font(18, True), fill="white")
    rows = [("INT-ADM-001", "Onboarding", "8", "0", "0", "0", "0", "8", False),
            ("CLI-ZEP-9999", "Project work", "0", "8", "8", "8", "8", "32", True),
            ("INT-TRN-001", "Methods workshop", "0", "0", "2", "0", "0", "2", False)]
    for k, r in enumerate(rows):
        y = 220 + k * 56
        bad = r[-1]
        d.rectangle([60, y, W - 60, y + 56], fill="#fff5f5" if bad else "white", outline="#d5dbe3")
        for (t, x), v in zip(cols, r[:-1]): d.text((x + 8, y + 16), v, font=font(18, bad and x == 60), fill="#b3261e" if bad and x == 60 else "#222")
        if bad: d.rectangle([62, y + 4, 318, y + 52], outline="#d93025", width=3)
    d.text((80, 420), "Total hours: 42.0", font=font(22, True), fill="#222")
    d.text((80, 455), "Status: Draft (not submitted)", font=font(20), fill="#555")
    button(d, (80, 520, 280, 580), "Validate", fill="#e3e8ee", fg="#222")
    button(d, (300, 520, 500, 580), "Submit", fill="#9aa5b1")
    im.save(OUT / "timesheet-invalid-code.png")

if __name__ == "__main__":
    vpn(); mfa(); timesheet()
