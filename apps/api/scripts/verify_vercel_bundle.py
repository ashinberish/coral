"""Fail fast if a `vercel build` bundle can't run on its declared Python runtime.

Native extensions (pydantic_core, asyncpg, greenlet, ...) are compiled per CPython
version. If the Vercel CLI builds with a different interpreter than the function's
runtime (e.g. it can't find python3.13 and falls back to 3.14), the deployment crashes
at import time with ``No module named 'pydantic_core._pydantic_core'``.

Usage (from apps/api, after `vercel build`):  python scripts/verify_vercel_bundle.py
"""

import json
import re
import sys
from pathlib import Path

OUTPUT = Path(".vercel/output/functions")
_RUNTIME = re.compile(r"^python(\d)\.(\d+)$")
# e.g. _pydantic_core.cpython-313-x86_64-linux-gnu.so
_EXT_TAG = re.compile(r"\.cpython-(\d)(\d+)[^/]*\.so$")


def check_function(config_path: Path) -> list[str]:
    config = json.loads(config_path.read_text())
    runtime = config.get("runtime", "")
    match = _RUNTIME.match(runtime)
    if not match:
        return [f"{config_path}: unexpected runtime {runtime!r}"]
    expected = f"{match.group(1)}{match.group(2)}"

    files = list(config.get("filePathMap", {})) or [
        str(p.relative_to(config_path.parent)) for p in config_path.parent.rglob("*.so")
    ]
    native = [(f, m) for f in files if (m := _EXT_TAG.search(f))]
    if not native:
        return [f"{config_path}: no native extensions found (is pydantic_core bundled?)"]

    errors = []
    for path, tag_match in native:
        tag = f"{tag_match.group(1)}{tag_match.group(2)}"
        if tag != expected:
            errors.append(f"{path} is built for cp{tag}, but the runtime is {runtime}")
    print(
        f"{config_path.parent.name}: runtime {runtime}, {len(native)} native extensions OK"
        if not errors
        else f"{config_path.parent.name}: {len(errors)} mismatched extensions"
    )
    return errors


def main() -> int:
    configs = sorted(OUTPUT.glob("*.func/.vc-config.json"))
    if not configs:
        print(f"No functions under {OUTPUT}; run `vercel build` first.", file=sys.stderr)
        return 1
    errors = [e for c in configs for e in check_function(c)]
    for error in errors[:20]:
        print(f"::error::{error}")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
