import crypto from "node:crypto";

const MASK = (1n << 64n) - 1n;

function rotateLeft(value, amount) {
  const shift = BigInt(amount);
  return ((value << shift) | (value >> (64n - shift))) & MASK;
}

export function deriveState(rootSeedHex, namespace) {
  const key = Buffer.from(rootSeedHex, "hex");
  if (key.length !== 32) throw new Error("Root seed must be exactly 256 bits");
  let attempt = namespace;
  for (let retry = 0; retry < 100; retry += 1) {
    const bytes = crypto.createHmac("sha256", key).update(attempt, "utf8").digest();
    const state = [0, 8, 16, 24].map((offset) => bytes.readBigUInt64BE(offset));
    if (state.some((word) => word !== 0n)) return state;
    attempt = `${namespace}/retry/${retry + 1}`;
  }
  throw new Error("Could not derive a non-zero xoshiro256** state");
}

export function nextUint64(state) {
  const result = (rotateLeft((state[1] * 5n) & MASK, 7) * 9n) & MASK;
  const temporary = (state[1] << 17n) & MASK;
  state[2] ^= state[0];
  state[3] ^= state[1];
  state[1] ^= state[2];
  state[0] ^= state[3];
  state[2] ^= temporary;
  state[3] = rotateLeft(state[3], 45);
  return result;
}

export function sampleInteger(state, upperExclusive) {
  if (!Number.isSafeInteger(upperExclusive) || upperExclusive <= 0) {
    throw new TypeError("upperExclusive must be a positive safe integer");
  }
  const bound = BigInt(upperExclusive);
  const limit = (1n << 64n) - ((1n << 64n) % bound);
  let value;
  do value = nextUint64(state); while (value >= limit);
  return Number(value % bound);
}

export function stateHex(state) {
  return state.map((word) => word.toString(16).padStart(16, "0")).join("");
}
