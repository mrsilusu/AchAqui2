"""
Script to generate AchAqui app assets from the logo.
Produces: icon.png, splash.png, adaptive-icon.png, favicon.png
"""
import math
from PIL import Image, ImageDraw, ImageFont

# ─── Colors ────────────────────────────────────────────────────────────────────
RED        = (204, 0,   0)
DARK_GRAY  = (55,  55,  55)
MID_GRAY   = (100, 100, 100)
LIGHT_GRAY = (200, 200, 200)
WHITE      = (255, 255, 255)
PIN_RED    = (210, 30,  30)
PIN_RED2   = (180, 20,  20)   # shadow / darker edge
GLASS_RIM  = (80,  80,  80)
HANDLE_TOP = (100, 100, 100)
HANDLE_BOT = (50,  50,  50)


# ─── Helpers ───────────────────────────────────────────────────────────────────

def draw_star(draw, cx, cy, r_outer, r_inner, color, n=5):
    """Draw a filled n-pointed star centred at (cx, cy)."""
    pts = []
    for i in range(2 * n):
        angle = math.radians(-90 + i * 180 / n)
        r = r_outer if i % 2 == 0 else r_inner
        pts.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
    draw.polygon(pts, fill=color)


def draw_pin(draw, cx, top_y, pin_w, pin_h, fill, outline_color=None):
    """
    Draw a map-pin (teardrop) shape.
    The circle part is centred at (cx, top_y + pin_w/2).
    The tail points downward ending at (cx, top_y + pin_h).
    """
    r = pin_w // 2
    circle_cx = cx
    circle_cy = top_y + r

    # Tail polygon
    tail_pts = [
        (cx - r * 0.45, circle_cy + r * 0.55),
        (cx + r * 0.45, circle_cy + r * 0.55),
        (cx,            top_y + pin_h),
    ]
    draw.polygon(tail_pts, fill=fill)

    # Circle head
    draw.ellipse(
        [circle_cx - r, circle_cy - r, circle_cx + r, circle_cy + r],
        fill=fill
    )

    if outline_color:
        draw.ellipse(
            [circle_cx - r, circle_cy - r, circle_cx + r, circle_cy + r],
            outline=outline_color, width=max(2, r // 10)
        )

    return circle_cx, circle_cy, r   # return circle info for star placement


def draw_magnifier(draw, cx, cy, glass_r, rim_thick, handle_len, handle_thick):
    """
    Draw a magnifying glass.
    Glass circle centred at (cx, cy).
    Handle goes toward lower-right.
    """
    # White interior
    draw.ellipse(
        [cx - glass_r, cy - glass_r, cx + glass_r, cy + glass_r],
        fill=WHITE
    )

    # Gray rim
    for t in range(rim_thick, 0, -1):
        alpha = int(80 + 175 * (1 - t / rim_thick))
        c = (80, 80, 80) if t < rim_thick // 2 else (110, 110, 110)
        draw.ellipse(
            [cx - glass_r - t, cy - glass_r - t,
             cx + glass_r + t, cy + glass_r + t],
            outline=c, width=1
        )

    # Handle (rotated ~45° toward lower-right)
    angle = math.radians(45)          # direction of handle
    hx1 = cx + glass_r * math.cos(angle)
    hy1 = cy + glass_r * math.sin(angle)
    hx2 = hx1 + handle_len * math.cos(angle)
    hy2 = hy1 + handle_len * math.sin(angle)

    # Draw handle as thick line with rounded caps → use polygon
    perp = math.radians(45 + 90)
    dx = (handle_thick / 2) * math.cos(perp)
    dy = (handle_thick / 2) * math.sin(perp)

    handle_pts = [
        (hx1 - dx, hy1 - dy),
        (hx1 + dx, hy1 + dy),
        (hx2 + dx, hy2 + dy),
        (hx2 - dx, hy2 - dy),
    ]
    # gradient-ish: draw two overlapping rectangles
    draw.polygon(handle_pts, fill=HANDLE_BOT)
    inner_pts = [
        (hx1 - dx * 0.5, hy1 - dy * 0.5),
        (hx1 + dx * 0.3, hy1 + dy * 0.3),
        (hx2 + dx * 0.3, hy2 + dy * 0.3),
        (hx2 - dx * 0.5, hy2 - dy * 0.5),
    ]
    draw.polygon(inner_pts, fill=HANDLE_TOP)

    # End cap ellipse
    ec_r = handle_thick // 2
    draw.ellipse(
        [hx2 - ec_r, hy2 - ec_r, hx2 + ec_r, hy2 + ec_r],
        fill=HANDLE_BOT
    )

    # Rim outline (on top)
    draw.ellipse(
        [cx - glass_r - rim_thick // 2, cy - glass_r - rim_thick // 2,
         cx + glass_r + rim_thick // 2, cy + glass_r + rim_thick // 2],
        outline=GLASS_RIM, width=rim_thick
    )


def draw_logo_group(draw, ox, oy, scale=1.0):
    """
    Draw the full logo (glass + pin + text) with origin (ox, oy) and scale.
    All base measurements are for a 1024-px canvas; scale accordingly.
    """
    s = scale

    # --- Magnifying glass ---
    glass_cx = int(ox + 220 * s)
    glass_cy = int(oy + 220 * s)
    glass_r  = int(185 * s)
    rim_t    = int(28 * s)
    handle_l = int(130 * s)
    handle_t = int(55 * s)

    draw_magnifier(draw, glass_cx, glass_cy, glass_r, rim_t, handle_l, handle_t)

    # --- Pin inside glass ---
    pin_w  = int(140 * s)
    pin_h  = int(190 * s)
    pin_cx = glass_cx
    pin_top_y = int(glass_cy - 110 * s)

    pcx, pcy, pr = draw_pin(draw, pin_cx, pin_top_y, pin_w, pin_h, PIN_RED)

    # White inner circle on pin
    inner_r = int(pr * 0.58)
    draw.ellipse(
        [pcx - inner_r, pcy - inner_r, pcx + inner_r, pcy + inner_r],
        fill=WHITE
    )

    # Star on pin
    star_ro = int(inner_r * 0.72)
    star_ri = int(inner_r * 0.30)
    draw_star(draw, pcx, pcy, star_ro, star_ri, DARK_GRAY)

    return glass_cx, glass_cy, glass_r   # handy for text positioning


def try_font(size):
    """Return a font at *size*, falling back to default."""
    for path in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        "/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf",
    ]:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()


def try_font_regular(size):
    for path in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
        "/usr/share/fonts/truetype/ubuntu/Ubuntu-R.ttf",
    ]:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()


