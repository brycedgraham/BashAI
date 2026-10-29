export type SafetyLevel = 'safe' | 'warning' | 'destructive';

export interface CommandFlag {
  flag: string;
  desc: string;
}

export interface TranslatedCommand {
  command: string;
  explanation: string;
  flags: CommandFlag[];
  safetyLevel: SafetyLevel;
  dangerousTokens?: string[];
  engineUsed: string;
}

export interface TerminalEntry {
  id: string;
  timestamp: number;
  type: 'command' | 'output' | 'error' | 'preview' | 'system';
  cwd: string;
  commandText?: string;
  output?: string;
  translation?: TranslatedCommand;
  exitCode?: number;
}

export interface FSNode {
  name: string;
  type: 'file' | 'dir';
  content?: string;
  size?: number;
  updatedAt: string;
  permissions: string;
  children?: Record<string, FSNode>;
}

export interface ProcessItem {
  pid: number;
  user: string;
  cpu: number;
  mem: number;
  command: string;
  status: 'running' | 'sleeping' | 'stopped';
}

export interface DaemonService {
  name: string;
  displayName: string;
  status: 'active' | 'inactive' | 'failed';
  uptime: string;
  port?: number;
  description: string;
}

export interface ModelConfig {
  provider: 'llamacpp' | 'ollama' | 'localai' | 'gemini' | 'auto';
  endpoint: string;
  modelName: string;
  isConnected: boolean;
  detectedModels: string[];
  backendType?: string;
}
