import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Load .env variables manually
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      process.env[key.trim()] = value;
    }
  }
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ Error: DATABASE_URL not found in .env file.');
  process.exit(1);
}

// Ensure backups directory exists
const backupsDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

// Generate file name: backup_YYYY-MM-DD_HH-mm.sql
const now = new Date();
const pad = (n: number) => n.toString().padStart(2, '0');
const year = now.getFullYear();
const month = pad(now.getMonth() + 1);
const day = pad(now.getDate());
const hours = pad(now.getHours());
const minutes = pad(now.getMinutes());
const fileName = `backup_${year}-${month}-${day}_${hours}-${minutes}.sql`;
const outputPath = path.join(backupsDir, fileName);

// Find pg_dump executable
let pgDumpPath = 'pg_dump';

// On Windows, check standard PostgreSQL installation directories
if (process.platform === 'win32') {
  const pgCommonDir = 'C:\\Program Files\\PostgreSQL';
  if (fs.existsSync(pgCommonDir)) {
    const versions = fs.readdirSync(pgCommonDir);
    // Sort versions to try the highest/latest one first
    versions.sort((a, b) => parseFloat(b) - parseFloat(a));
    for (const version of versions) {
      const candidatePath = path.join(pgCommonDir, version, 'bin', 'pg_dump.exe');
      if (fs.existsSync(candidatePath)) {
        pgDumpPath = `"${candidatePath}"`;
        break;
      }
    }
  }
}

console.log(`[Backup] Starting backup to: ${outputPath}`);
console.log(`[Backup] Using pg_dump executable: ${pgDumpPath}`);

try {
  // Run pg_dump to produce plain SQL text, with drop table statements (--clean), and without owner/privilege changes
  const command = `${pgDumpPath} --dbname="${dbUrl}" --clean --no-owner --no-privileges --file="${outputPath}"`;
  execSync(command, { stdio: 'inherit' });
  console.log(`✅ [Backup] Backup generated successfully: ${fileName}`);
} catch (error) {
  console.error('❌ [Backup] Error: Failed to generate database backup.');
  console.error(error);
  process.exit(1);
}