# ─── 1. icon.png  1024×1024 ────────────────────────────────────────────────────

def make_icon():
    W, H = 1024, 1024
    img  = Image.new("RGBA", (W, H), WHITE)
    draw = ImageDraw.Draw(img)

    # Logo group centred
    s = 0.92
    ox = int(W * 0.03)
    oy = int(H * 0.05)
    gcx, gcy, gr = draw_logo_group(draw, ox, oy, scale=s)

    # Text  "AchAqui"
    title_size = int(130 * s)
    font_bold  = try_font(title_size)
    sub_size   = int(52 * s)
    font_reg   = try_font_regular(sub_size)

    text_x = int(ox + 440 * s)
    text_y = int(oy + 155 * s)

    # "Ach" in red
    draw.text((text_x, text_y), "Ach", font=font_bold, fill=RED)
    ach_w = int(font_bold.getlength("Ach"))
    # "Aqui" in dark gray
    draw.text((text_x + ach_w, text_y), "Aqui", font=font_bold, fill=DARK_GRAY)

    # Subtitle
    sub_x = text_x
    sub_y = text_y + title_size + int(8 * s)
    draw.text((sub_x, sub_y), "Descubra o melhor perto de ti",
              font=font_reg, fill=MID_GRAY)

    img.save("assets/icon.png", "PNG")
    print("✓ assets/icon.png  (1024×1024)")


# ─── 2. splash.png  1284×2778 ──────────────────────────────────────────────────

