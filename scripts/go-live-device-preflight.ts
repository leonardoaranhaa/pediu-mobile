import fs from "node:fs";
import path from "node:path";
import appConfig from "../app.config";
import {
  buildDevicePreflightReport,
  summarizeDevicePreflight,
} from "./device-preflight";

const root = process.cwd();
const packageJson = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const easConfigPath = path.join(root, "eas.json");
const easConfig = fs.existsSync(easConfigPath)
  ? (JSON.parse(fs.readFileSync(easConfigPath, "utf8")) as {
      build?: Record<string, unknown>;
    })
  : null;

const checks = buildDevicePreflightReport({
  appConfig,
  packageJson,
  easConfig,
  env: process.env,
});
const summary = summarizeDevicePreflight(checks);

console.log("Go-Live device preflight — Expo/Android/iOS");
for (const check of checks) {
  console.log(`${check.status}: ${check.id} — ${check.message}`);
}
console.log(
  `Summary: PASS=${summary.PASS} BLOCKED=${summary.BLOCKED} NOT_CONFIGURED=${summary.NOT_CONFIGURED}`,
);

if (summary.BLOCKED > 0) process.exitCode = 1;
