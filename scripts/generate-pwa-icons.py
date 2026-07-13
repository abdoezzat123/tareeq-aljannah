#!/usr/bin/env python3
"""
توليد أيقونات PWA احترافية لتطبيق طريقك للجنة
- أيقونات عادية (any)
- أيقونات maskable (مع padding آمن)
- مقاسات: 72, 96, 128, 144, 152, 192, 384, 512
"""

import struct
import zlib
import os
import math

def lerp(c1, c2, t):
    """ interpolación lineal entre dos colores """
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))

def create_png(width, height, pixels):
    """ إنشاء ملف PNG من بكسلات raw """
    def chunk(chunk_type, data):
        c = chunk_type + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)  # RGB
    raw = b''
    for y in range(height):
        raw += b'\x00'  # filter byte
        for x in range(width):
            raw += bytes(pixels[y][x])

    compressed = zlib.compress(raw, 9)
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', ihdr)
    png += chunk(b'IDAT', compressed)
    png += chunk(b'IEND', b'')
    return png

def draw_icon(size, maskable=False):
    """ رسم أيقونة التطبيق - قبة مسجد ذهبية على خلفية داكنة """
    # ألوان
    bg_dark = (10, 10, 15)
    bg_light = (26, 26, 35)
    gold_light = (240, 212, 144)
    gold = (196, 168, 108)
    gold_dark = (160, 136, 80)
    gold_shadow = (128, 104, 64)
    door_dark = (13, 13, 20)
    white_light = (255, 244, 214)

    # padding للأيقونة maskable
    padding = int(size * 0.1) if maskable else 0
    content_size = size - 2 * padding

    # إنشاء خلفية
    pixels = []
    for y in range(size):
        row = []
        for x in range(size):
            dx = x - size // 2
            dy = y - size // 2
            dist = math.sqrt(dx * dx + dy * dy)
            max_dist = size * 0.7
            t_bg = min(1.0, dist / max_dist)
            row.append(lerp(bg_light, bg_dark, t_bg))
        pixels.append(row)

    # منطقة المحتوى
    cx = size // 2
    cy = size // 2

    # أبعاد القبة
    dome_radius = int(content_size * 0.28)
    dome_top = cy - int(content_size * 0.18)
    dome_bottom = cy + int(content_size * 0.20)
    dome_width = int(content_size * 0.32)

    # الهلال
    crescent_y = dome_top - int(content_size * 0.05)
    crescent_radius = int(content_size * 0.045)

    # الباب
    door_width = int(content_size * 0.07)
    door_height = int(content_size * 0.13)
    door_top = dome_bottom - door_height

    # النوافذ الجانبية
    win_width = int(content_size * 0.035)
    win_height = int(content_size * 0.07)

    # رسم القبة والمحتوى
    for y in range(size):
        for x in range(size):
            dx = x - cx
            dy = y - cy

            # شكل القبة (مستطيل سفلي)
            in_dome = False

            if dome_bottom > y > dome_top + dome_radius * 0.6:
                if abs(dx) < dome_width:
                    # تدرج ذهبي
                    dome_t = (dx + dome_width) / (2 * dome_width)
                    color = lerp(gold_light, gold_dark, dome_t)
                    # إضاءة علوية
                    if y < dome_top + dome_radius:
                        shine_t = 1.0 - (y - dome_top) / dome_radius
                        color = lerp(color, gold_light, max(0, shine_t) * 0.5)
                    pixels[y][x] = color
                    in_dome = True

            # قمة القبة (نصف دائرة)
            elif y <= dome_top + dome_radius and y > dome_top - crescent_radius * 2:
                cy_dome = dome_top + dome_radius
                circle_dist = math.sqrt(dx * dx + (y - cy_dome) ** 2)
                if circle_dist < dome_width * 0.95 and (y - cy_dome) < 0:
                    dome_t = (dx + dome_width) / (2 * dome_width)
                    color = lerp(gold_light, gold_dark, dome_t)
                    if y < dome_top + dome_radius * 0.5:
                        shine_t = 1.0 - (y - (dome_top - crescent_radius * 2)) / (dome_radius * 1.5)
                        color = lerp(color, white_light, max(0, min(1, shine_t)) * 0.3)
                    pixels[y][x] = color
                    in_dome = True

            # الباب
            if not in_dome:
                if abs(dx) < door_width and door_top < y < dome_bottom:
                    if y < door_top + door_width:
                        if (dx * dx + (y - door_top - door_width) ** 2) < door_width * door_width:
                            pixels[y][x] = door_dark
                    else:
                        pixels[y][x] = door_dark

            # الهلال
            crescent_dx = dx - int(content_size * 0.013)
            crescent_dy = y - crescent_y
            crescent_dist = math.sqrt(crescent_dx ** 2 + crescent_dy ** 2)
            if crescent_dist < crescent_radius:
                pixels[y][x] = gold_light
            crescent2_dx = dx - int(content_size * 0.004)
            crescent2_dy = y - crescent_y + int(content_size * 0.008)
            crescent2_dist = math.sqrt(crescent2_dx ** 2 + crescent2_dy ** 2)
            if crescent2_dist < crescent_radius * 0.85 and crescent_dist < crescent_radius:
                # نرجع لون الخلفية
                t_bg = min(1.0, math.sqrt(dx * dx + dy * dy) / (size * 0.7))
                pixels[y][x] = lerp(bg_light, bg_dark, t_bg)

            # قاعدة القبة (خط ذهبي)
            if abs(y - dome_bottom) < max(1, size // 100) and abs(dx) < dome_width + 5:
                pixels[y][x] = gold

    return pixels

def generate_all_icons():
    """ توليد كل الأيقونات المطلوبة """
    output_dir = '/home/z/my-project/public'

    # المقاسات العادية
    standard_sizes = [72, 96, 128, 144, 152, 192, 384, 512]

    # المقاسات maskable
    maskable_sizes = [192, 512]

    for size in standard_sizes:
        print(f"Generating icon-{size}.png ...")
        pixels = draw_icon(size, maskable=False)
        png_data = create_png(size, size, pixels)
        with open(f"{output_dir}/icon-{size}.png", 'wb') as f:
            f.write(png_data)

    for size in maskable_sizes:
        print(f"Generating icon-{size}-maskable.png ...")
        pixels = draw_icon(size, maskable=True)
        png_data = create_png(size, size, pixels)
        with open(f"{output_dir}/icon-{size}-maskable.png", 'wb') as f:
            f.write(png_data)

    # Apple Touch Icon (180x180)
    print("Generating apple-touch-icon.png ...")
    pixels = draw_icon(180, maskable=True)
    png_data = create_png(180, 180, pixels)
    with open(f"{output_dir}/apple-touch-icon.png", 'wb') as f:
        f.write(png_data)

    # favicon.ico (متعدد المقاسات)
    print("Generating favicon.ico ...")
    ico_sizes = [16, 32, 48]
    ico_buffers = []
    for s in ico_sizes:
        pixels = draw_icon(s, maskable=False)
        png_data = create_png(s, s, pixels)
        ico_buffers.append((s, png_data))

    # إنشاء ملف ICO
    header = struct.pack('<HHH', 0, 1, len(ico_buffers))
    offset = 6 + len(ico_buffers) * 16
    entries = b''
    images = b''
    for s, data in ico_buffers:
        w = s if s < 256 else 0
        h = s if s < 256 else 0
        entries += struct.pack('<BBBBHHII', w, h, 0, 0, 1, 32, len(data), offset)
        images += data
        offset += len(data)
    ico_data = header + entries + images
    with open(f"{output_dir}/favicon.ico", 'wb') as f:
        f.write(ico_data)

    print("\n✅ تم توليد كل الأيقونات بنجاح!")
    print(f"📁 المجلد: {output_dir}")
    print(f"📊 عدد الملفات: {len(standard_sizes) + len(maskable_sizes) + 2}")

if __name__ == "__main__":
    generate_all_icons()
