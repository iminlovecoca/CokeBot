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
        "color": (255, 80, 20),
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
        "color": (160, 80, 255),
    },
    {
        "name": "celestial_stone",
        "file": "celestial_v2_1786189522888.jpg",
        "type": "celestial",
        "color": (255, 255, 255),
    },
]

def draw_sparkle(draw, cx, cy, size, color, alpha=255):
    # 4-point star sparkle
    r = size
    r_inner = max(1, size // 4)
    r_g, g_g, b_g = color
    fill_col = (r_g, g_g, b_g, alpha)
    
    # Vertical line & Horizontal line
    draw.line([(cx - r, cy), (cx + r, cy)], fill=fill_col, width=max(1, size // 3))
    draw.line([(cx, cy - r), (cx, cy + r)], fill=fill_col, width=max(1, size // 3))
    
    # Center dot glow
    draw.ellipse([cx - r_inner, cy - r_inner, cx + r_inner, cy + r_inner], fill=(255, 255, 255, alpha))

def draw_particle(draw, cx, cy, size, color, alpha=255):
    r_g, g_g, b_g = color
    fill_col = (r_g, g_g, b_g, alpha)
    draw.ellipse([cx - size, cy - size, cx + size, cy + size], fill=fill_col)

def create_animated_gif(stone_info):
    img_path = os.path.join(base_dir, stone_info["file"])
    if not os.path.exists(img_path):
        print(f"File not found: {img_path}")
        return

    base_img = Image.open(img_path).convert("RGBA")
    w, h = base_img.size

    num_frames = 16
    frames = []

    # Pre-generate particle positions for smooth loop animation
    random.seed(42)
    p_count = 14
    particles = []
    for _ in range(p_count):
        particles.append({
            "x": random.randint(int(w * 0.25), int(w * 0.75)),
            "y": random.randint(int(h * 0.2), int(h * 0.8)),
            "speed_y": random.uniform(-1.5, -0.5) if stone_info["type"] in ["fire", "nature", "sun", "celestial"] else random.uniform(-0.5, 0.5),
            "speed_x": random.uniform(-0.5, 0.5),
            "size": random.randint(3, 8),
            "phase": random.uniform(0, math.pi * 2)
        })

    for f in range(num_frames):
        t = f / num_frames
        # Pulsing brightness effect on inner core (sine wave)
        pulse = 1.0 + 0.15 * math.sin(t * 2 * math.pi)
        
        # Brightness enhancement layer
        enhancer = ImageEnhance.Brightness(base_img)
        frame_base = enhancer.enhance(pulse)
        
        # Overlay canvas for sparkles & particles
        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        # Draw floating element-specific particles & sparkles
        for i, p in enumerate(particles):
            # Calculate position animated over time
            px = (p["x"] + p["speed_x"] * f * 3) % w
            py = (p["y"] + p["speed_y"] * f * 4) % h

            # Alpha pulse
            alpha = int(140 + 115 * Math_sin_deg(t * 360 + p["phase"]))
            alpha = max(30, min(255, alpha))

            if i % 3 == 0:
                # 4-point sparkle star
                s_size = int(p["size"] * (0.8 + 0.5 * math.sin(t * 2 * math.pi + p["phase"])))
                draw_sparkle(draw, int(px), int(py), max(3, s_size), stone_info["color"], alpha)
            else:
                # Glowing orb particle
                draw_particle(draw, int(px), int(py), p["size"], stone_info["color"], alpha)

        # Extra core burst on key frames
        burst_alpha = int(180 * math.sin(t * math.pi))
        if burst_alpha > 0 and stone_info["type"] == "fire":
            # Fire ember rising sparks
            for _ in range(3):
                sx = random.randint(int(w*0.3), int(w*0.7))
                sy = random.randint(int(h*0.3), int(h*0.7))
                draw_sparkle(draw, sx, sy, random.randint(4, 10), (255, 200, 50), burst_alpha)

        # Composite overlay on base image
        final_frame = Image.alpha_composite(frame_base, overlay)
        frames.append(final_frame.convert("RGB"))

    output_gif_path = os.path.join(base_dir, f"{stone_info['name']}_animated.gif")
    frames[0].save(
        output_gif_path,
        save_all=True,
        append_images=frames[1:],
        duration=80,  # 80ms per frame = smooth ~12.5 FPS loop
        loop=0
    )
    print(f"[SUCCESS] Created animated GIF: {output_gif_path}")

def Math_sin_deg(deg):
    return math.sin(math.radians(deg))

for stone in stones:
    create_animated_gif(stone)

print("All 7 GIF animations generated successfully!")
