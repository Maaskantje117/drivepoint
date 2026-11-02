import { execFileSync } from 'node:child_process';

export default function globalTeardown() {
  if (process.platform !== 'win32') return;

  try {
    const netstat = execFileSync('netstat', ['-ano', '-p', 'tcp'], { encoding: 'utf8' });
    const match = netstat.match(/TCP\s+127\.0\.0\.1:4178\s+\S+\s+LISTENING\s+(\d+)/i);
    if (match) {
      execFileSync('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Stop-Process -Id ${match[1]} -Force -ErrorAction SilentlyContinue`,
      ], { stdio: 'ignore' });
    }
  } catch {
    // The server may already be stopped by Playwright.
  }
}
