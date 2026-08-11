import os
import math
import random
from PIL import Image, ImageEnhance, ImageDraw, ImageFilter

base_dir = r"C:\Users\khang\.gemini\antigravity\brain\e1573dd0-adcd-4dc8-99fb-f3fe38332066"

stones = [
    {
        "name": "ember_stone",
        "file": "ember_stone_tilted_1786169083796.jpg",
        "type": "fire",
        "color": (255, 70, 20),
    },
    {
        "name": "tide_stone",
        "file": "tide_stone_v2_1786189495238.jpg",
        "type": "water",
        "color": (0, 229, 255),
    },
    {
        "name": "verdant_stone",
        "file": "verdant_stone_tilted_1786169121245.jpg",
        "type": "nature",
        "color": (80, 255, 120),
    },
    {
        "name": "arcane_stone",
        "file": "arcane_stone_v2_1786189481529.jpg",
        "type": "arcane",
        "color": (255, 30, 200),
    },
    {
        "name": "solar_stone",
        "file": "solar_stone_tilted_1786169160935.jpg",
        "type": "sun",
        "color": (255, 220, 50),
    },
    {
        "name": "void_stone",
        "file": "void_stone_v2_1786189508131.jpg",
        "type": "void",
        "color": (170, 90, 255),
    },
    {
        "name": "celestial_stone",
        "file": "celestial_v2_1786189522888.jpg",
        "type": "celestial",
        "color": (255, 255, 255),
    },
]

def remove_background(img_rgba, threshold=35):
    """
    Key out dark background pixels to make the GIF background 100% transparent.
    """
    data = img_rgba.getdata()
    new_data = []
    for item in data:
        r, g, b, a = item
        # If dark background pixel, make transparent
        if r < threshold and g < threshold and b < threshold:
            new_data.append((0, 0, 0, 0))
        else:
            # Keep glowing alpha proportion
            new_data.append(item)
    img_rgba.putdata(new_data)
    return img_rgba

