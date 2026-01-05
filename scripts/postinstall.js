// scripts/postinstall.js
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  console.log("🌟 Installing frontend dependencies...");
  execSync("npm install", { stdio: "inherit", cwd: path.join(__dirname, "../frontend") });

  console.log("🌟 Building frontend...");
  execSync("npm run build", { stdio: "inherit", cwd: path.join(__dirname, "../frontend") });

  console.log("✅ Frontend install & build complete!");
} catch (err) {
  console.error("❌ Postinstall script failed:", err);
  process.exit(1);
}
