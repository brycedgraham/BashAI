import { useState, useEffect } from 'react';
import { Terminal } from './components/Terminal';
import { ServerMonitor } from './components/ServerMonitor';
import { ModelConfigModal } from './components/ModelConfigModal';
import { CheatsheetDrawer } from './components/CheatsheetDrawer';
import { ScriptExportModal } from './components/ScriptExportModal';
import { SshIntegrationModal } from './components/SshIntegrationModal';
import { TerminalEntry, DaemonService, ModelConfig } from './types/terminal';
import { checkServerHealth } from './services/commandTranslator';
import {
  Terminal as TerminalIcon,
  Cpu,
  BookOpen,
  FileCode,
  Trash2,
  Activity,
  Layers,
  HelpCircle,
  Network,
} from 'lucide-react';

const initialServices: DaemonService[] = [
  {
    name: 'nginx',
    displayName: 'Nginx Web Server',
    status: 'active',
    uptime: '8d 4h',
    port: 80,
    description: 'Reverse proxy & HTTP load balancer',
  },
  {
    name: 'docker',
    displayName: 'Docker Container Daemon',
    status: 'active',
    uptime: '8d 4h',
    description: 'Container virtualization runtime',
  },
  {
    name: 'postgresql',
    displayName: 'PostgreSQL Database',
    status: 'active',
    uptime: '8d 4h',
    port: 5432,
    description: 'Relational database engine',
  },
  {
    name: 'sshd',
    displayName: 'OpenSSH Server',
    status: 'active',
    uptime: '14d 8h',
    port: 22,
    description: 'Secure shell remote access',
  },
];