def draw_sparkle(draw, cx, cy, size, color, alpha=255):
    r, g, b = color
    fill_col = (r, g, b, alpha)
    draw.line([(cx - size, cy), (cx + size, cy)], fill=fill_col, width=max(1, size // 3))
    draw.line([(cx, cy - size), (cx, cy + size)], fill=fill_col, width=max(1, size // 3))
    draw.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=(255, 255, 255, alpha))

def draw_holy_ring(draw, cx, cy, radius, angle, color, alpha=200):
    """Draws rotating celestial holy ring with star spikes."""
    r, g, b = color
    fill_col = (r, g, b, alpha)
    points_count = 8
    pts = []
    for i in range(points_count * 2):
        rad = angle + (i * math.pi / points_count)
        dist = radius if i % 2 == 0 else radius * 0.4
        x = cx + math.cos(rad) * dist
        y = cy + math.sin(rad) * dist
        pts.append((x, y))
    draw.polygon(pts, outline=fill_col, fill=(255, 255, 255, max(0, alpha - 80)))

def draw_water_wave(draw, cx, cy, radius, t_phase, color):
    """Draws flowing liquid water wave rings."""
    r, g, b = color
    points = []
    for deg in range(0, 360, 10):
        rad = math.radians(deg)
        wave_r = radius + 6 * math.sin(rad * 4 + t_phase * math.pi * 2)
        x = cx + math.cos(rad) * wave_r
        y = cy + math.sin(rad) * wave_r
        points.append((x, y))
    draw.polygon(points, outline=(r, g, b, 200), fill=None)

def draw_black_hole_spiral(draw, cx, cy, t_phase, color):
    """Draws swirling black hole spiral accretion vortex."""
    r_c, g_c, b_c = color
    for arm in range(3):
        arm_angle = (arm * 2 * math.pi / 3) + t_phase * 2 * math.pi
        points = []
        for step in range(25):
            dist = 60 - step * 2.2
            if dist < 4:
                break
            angle = arm_angle + step * 0.28
            x = cx + math.cos(angle) * dist
            y = cy + math.sin(angle) * dist
            points.append((x, y))
        if len(points) > 1:
            draw.line(points, fill=(r_c, g_c, b_c, 220), width=max(1, int(3 - step * 0.1)))
    # Inner black hole event horizon core
    draw.ellipse([cx - 14, cy - 14, cx + 14, cy + 14], fill=(0, 0, 0, 255), outline=(170, 90, 255, 255))

def create_transparent_animated_gif(stone_info):
    img_path = os.path.join(base_dir, stone_info["file"])
    if not os.path.exists(img_path):
        print(f"File not found: {img_path}")
        return

    orig_img = Image.open(img_path).convert("RGBA")
    w, h = orig_img.size
    cx, cy = w // 2, h // 2

    # Key out dark background for transparency
    transparent_base = remove_background(orig_img.copy(), threshold=32)

    num_frames = 16
    frames = []

    random.seed(1234)
    particles = []
    for _ in range(16):
        particles.append({
            "angle": random.uniform(0, math.pi * 2),
            "dist": random.uniform(20, 70),
            "speed": random.uniform(1.0, 3.0),
            "size": random.randint(2, 6)
        })

    for f in range(num_frames):
        t = f / num_frames

        # Base glow pulse
        pulse = 1.0 + 0.12 * math.sin(t * 2 * math.pi)
        enhancer = ImageEnhance.Brightness(transparent_base)
        frame_base = enhancer.enhance(pulse)

        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        stype = stone_info["type"]

        if stype == "water":
            # 🌊 Clear liquid water wave rings & rising bubbles
            draw_water_wave(draw, cx, cy, 45, t, stone_info["color"])
            draw_water_wave(draw, cx, cy, 32, t + 0.5, stone_info["color"])
            for p in particles:
                bx = cx + math.cos(p["angle"]) * (p["dist"] + math.sin(t * math.pi * 2) * 5)
                by = cy + math.sin(p["angle"]) * (p["dist"]) - (f * p["speed"]) % 40
                draw.ellipse([bx - 2, by - 2, bx + 2, by + 2], fill=(0, 229, 255, 200), outline=(255, 255, 255, 230))

        elif stype == "void":
            # 🌀 Swirling Black Hole accretion vortex pulling inward
            draw_black_hole_spiral(draw, cx, cy, t, stone_info["color"])
            for p in particles:
                # Inward spiraling cosmic particles
                r_dist = (p["dist"] - f * 2.5) % 65
                spin_angle = p["angle"] + (65 - r_dist) * 0.1
                px = cx + math.cos(spin_angle) * r_dist
                py = cy + math.sin(spin_angle) * r_dist
                draw_sparkle(draw, int(px), int(py), max(2, int(p["size"] * (r_dist / 65))), (220, 180, 255), 230)

        elif stype == "celestial":
            # 🌟 Rotating Holy Celestial Star Ring & Divine Prism Light Rays
            draw_holy_ring(draw, cx, cy, 52, t * 2 * math.pi, (255, 255, 255), 210)
            # Radiant Starburst Light Rays
            for ray_deg in range(0, 360, 45):
                ray_rad = math.radians(ray_deg + t * 360)
                length = 65 + 10 * math.sin(t * 4 * math.pi + ray_deg)
                rx = cx + math.cos(ray_rad) * length
                ry = cy + math.sin(ray_rad) * length
                draw.line([(cx, cy), (rx, ry)], fill=(255, 255, 255, 120), width=2)
            # Prismatic sparkles
            for p in particles:
                px = cx + math.cos(p["angle"] + t * math.pi) * p["dist"]
                py = cy + math.sin(p["angle"] + t * math.pi) * p["dist"]
                draw_sparkle(draw, int(px), int(py), p["size"] + 2, (255, 255, 255), 240)

        elif stype == "fire":
            # 🔥 Rising flames & heat embers
            for p in particles:
                px = cx + math.cos(p["angle"]) * (p["dist"] * 0.6)
                py = cy - (f * p["speed"] * 3) % 50
                draw_sparkle(draw, int(px), int(py), p["size"], (255, 120, 30), 220)

        elif stype == "nature":
            # 🌿 Floating leaves & bio-vein pulse
            for p in particles:
                px = cx + math.cos(p["angle"] + t * math.pi) * p["dist"]
                py = cy + math.sin(p["angle"] + t * math.pi) * p["dist"]
                draw.ellipse([px - 3, py - 2, px + 3, py + 2], fill=(80, 255, 120, 220))

        elif stype == "arcane":
            # ✨ Hot-pink magic rune sparkles
            for p in particles:
                px = cx + math.cos(p["angle"] + t * 2 * math.pi) * p["dist"]
                py = cy + math.sin(p["angle"] + t * 2 * math.pi) * p["dist"]
                draw_sparkle(draw, int(px), int(py), p["size"] + 1, (255, 30, 200), 230)

        elif stype == "sun":
            # ☀️ Solar flare beam pulse
            for ray_deg in range(0, 360, 30):
                ray_rad = math.radians(ray_deg)
                length = 50 + 12 * math.sin(t * 2 * math.pi + ray_deg)
                rx = cx + math.cos(ray_rad) * length
                ry = cy + math.sin(ray_rad) * length
                draw.line([(cx, cy), (rx, ry)], fill=(255, 220, 50, 140), width=3)

        final_frame = Image.alpha_composite(frame_base, overlay)
        frames.append(final_frame)

    output_gif_path = os.path.join(base_dir, f"{stone_info['name']}_transparent.gif")
    
    # Save as transparent GIF (disposal=2 restores to background)
    frames[0].save(
        output_gif_path,
        save_all=True,
        append_images=frames[1:],
        duration=70,  # ~14 FPS fast smooth loop
        loop=0,
        disposal=2
    )
    print(f"[SUCCESS] Created transparent GIF: {output_gif_path}")

for stone in stones:
    create_transparent_animated_gif(stone)

print("All 7 transparent GIF animations completed!")
