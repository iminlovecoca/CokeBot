import os
import math
import random
from PIL import Image, ImageEnhance, ImageDraw

base_dir = r"C:\Users\khang\.gemini\antigravity\brain\e1573dd0-adcd-4dc8-99fb-f3fe38332066"

stones = [
    {
        "name": "ember_stone",
        "file": "ember_stone_tilted_1786169083796.jpg",
        "color": (255, 80, 20),
    },
    {
        "name": "tide_stone",
        "file": "tide_stone_v2_1786189495238.jpg",
        "color": (0, 229, 255),
    },
    {
        "name": "verdant_stone",
        "file": "verdant_stone_tilted_1786169121245.jpg",
        "color": (80, 255, 120),
    },
    {
        "name": "arcane_stone",
        "file": "arcane_stone_v2_1786189481529.jpg",
        "color": (255, 30, 200),
    },
    {
        "name": "solar_stone",
        "file": "solar_stone_tilted_1786169160935.jpg",
        "color": (255, 220, 50),
    },
    {
        "name": "void_stone",
        "file": "void_stone_v2_1786189508131.jpg",
        "color": (170, 90, 255),
    },
    {
        "name": "celestial_stone",
        "file": "celestial_v2_1786189522888.jpg",
        "color": (255, 255, 255),
    },
]

def remove_background(img_rgba, threshold=35):
    """Key out black/dark background pixels to make it 100% transparent."""
    data = img_rgba.getdata()
    new_data = []
    for item in data:
        r, g, b, a = item
        if r < threshold and g < threshold and b < threshold:
            new_data.append((0, 0, 0, 0))
        else:
            new_data.append(item)
    img_rgba.putdata(new_data)
    return img_rgba

def draw_sparkle(draw, cx, cy, size, color, alpha=255):
    r, g, b = color
    fill_col = (r, g, b, alpha)
    draw.line([(cx - size, cy), (cx + size, cy)], fill=fill_col, width=max(1, size // 3))
    draw.line([(cx, cy - size), (cx, cy + size)], fill=fill_col, width=max(1, size // 3))
    draw.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=(255, 255, 255, alpha))

def create_clean_transparent_gif(stone_info):
    img_path = os.path.join(base_dir, stone_info["file"])
    if not os.path.exists(img_path):
        print(f"File not found: {img_path}")
        return

    orig_img = Image.open(img_path).convert("RGBA")
    w, h = orig_img.size
    cx, cy = w // 2, h // 2

    # Make background transparent
    transparent_base = remove_background(orig_img.copy(), threshold=35)

    num_frames = 16
    frames = []

    random.seed(42)
    particles = []
    for _ in range(12):
        particles.append({
            "x": random.randint(int(w * 0.2), int(w * 0.8)),
            "y": random.randint(int(h * 0.2), int(h * 0.8)),
            "size": random.randint(3, 7),
            "phase": random.uniform(0, math.pi * 2)
        })

    for f in range(num_frames):
        t = f / num_frames

        # Smooth pulse on crystal brightness
        pulse = 1.0 + 0.12 * math.sin(t * 2 * math.pi)
        enhancer = ImageEnhance.Brightness(transparent_base)
        frame_base = enhancer.enhance(pulse)

        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        # Subtle sparkling particles overlay matching element color
        for p in particles:
            px = p["x"] + 3 * math.sin(t * 2 * math.pi + p["phase"])
            py = p["y"] - (f * 1.5 + p["phase"] * 5) % 35
            alpha = int(120 + 120 * math.sin(t * 2 * math.pi + p["phase"]))
            alpha = max(20, min(255, alpha))
            draw_sparkle(draw, int(px), int(py), p["size"], stone_info["color"], alpha)

        final_frame = Image.alpha_composite(frame_base, overlay)
        frames.append(final_frame)

    output_gif_path = os.path.join(base_dir, f"{stone_info['name']}_clean_transparent.gif")

    frames[0].save(
        output_gif_path,
        save_all=True,
        append_images=frames[1:],
        duration=75,
        loop=0,
        disposal=2
    )
    print(f"[SUCCESS] Created clean transparent GIF: {output_gif_path}")

for stone in stones:
    create_clean_transparent_gif(stone)

print("All 7 clean transparent GIFs completed successfully!")
