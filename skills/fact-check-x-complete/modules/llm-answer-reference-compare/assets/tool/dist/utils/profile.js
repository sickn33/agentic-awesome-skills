import { homedir } from "node:os";
import { join, resolve } from "node:path";

export function profileDirectory(profile) {
    const root = process.env.FACTCHECK_BROWSER_PROFILE_DIR
        ? resolve(process.env.FACTCHECK_BROWSER_PROFILE_DIR)
        : join(homedir(), ".fact-check-x", "browser-profiles");
    return join(root, profile);
}
