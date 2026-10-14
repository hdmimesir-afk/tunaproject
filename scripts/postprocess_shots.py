"""Rounds corners, adds device bezel and soft shadow to the demo captures. Reads shots_raw/, writes public/shots and public/mobile."""
from PIL import Image, ImageDraw, ImageFilter
import os
os.makedirs('public/shots', exist_ok=True); os.makedirs('public/mobile', exist_ok=True)
INK = (0, 23, 31)

def rounded(im, r):
    m = Image.new('L', im.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0) + im.size, r, fill=255)
    out = im.convert('RGBA'); out.putalpha(m); return out

def shadow(img, blur, off, alpha, pad):
    w, h = img.size
    canvas = Image.new('RGBA', (w + pad * 2, h + pad * 2), (0, 0, 0, 0)); sh = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    blk = Image.new('RGBA', img.size, INK + (255,)); blk.putalpha(img.getchannel('A').point(lambda v: int(v * alpha)))
    sh.paste(blk, (pad, pad + off)); sh = sh.filter(ImageFilter.GaussianBlur(blur))
    canvas = Image.alpha_composite(canvas, sh); canvas.paste(img, (pad, pad), img); return canvas

def phone(path):
    im = Image.open(path).convert('RGB'); w, h = im.size; bz = int(w * 0.032)
    scr = rounded(im, int(w * 0.115)); ph = Image.new('RGBA', (w + bz * 2, h + bz * 2), (0, 0, 0, 0))
    ImageDraw.Draw(ph).rounded_rectangle((0, 0) + ph.size, int(w * 0.115) + bz, fill=INK + (255,)); ph.paste(scr, (bz, bz), scr)
    iw = int(w * 0.26); ih = int(w * 0.075)
    ImageDraw.Draw(ph).rounded_rectangle(((ph.size[0] - iw) // 2, bz + int(w * 0.03), (ph.size[0] + iw) // 2, bz + int(w * 0.03) + ih), ih // 2, fill=INK + (255,))
    return ph

# desktop dashboard (90px pad) + crops used on the cover
d = shadow(rounded(Image.open('shots_raw/d-dashboard.png'), 56), 40, 24, 0.35, 90); d.save('public/shots/dashboard.png')
w, h = d.size
d.crop((0, 0, int(w * 0.93), h)).save('public/shots/dash-hero.png'); d.crop((0, 0, int(w * 0.78), h)).save('public/shots/dash-cover.png')
# desktop module screens (60px pad)
for k in ['biaya', 'produksi', 'stok', 'gudang', 'jadwal', 'keuangan', 'asisten']:
    shadow(rounded(Image.open(f'shots_raw/d-{k}.png'), 48), 28, 16, 0.3, 60).save(f'public/shots/screen-{k}.png')
# phones: the three hero phones use an 80px pad, module phones a 60px pad
for k in ['home', 'approve', 'modul']:
    shadow(phone(f'shots_raw/p-{k}.png'), 36, 24, 0.4, 80).save(f'public/shots/phone-{k}.png')
for k in ['biaya', 'produksi', 'stok', 'gudang', 'jadwal', 'keuangan', 'asisten']:
    shadow(phone(f'shots_raw/p-{k}.png'), 30, 20, 0.35, 60).save(f'public/mobile/m-{k}.png')
print('shots ok')
