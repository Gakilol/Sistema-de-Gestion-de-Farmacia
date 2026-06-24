/**
 * Nicaraguan phone operator prefix configuration.
 * Uses eval("require") to bypass Next.js browser bundler static analysis.
 */

export function getAllowedPrefixes(): string[] {
  if (typeof window === 'undefined') {
    try {
      const fs = eval("require('fs')");
      const path = eval("require('path')");
      const configPath = path.join(process.cwd(), 'config-phone.json');
      
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed.prefixes)) {
          return parsed.prefixes;
        }
      }
    } catch (e) {
      // Fallback if filesystem operations fail
    }
  }
  
  // Default prefixes for Nicaragua (Claro: 8, Tigo: 7, 5, 6)
  return ['8', '7', '5', '6'];
}

export function setAllowedPrefixes(prefixes: string[]): void {
  if (typeof window === 'undefined') {
    try {
      const fs = eval("require('fs')");
      const path = eval("require('path')");
      const configPath = path.join(process.cwd(), 'config-phone.json');
      
      fs.writeFileSync(configPath, JSON.stringify({ prefixes }, null, 2), 'utf8');
    } catch (e) {
      console.error("Failed to write phone config:", e);
    }
  }
}
