"""Package imagegen's nine-pose sheets into equal, padded WebP cells.

Only extracts frames and resizes them; does not synthesize or repaint poses.
Run with the bundled Pillow runtime: script PET_ID SOURCE_PNG.
"""
import sys
from pathlib import Path
from shutil import copy2
from PIL import Image

root = Path(__file__).resolve().parent.parent
name, source = sys.argv[1:]
image = Image.open(source).convert('RGBA')
alpha = image.getchannel('A')
if alpha.getextrema() != (0, 255):
    raise ValueError('Motion sheet must have transparent background')
width, height = image.size
solid = alpha.point(lambda value: 255 if value > 200 else 0)

def boundaries(length, horizontal):
    result = [0]
    for fraction in (1 / 3, 2 / 3):
        candidates = range(round(length * (fraction - .055)), round(length * (fraction + .055)))
        def occupancy(position):
            box = (position, 0, position + 1, height) if horizontal else (0, position, width, position + 1)
            return solid.crop(box).histogram()[255]
        result.append(min(candidates, key=lambda p: (occupancy(p), abs(p - length * fraction))))
    return result + [length]

xs, ys = boundaries(width, True), boundaries(height, False)
cells = [image.crop((xs[col], ys[row], xs[col + 1], ys[row + 1]))
         for row in range(3) for col in range(3)]
scale = min(464 / max(cell.width for cell in cells), 464 / max(cell.height for cell in cells))
sheet = Image.new('RGBA', (1536, 1536))
for index, cell in enumerate(cells):
    cell = cell.resize((round(cell.width * scale), round(cell.height * scale)), Image.Resampling.LANCZOS)
    sheet.alpha_composite(cell, ((index % 3) * 512 + (512 - cell.width) // 2,
                                (index // 3) * 512 + 488 - cell.height))
original = root / 'docs/motion-art' / (name + '.png')
target = root / 'frontend/public/pets/motion' / (name + '.webp')
original.parent.mkdir(parents=True, exist_ok=True)
target.parent.mkdir(parents=True, exist_ok=True)
copy2(source, original)
sheet.save(target, 'WEBP', quality=88, method=4)
print(name, image.size, 'split', xs, ys, 'web bytes', target.stat().st_size)
