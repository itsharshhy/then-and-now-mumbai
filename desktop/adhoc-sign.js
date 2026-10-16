// Ad-hoc signs the finished universal app before the dmg and zip are made. Apple Silicon Macs refuse
// to open unsigned apps ("damaged"); an ad-hoc signature lets them open after "Open Anyway".
// Only the merged universal app is signed: signing the per-arch halves would stop them merging.
const { execFileSync } = require("node:child_process");
const path = require("node:path");

exports.default = async function (context) {
  if (context.electronPlatformName !== "darwin" || !context.appOutDir.endsWith("mac-universal")) return;
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  execFileSync("codesign", ["--force", "--deep", "--sign", "-", app], { stdio: "inherit" });
  execFileSync("codesign", ["--verify", "--deep", "--strict", "--verbose=2", app], { stdio: "inherit" });
};
