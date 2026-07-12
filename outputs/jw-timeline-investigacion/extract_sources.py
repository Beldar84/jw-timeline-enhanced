import json
import re
import unicodedata
from pathlib import Path
from lxml import html

BASE = Path(__file__).parent
URL_JESUS = "https://www.jw.org/es/biblioteca/libros/Perspicacia-para-comprender-las-Escrituras/Jesucristo/"
URL_BIBLIA = "https://www.jw.org/es/biblioteca/libros/Perspicacia-para-comprender-las-Escrituras/Biblia/"
URL_CRONO = "https://www.jw.org/es/biblioteca/libros/Perspicacia-para-comprender-las-Escrituras/Cronolog%C3%ADa/"


def clean(value):
    value = value.replace("\xa0", " ").replace("\u200b", "").replace("\ufeff", "")
    return re.sub(r"\s+", " ", value).strip()


def load_paragraphs(filename):
    root = html.fromstring((BASE / filename).read_bytes())
    result = []
    for p in root.xpath("//p[@data-pid]"):
        text = clean(" ".join(p.itertext()))
        result.append({
            "pid": int(p.get("data-pid")),
            "class": p.get("class", ""),
            "text": text,
            "strong": bool(p.xpath(".//strong")),
        })
    return result


def year_from_date(text):
    t = clean(text)
    nums = [int(x.replace(".", "")) for x in re.findall(r"(?<!\d)(\d{1,4}(?:\.\d{3})?)(?!\d)", t)]
    if not nums:
        return None
    if "a. E.C" in t or "a.E.C" in t or "a. de la E.C" in t:
        return -nums[0]
    if "Nisán" in t or "Iyar" in t or "Siván" in t:
        return nums[-1] if nums[-1] > 20 else 33
    if len(nums) >= 2 and re.search(r"\d\s*[-–]\s*\d", t):
        return round((nums[0] + nums[1]) / 2)
    return nums[0]


def normalize_name(text):
    t = unicodedata.normalize("NFKD", text.lower())
    t = "".join(ch for ch in t if not unicodedata.combining(ch))
    t = re.sub(r"\b(jesus|cristo|jehova|el|la|los|las|un|una|de|del|al|en|y|se|su|sus)\b", " ", t)
    return re.sub(r"[^a-z0-9]+", " ", t).strip()


def split_facts(event):
    parts = [clean(x) for x in re.split(r"\s*;\s*", event) if clean(x)]
    return [(p[0].upper() + p[1:]) if p and p[0].islower() else p for p in (parts or [event])]


def jesus_rows():
    ps = load_paragraphs("jesucristo.html")
    start = next(i for i, p in enumerate(ps) if p["text"] == "ACONTECIMIENTOS PRINCIPALES DE LA VIDA HUMANA DE JESÚS")
    ps = ps[start:]
    rows = []
    last_date = None
    last_year = None
    i = 0
    header = ["Tiempo", "Lugar", "Acontecimiento", "Mateo", "Marcos", "Lucas", "Juan"]
    while i < len(ps) - 6:
        texts = [ps[i + j]["text"] for j in range(7)]
        if texts == header:
            i += 7
            continue
        if "se" in ps[i]["class"].split() and not ps[i]["strong"]:
            cells = ps[i:i + 7]
            # A real row has six following table cells and a descriptive third cell.
            if all("sc" in c["class"].split() for c in cells[1:]) and cells[2]["text"] not in {"", "Acontecimiento", "—"}:
                date_text = cells[0]["text"]
                if date_text != "—":
                    last_date = date_text
                    parsed = year_from_date(date_text)
                    if parsed is not None:
                        last_year = parsed
                if last_date is None or last_year is None:
                    i += 7
                    continue
                refs = []
                for book, cell in zip(["Mateo", "Marcos", "Lucas", "Juan"], cells[3:7]):
                    if cell["text"] != "—":
                        refs.append(f"{book} {cell['text']}")
                shown = last_date if date_text != "—" else f"{last_date} (misma etapa)"
                for fact in split_facts(cells[2]["text"]):
                    rows.append({
                        "name": fact,
                        "year": last_year,
                        "shown": shown,
                        "reference": "; ".join(refs),
                        "url": URL_JESUS,
                        "source_group": "Vida de Jesús",
                    })
                i += 7
                continue
        # End after the table's ascension row.
        if ps[i]["text"].startswith("Ascensión de Jesús"):
            break
        i += 1
    return rows


