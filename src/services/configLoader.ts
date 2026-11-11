import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import chokidar from 'chokidar';
import { UserTier } from '../types.js';

export interface ClientConfig {
  id: string;
  name: string;
  api_key: string;
  tier: UserTier;
  allowed_tools: string[];
}

export interface TierConfig {
  default: { capacity: number; refill_rate: number };
  execution: { capacity: number; refill_rate: number };
}

export interface SecurityConfig {
  max_payload_bytes: number;
  ml_guard: {
    enabled: boolean;
    model: string;
    threshold: number;
  };
  custom_shell_patterns: string[];
  custom_injection_patterns: string[];
}

export interface AppConfig {
  version: string;
  server: { port: number; target_mcp_url: string };
  clients: ClientConfig[];
  tiers: Record<UserTier, TierConfig>;
  security: SecurityConfig;
}

export class ConfigLoader {
  private static config: AppConfig;
  private static configPath = path.resolve(process.cwd(), 'guardrail.yml');

  /**
   * Replaces ${VAR_NAME} placeholders with environment variable values.
   */
  private static interpolateEnvVars(content: string): string {
    return content.replace(/\${(\w+)}/g, (_, varName) => process.env[varName] || '');
  }

  /**
   * Reads and parses guardrail.yml into memory.
   */
  public static loadConfig(): AppConfig {
    try {
      if (!fs.existsSync(this.configPath)) {
        throw new Error(`Configuration file not found at: ${this.configPath}`);
      }

      const fileRaw = fs.readFileSync(this.configPath, 'utf8');
      const interpolated = this.interpolateEnvVars(fileRaw);
      const parsed = yaml.load(interpolated) as AppConfig;

      this.config = parsed;
      console.log(`[ConfigLoader] Configuration loaded successfully. (${parsed.clients.length} clients registered)`);
      return this.config;
    } catch (err: any) {
      console.error('[ConfigLoader Error]: Failed to parse guardrail.yml:', err.message);
      if (!this.config) {
        process.exit(1);
      }
      return this.config;
    }
  }

  /**
   * Returns current active configuration object.
   */
  public static getConfig(): AppConfig {
    if (!this.config) {
      return this.loadConfig();
    }
    return this.config;
  }

  /**
   * Enables live file watching for runtime changes.
   */
  public static watch(): void {
    const watcher = chokidar.watch(this.configPath, { persistent: true });

    watcher.on('change', () => {
      console.log('[ConfigLoader] guardrail.yml change detected. Hot-reloading configuration...');
      this.loadConfig();
    });
  }
}
