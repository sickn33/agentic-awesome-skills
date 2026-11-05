(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const ROLES = ['outline', 'edge', 'detail', 'texture', 'axis'];
  const RING_SEGMENTS = 144;

  const add = (a, b) => a.map((n, i) => n + b[i]);
  const sub = (a, b) => a.map((n, i) => n - b[i]);
  const dot = (a, b) => a.reduce((n, v, i) => n + v * b[i], 0);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = a => {
    const length = Math.hypot(...a);
    if (!length) throw Error('Zero direction');
    return a.map(n => n / length);
  };

  const finite = n => {
    if (!Number.isFinite(n)) throw Error('Expected a finite number');
    return n;
  };
  const positive = n => {
    finite(n);
    if (n <= 0) throw Error('Expected a positive number');
    return n;
  };
  const count = (n, min = 3, max = 512) => {
    if (!Number.isInteger(n) || n < min || n > max) throw Error(`Count must be ${min}–${max}`);
    return n;
  };
  const isPoint = v => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
  const point3 = (v, what) => {
    if (!isPoint(v)) throw Error(`${what} needs three finite coordinates`);
    return v;
  };
  const lineRole = role => {
    if (!ROLES.includes(role)) throw Error(`Line role must be one of ${ROLES.join(', ')}`);
    return role;
  };

  function part(id, name, explosion = [0, 0, 0]) {
    if (!name || id === undefined || id === null || String(id) === '') throw Error('A part needs a stable ID and name');
    point3(explosion, 'An explosion');
    return {id: String(id), name, explosion, vertices: [], triangles: [], lines: []};
  }

  function line(p, a, b, role = 'edge') {
    point3(a, 'A line end');
    point3(b, 'A line end');
    lineRole(role);
    if (Math.hypot(...sub(a, b)) > 1e-9) p.lines.push({a: [...a], b: [...b], role});
  }

  function ringPoints(center, radius, u, v, {start = 0, end = TAU, tolerance = .008} = {}) {
    positive(radius);
    positive(tolerance);
    [...center, ...u, ...v, start, end].forEach(finite);
    if (Math.abs(dot(u, v)) > 1e-6 || Math.abs(Math.hypot(...u) - 1) > 1e-6 || Math.abs(Math.hypot(...v) - 1) > 1e-6) {
      throw Error('Circle axes must be orthonormal');
    }
    const step = 2 * Math.acos(Math.max(-1, 1 - Math.min(tolerance / radius, 1)));
    const segments = Math.max(1, Math.ceil(Math.abs(end - start) / step));
    if (segments > 8192) throw Error('Curve tolerance requires too many segments');
    return Array.from({length: segments + 1}, (_, i) => {
      const t = start + (end - start) * i / segments;
      return center.map((n, k) => n + radius * (u[k] * Math.cos(t) + v[k] * Math.sin(t)));
    });
  }

  function radialPoint(x, r, hex, t) {
    let radius = r;
    if (hex) {
      const local = ((t + Math.PI / 6) % (Math.PI / 3) + Math.PI / 3) % (Math.PI / 3) - Math.PI / 6;
      radius = r * Math.cos(Math.PI / 6) / Math.cos(local);
    }
    return [x, radius * Math.cos(t), radius * Math.sin(t)];
  }

  function ring(p, x, r, {role = 'edge', hex = false} = {}) {
    positive(r);
    for (let j = 0; j < RING_SEGMENTS; j++) {
      line(p, radialPoint(x, r, hex, TAU * j / RING_SEGMENTS), radialPoint(x, r, hex, TAU * (j + 1) / RING_SEGMENTS), role);
    }
    return p;
  }

  function lathe(p, profile, {axis = 'x', at, ...options} = {}) {
    return merge(p, transform(latheX(piece(), profile, options), {origin: at ?? [0, 0, 0], ...along(axis)}));
  }

  function latheX(p, profile, {segments = RING_SEGMENTS, start = 0, end = TAU, omitRings = [], creaseAngle, role = 'edge'} = {}) {
    count(segments, 12, 720);
    lineRole(role);
    cleanProfile(profile.map(([x, r]) => [x, r]));
    if (profile.some(([, r]) => r < 0)) throw Error('Negative radius');
    if (profile.some(point => point[2] === 'h') && segments % 12 !== 0) throw Error('Hex profiles need a segment count divisible by 12');
    if (!(end > start && end - start <= TAU + 1e-8)) throw Error('Invalid lathe arc');
    const crease = i => {
      if (creaseAngle === undefined) return true;
      const [a, b, c] = [-1, 0, 1].map(k => profile[(i + k + profile.length) % profile.length]);
      const u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]];
      const cos = (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v) || 1);
      return cos <= Math.cos(creaseAngle * Math.PI / 180);
    };

    const partial = end - start < TAU - 1e-8;
    const n = Math.ceil(segments * (end - start) / TAU);
    const cols = partial ? n + 1 : n;
    const offset = p.vertices.length;
    const idx = (i, j) => offset + i * cols + j;

    for (const [x, r, kind] of profile) {
      for (let j = 0; j < cols; j++) p.vertices.push(radialPoint(x, r, kind === 'h', start + (end - start) * j / n));
    }
    for (let i = 0; i < profile.length; i++) {
      const k = (i + 1) % profile.length;
      for (let j = 0; j < n; j++) {
        const q = partial ? j + 1 : (j + 1) % cols;
        const a = idx(i, j), b = idx(k, j), c = idx(k, q), d = idx(i, q);
        p.triangles.push([a, b, c], [a, c, d]);
        if (!omitRings.includes(i) && crease(i)) line(p, p.vertices[a], p.vertices[d], role);
      }
      if (profile[i][2] === 'h' && profile[k][2] === 'h') {
        for (let j = segments / 12; j < cols; j += segments / 6) line(p, p.vertices[idx(i, j)], p.vertices[idx(k, j)], role);
      }
    }
    if (partial) {
      for (const side of [0, cols - 1]) {
        for (let i = 1; i < profile.length - 1; i++) p.triangles.push([idx(0, side), idx(i, side), idx(i + 1, side)]);
        for (let i = 0; i < profile.length; i++) line(p, p.vertices[idx(i, side)], p.vertices[idx((i + 1) % profile.length, side)], role);
      }
    }
    return p;
  }

  function helix(p, {x0, x1, radius, pitch, phase = 0, hand = 1, role = 'detail'}) {
    positive(radius);
    positive(pitch);
    [x0, x1, phase].forEach(finite);
    if (x1 <= x0 || ![-1, 1].includes(hand)) throw Error('Invalid helix span or handedness');
    const n = Math.ceil((x1 - x0) / pitch * 96);
    if (n > 100000) throw Error('Helix is too dense');
    let previous;
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n;
      const t = phase + hand * (x - x0) * TAU / pitch;
      const point = [x, radius * Math.cos(t), radius * Math.sin(t)];
      if (previous) line(p, previous, point, role);
      previous = point;
    }
    return p;
  }

  function knurl(p, {x0, x1, radius, starts = 12, pitch = 48}) {
    count(starts, 3, 48);
    for (let i = 0; i < starts; i++) {
      for (const hand of [-1, 1]) helix(p, {x0, x1, radius, pitch, phase: TAU * i / starts, hand, role: 'texture'});
    }
    return p;
  }

  function spring(p, {x0, x1, radius, wire, turns = 8, stepsPerTurn = 128, wireSteps = 32}) {
    [radius, wire, turns].forEach(positive);
    [x0, x1].forEach(finite);
    count(stepsPerTurn, 24, 192);
    count(wireSteps, 6, 64);
    if (x1 <= x0 || wire >= radius || (x1 - x0) / turns <= 2 * wire) throw Error('Spring coils intersect');
    const steps = Math.ceil(turns * stepsPerTurn);
    if (steps > 10000) throw Error('Spring is too dense');
    const base = p.vertices.length;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps * TAU * turns;
      const x = x0 + (x1 - x0) * i / steps;
      const radial = [0, Math.cos(t), Math.sin(t)];
      const tangent = unit([(x1 - x0) / (TAU * turns), -radius * Math.sin(t), radius * Math.cos(t)]);
      const normal = cross(radial, tangent);
      const center = [x, radius * Math.cos(t), radius * Math.sin(t)];
      for (let j = 0; j < wireSteps; j++) {
        const a = TAU * j / wireSteps;
        p.vertices.push(center.map((n, k) => n + wire * (radial[k] * Math.cos(a) + normal[k] * Math.sin(a))));
      }
    }
    for (let i = 0; i < steps; i++) {
      for (let j = 0; j < wireSteps; j++) {
        const a = base + i * wireSteps + j, b = base + i * wireSteps + (j + 1) % wireSteps, c = b + wireSteps, d = a + wireSteps;
        p.triangles.push([a, b, c], [a, c, d]);
      }
    }
    for (const end of [0, steps]) {
      const center = p.vertices.length, t = end / steps * TAU * turns;
      p.vertices.push([x0 + (x1 - x0) * end / steps, radius * Math.cos(t), radius * Math.sin(t)]);
      for (let j = 0; j < wireSteps; j++) {
        const a = base + end * wireSteps + j, b = base + end * wireSteps + (j + 1) % wireSteps;
        p.triangles.push(end ? [center, a, b] : [center, b, a]);
        line(p, p.vertices[a], p.vertices[b], 'detail');
      }
    }
    return p;
  }

  function screw(p, {length = 10, radius = 1.5, headRadius = 3, headHeight = 2, pitch = .8} = {}) {
    [length, radius, headRadius, headHeight, pitch].forEach(positive);
    if (headRadius < radius || length <= pitch) throw Error('Invalid screw dimensions');
    lathe(p, [[0, radius], [length, radius], [length, headRadius], [length + headHeight, headRadius], [length + headHeight, 0], [0, 0]]);
    helix(p, {x0: pitch / 2, x1: length - pitch / 2, radius: radius + .004, pitch});
    line(p, [length + headHeight, -headRadius * .7, 0], [length + headHeight, headRadius * .7, 0], 'detail');
    return p;
  }

  function roundedRectangle(width, height, radius, {center = [0, 0], tolerance = .01} = {}) {
    positive(width);
    positive(height);
    positive(radius);
    positive(tolerance);
    center.forEach(finite);
    if (radius > Math.min(width, height) / 2) throw Error('Corner radius exceeds profile');
    const x = width / 2 - radius, y = height / 2 - radius;
    const corners = [[x, -y, -Math.PI / 2], [x, y, 0], [-x, y, Math.PI / 2], [-x, -y, Math.PI]];
    return corners.flatMap(([cx, cy, start]) =>
      ringPoints([cx, cy, 0], radius, [1, 0, 0], [0, 1, 0], {start, end: start + Math.PI / 2, tolerance}).map(p => [p[0] + center[0], p[1] + center[1]]));
  }

  function transform(p, {origin = [0, 0, 0], xAxis = [1, 0, 0], yAxis = [0, 1, 0], zAxis = [0, 0, 1]} = {}) {
    [origin, xAxis, yAxis, zAxis].forEach(v => point3(v, 'A frame vector'));
    const orthonormal = [xAxis, yAxis, zAxis].every(v => Math.abs(Math.hypot(...v) - 1) <= 1e-6) && Math.abs(dot(xAxis, yAxis)) <= 1e-6;
    if (!orthonormal || Math.hypot(...sub(cross(xAxis, yAxis), zAxis)) > 1e-6) throw Error('Frame axes must be right-handed and orthonormal');
    const rotate = v => origin.map((_, i) => v[0] * xAxis[i] + v[1] * yAxis[i] + v[2] * zAxis[i]);
    const place = v => add(origin, rotate(v));
    p.vertices = p.vertices.map(place);
    p.lines = p.lines.map(l => ({...l, a: place(l.a), b: place(l.b)}));
    p.explosion = rotate(p.explosion);
    return p;
  }

  function merge(target, source) {
    if (target === source) throw Error('Cannot merge a part into itself');
    if (source.explosion.some(n => n !== 0)) throw Error('Construction pieces must have zero explosion before merging');
    const base = target.vertices.length;
    for (const v of source.vertices) target.vertices.push([...v]);
    for (const f of source.triangles) target.triangles.push(f.map(i => base + i));
    for (const l of source.lines) target.lines.push({...l, a: [...l.a], b: [...l.b]});
    return target;
  }

  const turn = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const crosses = (a, b, c, d) => turn(a, b, c) * turn(a, b, d) < 0 && turn(c, d, a) * turn(c, d, b) < 0;
  const inside = ([x, y], loop) => loop.reduce((hit, a, i) => {
    const b = loop[(i + 1) % loop.length];
    return (a[1] > y) !== (b[1] > y) && x < a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]) ? !hit : hit;
  }, false);

  function cleanProfile(profile) {
    if (!Array.isArray(profile) || profile.length < 3 || profile.length > 1024) throw Error('A profile needs 3–1024 points');
    for (const v of profile) {
      if (!Array.isArray(v) || v.length !== 2) throw Error('Profile points need two coordinates');
      v.forEach(finite);
    }
    const span = Math.max(...[0, 1].map(k => Math.max(...profile.map(p => p[k])) - Math.min(...profile.map(p => p[k]))));
    const epsilon = Math.max(span * 1e-10, 1e-12), areaTolerance = epsilon * span;
    const same = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) <= epsilon;
    const onSegment = (a, b, c) => Math.abs(turn(a, b, c)) <= areaTolerance
      && c[0] >= Math.min(a[0], b[0]) - epsilon && c[0] <= Math.max(a[0], b[0]) + epsilon
      && c[1] >= Math.min(a[1], b[1]) - epsilon && c[1] <= Math.max(a[1], b[1]) + epsilon;

    const points = profile.filter((v, i) => !i || !same(v, profile[i - 1])).map(v => [...v]);
    if (points.length > 1 && same(points[0], points.at(-1))) points.pop();
    for (let i = points.length - 1; i >= 0 && points.length > 3; i--) {
      const a = points[(i + points.length - 1) % points.length], b = points[i], c = points[(i + 1) % points.length];
      const forward = (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]) >= 0;
      if (Math.abs(turn(a, b, c)) <= areaTolerance && forward) points.splice(i, 1);
    }
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        if (j === i + 1 || (i === 0 && j === points.length - 1)) continue;
        const a = points[i], b = points[(i + 1) % points.length], c = points[j], d = points[(j + 1) % points.length];
        if (crosses(a, b, c, d) || onSegment(a, b, c) || onSegment(a, b, d) || onSegment(c, d, a) || onSegment(c, d, b)) {
          throw Error('Profile must not intersect itself');
        }
      }
    }
    const area = points.reduce((sum, a, i) => {
      const b = points[(i + 1) % points.length];
      return sum + a[0] * b[1] - b[0] * a[1];
    }, 0) / 2;
    if (points.length < 3 || Math.abs(area) <= areaTolerance) throw Error('Profile has no area');
    if (area < 0) points.reverse();
    return {points, areaTolerance};
  }

  function triangulate(points, order, areaTolerance) {
    const remaining = [...order], triangles = [];
    const same = (u, v) => points[u][0] === points[v][0] && points[u][1] === points[v][1];
    const inside = (a, b, c, v) => turn(points[a], points[b], points[v]) >= -areaTolerance
      && turn(points[b], points[c], points[v]) >= -areaTolerance
      && turn(points[c], points[a], points[v]) >= -areaTolerance;
    while (remaining.length > 3) {
      const neighbors = i => [remaining[(i + remaining.length - 1) % remaining.length], remaining[i], remaining[(i + 1) % remaining.length]];
      const ear = remaining.findIndex((_, i) => {
        const [a, b, c] = neighbors(i);
        return turn(points[a], points[b], points[c]) > areaTolerance
          && !remaining.some(v => !same(v, a) && !same(v, b) && !same(v, c) && inside(a, b, c, v));
      });
      if (ear < 0) throw Error('Could not triangulate extrusion profile');
      triangles.push(neighbors(ear));
      remaining.splice(ear, 1);
    }
    triangles.push([...remaining]);
    return triangles;
  }

  function bridgeHoles(points, outer, holes) {
    const edges = loop => loop.map((v, i) => [v, loop[(i + 1) % loop.length]]);
    const coordinates = loop => loop.map(v => points[v]);
    let merged = [...outer];
    const pending = [...holes].sort((h, k) => Math.max(...k.map(v => points[v][0])) - Math.max(...h.map(v => points[v][0])));
    while (pending.length) {
      const hole = pending.shift(), start = hole.reduce((m, v, i) => points[v][0] > points[hole[m]][0] ? i : m, 0), m = hole[start];
      const blockers = [...edges(merged), ...pending.flatMap(edges), ...edges(hole)];
      const others = [...merged, ...pending.flat(), ...hole];
      const enclosing = [hole, ...pending].map(coordinates);
      const clear = v => {
        const [ax, ay] = points[m], [bx, by] = points[v], length = Math.hypot(bx - ax, by - ay);
        const step = [ax + (bx - ax) * 1e-4, ay + (by - ay) * 1e-4];
        if (enclosing.some(loop => inside(step, loop))) return false;
        if (blockers.some(([e0, e1]) => e0 !== v && e1 !== v && e0 !== m && e1 !== m && crosses(points[m], points[v], points[e0], points[e1]))) return false;
        return !others.some(w => {
          if (w === v || w === m || (points[w][0] === bx && points[w][1] === by)) return false;
          const t = ((points[w][0] - ax) * (bx - ax) + (points[w][1] - ay) * (by - ay)) / (length * length);
          return t > 0 && t < 1 && Math.abs(turn(points[m], points[v], points[w])) / length < length * 1e-7;
        });
      };
      const visible = merged
        .map((v, i) => ({v, i, d: Math.hypot(points[v][0] - points[m][0], points[v][1] - points[m][1])}))
        .filter(({v}) => clear(v))
        .sort((x, y) => x.d - y.d)[0];
      if (!visible) throw Error('Could not connect a hole to the profile');
      const around = [...hole.slice(start), ...hole.slice(0, start), m];
      merged = [...merged.slice(0, visible.i + 1), ...around, visible.v, ...merged.slice(visible.i + 1)];
    }
    return merged;
  }

  function extrude(p, profile, {depth, holes = [], role = 'edge', creaseAngle = 25} = {}) {
    positive(depth);
    lineRole(role);
    finite(creaseAngle);
    if (creaseAngle < 0 || creaseAngle > 180) throw Error('Invalid crease angle');
    if (!Array.isArray(holes)) throw Error('Holes must be an array of profiles');
    const {points: outer, areaTolerance} = cleanProfile(profile);
    const loops = [outer, ...holes.map(h => {
      const points = cleanProfile(h).points.reverse();
      if (!points.every(point => inside(point, outer))) throw Error('Holes must sit inside the profile');
      return points;
    })];
    const points = loops.flat(), indexLoops = [];
    loops.reduce((offset, loop) => {
      indexLoops.push(loop.map((_, i) => offset + i));
      return offset + loop.length;
    }, 0);
    const order = indexLoops.length > 1 ? bridgeHoles(points, indexLoops[0], indexLoops.slice(1)) : indexLoops[0];
    const caps = triangulate(points, order, areaTolerance);

    const base = p.vertices.length, n = points.length;
    for (const z of [0, depth]) p.vertices.push(...points.map(([x, y]) => [x, y, z]));
    for (const [a, b, c] of caps) p.triangles.push([base + c, base + b, base + a], [base + n + a, base + n + b, base + n + c]);
    for (const loop of indexLoops) {
      const m = loop.length;
      for (let k = 0; k < m; k++) {
        const i = loop[k], j = loop[(k + 1) % m], a = base + i, b = base + j, c = base + n + j, d = base + n + i;
        p.triangles.push([a, b, c], [a, c, d]);
        line(p, p.vertices[a], p.vertices[b], role);
        line(p, p.vertices[d], p.vertices[c], role);
        const previous = points[loop[(k + m - 1) % m]], here = points[i], next = points[j];
        const u = unit([here[0] - previous[0], here[1] - previous[1], 0]), v = unit([next[0] - here[0], next[1] - here[1], 0]);
        if (dot(u, v) <= Math.cos(creaseAngle * Math.PI / 180)) line(p, p.vertices[a], p.vertices[d], role);
      }
    }
    return p;
  }

  function piece() {
    return part('piece', 'Construction piece');
  }

  const frame = (xAxis, yAxis, zAxis) => ({xAxis, yAxis, zAxis});
  const AXES = {x: frame([1, 0, 0], [0, 1, 0], [0, 0, 1]), y: frame([0, 1, 0], [0, 0, 1], [1, 0, 0]), z: frame([0, 0, 1], [1, 0, 0], [0, 1, 0])};
  const PLANES = {xy: AXES.x, xz: frame([1, 0, 0], [0, 0, 1], [0, -1, 0]), yz: AXES.y};

  function along(axis) {
    if (!AXES[axis]) throw Error('Axis must be x, y or z');
    return structuredClone(AXES[axis]);
  }

  function plane(name) {
    if (!PLANES[name]) throw Error('Plane must be xy, xz or yz');
    return structuredClone(PLANES[name]);
  }

  function box(p, [x0, y0, z0], [x1, y1, z1], {radius = 0, role = 'edge'} = {}) {
    [x0, y0, z0, x1, y1, z1].forEach(finite);
    if (!(x1 > x0 && y1 > y0 && z1 > z0)) throw Error('A box needs its second corner above the first on every axis');
    const profile = radius > 0
      ? roundedRectangle(x1 - x0, y1 - y0, radius, {center: [(x0 + x1) / 2, (y0 + y1) / 2]})
      : [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    return merge(p, transform(extrude(piece(), profile, {depth: z1 - z0, role}), {origin: [0, 0, z0]}));
  }

  function ringAngles(width, height, radius, {corner = 12, side = 24} = {}) {
    [width, height].forEach(positive);
    finite(radius);
    count(corner, 1, 256);
    count(side, 1, 256);
    if (radius < 0 || radius > Math.min(width, height) / 2) throw Error('Corner radius exceeds profile');
    const cx = width / 2 - radius, cy = height / 2 - radius, angles = [];
    [[cx, cy], [-cx, cy], [-cx, -cy], [cx, -cy]].forEach(([x, y], q) => {
      for (let i = 0; i < corner; i++) {
        const t = (q + i / corner) * Math.PI / 2;
        angles.push(Math.atan2(y + radius * Math.sin(t), x + radius * Math.cos(t)));
      }
      const t = (q + 1) * Math.PI / 2, [nx, ny] = [[-cx, cy], [-cx, -cy], [cx, -cy], [cx, cy]][q];
      const a = [x + radius * Math.cos(t), y + radius * Math.sin(t)], b = [nx + radius * Math.cos(t), ny + radius * Math.sin(t)];
      for (let k = 0; k < side; k++) angles.push(Math.atan2(a[1] + (b[1] - a[1]) * k / side, a[0] + (b[0] - a[0]) * k / side));
    });
    return angles.filter((t, i) => i === 0 || Math.abs(t - angles[i - 1]) > 1e-12);
  }

  function roundedRing(width, height, radius, {z = 0, center = [0, 0], angles = ringAngles(width, height, radius)} = {}) {
    [width, height].forEach(positive);
    [radius, z, ...center].forEach(finite);
    if (radius < 0 || radius > Math.min(width, height) / 2) throw Error('Corner radius exceeds profile');
    const qx = width / 2 - radius, qy = height / 2 - radius;
    return angles.map(t => {
      const c = Math.abs(Math.cos(t)), s = Math.abs(Math.sin(t));
      let d = Math.min(width / 2 / c, height / 2 / s);
      if (c * d > qx && s * d > qy) {
        const b = c * qx + s * qy;
        d = b + Math.sqrt(Math.max(0, b * b - qx * qx - qy * qy + radius * radius));
      }
      return [center[0] + d * Math.cos(t), center[1] + d * Math.sin(t), z];
    });
  }

  function circle(p, center, radius, normal, {role = 'edge', segments = RING_SEGMENTS} = {}) {
    positive(radius);
    count(segments, 3, 4096);
    const k = unit(normal), helper = Math.abs(k[0]) < .9 ? [1, 0, 0] : [0, 1, 0];
    const u = unit(cross(k, helper)), v = cross(k, u);
    const points = Array.from({length: segments}, (_, i) => center.map((c, j) => c + radius * (u[j] * Math.cos(TAU * i / segments) + v[j] * Math.sin(TAU * i / segments))));
    return polyline(p, points, {closed: true, role});
  }

  function sweep(p, path, section, {closed = false, caps = !closed, lines = closed ? 'none' : 'ends', role = 'edge'} = {}) {
    if (!Array.isArray(path) || path.length < (closed ? 3 : 2)) throw Error('A sweep path needs at least two points, or three when closed');
    if (!Array.isArray(section) || section.length < 3) throw Error('A sweep section needs at least three points');
    path.forEach(v => point3(v, 'A sweep path point'));
    section.forEach(v => {
      if (!Array.isArray(v) || v.length !== 2) throw Error('Sweep section points need two coordinates');
      v.forEach(finite);
    });
    const n = path.length, at = i => path[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
    const tangents = path.map((_, i) => unit(sub(at(i + 1), at(i - 1))));
    const transport = (u, from, to) => {
      const axis = cross(from, to), s2 = dot(axis, axis), c = dot(from, to);
      let turned = u;
      if (s2 >= 1e-18) {
        const w = cross(axis, u), d = dot(axis, u);
        turned = u.map((k, i) => k * c + w[i] + axis[i] * d * (1 - c) / s2);
      }
      return unit(sub(turned, to.map(k => k * dot(turned, to))));
    };
    const frames = [unit(cross(tangents[0], Math.abs(tangents[0][2]) < .9 ? [0, 0, 1] : [1, 0, 0]))];
    for (let i = 1; i < n; i++) frames.push(transport(frames[i - 1], tangents[i - 1], tangents[i]));
    let twist = 0;
    if (closed) {
      const back = transport(frames[n - 1], tangents[n - 1], tangents[0]), t = tangents[0];
      twist = Math.atan2(dot(cross(back, frames[0]), t), dot(back, frames[0]));
    }
    const rings = path.map((point, i) => {
      const t = tangents[i], angle = twist * i / n, w = cross(t, frames[i]);
      const uu = frames[i].map((k, j) => k * Math.cos(angle) + w[j] * Math.sin(angle)), vv = cross(t, uu);
      return section.map(([a, b]) => point.map((c, k) => c + a * uu[k] + b * vv[k]));
    });
    return loft(p, rings, {cyclic: closed, caps: !closed && caps, lines, role});
  }

  function polyline(p, points, {closed = false, role = 'edge'} = {}) {
    if (!Array.isArray(points) || points.length < 2) throw Error('A polyline needs at least two points');
    const n = closed ? points.length : points.length - 1;
    for (let i = 0; i < n; i++) line(p, points[i], points[(i + 1) % points.length], role);
    return p;
  }

  function loft(p, rings, {cyclic = false, caps = !cyclic, lines = 'all', role = 'edge'} = {}) {
    lineRole(role);
    if (!Array.isArray(rings) || rings.length < (cyclic ? 3 : 2)) throw Error('A loft needs at least two rings, or three when cyclic');
    const n = rings[0].length;
    count(n, 3, 4096);
    for (const ring of rings) {
      if (!Array.isArray(ring) || ring.length !== n) throw Error('Loft rings need equal point counts');
      ring.forEach(v => point3(v, 'A loft point'));
    }
    const base = p.vertices.length, first = p.triangles.length;
    rings.forEach(ring => p.vertices.push(...ring.map(v => [...v])));
    const idx = (i, j) => base + i * n + (j % n);
    const bands = cyclic ? rings.length : rings.length - 1;
    for (let i = 0; i < bands; i++) {
      const k = (i + 1) % rings.length;
      for (let j = 0; j < n; j++) p.triangles.push([idx(i, j), idx(i, j + 1), idx(k, j + 1)], [idx(i, j), idx(k, j + 1), idx(k, j)]);
    }
    if (caps && !cyclic) {
      for (const [i, flip] of [[0, true], [rings.length - 1, false]]) {
        const c = p.vertices.push([0, 1, 2].map(k => rings[i].reduce((sum, v) => sum + v[k], 0) / n)) - 1;
        for (let j = 0; j < n; j++) p.triangles.push(flip ? [c, idx(i, j + 1), idx(i, j)] : [c, idx(i, j), idx(i, j + 1)]);
      }
    }
    if (cyclic || caps) {
      const faces = p.triangles.slice(first);
      const volume = faces.reduce((sum, [a, b, c]) => sum + dot(p.vertices[a], cross(p.vertices[b], p.vertices[c])), 0);
      if (volume < 0) for (let f = first; f < p.triangles.length; f++) p.triangles[f].reverse();
    }
    if (!['all', 'ends', 'none'].includes(lines)) throw Error('Loft lines must be all, ends or none');
    rings.forEach((ring, i) => {
      if (lines === 'all' || (lines === 'ends' && (i === 0 || i === rings.length - 1))) polyline(p, ring, {closed: true, role});
    });
    return p;
  }

  const api = {TAU, ROLES, lineRole, isPoint, point3, add, sub, dot, cross, unit, part, line, ringPoints, ring, lathe, helix, knurl, spring, screw, roundedRectangle, extrude, loft, polyline, transform, merge, piece, along, plane, box, circle, sweep, ringAngles, roundedRing};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TechnicalGeometry = api;
})(globalThis);
