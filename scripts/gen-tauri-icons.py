#!/usr/bin/env python3
"""Generate the full Tauri desktop icon set from the existing app icon."""
from PIL import Image

SRC = "/home/z/my-project/public/icons/icon-512.png"
OUT = "/home/z/my-project/src-tauri/icons"

img = Image.open(SRC).convert("RGBA")

# PNG sizes required by Tauri's default config
png_targets = {
    "32x32.png": (32, 32),
    "128x128.png": (128, 128),
    "128x128@2x.png": (256, 256),
    "icon.png": (512, 512),
}
for name, size in png_targets.items():
    img.resize(size, Image.LANCZOS).save(f"{OUT}/{name}")
    print(f"{name} <- {size}")

# Windows ICO (multi-resolution)
img.save(f"{OUT}/icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print("icon.ico OK")

# macOS ICNS
img.save(f"{OUT}/icon.icns")
print("icon.icns OK")

print("done")
