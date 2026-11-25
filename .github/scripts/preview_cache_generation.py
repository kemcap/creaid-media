"""Refresh URLs of known fingerprinted assets without changing their bytes or duplicating files."""
from html.parser import HTMLParser
import re
import uuid

MARKER = b"# CREAID CACHE GENERATION "
GENERATION = re.compile(r"[0-9a-f]{32}")
ATTR = re.compile(r"""(\s+)([^\s=/>]+)(?:(\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?""")
TAGS = {"link", "script", "img", "source", "video", "audio", "a"}
ASSET = re.compile(r"^(/assets/[A-Za-z0-9_./-]+)([?#][^\s\"'<>]*)?$")

def generation():
    return uuid.uuid4().hex

def cache_rules(base, gen):
    if not gen:
        return base
    if not GENERATION.fullmatch(gen):
        raise ValueError("Invalid cache generation.")
    return base + MARKER + gen.encode("ascii") + b"\n"

def read_generation(current, baseline, cached):
    if current == baseline:
        return False, None
    if current == cached:
        return True, None
    if current.startswith(cached + MARKER):
        gen = current[len(cached + MARKER):].decode("ascii", errors="replace").removesuffix("\n")
        if GENERATION.fullmatch(gen) and current == cache_rules(cached, gen):
            return True, gen
    raise RuntimeError("Remote routing or access rules differ; no files changed.")

def refresh_url(url, known, gen):
    match = ASSET.fullmatch(url)
    if not match or match.group(1) not in known:
        return url
    path, suffix = match.group(1), match.group(2) or ""
    if "creaid-cache=" in suffix:
        raise ValueError("Reserved cache query already present in baseline.")
    prefix = "?creaid-cache=" + gen
    if suffix.startswith("?"):
        return path + prefix + "&amp;" + suffix[1:]
    return path + prefix + suffix

class RefreshParser(HTMLParser):
    def __init__(self, source, known, gen):
        super().__init__(convert_charrefs=False)
        self.source, self.known, self.gen = source, known, gen
        self.starts = [0]
        self.starts.extend(m.end() for m in re.finditer("\n", source))
        self.edits = []
        self.ignored = []

    def handle_endtag(self, tag):
        if self.ignored and tag == self.ignored[-1]:
            self.ignored.pop()

    def handle_startendtag(self, tag, attrs):
        self.start(tag, True)

    def handle_starttag(self, tag, attrs):
        self.start(tag, False)

    def start(self, tag, selfclosing):
        # HTMLParser treats script/style as raw text. Other raw/fallback elements
        # are excluded explicitly to mirror the fingerprinting pass.
        if self.ignored:
            return
        if tag in {"textarea", "title", "xmp", "iframe", "noembed", "noframes", "plaintext"} and not selfclosing:
            self.ignored.append(tag)
            return
        if tag not in TAGS:
            return
        text = self.get_starttag_text()
        end = re.match(r"<[\w-]+", text).end()
        def attr(m):
            space, name, eq, double, single, plain = m.groups()
            if eq is None:
                return m.group()
            value = next(v for v in (double, single, plain) if v is not None)
            new = value
            if name.lower() in ("href", "src", "poster", "data-src"):
                new = refresh_url(value, self.known, self.gen)
            elif name.lower() == "srcset" and not re.search(r"\bdata:", value, re.I):
                new = re.sub(r"(^|,\s*)(/assets/[^\s,]+)", lambda x: x[1] + refresh_url(x[2], self.known, self.gen), value)
            if new == value:
                return m.group()
            quote = '"' if double is not None else "'" if single is not None else ""
            return space + name + eq + quote + new + quote
        updated = text[:end] + ATTR.sub(attr, text[end:])
        if updated != text:
            line, col = self.getpos()
            offset = self.starts[line - 1] + col
            if self.source[offset:offset + len(text)] != text:
                raise ValueError("HTML position mismatch.")
            self.edits.append((offset, offset + len(text), updated))

def refresh_html(data, known, gen):
    if not gen:
        return data
    if not GENERATION.fullmatch(gen):
        raise ValueError("Invalid cache generation.")
    text = data.decode("utf-8")
    parser = RefreshParser(text, known, gen)
    parser.feed(text)
    parser.close()
    for start, end, replacement in reversed(parser.edits):
        text = text[:start] + replacement + text[end:]
    return text.encode("utf-8")
