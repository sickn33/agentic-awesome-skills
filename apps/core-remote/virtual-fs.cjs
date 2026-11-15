const path = require("node:path");
const bootstrap = require("./dist/bootstrap.json");
const files = new Map(
  Object.entries(bootstrap).map(([k, v]) => [k, Buffer.from(v)]),
);
const sparse = new Map();
const handles = new Map();
let next = 1;
function put(file, bytes, offset = 0, total = bytes.length) {
  for (const key of files.keys())
    if (!Object.hasOwn(bootstrap, key)) files.delete(key);
  sparse.clear();
  if (offset || total !== bytes.length)
    sparse.set(file, { bytes, offset, total });
  else files.set(file, bytes);
}
function stat(p) {
  p = path.resolve(p);
  const b = files.get(p),
    s = sparse.get(p);
  const dir =
    !b &&
    !s &&
    [...files.keys(), ...sparse.keys()].some((k) => k.startsWith(p + "/"));
  if (!b && !s && !dir) throw Error("Virtual file unavailable");
  return {
    size: b?.length ?? s?.total ?? 0,
    nlink: 1,
    dev: 1,
    ino: p,
    mtimeMs: 0,
    ctimeMs: 0,
    isFile: () => !dir,
    isDirectory: () => dir,
    isSymbolicLink: () => false,
  };
}
module.exports = {
  put,
  constants: { O_RDONLY: 0, O_NOFOLLOW: 0 },
  realpathSync: (p) => {
    stat(p);
    return path.resolve(p);
  },
  lstatSync: stat,
  fstatSync: (fd) => stat(handles.get(fd)),
  readFileSync: (p, enc) => {
    const b = files.get(path.resolve(p));
    if (!b) throw Error("Unavailable virtual file");
    return enc ? b.toString(enc) : b;
  },
  openSync: (p) => {
    stat(p);
    const fd = next++;
    handles.set(fd, path.resolve(p));
    return fd;
  },
  closeSync: (fd) => handles.delete(fd),
  readSync: (fd, b, off, len, pos) => {
    const p = handles.get(fd),
      s = sparse.get(p);
    const source = s ? s.bytes : files.get(p);
    const start = pos - (s?.offset || 0);
    if (start < 0) throw Error("Unavailable range");
    return source.copy(b, off, start, start + len);
  },
};