export default function App() {
  const [entries, setEntries] = useState<TerminalEntry[]>([]);
  const [cwd, setCwd] = useState<string>('/home/admin');
  const [services, setServices] = useState<DaemonService[]>(initialServices);
  const [isMonitorOpen, setIsMonitorOpen] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isCheatsheetOpen, setIsCheatsheetOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSshModalOpen, setIsSshModalOpen] = useState(false);

  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    provider: 'llamacpp',
    endpoint: 'http://localhost:8888',
    modelName: 'gemma-2b-it',
    isConnected: false,
    detectedModels: [],
  });

  // Check health on mount
  useEffect(() => {
    checkServerHealth(modelConfig.endpoint).then((health) => {
      setModelConfig((prev) => ({
        ...prev,
        isConnected: health.ollamaConnected,
        detectedModels: health.detectedModels,
      }));
    });
  }, [modelConfig.endpoint]);

  const handleSelectPrompt = (prompt: string) => {
    // Inject query into terminal
    setEntries((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        timestamp: Date.now(),
        type: 'command',
        cwd,
        commandText: prompt,
      },
    ]);

    // Automatically trigger translation
    const query = prompt.replace(/^\?\s*/, '');
    import('./services/commandTranslator').then(({ translateQuery }) => {
      translateQuery(query, cwd, modelConfig).then((translation) => {
        setEntries((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: 'preview',
            cwd,
            translation,
          },
        ]);
      });
    });
  };

  const handleTriggerMonitorCommand = (cmd: string) => {
    // Add command and run in terminal
    setEntries((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        timestamp: Date.now(),
        type: 'command',
        cwd,
        commandText: cmd,
      },
    ]);

    if (cmd.startsWith('systemctl restart')) {
      const parts = cmd.split(' ');
      const svcName = parts[2];
      setServices((prev) =>
        prev.map((s) => (s.name === svcName ? { ...s, status: 'active', uptime: 'just now' } : s))
      );
      setEntries((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          timestamp: Date.now(),
          type: 'output',
          cwd,
          output: `[ ok ] Restarting ${svcName} (via systemctl): ${svcName}.service.\n`,
        },
      ]);
    } else if (cmd.startsWith('systemctl status')) {
      const parts = cmd.split(' ');
      const svcName = parts[2] || 'nginx';
      setEntries((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          timestamp: Date.now(),
          type: 'output',
          cwd,
          output: `● ${svcName}.service - High Performance HTTP Server\n     Active: active (running) since Mon 2026-10-20 12:00:00 UTC\n   Main PID: 1420 (${svcName})\n      Tasks: 4 (limit: 19124)\n     Memory: 48.2M\n        CPU: 2min 42.500s\n`,
        },
      ]);
    } else if (cmd.includes('grep :')) {
      const port = cmd.split(':')[1]?.trim() || '80';
      setEntries((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          timestamp: Date.now(),
          type: 'output',
          cwd,
          output: `tcp   LISTEN 0      511            0.0.0.0:${port}          0.0.0.0:*     users:(("service",pid=1420,fd=6))\n`,
        },
      ]);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0B0F17] text-neutral-100 overflow-hidden font-sans">
      {/* 
        Top Bar Contract:
        Zone 1: Brand title, one line
        Zone 2: 4-5 single-line nav links
        Zone 3: 1 primary action button
      */}
      <header className="flex items-center justify-between gap-8 px-6 py-3 border-b border-neutral-800 bg-[#0E131F] shrink-0">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
          <TerminalIcon className="w-5 h-5 text-emerald-400" />
          <span className="text-base font-bold tracking-tight text-white">BashAI</span>
          <span className="text-xs text-neutral-500 font-mono hidden sm:inline">srv-us-east-01</span>
        </div>

        {/* Zone 2: Single-line nav links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-neutral-400">
          <button
            onClick={() => setIsSshModalOpen(true)}
            className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <Network className="w-3.5 h-3.5" />
            <span>Use in SSH Session</span>
          </button>
          <button
            onClick={() => setIsCheatsheetOpen(true)}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-neutral-500" />
            <span>Recipes</span>
          </button>
          <button
            onClick={() => setIsExportOpen(true)}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5 text-neutral-500" />
            <span>Script Exporter</span>
          </button>
          <button
            onClick={() => setIsMonitorOpen(!isMonitorOpen)}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-neutral-500" />
            <span>{isMonitorOpen ? 'Hide Telemetry' : 'Show Telemetry'}</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action: Local LLM Engine Status & Settings */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsConfigOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-neutral-200 bg-neutral-800/90 hover:bg-neutral-700/90 rounded-lg border border-neutral-700/80 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Engine: {modelConfig.modelName}</span>
            <span
              className={`w-2 h-2 rounded-full ${
                modelConfig.isConnected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
              title={modelConfig.isConnected ? 'Ollama daemon connected' : 'Embedded fallback active'}
            />
          </button>
        </div>
      </header>

      {/* Workspace Secondary Quick Bar */}
      <div className="flex items-center justify-between px-6 py-2 bg-neutral-950 border-b border-neutral-800/70 text-xs shrink-0">
        <div className="flex items-center gap-3 text-neutral-400 text-xs">
          <span className="flex items-center gap-1 text-cyan-400 font-mono font-medium">
            <span className="text-neutral-500 font-bold">$</span> ? &lt;query&gt;
          </span>
          <span className="text-neutral-600">·</span>
          <span className="hidden sm:inline">Natural Language Bash Assistant</span>
          <span className="text-neutral-600 hidden sm:inline">·</span>
          <span className="text-neutral-400 font-mono hidden md:inline">Current dir: {cwd}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSshModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium text-cyan-400 hover:text-cyan-300 hover:bg-neutral-800 transition-colors cursor-pointer border border-cyan-800/60"
            title="Install in real SSH terminal"
          >
            <TerminalIcon className="w-3 h-3 text-cyan-400" />
            <span>Install in SSH Terminal</span>
          </button>
          <button
            onClick={() => setIsCheatsheetOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>Quick Queries</span>
          </button>
          <button
            onClick={() => setEntries([])}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium text-neutral-400 hover:text-rose-300 hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Clear terminal (Ctrl+L)"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Main Terminal Viewport + Telemetry Panel */}
      <div className="flex flex-1 overflow-hidden relative">
        <Terminal
          entries={entries}
          setEntries={setEntries}
          cwd={cwd}
          setCwd={setCwd}
          services={services}
          setServices={setServices}
          modelConfig={modelConfig}
          onOpenModelConfig={() => setIsConfigOpen(true)}
          onOpenCheatsheet={() => setIsCheatsheetOpen(true)}
          onOpenExport={() => setIsExportOpen(true)}
        />

        <ServerMonitor
          services={services}
          onTriggerCommand={handleTriggerMonitorCommand}
          isOpen={isMonitorOpen}
          onToggle={() => setIsMonitorOpen(!isMonitorOpen)}
        />
      </div>

      {/* Modals & Drawers */}
      <ModelConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={modelConfig}
        onSaveConfig={(newConfig) => setModelConfig(newConfig)}
      />

      <CheatsheetDrawer
        isOpen={isCheatsheetOpen}
        onClose={() => setIsCheatsheetOpen(false)}
        onSelectPrompt={handleSelectPrompt}
      />

      <ScriptExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        entries={entries}
      />

      <SshIntegrationModal
        isOpen={isSshModalOpen}
        onClose={() => setIsSshModalOpen(false)}
      />
    </div>
  );
}
