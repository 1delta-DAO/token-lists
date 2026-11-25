#!/usr/bin/env python3
"""
Pre-render icons for Inverse FiRM's Curve / Yearn LP collateral.

None of these LP tokens has an icon anywhere: Inverse's own markets API gives
every one of them the same generic DOLA picture, and the FiRM site draws the
real thing at runtime — the two pool legs side by side under a Curve (or, for
the `yv-` vaults, a Yearn) badge. A list carries one `logoURI`, so we render
that same composite once and embed the bytes as a `data:image/webp;base64,…`
URI in `logoOverrides.json`. Nothing to host, nothing that can 404.

Legs and the protocol badge come from Inverse's markets API (`underlying.pairs`,
`underlying.protocolImage`); each leg's icon is taken from our own list for
that address, with LEG_ICON covering the legs whose list icon Pillow cannot
read (SVG) or that are not in the list at all.

    python3 scripts/logos/inverse_lp_icons.py            # write logoOverrides.json
    python3 scripts/logos/inverse_lp_icons.py --rewrite  # also patch 1.json in place

Add a new LP collateral to `onchain-fetch/coins.json` and run `pnpm onchain`
first — an override only applies to an address the list already has.
"""
import base64
import io
import json
import os
import sys
import urllib.request

from PIL import Image, ImageDraw

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OVERRIDES_JSON = os.path.join(os.path.dirname(__file__), 'logoOverrides.json')
MARKETS_API = 'https://www.inverse.finance/api/f2/fixed-markets'
CHAIN = '1'
UA = 'Mozilla/5.0 (token-lists inverse lp icons)'
# 96 px renders crisply at the 24-40 px the UI draws and keeps each URI at a few kB.
SIZE = 96
LEG = 60
BADGE = 36

LEG_ICON = {
    # sUSDe: the list carries Mantle's SVG
    '0x9d39a5de30e57443bff2a8307a4256c8797a3497': 'https://assets.coingecko.com/coins/images/33669/standard/sUSDe-Symbol-Color.png',
    # FRAX/PYUSD Curve LP (not in the list): show the PYUSD leg
    '0xa5588f7cdf560811710a2d82d3c9c99769db1dcb': 'https://assets.coingecko.com/coins/images/31212/large/PYUSD_Logo_%282%29.png?1691458314',
}


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'image/*,application/json,*/*'})
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read()


_cache = {}


def disc(url, d):
    """`url` as a `d`-px circle, edge antialiased by drawing the mask at 4x."""
    if url not in _cache:
        _cache[url] = Image.open(io.BytesIO(get(url))).convert('RGBA')
    src = _cache[url].copy()
    s = min(src.size)
    src = src.crop(((src.width - s) // 2, (src.height - s) // 2, (src.width + s) // 2, (src.height + s) // 2))
    src = src.resize((d, d), Image.LANCZOS)
    mask = Image.new('L', (d * 4, d * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, d * 4 - 1, d * 4 - 1), fill=255)
    mask = mask.resize((d, d), Image.LANCZOS)
    alpha = Image.new('L', (d, d), 0)
    alpha.paste(src.getchannel('A'), mask=mask)
    src.putalpha(alpha)
    return src


def ring(d):
    """Dark backing disc, 2 px wider than what sits on it, so overlapping discs stay apart on any background."""
    m = Image.new('RGBA', (d * 4, d * 4), (0, 0, 0, 0))
    ImageDraw.Draw(m).ellipse((0, 0, d * 4 - 1, d * 4 - 1), fill=(18, 18, 22, 255))
    return m.resize((d, d), Image.LANCZOS)


def compose(left, right, badge):
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    y = (SIZE - LEG) // 2 - 6
    img.alpha_composite(disc(left, LEG), (0, y))
    img.alpha_composite(ring(LEG + 4), (SIZE - LEG - 2, y - 2))
    img.alpha_composite(disc(right, LEG), (SIZE - LEG, y))
    img.alpha_composite(ring(BADGE + 4), ((SIZE - BADGE) // 2 - 2, SIZE - BADGE - 2))
    img.alpha_composite(disc(badge, BADGE), ((SIZE - BADGE) // 2, SIZE - BADGE))
    out = io.BytesIO()
    img.save(out, 'WEBP', quality=82, method=6)
    return out.getvalue()


def main():
    rewrite = '--rewrite' in sys.argv
    list_path = os.path.join(REPO, f'{CHAIN}.json')
    data = json.load(open(list_path))
    lst = data['list']
    overrides = json.load(open(OVERRIDES_JSON))
    by_addr = overrides.setdefault(CHAIN, {})

    markets = json.loads(get(MARKETS_API))['markets']
    done, skipped = 0, []
    seen = set()
    for m in markets:
        u = m.get('underlying')
        addr = m['collateral'].lower()
        if not isinstance(u, dict) or not u.get('isLP') or addr in seen:
            continue
        seen.add(addr)
        if addr not in lst:
            skipped.append(f'{m["name"]} {addr}: not in {CHAIN}.json')
            continue
        legs = [p.lower() for p in u['pairs']]
        urls = [LEG_ICON.get(a) or (lst.get(a) or {}).get('logoURI') for a in legs]
        if not all(urls):
            skipped.append(f'{m["name"]} {addr}: no icon for leg {legs[urls.index(None)]}')
            continue
        uri = 'data:image/webp;base64,' + base64.b64encode(compose(urls[0], urls[1], u['protocolImage'])).decode()
        by_addr[addr] = uri
        if rewrite:
            lst[addr]['logoURI'] = uri
        done += 1
        print(f'  {m["name"]:<22} {addr}  {len(uri) // 1024} kB')

    overrides[CHAIN] = dict(sorted(by_addr.items()))
    with open(OVERRIDES_JSON, 'w') as fh:
        json.dump(overrides, fh, indent=2, ensure_ascii=False)
        fh.write('\n')
    if rewrite:
        with open(list_path, 'w') as fh:
            json.dump(data, fh, indent=2, ensure_ascii=False)
            fh.write('\n')
    print(f'{done} icons written' + (f', {len(skipped)} skipped:\n  ' + '\n  '.join(skipped) if skipped else ''))


if __name__ == '__main__':
    main()
