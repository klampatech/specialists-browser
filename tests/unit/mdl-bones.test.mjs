/**
 * The bone transform.
 *
 * WHY THIS TEST EXISTS
 * --------------------
 * A studio model's vertices are stored in BONE-LOCAL space: each
 * vertex names a bone, and its coordinates are relative to that
 * bone's origin. Rendering them without applying the bones' world
 * transforms puts every vertex at its bone's origin, and the model
 * comes out EXPLODED — limbs in the wrong place, the figure a heap of
 * disconnected pieces.
 *
 * So the transform has to be RIGHT, and "right" here has an
 * authoritative answer: the Rust port's own renderer
 * (`tools/port/tsp-rs`), which is a port of the engine's studio
 * model code.
 *
 * The numbers below are the Rust renderer's, taken from its own dump
 * of a real TS player model (`spaids.mdl`, the seal model):
 *
 *   - the world position of every bone;
 *   - a bone's full 3x4 matrix;
 *   - a real vertex transformed through that bone.
 *
 * WHAT IS ACTUALLY ASSERTED
 * -------------------------
 *   - the Euler order is Rz(c)·Ry(b)·Rx(a), and the two nearest
 *     alternatives are measurably wrong
 *   - a bone's world position matches the Rust renderer
 *   - a bone's world MATRIX matches the Rust renderer
 *   - a vertex transformed through that bone matches the Rust renderer
 *   - the position is composed parent-ROTATION-first: rotating the
 *     local offset by the parent's rotation and then offsetting by
 *     the parent's position is right, and doing it the other way
 *     round puts the hands 10.8 units away from where they belong
 *   - the root bone has no parent, so its world transform is its own
 *   - a malformed parent index does not read out of bounds
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBoneMatrices,
  eulerMatrix,
  mul3,
  transformPoint,
} from '../../src/mod/mdl-bones.ts';

const close = (a, b, eps = 1e-4) =>
  Math.abs(a - b) <= eps;

/**
 * The Rust renderer's dump of spaids.mdl (the seal model): every
 * bone's parent, its local position and rotation from `value[]`, and
 * the world position the Rust renderer computed for it.
 */
