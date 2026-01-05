// scripts/postinstall.js
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  console.log('Installing frontend dependencies...');
  execSync('npm install', { cwd: path.join(__dirname, '../frontend'), stdio: 'inherit', shell: true });

  console.log('Building frontend...');
  execSync('npm run build', { cwd: path.join(__dirname, '../frontend'), stdio: 'inherit', shell: true });

  console.log('Postinstall completed successfully!');
} catch (err) {
  console.error('❌ Postinstall script failed:', err);
  process.exit(1);
}
