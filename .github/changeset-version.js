// ORIGINALLY FROM CLOUDFLARE WRANGLER:
// https://github.com/cloudflare/wrangler2/blob/main/.github/changeset-version.js

import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// This script is used by the `release.yml` workflow to update the version of the packages being released.
// The standard step is only to run `changeset version` but this does not update the package-lock.json file.
// So we also run `npm install`, which does this update.
// This is a workaround until this is handled automatically by `changeset version`.
// See https://github.com/changesets/changesets/issues/421.

async function run() {
  try {
    // Use execFile instead of exec to prevent command injection
    await execFileAsync("npx", ["changeset", "version"]);
    await execFileAsync("npm", ["install"]);
  } catch (error) {
    console.error("Error running changeset version:", error);
    process.exit(1);
  }
}

run();

