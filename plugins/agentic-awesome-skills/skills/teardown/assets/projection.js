(function (root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const G = node ? require('./geometry.js') : root.TechnicalGeometry;
  const SHEET = node ? require('./sheet.js') : root.TechnicalSheet;
  const {add, sub, dot, cross, ROLES} = G;

  function createCamera({azimuth = -135, elevation = Math.asin(1 / Math.sqrt(3)) * 180 / Math.PI, roll = 16} = {}) {
    if (![azimuth, elevation, roll].every(Number.isFinite) || Math.abs(elevation) > 90) throw Error('Invalid camera angles');
    const a = azimuth * Math.PI / 180, e = elevation * Math.PI / 180, r = roll * Math.PI / 180;
    const direction = [Math.cos(e) * Math.cos(a), Math.cos(e) * Math.sin(a), Math.sin(e)];
    const right = [-Math.sin(a), Math.cos(a), 0], up = cross(direction, right);
    return {
      direction,
      project: p => {
        const x = dot(p, right), y = -dot(p, up);
        return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r), dot(p, direction)];
      }
    };
  }
  const defaultCamera = createCamera();
  const project = (point, camera) => (camera ? createCamera(camera) : defaultCamera).project(point);

  const escape = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
  const round = n => Number(n.toFixed(3));
  const rank = line => ROLES.indexOf(line.role);
  const shift = (part, amount) => part.explosion.map(n => n * amount);

  function contours(part, direction) {
    const edges = new Map();
    for (const f of part.triangles) {
      const ab = sub(part.vertices[f[1]], part.vertices[f[0]]), ac = sub(part.vertices[f[2]], part.vertices[f[0]]), n = cross(ab, ac);
      const length = Math.hypot(...n), flat = length <= Math.hypot(...ab) * Math.hypot(...ac) * 1e-12;
      for (let j = 0; j < 3; j++) {
        const a = f[j], b = f[(j + 1) % 3], key = a < b ? `${a}:${b}` : `${b}:${a}`;
        if (!edges.has(key)) edges.set(key, {a, b, uses: 0, signs: []});
        const edge = edges.get(key);
        edge.uses++;
        if (!flat) edge.signs.push(dot(n, direction) / length);
      }
    }
    return [...edges.values()].filter(e => {
      if (!e.signs.length) return false;
      if (e.uses === 1) return true;
      const low = Math.min(...e.signs), high = Math.max(...e.signs);
      return low <= 1e-8 && high >= -1e-8 && (low < -1e-8 || high > 1e-8);
    });
  }

  const SNAP = .02;
  function snapEnds(segments) {
    const cell = n => Math.floor(n / SNAP), grid = new Map(), alias = new Map();
    for (const key of new Set(segments.flat())) {
      const [x, y] = key.split(' ').map(Number);
      let match;
      for (let i = -1; i <= 1 && !match; i++) {
        for (let j = -1; j <= 1 && !match; j++) {
          match = grid.get(`${cell(x) + i},${cell(y) + j}`)?.find(p => Math.hypot(p.x - x, p.y - y) <= SNAP)?.key;
        }
      }
      if (!match) {
        const home = `${cell(x)},${cell(y)}`;
        if (!grid.has(home)) grid.set(home, []);
        grid.get(home).push({x, y, key});
      }
      alias.set(key, match ?? key);
    }
    return segments.map(([a, b]) => [alias.get(a), alias.get(b)]).filter(([a, b]) => a !== b);
  }

  function runsOf(lines) {
    const segments = snapEnds(lines), ends = new Map(), used = new Uint8Array(segments.length);
    segments.forEach(([a, b], i) => {
      for (const end of [a, b]) {
        if (!ends.has(end)) ends.set(end, []);
        ends.get(end).push(i);
      }
    });
    const extend = (from, add) => {
      for (let tail = from; ;) {
        const next = ends.get(tail).find(i => !used[i]);
        if (next === undefined) return;
        used[next] = 1;
        const [a, b] = segments[next];
        tail = a === tail ? b : a;
        add(tail);
      }
    };
    const runs = [];
    segments.forEach(([a, b], i) => {
      if (used[i]) return;
      used[i] = 1;
      const points = [a, b];
      extend(b, end => points.push(end));
      extend(a, end => points.unshift(end));
      runs.push(points);
    });
    return runs;
  }

  const chain = lines => runsOf(lines).map(smoothPath).join('');

  const SMOOTH_TURN = Math.cos(35 * Math.PI / 180);
  const toPoint = key => key.split(' ').map(Number);
  const turn = (u, v) => (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v));
  function smoothPath(keys) {
    const points = keys.map(toPoint), n = points.length;
    const closed = n > 3 && keys[0] === keys[n - 1];
    const tangent = i => {
      let prev = i - 1, next = i + 1;
      if (i === 0 || i === n - 1) {
        if (!closed) return null;
        prev = n - 2;
        next = 1;
      }
      const p = points[i], u = [p[0] - points[prev][0], p[1] - points[prev][1]], v = [points[next][0] - p[0], points[next][1] - p[1]];
      if (turn(u, v) < SMOOTH_TURN) return null;
      const t = [u[0] + v[0], u[1] + v[1]], lt = Math.hypot(...t);
      return {direction: [t[0] / lt, t[1] / lt], handle: Math.min(Math.hypot(...u), Math.hypot(...v)) / 3};
    };
    const tangents = points.map((_, i) => tangent(i));
    let d = 'M' + keys[0];
    for (let i = 1; i < n; i++) {
      const start = tangents[i - 1], end = tangents[i];
      if (!start && !end) {
        d += 'L' + keys[i];
        continue;
      }
      const a = points[i - 1], b = points[i], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const chord = [(b[0] - a[0]) / length, (b[1] - a[1]) / length];
      const [out, outHandle] = start ? [start.direction, start.handle] : [chord, length / 3];
      const [into, intoHandle] = end ? [end.direction, end.handle] : [chord, length / 3];
      d += `C${round(a[0] + out[0] * outHandle)} ${round(a[1] + out[1] * outHandle)} ${round(b[0] - into[0] * intoHandle)} ${round(b[1] - into[1] * intoHandle)} ${keys[i]}`;
    }
    return d;
  }

  function carryOutlines(paths) {
    const ends = [];
    for (const run of runsOf(paths.get('outline'))) {
      if (run[0] === run[run.length - 1]) continue;
      for (const [end, before] of [[run[0], run[1]], [run[run.length - 1], run[run.length - 2]]]) {
        const p = toPoint(end), q = toPoint(before);
        ends.push({at: p, arriving: [p[0] - q[0], p[1] - q[1]]});
      }
    }
    const reach = points => {
      const p = points[0], leaving = [points[1][0] - p[0], points[1][1] - p[1]];
      if (!ends.some(e => Math.hypot(e.at[0] - p[0], e.at[1] - p[1]) <= SNAP && turn(e.arriving, leaving) >= SMOOTH_TURN)) return 0;
      let i = 1;
      while (i < points.length - 1 && turn([points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]], [points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]]) >= SMOOTH_TURN) i++;
      return i;
    };
    const pairs = keys => keys.slice(1).map((key, i) => [keys[i], key]);
    const carried = [], kept = [];
    for (const run of runsOf(paths.get('edge'))) {
      const points = run.map(toPoint), last = run.length - 1;
      if (run[0] === run[last]) {
        kept.push(...pairs(run));
        continue;
      }
      const head = reach(points), tail = last - reach([...points].reverse());
      if (!head && tail === last) {
        kept.push(...pairs(run));
      } else if (head >= tail) {
        carried.push(...pairs(run));
      } else {
        carried.push(...pairs(run.slice(0, head + 1)), ...pairs(run.slice(tail)));
        kept.push(...pairs(run.slice(head, tail + 1)));
      }
    }
    paths.set('outline', [...paths.get('outline'), ...carried]);
    if (kept.length) paths.set('edge', kept);
    else paths.delete('edge');
  }

  function checkPart(p) {
    if (p.triangles.some(f => f.length !== 3 || f.some(i => !Number.isInteger(i) || i < 0 || i >= p.vertices.length))) {
      throw Error(`Part ${p.id} has a triangle that references a missing vertex`);
    }
    if (!p.vertices.every(G.isPoint) || !p.lines.every(l => G.isPoint(l.a) && G.isPoint(l.b))) {
      throw Error(`Part ${p.id} has a point without three finite coordinates`);
    }
  }

  function fit(scenes, marginX = SHEET.margin) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const extend = ([x, y]) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    };
    for (const {meshes, trails} of scenes) {
      for (const mesh of meshes) {
        mesh.points.forEach(extend);
        for (const l of mesh.lines) [l.a, l.b].forEach(extend);
      }
      for (const t of trails) [t.a, t.b].forEach(extend);
    }
    if (![minX, minY, maxX, maxY].every(Number.isFinite)) throw Error('Drawing geometry must contain finite vertices');
    const scale = Math.min((SHEET.width - marginX * 2) / (maxX - minX || 1), (SHEET.height - SHEET.margin * 2) / (maxY - minY || 1));
    const bounds = {width: (maxX - minX) * scale, height: (maxY - minY) * scale};
    bounds.x = (SHEET.width - bounds.width) / 2;
    bounds.y = (SHEET.height - bounds.height) / 2;
    return {scale, bounds, offset: [bounds.x - minX * scale, bounds.y - minY * scale]};
  }

  function occluder(meshes, paper, depthTolerance) {
    const triangles = [], cells = new Map(), cellSize = 1.5;
    const cell = n => Math.floor(n / cellSize);
    for (const mesh of meshes) {
      if (mesh.part.transparent) continue;
      const points = mesh.points.map(paper);
      for (const face of mesh.part.triangles) {
        const [a, b, c] = face.map(i => points[i]);
        const den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
        const span = Math.max((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2, (b[0] - c[0]) ** 2 + (b[1] - c[1]) ** 2, (c[0] - a[0]) ** 2 + (c[1] - a[1]) ** 2);
        if (Math.abs(den) <= span * 1e-9) continue;
        const id = triangles.push({part: mesh.part, a, b, c, den}) - 1;
        for (let x = cell(Math.min(a[0], b[0], c[0])); x <= cell(Math.max(a[0], b[0], c[0])); x++) {
          for (let y = cell(Math.min(a[1], b[1], c[1])); y <= cell(Math.max(a[1], b[1], c[1])); y++) {
            const key = x + ',' + y;
            if (!cells.has(key)) cells.set(key, []);
            cells.get(key).push(id);
          }
        }
      }
    }
    const under = (p, visit) => {
      for (const id of cells.get(cell(p[0]) + ',' + cell(p[1])) || []) {
        const {part, a, b, c, den} = triangles[id];
        const u = ((b[1] - c[1]) * (p[0] - c[0]) + (c[0] - b[0]) * (p[1] - c[1])) / den;
        if (u < -.000001 || u > 1.000001) continue;
        const v = ((c[1] - a[1]) * (p[0] - c[0]) + (a[0] - c[0]) * (p[1] - c[1])) / den;
        if (v < -.000001 || u + v > 1.000001) continue;
        if (visit(part, u * a[2] + v * b[2] + (1 - u - v) * c[2])) return true;
      }
      return false;
    };
    return {
      visible: p => !under(p, (_, depth) => depth > p[2] + depthTolerance),
      front: p => {
        let best = null;
        under(p, (part, depth) => {
          if (!best || depth > best.depth) best = {part, depth};
        });
        return best;
      }
    };
  }

  function inker({paper, scale, visible, sample}) {
    const point = p => `${round(p[0])} ${round(p[1])}`;
    return (lines, collect) => {
      const paths = new Map(), seen = new Set();
      for (const {a: from, b: to, role} of lines.sort((a, b) => rank(a) - rank(b))) {
        const a = paper(from), b = paper(to);
        const key = [a, b].map(q => point(q) + ' ' + round(q[2] * scale)).sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / sample));
        let run = null, previous = null;
        const edge = (shown, hidden) => {
          for (let n = 0; n < 8; n++) {
            const middle = shown.map((v, k) => (v + hidden[k]) / 2);
            if (visible(middle)) shown = middle;
            else hidden = middle;
          }
          return shown;
        };
        const keep = (start, end) => {
          const ends = [point(start), point(end)];
          if (ends[0] === ends[1]) return;
          collect?.push(start, end);
          if (!paths.has(role)) paths.set(role, []);
          paths.get(role).push(ends);
        };
        for (let i = 0; i <= steps; i++) {
          const at = a.map((n, k) => n + (b[k] - n) * i / steps);
          if (visible(at)) {
            run ??= previous ? edge(at, previous) : at;
          } else if (run !== null) {
            keep(run, edge(previous, at));
            run = null;
          }
          previous = at;
        }
        if (run !== null) keep(run, previous);
      }
      if (paths.has('outline') && paths.has('edge')) carryOutlines(paths);
      return [...paths].map(([role, segments]) => `<path data-line-role="${role}" fill="none" d="${chain(segments)}"/>`).join('');
    };
  }

  const FILL_CELL = 1.5;
  const boxOf = ([a, b, c]) => [Math.min(a[0], b[0], c[0]), Math.min(a[1], b[1], c[1]), Math.max(a[0], b[0], c[0]), Math.max(a[1], b[1], c[1])];
  const cellsOf = box => {
    const keys = [];
    for (let x = Math.floor(box[0] / FILL_CELL); x <= Math.floor(box[2] / FILL_CELL); x++) {
      for (let y = Math.floor(box[1] / FILL_CELL); y <= Math.floor(box[3] / FILL_CELL); y++) keys.push(x + ',' + y);
    }
    return keys;
  };

  function shellFacing(part) {
    const vertex = i => part.vertices[i].map(n => n.toFixed(6)).join(), parent = part.triangles.map((_, f) => f), owners = new Map();
    const find = f => {
      while (parent[f] !== f) f = parent[f] = parent[parent[f]];
      return f;
    };
    const edges = part.triangles.map(face => {
      const keys = face.map(vertex);
      return keys.map((k, j) => [k, keys[(j + 1) % 3]].sort().join('|'));
    });
    edges.forEach((list, f) => list.forEach(edge => {
      if (owners.has(edge)) parent[find(f)] = find(owners.get(edge));
      else owners.set(edge, f);
    }));
    const shells = new Map();
    part.triangles.forEach((face, f) => {
      const root = find(f);
      if (!shells.has(root)) shells.set(root, {volume: 0, uses: new Map()});
      const shell = shells.get(root), [a, b, c] = face.map(i => part.vertices[i]);
      shell.volume += dot(a, cross(b, c));
      for (const edge of edges[f]) shell.uses.set(edge, (shell.uses.get(edge) || 0) + 1);
    });
    for (const shell of shells.values()) {
      shell.sign = [...shell.uses.values()].every(n => n % 2 === 0) ? Math.sign(shell.volume) : 0;
    }
    return part.triangles.map((_, f) => shells.get(find(f)).sign);
  }

  function paintGroups(parts, behind) {
    const index = new Map(), low = new Map(), stack = [], groups = [];
    const ahead = part => parts.filter(other => behind.get(other)?.has(part));
    const connect = part => {
      index.set(part, index.size);
      low.set(part, index.get(part));
      stack.push(part);
      for (const next of ahead(part)) {
        if (!index.has(next)) {
          connect(next);
          low.set(part, Math.min(low.get(part), low.get(next)));
        } else if (stack.includes(next)) {
          low.set(part, Math.min(low.get(part), index.get(next)));
        }
      }
      if (low.get(part) === index.get(part)) {
        const group = [];
        for (let member; member !== part;) group.push(member = stack.pop());
        groups.push(group);
      }
    };
    parts.forEach(part => index.has(part) || connect(part));
    return groups.reverse();
  }

  function sliceCycle(faces, seen) {
    const pieces = [];
    const split = corners => {
      const lengths = [0, 1, 2].map(j => Math.hypot(corners[(j + 1) % 3][0] - corners[j][0], corners[(j + 1) % 3][1] - corners[j][1]));
      const j = lengths.indexOf(Math.max(...lengths));
      if (lengths[j] <= 3) return [corners];
      const a = corners[j], b = corners[(j + 1) % 3], c = corners[(j + 2) % 3], m = a.map((n, k) => (n + b[k]) / 2);
      return [...split([a, m, c]), ...split([m, b, c])];
    };
    for (const {part, corners: whole, shows} of faces) {
      if (shows === 2) {
        pieces.push({part, source: {whole, count: 1}, corners: whole, box: boxOf(whole), depth: Infinity});
        continue;
      }
      const all = split(whole), source = {whole, count: all.length};
      for (const corners of all) {
        if (seen(corners, part)) pieces.push({part, source, corners, box: boxOf(corners), depth: (corners[0][2] + corners[1][2] + corners[2][2]) / 3});
      }
    }
    const overlaps = (p, q) => p[0] < q[2] && q[0] < p[2] && p[1] < q[3] && q[1] < p[3];
    const covered = (run, piece) => cellsOf(piece.box).some(k => run.cells.get(k)?.some(box => overlaps(box, piece.box)));
    const result = [];
    for (const piece of pieces.sort((p, q) => p.depth - q.depth)) {
      let run;
      for (let i = result.length - 1; i >= 0 && !run; i--) {
        if (result[i].part === piece.part) run = result[i];
        else if (covered(result[i], piece)) break;
      }
      if (!run) result.push(run = {part: piece.part, pieces: [], cells: new Map(), box: [...piece.box]});
      run.pieces.push(piece);
      for (const k of cellsOf(piece.box)) {
        if (!run.cells.has(k)) run.cells.set(k, []);
        run.cells.get(k).push(piece.box);
      }
      run.box = [Math.min(run.box[0], piece.box[0]), Math.min(run.box[1], piece.box[1]), Math.max(run.box[2], piece.box[2]), Math.max(run.box[3], piece.box[3])];
    }
    return result.map((run, index) => {
      const counts = new Map(), drawn = new Set(), triangles = [];
      for (const {source} of run.pieces) counts.set(source, (counts.get(source) || 0) + 1);
      for (const {source, corners} of run.pieces) {
        if (drawn.has(source)) continue;
        if (counts.get(source) === source.count) {
          drawn.add(source);
          triangles.push(source.whole);
        } else {
          triangles.push(corners);
        }
      }
      const covers = new Set(result.slice(0, index).filter(r => r.part !== run.part && overlaps(r.box, run.box)).map(r => r.part));
      return {part: run.part, triangles, covers: [...covers]};
    });
  }

  function outlinePath(triangles) {
    const point = p => `${Number(p[0].toFixed(2))} ${Number(p[1].toFixed(2))}`;
    const edges = new Map();
    for (const corners of triangles) {
      const keys = corners.map(point);
      for (let j = 0; j < 3; j++) {
        const from = keys[j], to = keys[(j + 1) % 3];
        if (from === to) continue;
        const back = to + '|' + from;
        if (edges.get(back)) edges.set(back, edges.get(back) - 1);
        else edges.set(from + '|' + to, (edges.get(from + '|' + to) || 0) + 1);
      }
    }
    const outgoing = new Map();
    for (const [edge, count] of edges) {
      const [from, to] = edge.split('|');
      if (!outgoing.has(from)) outgoing.set(from, []);
      for (let n = 0; n < count; n++) outgoing.get(from).push(to);
    }
    let d = '';
    for (const [start, targets] of outgoing) {
      while (targets.length) {
        const loop = [start];
        for (let at = outgoing.get(start).pop(); at !== start; at = outgoing.get(at).pop()) loop.push(at);
        const corners = loop.map(k => k.split(' ').map(Number)).filter((p, i, all) => {
          const a = all[(i + all.length - 1) % all.length], b = all[(i + 1) % all.length];
          const span = Math.hypot(b[0] - a[0], b[1] - a[1]);
          return span === 0 || Math.abs((p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])) / span > .004;
        });
        const area = corners.reduce((sum, p, i) => sum + p[0] * corners[(i + 1) % corners.length][1] - corners[(i + 1) % corners.length][0] * p[1], 0);
        if (corners.length > 2 && Math.abs(area) > 1e-4) d += 'M' + corners.map(p => p.join(' ')).join('L') + 'Z';
      }
    }
    return d;
  }

  function filler(meshes, paper, front, tolerance) {
    const candidates = [];
    for (const {part, points: projected} of meshes) {
      if (part.transparent) continue;
      const points = projected.map(paper), signs = shellFacing(part);
      part.triangles.forEach((face, f) => {
        const [a, b, c] = face.map(i => points[i]);
        const area = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
        if (Math.abs(area) <= 1e-7) return;
        if (area * signs[f] <= 0) candidates.push({part, corners: area > 0 ? [a, b, c] : [a, c, b]});
      });
    }
    const behind = new Map();
    const relate = (back, ahead) => {
      if (!behind.has(ahead)) behind.set(ahead, new Set());
      behind.get(ahead).add(back);
    };
    const seen = ([a, b, c], part) => {
      const steps = Math.min(24, Math.ceil(Math.max(Math.hypot(b[0] - a[0], b[1] - a[1]), Math.hypot(c[0] - a[0], c[1] - a[1])) / 1.5));
      let shown = 0, hidden = false;
      for (let i = 0; i <= steps; i++) {
        for (let j = 0; i + j <= steps; j++) {
          const u = (i + 1 / 3) / (steps + 1), v = (j + 1 / 3) / (steps + 1);
          const p = [0, 1, 2].map(k => a[k] + u * (b[k] - a[k]) + v * (c[k] - a[k])), top = front(p);
          if (!top || top.depth <= p[2] + tolerance) {
            shown = 1;
          } else {
            hidden = true;
            if (top.part !== part) relate(part, top.part);
          }
        }
      }
      return shown && !hidden ? 2 : shown;
    };
    const shown = candidates.filter(face => (face.shows = seen(face.corners, face.part)));
    const outside = (part, group) => [...(behind.get(part) || [])].filter(other => !group.includes(other));
    const runs = paintGroups([...new Set(shown.map(f => f.part))], behind).flatMap(group => {
      if (group.length === 1) {
        const [part] = group;
        return [{part, triangles: shown.filter(f => f.part === part).map(f => f.corners), covers: outside(part, group)}];
      }
      return sliceCycle(shown.filter(f => group.includes(f.part)), seen).map(run => ({...run, covers: [...run.covers, ...outside(run.part, group)]}));
    });
    return runs.map(run => {
      const d = outlinePath(run.triangles);
      const covers = run.covers.filter(part => part !== run.part).map(part => part.id).join(' ');
      return d && `<path data-fill="${escape(run.part.id)}" data-covers="${escape(covers)}" fill="none" d="${d}"/>`;
    }).join('');
  }

  function annotator(anchors, bounds, ink) {
    const GAP = 7, SIZE = 3.2, top = SHEET.margin, bottom = SHEET.height - SHEET.margin, middle = bounds.x + bounds.width / 2;
    const sides = [anchors.filter(a => a.center < middle), anchors.filter(a => a.center >= middle)];
    let markup = '';
    sides.forEach((list, side) => {
      list.sort((p, q) => p.point[1] - q.point[1]);
      const ys = list.map(a => Math.min(bottom, Math.max(top, a.point[1])));
      for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + GAP);
      const overflow = Math.max(0, (ys[ys.length - 1] ?? 0) - bottom);
      for (let i = ys.length - 1; i >= 0; i--) ys[i] = Math.min(ys[i] - overflow, i < ys.length - 1 ? ys[i + 1] - GAP : Infinity);
      const direction = side ? 1 : -1;
      list.forEach(({point: [x, y], name}, i) => {
        const edge = reach(ink, ys[i] - SIZE, ys[i] + SIZE, side, x);
        const column = edge + direction * 16, elbow = column - direction * 5;
        markup += `<path data-line-role="detail" fill="none" d="M${round(x)} ${round(y)}L${round(elbow)} ${round(ys[i])}L${round(column)} ${round(ys[i])}"/>`
          + `<circle data-ink-fill="" cx="${round(x)}" cy="${round(y)}" r=".6"/>`
          + `<text data-ink-fill="" data-annotation="" x="${round(column + direction * 1.5)}" y="${round(ys[i] + SIZE * .35)}" font-size="${SIZE}" text-anchor="${side ? 'start' : 'end'}">${escape(name.toUpperCase())}</text>`;
      });
    });
    return markup && `<g data-annotations="">${markup}</g>`;
  }

  // Ink arrives as segment end pairs, so a long edge passing the label's
  // height has no point near it; clip each segment to the band instead.
  function reach(ink, low, high, side, from) {
    let far = from;
    for (let k = 0; k < ink.length; k += 2) {
      const [a, b] = [ink[k], ink[k + 1]], dy = b[1] - a[1];
      const [t0, t1] = dy ? [(low - a[1]) / dy, (high - a[1]) / dy].sort((m, n) => m - n) : a[1] >= low && a[1] <= high ? [0, 1] : [1, 0];
      const lo = Math.max(0, t0), hi = Math.min(1, t1);
      if (lo > hi) continue;
      for (const t of [lo, hi]) {
        const x = a[0] + (b[0] - a[0]) * t;
        far = side ? Math.max(far, x) : Math.min(far, x);
      }
    }
    return far;
  }

  function anchorOf(part, points, middle) {
    if (!points.length) return null;
    const within = (axis, low, high) => {
      const sorted = points.map(p => p[axis]).sort((a, b) => a - b), at = q => sorted[Math.floor(q * (sorted.length - 1))];
      return p => p[axis] >= at(low) && p[axis] <= at(high);
    };
    const inX = within(0, .1, .9), inY = within(1, .25, .75);
    const band = points.filter(p => inX(p) && inY(p));
    const pool = band.length ? band : points, center = pool.reduce((sum, p) => sum + p[0], 0) / pool.length;
    const point = pool.reduce((best, p) => (center < middle ? p[0] < best[0] : p[0] > best[0]) ? p : best);
    return {name: part.name, point, center};
  }

  function render(parts, {explosion = 1, isolated = null, sample = .045, camera, fitExplosion = explosion, trails = [], fill = false, annotate = false, labels = annotate} = {}) {
    for (const [name, value] of [['Explosion', explosion], ['Fit explosion', fitExplosion]]) {
      if (!Number.isFinite(value) || value < 0 || value > 2) throw Error(name + ' must be 0–2');
    }
    if (!Number.isFinite(sample) || sample < .01 || sample > .2) throw Error('Invalid paper-space sampling');
    if (!Array.isArray(trails)) throw Error('Trails must be an array');
    const view = camera ? createCamera(camera) : defaultCamera;
    const shown = isolated === null ? parts : parts.filter(p => p.id === String(isolated));
    if (!shown.length) throw Error('Unknown part');
    shown.forEach(checkPart);

    const byId = new Map(parts.map(p => [p.id, p]));
    const trailEnd = (point, id, amount) => {
      G.point3(point, 'A trail end');
      if (id === undefined || id === null) return point;
      if (!byId.has(String(id))) throw Error(`Trail refers to unknown part ${id}`);
      return add(point, shift(byId.get(String(id)), amount));
    };
    const scene = amount => ({
      meshes: shown.map(part => {
        const offset = shift(part, amount), place = v => view.project(add(v, offset));
        return {part, points: part.vertices.map(place), lines: part.lines.map(l => ({role: l.role, a: place(l.a), b: place(l.b)}))};
      }),
      trails: isolated === null ? trails.map(t => {
        const a = trailEnd(t.a, t.from, amount), b = trailEnd(t.b, t.to, amount);
        return {role: G.lineRole(t.role ?? 'axis'), a: view.project(a), b: view.project(b), collapsed: Math.hypot(...sub(a, b)) <= 1e-9};
      }) : []
    });

    const current = scene(explosion);
    const {scale, bounds, offset} = fit(fitExplosion === explosion ? [current] : [current, scene(fitExplosion)], annotate ? SHEET.labelMargin : SHEET.margin);
    const paper = p => [offset[0] + p[0] * scale, offset[1] + p[1] * scale, p[2]];
    const {visible, front} = occluder(current.meshes, paper, .01 / scale);
    const ink = inker({paper, scale, sample, visible});

    const inked = [];
    const groups = current.meshes.map(({part, points, lines}) => {
      const outlines = contours(part, view.direction).map(({a, b}) => ({a: points[a], b: points[b], role: 'outline'}));
      const id = `part-${escape(part.id)}-${escape(SHEET.slug(part.name))}`, collected = [];
      inked.push([part, collected]);
      return `<g id="${id}" data-item="${escape(part.id)}" data-name="${escape(part.name)}"><title>${escape(part.name)}</title>${ink([...lines, ...outlines], collected)}</g>`;
    });
    const fillInk = fill ? filler(current.meshes, paper, front, .01 / scale) : '';
    if (fillInk) groups.unshift(`<g data-fills="">${fillInk}</g>`);
    const trailInk = ink(current.trails.filter(t => !t.collapsed));
    if (trailInk) groups.push(`<g data-trails="">${trailInk}</g>`);
    if (annotate && labels) groups.push(annotator(inked.map(([part, points]) => anchorOf(part, points, bounds.x + bounds.width / 2)).filter(Boolean), bounds, inked.flatMap(([, points]) => points)));
    return {markup: groups.join(''), bounds, scale, offset};
  }

  const api = {SHEET, createCamera, project, render};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TechnicalProjection = api;
})(globalThis);
