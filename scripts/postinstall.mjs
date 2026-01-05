// scripts/postinstall.mjs
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  console.log('Installing frontend dependencies and building frontend...');
  
  // Navigate to frontend and run npm install & build
  execSync('npm install', { stdio: 'inherit', cwd: join(__dirname, '../frontend') });
  execSync('npm run build', { stdio: 'inherit', cwd: join(__dirname, '../frontend') });

  console.log('Frontend installed and built successfully!');
} catch (err) {
  console.error('❌ Postinstall script failed:', err.message);
  process.exit(1); // Exit with error code so npm knows
}