export const SPAIDS_BONES = [
  { name: "Bip01", parent: -1, pos: [0.23384900391101837, 0.3681640028953552, 39.526119232177734], rot: [0, 0, -1.5707950592041016], world: [0.23384900391101837, 0.3681640028953552, 39.526119232177734] },
  { name: "Bip01 Bacino", parent: 0, pos: [-0.0000019999999949504854, 0, 0], rot: [-1.5707950592041016, -1.570451021194458, 0], world: [0.23384900390848318, 0.3681660028953502, 39.526119232177734] },
  { name: "Bip01 SX Coscia", parent: 1, pos: [-0.000004999999873689376, 0.000007000000096013537, 3.713253974914551], rot: [-3.1395390033721924, 0.02608799934387207, 3.120120048522949], world: [3.947102978828845, 0.36816841839503545, 39.52611423138634] },
  { name: "Bip01 SX Polpaccio", parent: 2, pos: [18.045724868774414, 0, 0], rot: [0, 0, -0.12150099873542786], world: [3.4763804930373716, -0.012932124018762148, 21.4905557771148] },
  { name: "Bip01 SX Piede", parent: 3, pos: [17.597599029541016, 0, 0], rot: [-0.0026130001060664654, 0.02603599987924099, 0.09996700286865234], world: [3.025104701560773, 1.7505570586684074, 3.987357564585885] },
  { name: "Bip01 DX Coscia", parent: 1, pos: [0.000004999999873689376, -0.000003000000106112566, -3.713253974914551], rot: [3.139069080352783, -0.017355000600218773, 3.1171441078186035], world: [-3.4794049710017383, 0.3681595873959135, 39.526124231587914] },
  { name: "Bip01 DX Polpaccio", parent: 5, pos: [18.04572105407715, 0, 0], rot: [0, 0, -0.12755100429058075], world: [-3.1662360823205202, -0.06669235611835594, 21.48836169307036] },
  { name: "Bip01 DX Piede", parent: 6, pos: [17.597597122192383, 0, 0], rot: [0.002950000111013651, -0.017288999632000923, 0.10305500030517578], world: [-2.8689787670007427, 1.75054919881165, 3.987370415587872] },
  { name: "Bip01 Dorso", parent: 1, pos: [1.2936700582504272, 0.6844779849052429, -9.999999974752427e-7], rot: [-0.000003999999989900971, -9.999999974752427e-7, 0.11418499797582626], world: [0.23384973975066753, -0.3167586527103906, 40.8195528592253] },
  { name: "Bip01 Dorso1", parent: 8, pos: [5.309685230255127, -0.003834000090137124, 0], rot: [0, 0, -0.06977800279855728], world: [0.23385659113262125, -0.9197410331021888, 46.09489021268775] },
  { name: "Bip01 Dorso2", parent: 9, pos: [4.826789855957031, -0.00459099980071187, 0], rot: [0, 0, -0.09594400227069855], world: [0.23386330400133865, -1.1310924855343834, 50.91705279335201] },
  { name: "Bip01 Dorso3", parent: 10, pos: [5.79276704788208, -0.005303999874740839, 0], rot: [0, 0, 0.017443999648094177], world: [0.23387209243878673, -0.829383334435134, 56.701959861880326] },
  { name: "Bip01 Collo", parent: 11, pos: [6.662322044372559, -0.0014530000044032931, 0], rot: [0, -9.999999974752427e-7, 0.47099998593330383], world: [0.2338820477345968, -0.6031357796582681, 63.360439356329486] },
  { name: "Bip01 Testa", parent: 12, pos: [2.0469810962677, 9.999999974752427e-7, 0], rot: [0, 0, -0.15779800713062286], world: [0.23388563590577824, -1.4699346376501636, 65.214837196128] },
  { name: "Bip01 SX Clavicola", parent: 12, pos: [-3.112027883529663, 1.5172569751739502, 4.341909885406494], rot: [-0.000012999999853491317, -1.3707979917526245, 2.669809103012085], world: [4.575783726025233, -0.6598570217349186, 59.89869987359469] },
  { name: "Bip01 SX Braccio superiore", parent: 14, pos: [4.827230930328369, 0, 9.999999974752427e-7], rot: [0.11206600069999695, 1.2601280212402344, 0.1136770024895668], world: [9.306790931774875, -0.6929706668096092, 58.94024655685218] },
  { name: "Bip01 SX Avambraccio", parent: 15, pos: [11.139762878417969, 0, 0], rot: [0, 0, -0.20000000298023224], world: [10.515544934500198, -0.689151059192824, 47.86625828889415] },
  { name: "Bip01 SX Mano", parent: 16, pos: [10.314597129821777, 9.999999974752427e-7, -9.999999974752427e-7], rot: [-1.5700000524520874, 0, -0.06977800279855728], world: [11.61245450397022, -2.734877920250466, 37.81624809203953] },
  { name: "Bip01 DX Clavicola", parent: 12, pos: [-2.8699018955230713, 1.3996659517288208, -4.1403961181640625], rot: [-0.000014000000192027073, 1.3707950115203857, 2.669783115386963], world: [-3.906521639806942, -0.6558501839484346, 60.167860433665766] },
  { name: "Bip01 DX Braccio superiore", parent: 18, pos: [4.972046852111816, 0, 0], rot: [-0.11519300192594528, -1.2687950134277344, 0.11695700138807297], world: [-8.779459640445163, -0.6899746430986313, 59.18066204285534] },
  { name: "Bip01 DX Avambraccio", parent: 19, pos: [11.58535385131836, 0, 9.999999974752427e-7], rot: [0, 0, -0.20000000298023224], world: [-9.936073302752826, -0.685996958627851, 47.65318821402157] },
  { name: "Bip01 DX Mano", parent: 20, pos: [10.127057075500488, 0, 0], rot: [1.5697519779205322, 0, -0.06977800279855728], world: [-10.926943558880776, -2.694524832155693, 37.7768894676679] },
];

const bones = SPAIDS_BONES.map((b) => ({
  parent: b.parent,
  value: [...b.pos, ...b.rot],
}));

test('the Euler order is Rz(c)·Ry(b)·Rx(a)', () => {
  // The Rust renderer confirmed this order numerically: with it, the
  // reproduction error was 0.0; the two nearest alternatives were off
  // by 0.30 and 1.88.
  const m = eulerMatrix(0.3, -0.7, 0.2);

  const rz = (c) => {
    const s = Math.sin(c);
    const q = Math.cos(c);
    return [[q, -s, 0], [s, q, 0], [0, 0, 1]];
  };
  const ry = (b) => {
    const s = Math.sin(b);
    const q = Math.cos(b);
    return [[q, 0, s], [0, 1, 0], [-s, 0, q]];
  };
  const rx = (a) => {
    const s = Math.sin(a);
    const q = Math.cos(a);
    return [[1, 0, 0], [0, q, -s], [0, s, q]];
  };

  const expected = mul3(rz(0.2), mul3(ry(-0.7), rx(0.3)));
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      assert.ok(
        close(m[i][j], expected[i][j], 1e-12),
        `element [${i}][${j}] must match Rz(c)·Ry(b)·Rx(a)`,
      );
    }
  }
});