def bible_book_rows():
    ps = load_paragraphs("biblia.html")
    start = next(i for i, p in enumerate(ps) if p["text"] == "TABLA CRONOLÓGICA DE LOS LIBROS DE LA BIBLIA")
    ps = ps[start:]
    header = ["Libro", "Escritor", "Fecha en que se terminó", "Tiempo que abarca", "Lugar donde se escribió"]
    rows = []
    i = 0
    while i < len(ps) - 4:
        texts = [ps[i + j]["text"] for j in range(5)]
        if texts == header:
            i += 5
            while i < len(ps) - 4:
                if [ps[i + j]["text"] for j in range(5)] == header:
                    break
                cells = ps[i:i + 5]
                date_text = cells[2]["text"]
                year = year_from_date(date_text)
                if year is None or cells[0]["text"] in {"", "—"}:
                    i += 1
                    continue
                era = "a. e. c." if year < 0 else "e. c."
                shown = f"{date_text} {era}" if "E.C" not in date_text and "e.c" not in date_text.lower() else date_text
                rows.append({
                    "name": f"Se termina de escribir {cells[0]['text']}",
                    "year": year,
                    "shown": shown,
                    "reference": f"Libro de {cells[0]['text']}; escritor: {cells[1]['text']}",
                    "url": URL_BIBLIA,
                    "source_group": "Libros bíblicos",
                })
                i += 5
            continue
        i += 1
    # The first table is BCE; correct rows before Mateo if the page omits the era in each cell.
    greek_started = False
    for row in rows:
        if "Mateo" in row["name"]:
            greek_started = True
        if not greek_started and row["year"] > 0:
            row["year"] = -row["year"]
            row["shown"] = row["shown"].replace("e. c.", "a. e. c.")
    return rows


def chronology_rows():
    ps = load_paragraphs("cronologia.html")
    rows = []
    # The main kings table is a stream of event/date pairs. Dates follow their event text.
    start = next(i for i, p in enumerate(ps) if p["text"] == "REINO DE JUDÁ")
    end = next(i for i, p in enumerate(ps[start:], start) if p["text"].startswith("NOTA: Después de la toma de Samaria"))
    segment = ps[start:end]
    pending = []
    current_year = None
    date_re = re.compile(r"^(?:c\.|a\.|d\.)?\s*\d{3,4}$")
    skip_prefix = ("Profeta", "Profetas", "Sumo sacerdote", "Sumos sacerdotes", "Fechas a.")
    for p in segment:
        t = p["text"]
        if not t or t in {"REINO DE JUDÁ", "REINO DE ISRAEL"} or t.startswith(skip_prefix):
            continue
        if date_re.match(t):
            parsed = year_from_date(t + " a. E.C.")
            if parsed is not None:
                current_year = parsed
                for event in pending:
                    rows.append({
                        "name": event,
                        "year": current_year,
                        "shown": f"{t} a. e. c.",
                        "reference": "Tabla de reyes, profetas y acontecimientos de Judá e Israel",
                        "url": URL_CRONO,
                        "source_group": "Cronología de Judá e Israel",
                    })
                pending = []
            continue
        if len(t) > 8 and not p["strong"]:
            pending.append(t)
    # Genealogical births calculated directly from the chronology article's stated intervals.
    genealogy = [
        ("Nace Set", -3896, "3896 a. e. c.", "Génesis 5:3"),
        ("Nace Enós", -3791, "3791 a. e. c.", "Génesis 5:6"),
        ("Nace Quenán", -3701, "3701 a. e. c.", "Génesis 5:9"),
        ("Nace Mahalalel", -3631, "3631 a. e. c.", "Génesis 5:12"),
        ("Nace Jared", -3566, "3566 a. e. c.", "Génesis 5:15"),
        ("Nace Arpaksad", -2368, "2368 a. e. c.", "Génesis 11:10"),
        ("Nace Selah", -2333, "2333 a. e. c.", "Génesis 11:12"),
        ("Nace Éber", -2303, "2303 a. e. c.", "Génesis 11:14"),
        ("Nace Péleg", -2269, "2269 a. e. c.", "Génesis 11:16"),
        ("Nace Reú", -2239, "2239 a. e. c.", "Génesis 11:18"),
        ("Nace Serug", -2207, "2207 a. e. c.", "Génesis 11:20"),
        ("Nace Nacor", -2177, "2177 a. e. c.", "Génesis 11:22"),
        ("Nace Taré", -2148, "2148 a. e. c.", "Génesis 11:24"),
    ]
    for name, year, shown, ref in genealogy:
        rows.append({"name": name, "year": year, "shown": shown, "reference": ref, "url": URL_CRONO, "source_group": "Genealogía"})
    return rows


