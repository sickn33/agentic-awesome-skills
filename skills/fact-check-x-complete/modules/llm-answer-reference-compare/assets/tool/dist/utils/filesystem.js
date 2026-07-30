import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
export async function readJsonFile(path) {
    return JSON.parse(await readFile(path, "utf8"));
}
export async function writeJsonFile(path, value) {
    await ensureDir(dirname(path));
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
export async function writeTextFile(path, value) {
    await ensureDir(dirname(path));
    await writeFile(path, value, "utf8");
}
export async function ensureDir(path) {
    await mkdir(path, { recursive: true });
}