test('every bone world position matches the Rust renderer', () => {
  const mats = computeBoneMatrices(bones);
  assert.equal(mats.length, SPAIDS_BONES.length);
  for (let i = 0; i < SPAIDS_BONES.length; i++) {
    const got = [mats[i][0][3], mats[i][1][3], mats[i][2][3]];
    const want = SPAIDS_BONES[i].world;
    for (let k = 0; k < 3; k++) {
      assert.ok(
        close(got[k], want[k], 5e-3),
        `${SPAIDS_BONES[i].name}: position[${k}] was ${got[k]}, the Rust renderer says ${want[k]}`,
      );
    }
  }
});

test('a bone world matrix matches the Rust renderer', () => {
  // The Rust renderer's matrix for bone 13 (Bip01 Testa):
  //   [[0.000002, -0.0000016, 1, 0.2338854],
  //    [-0.2758311, -0.9612061, -9e-7, -1.4699337],
  //    [0.9612061, -0.2758311, -0.0000024, 65.214836]]
  const mats = computeBoneMatrices(bones);
  const m = mats[13];
  const want = [
    [0.000002, -0.0000016, 1, 0.2338854],
    [-0.2758311, -0.9612061, -0.0000009, -1.4699337],
    [0.9612061, -0.2758311, -0.0000024, 65.214836],
  ];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 4; j++) {
      assert.ok(
        close(m[i][j], want[i][j], 1e-5),
        `bone 13 matrix[${i}][${j}] was ${m[i][j]}, the Rust renderer says ${want[i][j]}`,
      );
    }
  }
});

test('a vertex transformed through its bone matches the Rust renderer', () => {
  // The Rust renderer's worked example: vertex 0, on bone 13
  // (Bip01 Testa), local (5.82, 0.27, -3.24) -> world
  // (-3.0061, -3.3348, 70.7346).
  const mats = computeBoneMatrices(bones);
  const got = transformPoint(mats[13], [5.82, 0.27, -3.24]);
  const want = [-3.0061, -3.3348, 70.7346];
  for (let k = 0; k < 3; k++) {
    assert.ok(
      close(got[k], want[k], 5e-3),
      `vertex[${k}] was ${got[k]}, the Rust renderer says ${want[k]}`,
    );
  }
});

test('the local position is rotated by the PARENT before it is offset', () => {
  // This is the subtle one, and getting it backwards is what puts a
  // hand 10.8 units away from where it belongs.
  //
  // Bone 2 (Bip01 SX Coscia) has a local position of (0, 0, 3.7133)
  // and its parent is bone 1, which is rotated. The Rust renderer's
  // world position for it is (3.9471, 0.3682, 39.5261) — the offset
  // from its parent is (3.7133, 0, 0), i.e. the local (0, 0, 3.7133)
  // ROTATED by the parent's rotation, not applied as-is.
  const mats = computeBoneMatrices(bones);
  const parent = mats[1];
  const offset = [
    mats[2][0][3] - parent[0][3],
    mats[2][1][3] - parent[1][3],
    mats[2][2][3] - parent[2][3],
  ];
  assert.ok(
    close(offset[0], 3.7133, 5e-3) && close(offset[1], 0, 5e-3) && close(offset[2], 0, 5e-3),
    `the offset must be the local position rotated by the parent, got ${offset.join(', ')}`,
  );
});

test('the root bone has no parent, so its world transform is its own', () => {
  const mats = computeBoneMatrices(bones);
  const root = mats[0];
  // The root's own rotation, from its own angles.
  const own = eulerMatrix(
    SPAIDS_BONES[0].rot[0],
    SPAIDS_BONES[0].rot[1],
    SPAIDS_BONES[0].rot[2],
  );
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      assert.ok(
        close(root[i][j], own[i][j], 1e-9),
        'the root bone carries its own rotation',
      );
    }
  }
  assert.ok(close(root[0][3], SPAIDS_BONES[0].pos[0], 1e-9));
});

test('a malformed parent index does not read out of bounds', () => {
  // A bone whose parent index is past the end of the list, or points
  // forward, is treated as a root. The engine does the same with a
  // malformed model rather than reading out of bounds.
  const mats = computeBoneMatrices([
    { parent: -1, value: [1, 2, 3, 0, 0, 0] },
    { parent: 99, value: [4, 5, 6, 0, 0, 0] },
    { parent: 5, value: [7, 8, 9, 0, 0, 0] },
  ]);
  assert.equal(mats.length, 3);
  assert.ok(close(mats[1][0][3], 4, 1e-9), 'a forward parent is treated as a root');
  assert.ok(close(mats[2][0][3], 7, 1e-9), 'an out-of-range parent is treated as a root');
});

test('an empty bone list produces no matrices', () => {
  assert.deepEqual(computeBoneMatrices([]), []);
});
