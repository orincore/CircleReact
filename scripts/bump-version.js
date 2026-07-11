#!/usr/bin/env node
/**
 * Bumps the app version across every file the App Store / Play Store build
 * pipeline reads it from, in one shot.
 *
 * Source of truth: app.json (expo.version / expo.ios.buildNumber / expo.android.versionCode).
 *
 * Usage:
 *   node scripts/bump-version.js [patch|minor|major] [--dry-run]
 *   node scripts/bump-version.js --set=2.3.0
 *
 * Defaults to a patch bump. Always increments the iOS build number and the
 * Android version code by 1, regardless of which semver part changes.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY_RUN = process.argv.includes("--dry-run");

const args = process.argv.slice(2).filter((a) => a !== "--dry-run");
const setArg = args.find((a) => a.startsWith("--set="));
const bumpType = setArg ? null : args.find((a) => ["patch", "minor", "major"].includes(a)) || "patch";

function bumpSemver(version, type) {
  const parts = version.split(".").map(Number);
  while (parts.length < 3) parts.push(0);
  let [major, minor, patch] = parts;

  if (type === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (type === "minor") {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  return `${major}.${minor}.${patch}`;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  const content = JSON.stringify(data, null, 2) + "\n";
  if (DRY_RUN) return;
  fs.writeFileSync(filePath, content);
}

function replaceInFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) {
    return { skipped: true };
  }
  let content = fs.readFileSync(filePath, "utf8");
  for (const { pattern, replacement } of replacements) {
    content = content.replace(pattern, replacement);
  }
  if (!DRY_RUN) fs.writeFileSync(filePath, content);
  return { skipped: false };
}

// --- 1. app.json is the source of truth ---
const appJsonPath = path.join(ROOT, "app.json");
const appJson = readJson(appJsonPath);
const expo = appJson.expo;

const currentVersion = expo.version;
const currentBuildNumber = parseInt(expo.ios.buildNumber, 10);
const currentVersionCode = expo.android.versionCode;

const newVersion = setArg ? setArg.split("=")[1] : bumpSemver(currentVersion, bumpType);
const newBuildNumber = String(currentBuildNumber + 1);
const newVersionCode = currentVersionCode + 1;

expo.version = newVersion;
expo.ios.buildNumber = newBuildNumber;
expo.android.versionCode = newVersionCode;
if (expo.runtimeVersion && typeof expo.runtimeVersion === "string") {
  expo.runtimeVersion = newVersion;
}

writeJson(appJsonPath, appJson);

// --- 2. package.json ---
const packageJsonPath = path.join(ROOT, "package.json");
const packageJson = readJson(packageJsonPath);
packageJson.version = newVersion;
writeJson(packageJsonPath, packageJson);

// --- 3. Android: android/app/build.gradle ---
const gradlePath = path.join(ROOT, "android", "app", "build.gradle");
const gradleResult = replaceInFile(gradlePath, [
  {
    pattern: /versionCode\s+\d+/,
    replacement: `versionCode ${newVersionCode}`,
  },
  {
    pattern: /versionName\s+"[^"]*"/,
    replacement: `versionName "${newVersion}"`,
  },
]);

// --- 4. iOS: project.pbxproj + Info.plist (gitignored / prebuild output, may not exist locally) ---
const pbxprojPath = path.join(ROOT, "ios", "Circle.xcodeproj", "project.pbxproj");
const pbxprojResult = replaceInFile(pbxprojPath, [
  {
    pattern: /CURRENT_PROJECT_VERSION = \d+;/g,
    replacement: `CURRENT_PROJECT_VERSION = ${newBuildNumber};`,
  },
  {
    pattern: /MARKETING_VERSION = [^;]+;/g,
    replacement: `MARKETING_VERSION = ${newVersion};`,
  },
]);

const infoPlistPath = path.join(ROOT, "ios", "Circle", "Info.plist");
const infoPlistResult = replaceInFile(infoPlistPath, [
  {
    pattern: /(<key>CFBundleShortVersionString<\/key>\s*\n\s*<string>)[^<]*(<\/string>)/,
    replacement: `$1${newVersion}$2`,
  },
  {
    pattern: /(<key>CFBundleVersion<\/key>\s*\n\s*<string>)[^<]*(<\/string>)/,
    replacement: `$1${newBuildNumber}$2`,
  },
]);

// --- Summary ---
const prefix = DRY_RUN ? "[dry-run] " : "";
console.log(`${prefix}Version bump: ${currentVersion} -> ${newVersion}`);
console.log(`${prefix}iOS buildNumber: ${currentBuildNumber} -> ${newBuildNumber}`);
console.log(`${prefix}Android versionCode: ${currentVersionCode} -> ${newVersionCode}`);
console.log("");
console.log(`${prefix}Updated app.json (version, ios.buildNumber, android.versionCode, runtimeVersion)`);
console.log(`${prefix}Updated package.json (version)`);
console.log(
  `${prefix}${gradleResult.skipped ? "Skipped (not found): " : "Updated: "}android/app/build.gradle`
);
console.log(
  `${prefix}${pbxprojResult.skipped ? "Skipped (not found, run expo prebuild first): " : "Updated: "}ios/Circle.xcodeproj/project.pbxproj`
);
console.log(
  `${prefix}${infoPlistResult.skipped ? "Skipped (not found, run expo prebuild first): " : "Updated: "}ios/Circle/Info.plist`
);

if (pbxprojResult.skipped || infoPlistResult.skipped) {
  console.log("");
  console.log(
    "Note: ios/ is gitignored and only exists after `expo prebuild` / `expo run:ios`. Re-run this script (or just re-run prebuild) once that folder exists if you need the native iOS project files in sync too."
  );
}