def make_splash():
    W, H = 1284, 2778
    img  = Image.new("RGBA", (W, H), WHITE)
    draw = ImageDraw.Draw(img)

    # Scale logo to ~55% of width
    s = 1.05
    logo_w = int(800 * s)
    logo_h = int(500 * s)

    ox = (W - logo_w) // 2 - int(30 * s)
    oy = (H - logo_h) // 2 - int(80 * s)

    gcx, gcy, gr = draw_logo_group(draw, ox, oy, scale=s)

    # Title
    title_size = int(120 * s)
    font_bold  = try_font(title_size)
    sub_size   = int(48 * s)
    font_reg   = try_font_regular(sub_size)

    text_x = int(ox + 440 * s)
    text_y = int(oy + 155 * s)

    draw.text((text_x, text_y), "Ach", font=font_bold, fill=RED)
    ach_w = int(font_bold.getlength("Ach"))
    draw.text((text_x + ach_w, text_y), "Aqui", font=font_bold, fill=DARK_GRAY)

    sub_x = text_x
    sub_y = text_y + title_size + int(8 * s)
    draw.text((sub_x, sub_y), "Descubra o melhor perto de ti",
              font=font_reg, fill=MID_GRAY)

    img.save("assets/splash.png", "PNG")
    print("✓ assets/splash.png  (1284×2778)")


# ─── 3. adaptive-icon.png  1024×1024 ───────────────────────────────────────────

def make_adaptive_icon():
    """Only the magnifier + pin, no text, large and centred."""
    W, H = 1024, 1024
    img  = Image.new("RGBA", (W, H), WHITE)
    draw = ImageDraw.Draw(img)

    s = 1.3
    ox = int((W - 470 * s) // 2)
    oy = int((H - 470 * s) // 2)

    glass_cx = int(ox + 220 * s)
    glass_cy = int(oy + 220 * s)
    glass_r  = int(185 * s)
    rim_t    = int(28 * s)
    handle_l = int(130 * s)
    handle_t = int(55 * s)

    draw_magnifier(draw, glass_cx, glass_cy, glass_r, rim_t, handle_l, handle_t)

    pin_w  = int(140 * s)
    pin_h  = int(190 * s)
    pin_cx = glass_cx
    pin_top_y = int(glass_cy - 110 * s)

    pcx, pcy, pr = draw_pin(draw, pin_cx, pin_top_y, pin_w, pin_h, PIN_RED)

    inner_r = int(pr * 0.58)
    draw.ellipse(
        [pcx - inner_r, pcy - inner_r, pcx + inner_r, pcy + inner_r],
        fill=WHITE
    )
    draw_star(draw, pcx, pcy, int(inner_r * 0.72), int(inner_r * 0.30), DARK_GRAY)

    img.save("assets/adaptive-icon.png", "PNG")
    print("✓ assets/adaptive-icon.png  (1024×1024)")


# ─── 4. favicon.png  48×48 ─────────────────────────────────────────────────────

def make_favicon():
    W, H = 48, 48
    img  = Image.new("RGBA", (W, H), WHITE)
    draw = ImageDraw.Draw(img)

    # Just the pin, centred
    pin_w = 28
    pin_h = 38
    cx    = W // 2
    top_y = (H - pin_h) // 2 - 2

    pcx, pcy, pr = draw_pin(draw, cx, top_y, pin_w, pin_h, PIN_RED)

    inner_r = int(pr * 0.58)
    draw.ellipse(
        [pcx - inner_r, pcy - inner_r, pcx + inner_r, pcy + inner_r],
        fill=WHITE
    )
    draw_star(draw, pcx, pcy, int(inner_r * 0.72), int(inner_r * 0.30), DARK_GRAY)

    img.save("assets/favicon.png", "PNG")
    print("✓ assets/favicon.png  (48×48)")


# ─── Run ────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import os
    os.makedirs("assets", exist_ok=True)
    make_icon()
    make_splash()
    make_adaptive_icon()
    make_favicon()
    print("\nAll assets generated successfully.")
