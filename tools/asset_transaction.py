"""Publish a validated asset batch and both indexes with rollback on I/O failure."""
import json
import os
import shutil
import tempfile
import fcntl
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, Mapping, Protocol


class IndexRenderer(Protocol):
    JS: str

    def render_js(self, index: dict) -> str: ...


@contextmanager
def index_lock(index_path: Path) -> Iterator[None]:
    """Serialize all cooperative publishers sharing an asset registry."""
    target = index_path.resolve()
    target.parent.mkdir(parents=True, exist_ok=True)
    with (target.parent / '.asset-index.lock').open('a+b') as lock:
        fcntl.flock(lock.fileno(), fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(lock.fileno(), fcntl.LOCK_UN)


def _preflight(files: Mapping[Path, bytes]) -> dict[Path, bytes]:
    validated: dict[Path, bytes] = {}
    for raw, content in files.items():
        target = Path(raw)
        if target.is_symlink():
            raise ValueError(f'Asset destination is a symlink: {target}')
        target = target.resolve()
        if target in validated:
            raise ValueError(f'duplicate asset destination: {target}')
        if target.exists() and not target.is_file():
            raise ValueError(f'Asset destination is not a regular file: {target}')
        if not isinstance(content, bytes):
            raise TypeError(f'Asset content must be bytes: {target}')
        validated[target] = content
    return validated


def _prepare(target: Path, content: bytes) -> tuple[Path, Path | None]:
    target.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix='.dunia-asset-', dir=target.parent)
    candidate, backup = Path(name), None
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        candidate.chmod(target.stat().st_mode & 0o777 if target.exists() else 0o644)
        if target.exists():
            fd, name = tempfile.mkstemp(prefix='.dunia-backup-', dir=target.parent)
            os.close(fd)
            backup = Path(name)
            shutil.copy2(target, backup)
        return candidate, backup
    except BaseException as error:
        cleanup = _cleanup([candidate, backup], set())
        if cleanup:
            raise OSError(f'Asset staging failed: {error}; temporary cleanup failed: ' + '; '.join(cleanup)) from error
        raise


def _rollback(promoted: list[Path], backups: Mapping[Path, Path | None]) -> dict[Path, Path | None]:
    failed: dict[Path, Path | None] = {}
    for target in reversed(promoted):
        backup = backups[target]
        try:
            if backup is None:
                target.unlink(missing_ok=True)
            else:
                os.replace(backup, target)
        except OSError:
            failed[target] = backup
    return failed


def _cleanup(paths: list[Path | None], preserve: set[Path]) -> list[str]:
    failures: list[str] = []
    for temporary in paths:
        if temporary is None or temporary in preserve:
            continue
        try:
            temporary.unlink(missing_ok=True)
        except OSError as error:
            failures.append(f'{temporary}: {error}')
    return failures


def replace_batch(files: Mapping[Path, bytes]) -> None:
    """Stage every byte first; restore replaced targets if any promotion fails."""
    validated = _preflight(files)
    staged: dict[Path, Path] = {}
    backups: dict[Path, Path | None] = {}
    promoted: list[Path] = []
    recovery: set[Path] = set()
    failure: BaseException | None = None
    rollback_message = ''
    try:
        for target, content in validated.items():
            staged[target], backups[target] = _prepare(target, content)
        for target, candidate in staged.items():
            os.replace(candidate, target)
            promoted.append(target)
    except BaseException as error:
        failure = error
        failed = _rollback(promoted, backups)
        recovery = {backup for backup in failed.values() if backup is not None}
        if failed:
            locations = ', '.join(f'{target} (backup: {backup})' for target, backup in failed.items())
            rollback_message = 'Asset rollback incomplete; preserve recovery files: ' + locations
    cleanup = _cleanup([*staged.values(), *backups.values()], recovery)
    if rollback_message or cleanup:
        message = rollback_message or (str(failure) if failure else 'Assets published successfully')
        if cleanup:
            message += '; temporary cleanup failed: ' + '; '.join(cleanup)
        raise OSError(message) from failure
    if failure is not None:
        raise failure


def publish(index_path: str, entries: dict, files: Mapping[Path, bytes], helper: IndexRenderer) -> int:
    """Merge only owned entries and prepare JS before changing published data."""
    target = Path(index_path)
    index_paths = {target.resolve(), Path(helper.JS).resolve()}
    if len(index_paths) != 2 or any(Path(raw).resolve() in index_paths for raw in files):
        raise ValueError('Asset batch must not duplicate or replace registry destinations')
    with index_lock(target):
        with target.open(encoding='utf-8') as source:
            current = json.load(source)
        current['assets'] = dict(sorted({**current['assets'], **entries}.items()))
        javascript = helper.render_js(current).encode('utf-8')
        exports = dict(files)
        exports[target] = json.dumps(current, indent=1).encode('utf-8')
        exports[Path(helper.JS)] = javascript
        replace_batch(exports)
        return len(current['assets'])
