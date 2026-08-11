import os
import math
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

image_path = r"C:\Users\khang\.gemini\antigravity\brain\e1573dd0-adcd-4dc8-99fb-f3fe38332066\.user_uploaded\media_1786190845474.jpg"
output_dir = r"C:\Users\khang\.gemini\antigravity\brain\e1573dd0-adcd-4dc8-99fb-f3fe38332066"

def animate_boss():
    if not os.path.exists(image_path):
        print("Boss image not found!")
        return

    base_img = Image.open(image_path).convert("RGBA")
    w, h = base_img.size

    num_frames = 24
    frames = []

    img_np = np.array(base_img)

    # Magic circle center on the ground plane (~512, 880)
    cx, cy = 512, 880
    
    # Pre-compute meshgrid for ground magic circle rotation
    y_indices, x_indices = np.indices((h, w))
    
    # Mask region for the ground magic circle (bottom section y > 700)
    ground_mask = (y_indices > 720).astype(np.float32)
    # Smooth blend transition at boundary y=700..740
    transition_mask = np.clip((y_indices - 700) / 40.0, 0.0, 1.0)

    # Relative coordinates from magic circle center
    dx = (x_indices - cx).astype(np.float32)
    dy = (y_indices - cy).astype(np.float32)
    
    # Distance and angle in polar space
    dist = np.sqrt(dx**2 + (dy * 2.2)**2)  # 2.2 factor for perspective ellipse
    angle = np.arctan2(dy * 2.2, dx)

    for f in range(num_frames):
        t = f / num_frames
        
        # 1. Continuous Rotation of Ground Magic Circle
        rot_angle = angle + (t * 2 * math.pi)
        
        # Remap back to Cartesian source coordinates
        src_x = cx + dist * np.cos(rot_angle)
        src_y = cy + (dist * np.sin(rot_angle)) / 2.2
        
        src_x = np.clip(src_x, 0, w - 1).astype(np.int32)
        src_y = np.clip(src_y, 0, h - 1).astype(np.int32)
        
        # Rotated ground magic circle array
        rotated_ground = img_np[src_y, src_x]

        # Blend rotated ground with static upper body using transition_mask
        blend_mask = transition_mask[:, :, np.newaxis]
        frame_arr = (img_np * (1 - blend_mask) + rotated_ground * blend_mask).astype(np.uint8)
        
        frame_img = Image.fromarray(frame_arr, "RGBA")

        # 2. Idle Breathing & Core Pulse on Boss Torso
        breathe_scale = 1.0 + 0.018 * math.sin(t * 2 * math.pi)
        breathe_shift_y = int(4 * math.sin(t * 2 * math.pi))
        
        # Crop boss upper body (y: 0..730)
        boss_body = frame_img.crop((0, 0, w, 740))
        bw, bh = boss_body.size
        
        # Slightly scale & shift boss body for breathing
        new_bw = int(bw * breathe_scale)
        new_bh = int(bh * breathe_scale)
        boss_body_scaled = boss_body.resize((new_bw, new_bh), Image.Resampling.BILINEAR)
        
        # Paste breathing boss body centered
        offset_x = (w - new_bw) // 2
        offset_y = (740 - new_bh) // 2 + breathe_shift_y
        
        canvas = Image.new("RGBA", (w, h), (0, 0, 0, 255))
        # Paste rotated ground first
        canvas.paste(frame_img, (0, 0))
        # Paste breathing boss body over top
        canvas.paste(boss_body_scaled, (offset_x, offset_y), boss_body_scaled)

        # 3. Pulse Black Hole Core & Energy Veins
        core_brightness = 1.0 + 0.22 * math.sin(t * 2 * math.pi)
        core_enhancer = ImageEnhance.Brightness(canvas)
        final_frame = core_enhancer.enhance(core_brightness)

        # Convert to RGB for GIF palette encoding
        frames.append(final_frame.convert("RGB"))

    output_gif_path = os.path.join(output_dir, "cosmic_boss_idle.gif")
    frames[0].save(
        output_gif_path,
        save_all=True,
        append_images=frames[1:],
        duration=50,  # 50ms = 20 FPS smooth loop animation
        loop=0
    )
    print(f"[SUCCESS] Created animated boss GIF: {output_gif_path}")

animate_boss()
