const assert = require('node:assert/strict');
const G = require('../assets/geometry.js'), P = require('../assets/projection.js');
const checks = [];
function test(name, fn) {
  fn();
  checks.push(name);
}
function segmentLengths(markup) {
  const lengths = [];
  for (const [, d] of markup.matchAll(/data-line-role="[^"]*" fill="none" d="([^"]*)"/g))
    for (const run of d.split('M').filter(Boolean)) {
      const points = run.split(/[LC]/).map(p => p.trim().split(' ').map(Number).slice(-2));
      for (let i = 1; i < points.length; i++) lengths.push(Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
    }
  return lengths;
}
function meshIsClosed(p) {
  const edges = new Map();
  for (const triangle of p.triangles)
    for (let j = 0; j < 3; j++) {
      const a = triangle[j], b = triangle[(j + 1) % 3];
      assert.ok(a >= 0 && a < p.vertices.length);
      const key = [a, b].sort((a, b) => a - b).join(':');
      edges.set(key, (edges.get(key) || 0) + 1);
    }
  for (const uses of edges.values()) assert.equal(uses, 2, 'Every closed-mesh edge joins exactly two faces');
  for (const point of p.vertices) for (const value of point) assert.ok(Number.isFinite(value));
}
test('Projected circle samples honor plane, radius and chord tolerance', () => {
  const u = G.unit([1, 2, 0]), v = [0, 0, 1], center = [4, 5, 6], radius = 13, tolerance = .006;
  const points = G.ringPoints(center, radius, u, v, {tolerance});
  for (const p of points) {
    const delta = G.sub(p, center);
    assert.ok(Math.abs(Math.hypot(...delta) - radius) < 1e-10);
    assert.ok(Math.abs(G.dot(delta, G.cross(u, v))) < 1e-10);
  }
  for (let i = 1; i < points.length; i++) {
    const middle = points[i].map((n, k) => (n + points[i - 1][k]) / 2);
    assert.ok(radius - Math.hypot(...G.sub(middle, center)) <= tolerance + 1e-10);
  }
  assert.throws(() => G.ringPoints(center, radius, u, u));
});
test('Rounded housing profiles preserve width, height and corner radii', () => {
  const points = G.roundedRectangle(80, 50, 5);
  assert.equal(Math.min(...points.map(p => p[0])), -40);
  assert.equal(Math.max(...points.map(p => p[0])), 40);
  assert.equal(Math.min(...points.map(p => p[1])), -25);
  assert.equal(Math.max(...points.map(p => p[1])), 25);
  const moved = G.roundedRectangle(80, 50, 5, {center: [10, -5]});
  assert.equal(Math.min(...moved.map(p => p[0])), -30);
  assert.equal(Math.max(...moved.map(p => p[1])), 20);
  assert.throws(() => G.roundedRectangle(10, 10, 6));
});
test('Hollow lathes preserve their bore and closed surface connectivity', () => {
  const p = G.part('tube', 'Tube');
  G.lathe(p, [[0, 5], [20, 5], [20, 3], [0, 3]]);
  meshIsClosed(p);
  for (const v of p.vertices) assert.ok(Math.hypot(v[1], v[2]) >= 3 - 1e-10);
  assert.throws(() =>
    G.lathe(p, [[0, -1], [2, 1], [2, 0]])
  );
});
test('Spring wire is closed and fits its radial envelope', () => {
  const p = G.part('spring', 'Spring');
  G.spring(p, {x0: 0, x1: 12, radius: 3, wire: .3, turns: 6});
  meshIsClosed(p);
  for (const v of p.vertices) {
    const r = Math.hypot(v[1], v[2]);
    assert.ok(r >= 2.7 - 1e-8 && r <= 3.3 + 1e-8);
  }
  assert.throws(() => G.spring(p, {x0: 0, x1: 2, radius: 3, wire: .3, turns: 6}));
});
test('Thread pitch and handedness repeat at the same angular phase', () => {
  for (const hand of [-1, 1]) {
    const p = G.part('thread', 'Thread');
    G.helix(p, {x0: 0, x1: 8, radius: 2, pitch: 2, hand});
    const a = p.lines[0].a, b = p.lines[96].a;
    assert.ok(Math.abs(b[0] - a[0] - 2) < 1e-10);
    assert.ok(Math.hypot(b[1] - a[1], b[2] - a[2]) < 1e-10);
    assert.equal(Math.sign(p.lines[0].b[2]), hand);
  }
});
test('Knurl starts and screw proportions produce valid finite geometry', () => {
  const p = G.part('grip', 'Grip');
  G.knurl(p, {x0: 1, x1: 19, radius: 4, starts: 8, pitch: 30});
  assert.equal(p.lines.length, 8 * 2 * Math.ceil((18 / 30) * 96));
  const screw = G.part('screw', 'Screw');
  G.screw(screw, {length: 10, radius: 1.5, headRadius: 3, headHeight: 2});
  meshIsClosed(screw);
  assert.equal(Math.max(...screw.vertices.map(p => p[0])), 12);
  assert.ok(Math.abs(Math.max(...screw.vertices.map(p => Math.hypot(p[1], p[2]))) - 3) < 1e-10);
});
test('Isolation restores edges hidden by another complete solid', () => {
  const back = G.part('back', 'Back', [0, 30, 0]);
  G.lathe(back, [[0, 4], [12, 4], [12, 0], [0, 0]]);
  const front = structuredClone(back);
  front.id = 'front';
  front.name = 'Front';
  front.explosion = [0, 0, 0];
  const offset = [-20 / Math.sqrt(3), -20 / Math.sqrt(3), 20 / Math.sqrt(3)];
  front.vertices = front.vertices.map(p => G.add(p, offset));
  front.lines = front.lines.map(l => ({...l, a: G.add(l.a, offset), b: G.add(l.b, offset)}));
  const frozen = JSON.stringify([back, front]);
  const together = P.render([back, front], {explosion: 0}).markup, isolated = P.render([back, front], {explosion: 0, isolated: 'back'}).markup;
  const hidden = together.match(/data-item="back"[^]*?<\/g>/)[0];
  assert.ok(isolated.length > hidden.length * 2, 'Isolated geometry must restore obscured lines');
  assert.ok(!isolated.includes('data-item="front"'));
  assert.equal(JSON.stringify([back, front]), frozen, 'Projection must not mutate model geometry');
  assert.equal(P.render([back, front], {explosion: 0}).markup, together, 'Zero spacing must be deterministic');
  assert.notEqual(P.render([back, front], {explosion: 1}).markup, together);
});
test('Edge-on cylinder facets retain both long silhouettes at different resolutions', () => {
  for (const segments of [144, 180, 240]) {
    const stem = G.part('stem', 'Upright stem');
    G.lathe(
      stem,
      [[0, 3], [80, 3], [80, 0], [0, 0]],
      {segments}
    );
    const upright = ([x, y, z]) => [y, z, x];
    stem.vertices = stem.vertices.map(upright);
    stem.lines = stem.lines.map(l => ({...l, a: upright(l.a), b: upright(l.b)}));
    const markup = P.render([stem]).markup, lengths = segmentLengths(markup);
    assert.ok(lengths.filter(length => length > 200).length >= 2, `Missing stem outlines with ${segments} segments`);
  }
});
test('Camera angles preserve distances and keep world Z upright at zero roll', () => {
  for (const elevation of [0, 20, 65, 90]) {
    const camera = {azimuth: -125, elevation, roll: 0}, origin = P.project([0, 0, 0], camera), top = P.project([0, 0, 20], camera);
    assert.ok(Math.abs(top[0] - origin[0]) < 1e-10);
    assert.ok(Math.abs(Math.hypot(...top) - 20) < 1e-10);
    const axes = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map(p => P.project(p, camera));
    for (const axis of axes) assert.ok(Math.abs(Math.hypot(...axis) - 1) < 1e-10);
    assert.ok(Math.abs(G.dot(axes[0], axes[1])) < 1e-10);
  }
  assert.throws(() => P.project([0, 0, 0], {elevation: 100}));
});
test('Concave extrusions preserve volume, winding and open notches', () => {
  const profile = [[0, 0], [8, 0], [8, 2], [3, 2], [3, 7], [0, 7]];
  for (const outline of [profile, [...profile].reverse(), [...profile, profile[0]]]) {
    const p = G.part('bracket', 'Bracket');
    G.extrude(p, outline, {depth: 4});
    meshIsClosed(p);
    const volume = p.triangles.reduce((sum, [a, b, c]) => sum + G.dot(p.vertices[a], G.cross(p.vertices[b], p.vertices[c])) / 6, 0);
    assert.ok(Math.abs(volume - 124) < 1e-8, 'Cap triangles must exclude the concave notch');
    for (const face of p.triangles) {
      const c = [0, 1, 2].map(k => face.reduce((s, i) => s + p.vertices[i][k], 0) / 3);
      assert.ok(!(c[0] > 3 + 1e-9 && c[1] > 2 + 1e-9), 'No surface crosses the open notch');
    }
  }
  const invalid = G.part('invalid', 'Invalid');
  assert.throws(() =>
    G.extrude(
      invalid,
      [[0, 0], [4, 4], [0, 4], [4, 0]],
      {depth: 3}
    )
  );
  assert.equal(invalid.vertices.length, 0, 'Rejected contours must leave the part unchanged');
  assert.throws(() => G.extrude(invalid, profile, {depth: 0}));
  const rounded = G.part('rounded', 'Rounded');
  G.extrude(rounded, G.roundedRectangle(20, 10, 5), {depth: 2});
  meshIsClosed(rounded);
});
test('Rigid placement moves every feature and rotates explosion vectors without translation', () => {
  const p = G.part('tube', 'Tube', [5, 0, 0]);
  G.lathe(p, [[0, 3], [12, 3], [12, 2], [0, 2]]);
  const before = structuredClone(p), origin = [10, 20, 30];
  G.transform(p, {origin, xAxis: [0, 0, 1], yAxis: [1, 0, 0], zAxis: [0, 1, 0]});
  assert.deepEqual(p.vertices[0], [before.vertices[0][1] + 10, before.vertices[0][2] + 20, before.vertices[0][0] + 30]);
  assert.deepEqual(p.explosion, [0, 0, 5]);
  assert.ok(
    Math.abs(Math.hypot(...G.sub(p.lines[0].a, p.lines[0].b)) - Math.hypot(...G.sub(before.lines[0].a, before.lines[0].b))) < 1e-10
  );
  assert.throws(() => G.transform(p, {zAxis: [0, 0, -1]}), 'Reflections must not silently invert surface winding');
});
test('Paper anchors agree with rendered bounds after camera and explosion changes', () => {
  const p = G.part('block', 'Block', [30, -10, 5]);
  G.extrude(
    p,
    [[0, 0], [8, 0], [8, 12], [0, 12]],
    {depth: 4}
  );
  for (const explosion of [0, .7, 1.5]) {
    const camera = {azimuth: -65, elevation: 22, roll: 0}, result = P.render([p], {explosion, camera});
    const points = p.vertices.map(v =>
      P.project(
        G.add(
          v,
          p.explosion.map(n => n * explosion)
        ),
        camera
      )
        .slice(0, 2)
        .map((n, i) => n * result.scale + result.offset[i])
    );
    for (const [k, axis, size] of [[0, 'x', 'width'], [1, 'y', 'height']]) {
      assert.ok(Math.abs(Math.min(...points.map(p => p[k])) - result.bounds[axis]) < 1e-9);
      assert.ok(Math.abs(Math.max(...points.map(p => p[k])) - result.bounds[axis] - result.bounds[size]) < 1e-9);
    }
  }
});
test('Missing or invalid geometry fails before producing a blank NaN drawing', () => {
  assert.throws(() => P.render([G.part('empty', 'Empty')]), /finite vertices/);
  const p = G.part('broken', 'Broken');
  p.vertices.push([0, 0, 0], [NaN, 1, 2]);
  assert.throws(() => P.render([p]), /three finite coordinates/);
});
test('Small spring silhouettes are identical in millimeters and meters', () => {
  const drawings = [1, .001].map(scale => {
    const p = G.part('spring', 'Miniature spring');
    G.spring(p, {x0: 0, x1: 1.2 * scale, radius: .3 * scale, wire: .03 * scale, turns: 6});
    return P.render([p], {explosion: 0}).markup;
  });
  assert.equal(drawings[0], drawings[1], 'Changing model units must not erase small faces');
});
test('Submesh composition preserves indices, features and the complete part identity', () => {
  const target = G.part('assembly-piece', 'One fabricated part', [0, 0, 20]), source = G.part('piece', 'Construction piece');
  const square = [[0, 0], [4, 0], [4, 4], [0, 4]];
  G.extrude(target, square, {depth: 2});
  G.extrude(source, square, {depth: 2});
  G.transform(source, {origin: [6, 0, 0]});
  const sourceBefore = JSON.stringify(source), count = target.vertices.length;
  G.merge(target, source);
  meshIsClosed(target);
  assert.equal(target.vertices.length, count + source.vertices.length);
  assert.deepEqual(target.explosion, [0, 0, 20]);
  assert.equal(target.id, 'assembly-piece');
  assert.equal(JSON.stringify(source), sourceBefore, 'Merging must leave reusable source geometry unchanged');
  const targetBefore = JSON.stringify(target);
  G.transform(source, {origin: [100, 0, 0]});
  assert.equal(JSON.stringify(target), targetBefore, 'Merged features must not alias their source');
  const moving = G.part('moving', 'Moving piece', [1, 0, 0]);
  assert.throws(() => G.merge(target, moving), /zero explosion/);
  assert.throws(() => G.merge(target, target), /itself/);
});
test('Lofts close and face outward whichever way their rings run', () => {
  const square = (h, z) => [[h, -h, z], [h, h, z], [-h, h, z], [-h, -h, z]];
  const volume = p => p.triangles.reduce((sum, [a, b, c]) => sum + G.dot(p.vertices[a], G.cross(p.vertices[b], p.vertices[c])), 0) / 6;
  for (const rings of [
    [square(2, 0), square(1, 3)],
    [square(1, 3), square(2, 0)],
    [square(2, 0), square(1, 3)].map(r => [...r].reverse())
  ]) {
    const p = G.part('frustum', 'Frustum');
    G.loft(p, rings);
    meshIsClosed(p);
    assert.ok(volume(p) > 0, 'Closed lofts wind toward their outside');
  }
  const ring = G.part('ring', 'Square ring');
  G.loft(ring, [square(3, 0), square(3, 1), square(2, 1), square(2, 0)], {cyclic: true});
  meshIsClosed(ring);
  assert.ok(volume(ring) > 0);
  assert.throws(() => G.loft(ring, [square(1, 0), square(1, 1).slice(1)]), /equal point counts/);
});
test('Lathes reject crossing profiles and can skip rings on smooth curves', () => {
  assert.throws(
    () =>
      G.lathe(G.part('cell', 'Cell'), [[0, 20], [10, 20], [10, 22], [5, 19], [0, 22]]),
    /intersect/
  );
  const arc = Array.from({length: 13}, (_, i) => {
    const t = ((Math.PI / 2) * i) / 12;
    return [6 * Math.sin(t), 6 * Math.cos(t) + .001];
  });
  const dome = G.part('dome', 'Dome');
  G.lathe(dome, [[0, 0], ...arc.map(([x, r]) => [x, r]), [6, 0]], {creaseAngle: 20});
  const all = G.part('dome', 'Dome');
  G.lathe(all, [[0, 0], ...arc, [6, 0]]);
  assert.ok(dome.lines.length < all.lines.length / 3, 'Smooth profile vertices must not add rings');
  const loft = G.part('band', 'Band'), square = (h, z) => [[h, -h, z], [h, h, z], [-h, h, z], [-h, -h, z]];
  G.loft(loft, [square(2, 0), square(2, 1), square(2, 2)], {lines: 'ends'});
  assert.equal(loft.lines.length, 8);
});
test('Trails follow part explosions, hide behind solids and stay out of part groups', () => {
  const base = G.part('base', 'Base'), cap = G.part('cap', 'Cap', [0, 0, 30]), square = [[-5, -5], [5, -5], [5, 5], [-5, 5]];
  G.extrude(base, square, {depth: 4});
  G.extrude(cap, square, {depth: 2});
  G.transform(cap, {origin: [0, 0, 4]});
  const trails = [
    {a: [0, 0, -10], b: [0, 0, 4], to: 'base'},
    {a: [0, 0, 6], b: [0, 0, 6], from: 'cap', to: 'base'}
  ];
  const camera = {azimuth: -120, elevation: 30, roll: 0}, exploded = P.render([base, cap], {camera, trails}).markup;
  const group = exploded.match(/<g data-trails="">([\s\S]*?)<\/g>/);
  assert.ok(group, 'Trails render in their own group');
  assert.ok(!group[0].includes('data-item') && group[0].includes('data-line-role="axis"'));
  assert.ok(!P.render([base, cap], {camera, trails, isolated: 'cap'}).markup.includes('data-trails'), 'Isolated parts omit trails');
  assert.throws(() => P.render([base, cap], {trails: [{a: [0, 0, 0], b: [0, 0, 1], to: 'lid'}]}), /unknown part/);
  const steady = P.render([base, cap], {camera, explosion: .5, fitExplosion: 1}).scale, loose = P.render([base, cap], {camera, explosion: .5}).scale, full = P.render([base, cap], {camera, explosion: 1}).scale;
  assert.ok(Math.abs(steady - full) < 1e-9 && loose > steady, 'Fitting to the widest spacing keeps the scale steady');
  const broken = G.part('broken', 'Broken');
  broken.vertices = [[0, 0, 0], [1, 0, 0]];
  broken.triangles = [[0, 1, 2]];
  assert.throws(() => P.render([broken]), /missing vertex/);
});
test('Rounded rings share sample angles so differently sized shells loft cleanly', () => {
  const angles = G.ringAngles(60, 40, 8), outer = G.roundedRing(60, 40, 8, {angles}), inner = G.roundedRing(56, 36, 6, {z: 0, angles});
  assert.equal(outer.length, inner.length);
  assert.ok(Math.abs(Math.max(...outer.map(p => p[0])) - 30) < 1e-6 && Math.abs(Math.max(...outer.map(p => p[1])) - 20) < 1e-6);
  const shell = G.part('shell', 'Shell'), at = (ring, z) => ring.map(([x, y]) => [x, y, z]);
  G.loft(shell, [at(inner, 0), at(outer, 0), at(outer, 10), at(inner, 10)], {cyclic: true});
  meshIsClosed(shell);
  const block = G.part('block', 'Block');
  G.box(block, [0, 0, 0], [10, 6, 3], {radius: 1});
  meshIsClosed(block);
  assert.equal(Math.max(...block.vertices.map(v => v[0])), 10);
  assert.equal(Math.max(...block.vertices.map(v => v[2])), 3);
  const pin = G.transform(
    G.lathe(G.piece(), [[0, 0], [0, 1], [8, 1], [8, 0]]),
    {origin: [0, 0, 2], ...G.along('z')}
  );
  assert.ok(Math.abs(Math.max(...pin.vertices.map(v => v[2])) - 10) < 1e-9, 'along(z) turns lathe X onto world Z');
  for (const axis of ['x', 'y', 'z']) G.transform(G.piece(), G.along(axis));
  for (const name of ['xy', 'xz', 'yz']) G.transform(G.piece(), G.plane(name));
  const wall = G.transform(
    G.extrude(
      G.piece(),
      [[0, 0], [10, 0], [10, 5], [0, 5]],
      {depth: 1}
    ),
    G.plane('xz')
  );
  assert.ok(
    Math.abs(Math.max(...wall.vertices.map(v => v[2])) - 5) < 1e-9 && Math.min(...wall.vertices.map(v => v[1])) === -1,
    'xz lays a profile upright with depth toward -y'
  );
});
test('Open skins keep their rim, glass hides nothing and line-only parts still fit the page', () => {
  const camera = {azimuth: -120, elevation: 30, roll: 0};
  const skin = G.part('skin', 'Skin');
  skin.vertices = [[0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0]];
  skin.triangles = [[0, 1, 2], [0, 2, 3]];
  assert.ok(segmentLengths(P.render([skin], {camera}).markup).reduce((a, b) => a + b, 0) > 100, 'A free edge draws as an outline');
  const dial = G.part('dial', 'Dial');
  G.box(dial, [-5, -5, 0], [5, 5, 1]);
  const glass = G.part('glass', 'Crystal');
  G.box(glass, [-12, -12, 2], [12, 12, 3]);
  const covered = P.render([dial, glass], {camera, explosion: 0}).markup.match(/data-item="dial"[\s\S]*?<\/g>/)[0];
  glass.transparent = true;
  const seen = P.render([dial, glass], {camera, explosion: 0}).markup.match(/data-item="dial"[\s\S]*?<\/g>/)[0];
  assert.ok(
    segmentLengths(seen).reduce((a, b) => a + b, 0) > segmentLengths(covered).reduce((a, b) => a + b, 0) * 2,
    'Transparent parts do not hide what is behind them'
  );
  const mark = G.part('mark', 'Mark');
  G.circle(mark, [0, 0, 0], 4, [0, 1, 0]);
  assert.ok(mark.lines.every(l => Math.abs(l.a[1]) < 1e-9));
  assert.ok(P.render([mark], {camera}).markup.includes('data-item="mark"'));
});
test('Lathe points on the axis do not draw radial outlines', () => {
  const disc = G.part('disc', 'Disc');
  G.lathe(disc, [[0, 0], [0, 5], [1, 5], [1, 0]]);
  G.transform(disc, G.along('z'));
  const {markup} = P.render([disc], {camera: {azimuth: -90, elevation: 90, roll: 0}}), points = [...markup.matchAll(/([-\d.]+) ([-\d.]+)/g)].map(m => [+m[1], +m[2]]);
  assert.ok(points.length > 100, 'Straight plan views keep the visible rim');
  assert.ok(
    points.every(([x, y]) => Math.hypot(x - 210, y - 148.5) > 50),
    'No ink reaches the centre of a solid disc seen face on'
  );
});
test('Lathes turn onto other axes and sweeps close into tubes and rings', () => {
  const disc = G.part('disc', 'Disc');
  G.lathe(
    disc,
    [[0, 0], [0, 5], [2, 5], [2, 0]],
    {axis: 'z', at: [1, 2, 3]}
  );
  meshIsClosed(disc);
  assert.ok(
    Math.abs(Math.max(...disc.vertices.map(v => v[2])) - 5) < 1e-9 && Math.abs(Math.max(...disc.vertices.map(v => v[0])) - 6) < 1e-6
  );
  const section = Array.from({length: 12}, (_, i) => [Math.cos((i * Math.PI) / 6), Math.sin((i * Math.PI) / 6)]);
  const handle = G.part('handle', 'Handle');
  G.sweep(
    handle,
    [[0, 0, 0], [10, 0, 0], [14, 0, 4], [14, 0, 20]],
    section
  );
  meshIsClosed(handle);
  const ring = G.part('ring', 'Key ring');
  G.sweep(
    ring,
    Array.from({length: 48}, (_, i) => [10 * Math.cos((i * Math.PI) / 24), 10 * Math.sin((i * Math.PI) / 24), 0]),
    section,
    {closed: true}
  );
  meshIsClosed(ring);
  for (const v of ring.vertices)
    assert.ok(Math.abs(Math.hypot(Math.hypot(v[0], v[1]) - 10, v[2]) - 1) < 1e-6, 'A closed sweep keeps its tube radius');
});
test('Extrusions cut real holes that stay open through the part', () => {
  const disc = (cx, cy, r, n = 24) =>
    Array.from({length: n}, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)]);
  const lever = G.part('lever', 'Lever');
  G.extrude(
    lever,
    [[0, -4], [40, -4], [40, 4], [0, 4]],
    {depth: 2, holes: [disc(6, 0, 2), disc(34, 0, 1.5, 16)]}
  );
  meshIsClosed(lever);
  const volume =
    lever.triangles.reduce((sum, [a, b, c]) => sum + G.dot(lever.vertices[a], G.cross(lever.vertices[b], lever.vertices[c])), 0) / 6;
  const expected = (320 - Math.PI * 4 * .98 - Math.PI * 2.25 * .97) * 2;
  assert.ok(Math.abs(volume - expected) < 1.5, `Volume ${volume} should drop by the holes`);
  const plain = G.part('lever', 'Lever');
  G.extrude(
    plain,
    [[0, -4], [40, -4], [40, 4], [0, 4]],
    {depth: 2}
  );
  const ink = part => segmentLengths(P.render([part], {camera: {azimuth: -90, elevation: 90, roll: 0}}).markup).reduce((a, b) => a + b, 0);
  assert.ok(ink(lever) > ink(plain) * 1.15, 'Hole rims draw in a plan view');
  assert.throws(
    () =>
      G.extrude(
        G.part('bad', 'Bad'),
        [[0, 0], [4, 0], [4, 4], [0, 4]],
        {depth: 1, holes: [disc(10, 10, 1)]}
      ),
    /inside the profile/
  );
  const rear = G.ringPoints([10, 14, 0], 6, [1, 0, 0], [0, 1, 0], {start: Math.PI / 2, end: Math.PI}).map(([x, y]) => [x, y]);
  for (const count of [12, 24, 48, 96]) {
    const wall = G.part('wall', 'Wall');
    G.extrude(wall, [[4, 11], [120, 11], [120, 20], ...rear], {depth: .8, holes: [disc(10, 14, 1.6, count).map(([x, y]) => [x, y])]});
    meshIsClosed(wall);
  }
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < 40; k++) {
    const w = 20 + random() * 60, h = 10 + random() * 30, r = (Math.min(w, h) / 2) * random(), count = 8 + Math.floor(random() * 40);
    const holes = [0, 1]
      .map(() => disc((random() - .5) * (w - 12), (random() - .5) * (h - 12), 1 + random() * 2, count))
      .filter((c, i, all) => i === 0 || Math.hypot(c[0][0] - all[0][0][0], c[0][1] - all[0][0][1]) > 8);
    const plate = G.part('plate', 'Plate');
    G.extrude(plate, G.roundedRectangle(w, h, r), {depth: 1, holes});
    meshIsClosed(plate);
  }
});
test('Closed sweeps meet without a twist on a three-dimensional loop and screws take defaults', () => {
  const path = Array.from({length: 180}, (_, i) => {
    const t = (i * 2 * Math.PI) / 180;
    return [Math.sin(t) + 2 * Math.sin(2 * t), Math.cos(t) - 2 * Math.cos(2 * t), -Math.sin(3 * t)].map(n => n * 10);
  });
  const square = [[-1, -1], [1, -1], [1, 1], [-1, 1]], knot = G.part('knot', 'Knot');
  G.sweep(knot, path, square, {closed: true});
  meshIsClosed(knot);
  const ring = i => knot.vertices.slice(i * 4, i * 4 + 4), turnBetween = (a, b) => Math.max(...a.map((v, k) => Math.hypot(...G.sub(v, b[k]))));
  const seam = turnBetween(ring(179), ring(0)), step = turnBetween(ring(0), ring(1));
  assert.ok(seam < step * 1.2, 'The seam band twists no more than its neighbours');
  meshIsClosed(G.screw(G.part('screw', 'Screw')));
});
test('Sweeps keep their section through right-angle turns', () => {
  const square = [[-1, -1], [1, -1], [1, 1], [-1, 1]], frame = G.part('frame', 'Frame');
  G.sweep(frame, [[0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0]], square, {closed: true});
  meshIsClosed(frame);
  for (let r = 0; r < 4; r++) {
    const ring = frame.vertices.slice(r * 4, r * 4 + 4);
    for (let k = 0; k < 4; k++) assert.ok(Math.abs(Math.hypot(...G.sub(ring[k], ring[(k + 1) % 4])) - 2) < 1e-9, 'Every ring keeps the section side');
  }
});
test('Feature lines own their endpoints and part IDs are strings', () => {
  const p = G.part(7, 'Plate');
  assert.equal(p.id, '7');
  assert.throws(() => G.part(undefined, 'Unnamed'), /stable ID/);
  G.extrude(p, [[0, 0], [4, 0], [4, 4], [0, 4]], {depth: 1});
  const before = JSON.stringify(p.lines);
  p.vertices[0][0] = 99;
  assert.equal(JSON.stringify(p.lines), before, 'Editing a vertex must not move feature lines');
  const nut = G.part('nut', 'Nut');
  G.ring(nut, 2, 5, {role: 'detail', hex: true});
  assert.ok(nut.lines.every(l => l.role === 'detail'));
  const radii = nut.lines.map(l => Math.hypot(l.a[1], l.a[2]));
  assert.ok(Math.abs(Math.max(...radii) - 5) < 1e-9 && Math.abs(Math.min(...radii) - 5 * Math.cos(Math.PI / 6)) < 1e-9, 'A hex ring has flats');
});
test('Fills cover each part once, behind its ink and in depth order', () => {
  const camera = {azimuth: -120, elevation: 30, roll: 0};
  const back = G.part('back', 'Back block');
  G.box(back, [0, 0, 0], [20, 20, 5]);
  const front = G.part('front', 'Front block');
  G.box(front, [5, 5, 10], [15, 15, 15]);
  const hidden = G.part('hidden', 'Hidden core');
  G.box(hidden, [8, 8, 1], [12, 12, 4]);
  const tube = G.part('tube', 'Inward-wound tube');
  G.lathe(tube, [[0, 3], [5, 3], [5, 1.25], [0, 1.25]]);
  G.transform(tube, {origin: [30, 10, 0], ...G.along('z')});
  const parts = [back, front, hidden, tube];
  assert.ok(!P.render(parts, {camera}).markup.includes('data-fills'), 'Fills are drawn only on request');
  const {markup} = P.render(parts, {camera, fill: true});
  assert.ok(markup.indexOf('data-fills') < markup.indexOf('data-item'), 'Fills sit behind every part');
  const fills = [...markup.matchAll(/data-fill="([^"]*)" data-covers="([^"]*)"/g)].map(m => ({id: m[1], covers: m[2].split(' ').filter(Boolean)}));
  assert.deepEqual(fills.map(f => f.id).sort(), ['back', 'front', 'tube'], 'A fully hidden part draws no fill');
  assert.ok(fills.find(f => f.id === 'front').covers.includes('back'), 'A nearer part records the parts it paints over');
  assert.ok(fills.findIndex(f => f.id === 'back') < fills.findIndex(f => f.id === 'front'), 'Farther fills paint first');
  const area = id => {
    const d = markup.match(new RegExp(`data-fill="${id}"[^>]* d="([^"]*)"`))[1];
    return d.split('M').filter(Boolean).reduce((sum, loop) => {
      const p = loop.replace('Z', '').split('L').map(q => q.split(' ').map(Number));
      return sum + p.reduce((s, q, i) => s + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0) / 2;
    }, 0);
  };
  assert.ok(area('tube') > 1, 'An inward-wound closed shell still fills its silhouette');
});
test('Annotations label each visible part beside the drawing', () => {
  const camera = {azimuth: -120, elevation: 30, roll: 0};
  const base = G.part('base', 'Base plate');
  G.box(base, [0, 0, 0], [20, 20, 2]);
  const cap = G.part('cap', 'Cap', [0, 0, 20]);
  G.box(cap, [5, 5, 2.1], [15, 15, 6]);
  assert.ok(!P.render([base, cap], {camera}).markup.includes('data-annotations'), 'Labels are drawn only on request');
  const {markup, bounds} = P.render([base, cap], {camera, annotate: true});
  const labels = [...markup.matchAll(/<path[^>]* d="M([-\d.]+) [-\d.]+L[^"]*"\/>.*?<text[^>]* x="([^"]*)"[^>]*text-anchor="(\w+)"[^>]*>([^<]*)<\/text>/g)];
  assert.deepEqual(labels.map(m => m[4]).sort(), ['BASE PLATE', 'CAP'], 'Labels are the part names in capitals');
  assert.ok(labels.every(([, anchor, x, side]) => side === 'start' ? +x > +anchor : +x < +anchor), 'Labels sit beside their part, away from the drawing');
  const capLabel = labels.find(m => m[4] === 'CAP');
  assert.ok(+capLabel[2] > bounds.x && +capLabel[2] < bounds.x + bounds.width, 'A label hugs the drawing at its own height instead of the widest part');
  assert.ok(bounds.x >= 78 - 1e-6, 'The drawing leaves room for labels');
});
console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
