import json
from pathlib import Path


def load_sample_recipes(path: str):
    p = Path(path)
    if not p.exists():
        return []
    return json.loads(p.read_text(encoding="utf-8"))