def canonical_tokens(text):
    aliases = {
        "nace": "nacer", "nacimiento": "nacer", "nacido": "nacer",
        "muere": "morir", "muerte": "morir", "fallece": "morir", "fallecimiento": "morir",
        "resucita": "resucitar", "resurreccion": "resucitar", "levanta": "resucitar",
        "bautismo": "bautizar", "bautiza": "bautizar", "bautizado": "bautizar",
        "empieza": "comenzar", "comienzo": "comenzar", "comienza": "comenzar", "inicia": "comenzar",
        "termina": "terminar", "terminado": "terminar", "completa": "terminar",
        "destruccion": "destruir", "destruye": "destruir", "destruida": "destruir",
    }
    return {aliases.get(t, t) for t in normalize_name(text).split()}


def is_existing(candidate, candidate_year, existing_rows):
    n = normalize_name(candidate)
    if not n:
        return True
    nt = set(n.split())
    for ex, ex_year in existing_rows:
        e = normalize_name(ex)
        if n == e or (len(n) > 12 and (n in e or e in n)):
            return True
        et = set(e.split())
        if len(nt) >= 3 and len(et) >= 3 and len(nt & et) / min(len(nt), len(et)) >= 0.8:
            return True
        if candidate_year == ex_year:
            nc, ec = canonical_tokens(candidate), canonical_tokens(ex)
            if nc and ec and len(nc & ec) / min(len(nc), len(ec)) >= 0.75:
                return True
    return False


def main():
    existing = json.loads((BASE / "cartas_existentes.json").read_text())
    existing_rows = [(r[1], r[2]) for r in existing[1:] if len(r) > 2]
    gathered = jesus_rows() + bible_book_rows() + chronology_rows()
    unique = []
    seen = set()
    for row in gathered:
        key = normalize_name(row["name"])
        if not key or key in seen or is_existing(row["name"], row["year"], existing_rows):
            continue
        seen.add(key)
        unique.append(row)
    unique.sort(key=lambda r: (r["year"], r["name"]))
    (BASE / "fechas_jw_extraidas.json").write_text(json.dumps(unique, ensure_ascii=False, indent=2))
    counts = {}
    for row in unique:
        counts[row["source_group"]] = counts.get(row["source_group"], 0) + 1
    print(json.dumps({"jesus_raw": len(jesus_rows()), "books_raw": len(bible_book_rows()), "chronology_raw": len(chronology_rows()), "unique_new": len(unique), "by_group": counts}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
