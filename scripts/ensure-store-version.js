/**
 * App Store Connect closes a version train once that version is released.
 * A later build with the same marketing version fails with:
 *   Invalid Pre-Release Train. The train version 'x.y.z' is closed
 *
 * Before a store build, compare app.json with the live App Store version.
 * If this build is not strictly newer, bump the patch version.
 */
const fs = require("fs");
const https = require("https");
const path = require("path");

const root = path.join(__dirname, "..");
const appJsonPath = path.join(root, "app.json");
const pkgPath = path.join(root, "package.json");
const lockPath = path.join(root, "package-lock.json");
const bundleId = "ch.valmia.app";

function parse(version) {
  return String(version)
    .split(".")
    .map((part) => parseInt(part, 10) || 0);
}

function cmp(a, b) {
  const left = parse(a);
  const right = parse(b);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function nextAbove(current, live) {
  if (cmp(current, live) > 0) return current;
  const parts = parse(live);
  while (parts.length < 3) parts.push(0);
  parts[2] += 1;
  return parts.join(".");
}

function lookupLiveVersion() {
  return new Promise((resolve) => {
    const req = https.get(
      `https://itunes.apple.com/lookup?bundleId=${bundleId}`,
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          try {
            const json = JSON.parse(body);
            resolve(json.results?.[0]?.version || null);
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.setTimeout(8000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

function writeVersion(next) {
  const app = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
  app.expo.version = next;
  fs.writeFileSync(appJsonPath, JSON.stringify(app, null, 2) + "\n");

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.version = next;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  if (fs.existsSync(lockPath)) {
    const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    lock.version = next;
    if (lock.packages && lock.packages[""]) lock.packages[""].version = next;
    fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");
  }
}

async function main() {
  const app = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
  const current = app.expo.version;
  const live = await lookupLiveVersion();

  if (!live) {
    console.log(`App Store version check skipped (lookup failed). Keeping ${current}.`);
    return;
  }

  if (cmp(current, live) > 0) {
    console.log(`App version ${current} is newer than the live App Store version ${live}.`);
    return;
  }

  const next = nextAbove(current, live);
  writeVersion(next);
  console.log(
    `App Store version ${live} is closed for new builds of ${current}. Bumped marketing version to ${next}.`
  );
}

main();
