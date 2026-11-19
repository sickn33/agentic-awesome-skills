#!/usr/bin/env python3
"""Container preflight helpers for the NVMe modes (standard library only; called by docker/entrypoint.sh).

  preflight.py odirect PATH   PATH is a file: O_DIRECT read of its first 4 KiB. PATH is a directory: create, O_DIRECT
                              write + read back 4 KiB, delete. Prints one line and exits 1 if the filesystem refuses it.
  preflight.py cpus           CPU layout for nv2's pinned threads. Prints `export VAR=...` lines for the entrypoint to
                              eval, and one `[glm53] ...` line on stderr. Variables already set in the environment are
                              kept (and must lie inside the container's CPU set). When the measured defaults (CPU lane
                              2-23, main thread 24, controller 25, NVMe readers 26-39) all lie inside the CPU set they
                              are used unchanged; otherwise the layout is derived from os.sched_getaffinity: main thread
                              on the first CPU, controller on the second, CPU lane on the rest, readers on the last
                              min(14, rest) of those (the default layout also shares reader CPUs with lane cores).
"""
import errno, mmap, os, sys

DEFAULTS = {"GLM53_NV_CPU_CPUS": "2-23", "GLM53_MAIN_CPUS": os.environ.get("GLM53_MAIN_DEFAULT") or "24", "GLM53_NV_CTL_CPU": "25", "GLM53_NV_READER_CPUS": "26-39"}
BLOCK = 4096


def cpus(spec):
    out = []
    for part in spec.split(","):
        if part:
            a, _, b = part.partition("-")
            out += range(int(a), int(b or a) + 1)
    return out


def spec(cs):
    """[2,3,4,7] -> '2-4,7'"""
    cs, runs = sorted(set(cs)), []
    for c in cs:
        if runs and c == runs[-1][1] + 1:
            runs[-1][1] = c
        else:
            runs.append([c, c])
    return ",".join(f"{a}-{b}" if b > a else f"{a}" for a, b in runs)


def fstype(path):
    best, kind = "", "?"
    try:
        for line in open("/proc/mounts"):
            dev, mnt, fs = line.split()[:3]
            if (path == mnt or path.startswith(mnt.rstrip("/") + "/")) and len(mnt) >= len(best):
                best, kind = mnt, fs
    except OSError:
        pass
    return kind


def odirect(path):
    buf = mmap.mmap(-1, BLOCK)  # page-aligned, as O_DIRECT needs
    probe = os.path.join(path, f".odirect-probe-{os.getpid()}") if os.path.isdir(path) else None
    try:
        if probe:
            fd = os.open(probe, os.O_RDWR | os.O_CREAT | os.O_TRUNC | os.O_DIRECT, 0o600)
            try:
                buf.write(b"\x5a" * BLOCK)
                if os.pwritev(fd, [buf], 0) != BLOCK:
                    raise OSError("short O_DIRECT write")
                if os.preadv(fd, [buf], 0) != BLOCK:
                    raise OSError("short O_DIRECT read")
            finally:
                os.close(fd)
                os.unlink(probe)
        else:
            fd = os.open(path, os.O_RDONLY | os.O_DIRECT)
            try:
                os.preadv(fd, [buf], 0)
            finally:
                os.close(fd)
    except OSError as e:
        what = "writes" if probe else "reads"
        if e.errno == errno.EINVAL:
            print(f"[glm53] ERROR: {path} ({fstype(path)}) does not support O_DIRECT {what}; put the NVMe expert store on "
                  "a local NVMe filesystem that does (xfs, ext4)", file=sys.stderr)
        else:
            print(f"[glm53] ERROR: O_DIRECT {what} at {path} ({fstype(path)}) failed: {e.strerror or e}", file=sys.stderr)
        return 1
    return 0


def layout():
    have = sorted(os.sched_getaffinity(0))
    lane_on = os.environ.get("GLM53_NV_CPU") == "1"
    keys = [k for k in DEFAULTS if lane_on or k != "GLM53_NV_CPU_CPUS"]
    # the main thread is pinned only when it is set, or when the mode pins it by default (GLM53_MAIN_DEFAULT, set by the
    # entrypoint for nvme / nvme-exact when GLM53_MAIN_CPUS is not given at all; an empty value means "do not pin")
    if not os.environ.get("GLM53_MAIN_CPUS") and not os.environ.get("GLM53_MAIN_DEFAULT"):
        keys.remove("GLM53_MAIN_CPUS")
    given = {k: os.environ[k] for k in keys if os.environ.get(k)}
    bad = {k: sorted(set(cpus(v)) - set(have)) for k, v in given.items()}
    bad = {k: v for k, v in bad.items() if v}
    if bad:
        print(f"[glm53] ERROR: CPUs outside this container's cpuset ({len(have)} CPUs, {spec(have)}): {bad}; set "
              "GLM53_NV_CPU_CPUS / GLM53_MAIN_CPUS / GLM53_NV_CTL_CPU / GLM53_NV_READER_CPUS inside it, or unset them", file=sys.stderr)
        return 1
    out = dict(given)
    missing = [k for k in keys if k not in given]
    if all(set(cpus(DEFAULTS[k])) <= set(have) for k in missing):
        out.update({k: DEFAULTS[k] for k in missing})
        how = "measured layout"
    else:
        main, ctl = have[0], have[1 % len(have)]
        rest = have[2:] or have
        derived = {"GLM53_MAIN_CPUS": str(main), "GLM53_NV_CTL_CPU": str(ctl), "GLM53_NV_CPU_CPUS": spec(rest),
                   "GLM53_NV_READER_CPUS": spec(rest[-min(14, len(rest)):])}
        out.update({k: derived[k] for k in missing})
        how = f"derived from the container's {len(have)} CPUs (measured layout needs CPUs 2-39)"
    for k in keys:
        print(f"export {k}={out[k]}")
    print(f"[glm53] nv2 CPU layout, {how}: " + ", ".join(f"{k[6:]}={out[k]}" for k in keys), file=sys.stderr)
    return 0


if __name__ == "__main__":
    if sys.argv[1:2] == ["odirect"] and len(sys.argv) == 3:
        sys.exit(odirect(sys.argv[2]))
    if sys.argv[1:] == ["cpus"]:
        sys.exit(layout())
    sys.exit(__doc__)
