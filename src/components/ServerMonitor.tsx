import React from 'react';
import { DaemonService } from '../types/terminal';
import { Cpu, HardDrive, Network, Server, RefreshCw, Activity, Terminal as TerminalIcon } from 'lucide-react';

interface Props {
  services: DaemonService[];
  onTriggerCommand: (cmd: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const ServerMonitor: React.FC<Props> = ({
  services,
  onTriggerCommand,
  isOpen,
}) => {
  const [metrics, setMetrics] = React.useState({
    cpu: 18.4,
    ramUsed: 4.2,
    ramTotal: 16.0,
    diskUsed: 42,
    netRx: '1.2 MB/s',
    netTx: '850 KB/s',
    uptime: '14d 8h 22m',
  });

  // Subtle real-time oscillation to feel alive like an active Linux node
  React.useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        cpu: +(14 + Math.random() * 9).toFixed(1),
        ramUsed: +(4.1 + Math.random() * 0.3).toFixed(2),
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`border-l border-neutral-800 bg-neutral-950/95 flex flex-col transition-all duration-200 z-10 ${
        isOpen ? 'w-80 shrink-0' : 'w-0 overflow-hidden border-l-0'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/40">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-xs tracking-wider uppercase text-neutral-200">
            Node Telemetry
          </span>
        </div>
        <div className="text-[11px] text-neutral-400 font-mono">
          srv-us-east-01
        </div>
      </div>

      <div className="p-4 space-y-5 overflow-y-auto flex-1 font-mono text-xs">
        {/* System identity */}
        <div className="bg-neutral-900/60 p-3 rounded border border-neutral-800/80 space-y-1.5 font-sans">
          <div className="flex justify-between text-neutral-400 text-[11px]">
            <span>OS</span>
            <span className="text-neutral-200 font-medium">Debian 12 (bookworm)</span>
          </div>
          <div className="flex justify-between text-neutral-400 text-[11px]">
            <span>Kernel</span>
            <span className="text-neutral-200 font-mono">6.1.0-21-amd64</span>
          </div>
          <div className="flex justify-between text-neutral-400 text-[11px]">
            <span>Uptime</span>
            <span className="text-emerald-400 font-mono tabular-nums">{metrics.uptime}</span>
          </div>
        </div>

        {/* Live Resource Vitals */}
        <div className="space-y-3">
          <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold font-sans flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-neutral-400" /> CPU Load
            </span>
            <span className="text-emerald-400 font-mono tabular-nums">{metrics.cpu}%</span>
          </div>
          <div className="w-full bg-neutral-800/80 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-500 rounded-full"
              style={{ width: `${metrics.cpu}%` }}
            />
          </div>

          <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold font-sans flex items-center justify-between pt-1">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-neutral-400" /> Memory (RAM)
            </span>
            <span className="text-cyan-400 font-mono tabular-nums">
              {metrics.ramUsed} / {metrics.ramTotal} GB
            </span>
          </div>
          <div className="w-full bg-neutral-800/80 h-2 rounded-full overflow-hidden">
            <div
              className="bg-cyan-500 h-full transition-all duration-500 rounded-full"
              style={{ width: `${(metrics.ramUsed / metrics.ramTotal) * 100}%` }}
            />
          </div>

          <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold font-sans flex items-center justify-between pt-1">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-neutral-400" /> Root Disk (/dev/sda1)
            </span>
            <span className="text-amber-400 font-mono tabular-nums">{metrics.diskUsed}% (148G free)</span>
          </div>
          <div className="w-full bg-neutral-800/80 h-2 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full transition-all duration-500 rounded-full"
              style={{ width: `${metrics.diskUsed}%` }}
            />
          </div>
        </div>

        {/* Managed Services */}
        <div className="pt-2 border-t border-neutral-800 space-y-2.5">
          <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold font-sans flex items-center justify-between">
            <span>Systemd Daemons</span>
            <span className="text-[10px] text-neutral-500 font-normal">Click to test</span>
          </div>

          <div className="space-y-1.5">
            {services.map((svc) => (
              <div
                key={svc.name}
                className="flex items-center justify-between p-2 rounded bg-neutral-900/40 border border-neutral-800/60 hover:border-neutral-700 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-neutral-200">{svc.name}</span>
                    <span className="text-[10px] text-neutral-400 font-sans">
                      {svc.status === 'active' ? 'active (running)' : 'inactive'}
                    </span>
                  </div>
                  {svc.port && (
                    <div className="text-[10px] text-neutral-500 font-sans">
                      Port: <span className="text-neutral-300 font-mono">{svc.port}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onTriggerCommand(`systemctl status ${svc.name}`)}
                    title={`Check status of ${svc.name}`}
                    className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <TerminalIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onTriggerCommand(`systemctl restart ${svc.name}`)}
                    title={`Restart ${svc.name}`}
                    className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Listening Ports */}
        <div className="pt-2 border-t border-neutral-800 space-y-2">
          <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold font-sans flex items-center gap-1.5">
            <Network className="w-3.5 h-3.5" /> Listening Sockets
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <div
              onClick={() => onTriggerCommand('ss -tulpn | grep :22')}
              className="p-1.5 rounded bg-neutral-900/50 border border-neutral-800 cursor-pointer hover:border-neutral-700 transition-colors flex justify-between"
            >
              <span className="text-neutral-400">:22</span>
              <span className="text-neutral-300 font-sans">sshd</span>
            </div>
            <div
              onClick={() => onTriggerCommand('ss -tulpn | grep :80')}
              className="p-1.5 rounded bg-neutral-900/50 border border-neutral-800 cursor-pointer hover:border-neutral-700 transition-colors flex justify-between"
            >
              <span className="text-neutral-400">:80</span>
              <span className="text-neutral-300 font-sans">nginx</span>
            </div>
            <div
              onClick={() => onTriggerCommand('ss -tulpn | grep :443')}
              className="p-1.5 rounded bg-neutral-900/50 border border-neutral-800 cursor-pointer hover:border-neutral-700 transition-colors flex justify-between"
            >
              <span className="text-neutral-400">:443</span>
              <span className="text-neutral-300 font-sans">nginx</span>
            </div>
            <div
              onClick={() => onTriggerCommand('ss -tulpn | grep :5432')}
              className="p-1.5 rounded bg-neutral-900/50 border border-neutral-800 cursor-pointer hover:border-neutral-700 transition-colors flex justify-between"
            >
              <span className="text-neutral-400">:5432</span>
              <span className="text-neutral-300 font-sans">postgres</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
