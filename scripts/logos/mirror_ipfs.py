#!/usr/bin/env python3
"""
Mirror IPFS-hosted token logos into 1delta-DAO/asset-icons `ipfs/`.

The public ipfs.io gateway was sunset on 2026-09-21 (it now answers 429/403 to
everything), and dweb.link, cloudflare-ipfs.com and nftstorage.link went with
it. Lists we ingest (Solana above all) still point ~1000 logos at those hosts,
so a front end shows a broken image plus a console error per token.

This pass walks every list at the repo root, collects each `logoURI` that is
content-addressed (`ipfs://<cid>`, `<host>/ipfs/<cid>`, `<cid>.ipfs.<host>`),
fetches it through a gateway that still serves, normalizes it to a ≤128 px webp
and writes it to `<asset-icons>/ipfs/<key>.webp`. The CID (+ sub-path) → mirror
URL map lands in `ipfsMirror.json`, which `logoOverrides.ts` applies on every
generate, so a regenerated list never brings the dead URL back.

    python3 scripts/logos/mirror_ipfs.py ../asset-icons            # fetch what is missing
    python3 scripts/logos/mirror_ipfs.py ../asset-icons --rewrite  # also patch the json files in place

Already-mirrored keys are skipped, so re-running after a generate only fetches
new logos. Commit and push asset-icons BEFORE publishing the lists.
"""
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from PIL import Image

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MIRROR_JSON = os.path.join(os.path.dirname(__file__), 'ipfsMirror.json')
RAW_ROOT = 'https://raw.githubusercontent.com/1delta-DAO/asset-icons/main/ipfs/'
# Gateways that still serve arbitrary CIDs (checked 2026-10-14). Tried in order.
GATEWAYS = ['https://ipfs.filebase.io/ipfs/', 'https://gateway.pinata.cloud/ipfs/']
# Hosts that are gone — never worth trying the original URL on.
DEAD = re.compile(r'(^|\.)(ipfs\.io|dweb\.link|cloudflare-ipfs\.com|cf-ipfs\.com|nftstorage\.link|w3s\.link)$')
SIZE = 128
CID = r'(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{50,})'
UA = 'Mozilla/5.0 (token-lists ipfs mirror)'


def ipfs_key(uri):
    """`<cid>` or `<cid>/<path>` for a content-addressed URL, else None."""
    if not isinstance(uri, str):
        return None
    m = re.match(r'^ipfs://(?:ipfs/)?' + CID + r'(/[^?#]*)?', uri)
    if not m:
        try:
            u = urllib.parse.urlsplit(uri)
        except ValueError:
            return None
        if u.scheme not in ('http', 'https'):
            return None
        m = re.match(r'^/ipfs/' + CID + r'(/[^?#]*)?$', u.path)
        if not m:
            h = re.match(r'^' + CID + r'\.ipfs\.', u.hostname or '')
            if not h:
                return None
            path = u.path if u.path not in ('', '/') else ''
            return h.group(1) + urllib.parse.unquote(path).rstrip('/')
    path = urllib.parse.unquote(m.group(2) or '').rstrip('/')
    return m.group(1) + path


def file_name(key):
    cid, _, path = key.partition('/')
    if not path:
        return cid + '.webp'
    slug = re.sub(r'[^A-Za-z0-9]+', '-', os.path.splitext(path)[0]).strip('-')[:60]
    return f'{cid}-{slug}.webp'


def walk_logos(node, out):
    if isinstance(node, dict):
        for k, v in node.items():
            if isinstance(v, str):
                if k == 'logoURI' or ipfs_key(v):
                    out.append(v)
            else:
                walk_logos(v, out)
    elif isinstance(node, list):
        for v in node:
            walk_logos(v, out)


def list_files():
    return sorted(f for f in os.listdir(REPO) if f.endswith('.json'))


def collect():
    """{ key: [original URLs] } over every list at the repo root."""
    by_key = {}
    for f in list_files():
        with open(os.path.join(REPO, f)) as fh:
            data = json.load(fh)
        urls = []
        walk_logos(data, urls)
        for u in urls:
            k = ipfs_key(u)
            if k:
                by_key.setdefault(k, set()).add(u)
    return by_key


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'image/*,*/*'})
    with urllib.request.urlopen(req, timeout=25) as r:
        if r.status != 200:
            raise IOError(f'{r.status}')
        return r.read(8 * 1024 * 1024 + 1)


def svg_to_png(raw):
    import cairosvg
    # untrusted markup: drop every reference that is not inline data or a local fragment
    raw = re.sub(rb'(?:xlink:)?href\s*=\s*(["\'])(?!data:|#).*?\1', b'', raw)
    raw = re.sub(rb'url\(\s*["\']?(?!data:|#)[^)]*\)', b'none', raw)
    return cairosvg.svg2png(bytestring=raw, output_width=SIZE * 2, unsafe=False)


def ffmpeg_to_png(raw):
    """Formats this Pillow cannot read (AVIF): first frame via ffmpeg, stdin → stdout."""
    import subprocess
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', 'pipe:0', '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'png', 'pipe:1'],
                       input=raw, capture_output=True, timeout=60)
    if r.returncode or not r.stdout:
        raise IOError('ffmpeg: ' + r.stderr.decode(errors='replace')[:100])
    return r.stdout


def to_webp(raw):
    """Pillow first (a PNG's C2PA/XMP metadata can contain `<svg`, so sniffing text is not enough), then SVG, then ffmpeg."""
    try:
        img = Image.open(io.BytesIO(raw))
        img.load()
    except Exception:  # noqa: BLE001
        head = raw[:1024].lstrip().lower()
        png = svg_to_png(raw) if head.startswith((b'<?xml', b'<svg', b'<!doctype svg')) or b'<svg' in head else ffmpeg_to_png(raw)
        img = Image.open(io.BytesIO(png))
    img.seek(0)  # animated gif/webp: first frame
    img = img.convert('RGBA')
    if img.width < 2 or img.height < 2:
        raise ValueError('placeholder pixel, not a logo')
    img.thumbnail((SIZE, SIZE), Image.LANCZOS)
    out = io.BytesIO()
    img.save(out, 'WEBP', quality=88, method=6)
    return out.getvalue()


def fetch(key, originals):
    candidates = [g + urllib.parse.quote(key, safe='/') for g in GATEWAYS]
    for u in originals:
        host = urllib.parse.urlsplit(u).hostname or ''
        if u.startswith('http') and not DEAD.search(host):
            candidates.append(u)
    errors = []
    for url in candidates:
        try:
            raw = get(url)
            if len(raw) > 8 * 1024 * 1024:
                raise IOError('too large')
            return to_webp(raw), None
        except Exception as e:  # noqa: BLE001 — any failure → next gateway
            errors.append(f'{urllib.parse.urlsplit(url).hostname}: {type(e).__name__} {e}'[:160])
    return None, errors


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        sys.exit(__doc__)
    icons = os.path.join(os.path.abspath(args[0]), 'ipfs')
    os.makedirs(icons, exist_ok=True)
    mirror = json.load(open(MIRROR_JSON)) if os.path.exists(MIRROR_JSON) else {}

    by_key = collect()
    todo = {k: v for k, v in by_key.items() if k not in mirror}
    print(f'{len(by_key)} ipfs logos, {len(by_key) - len(todo)} already mirrored, fetching {len(todo)}')

    failed = {}

    def one(item):
        k, originals = item
        data, errors = fetch(k, sorted(originals))
        if data is None:
            failed[k] = {'urls': sorted(originals), 'errors': errors}
            return
        name = file_name(k)
        with open(os.path.join(icons, name), 'wb') as fh:
            fh.write(data)
        mirror[k] = RAW_ROOT + name

    with ThreadPoolExecutor(6) as ex:
        for i, _ in enumerate(ex.map(one, sorted(todo.items())), 1):
            if i % 50 == 0:
                print(f'  {i}/{len(todo)}', flush=True)

    with open(MIRROR_JSON, 'w') as fh:
        json.dump(dict(sorted(mirror.items())), fh, indent=2)
        fh.write('\n')
    print(f'mirrored {len(todo) - len(failed)}, failed {len(failed)}')
    if failed:
        with open(os.path.join(REPO, 'scripts', 'logos', '.ipfs-failed.json'), 'w') as fh:
            json.dump(failed, fh, indent=2)
        print('  failures → scripts/logos/.ipfs-failed.json')

    if '--rewrite' in sys.argv:
        rewrite(mirror)


def rewrite(mirror):
    """Swap each mirrored URL for its asset-icons copy, as a string edit so each file keeps its formatting."""
    for f in list_files():
        p = os.path.join(REPO, f)
        with open(p) as fh:
            text = fh.read()
        urls = []
        walk_logos(json.loads(text), urls)
        n = 0
        for u in set(urls):
            k = ipfs_key(u)
            if k and k in mirror:
                enc = json.dumps(u)[1:-1]
                c = text.count('"' + enc + '"')
                if c:
                    text = text.replace('"' + enc + '"', json.dumps(mirror[k]))
                    n += c
        if n:
            with open(p, 'w') as fh:
                fh.write(text)
            print(f'  {f}: {n} rewritten')


if __name__ == '__main__':
    main()
