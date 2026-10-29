import React from 'react';
import { BookOpen, X, ChevronRight, Zap } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (prompt: string, autoRun?: boolean) => void;
}

interface CheatItem {
  query: string;
  category: string;
  targetCommand: string;
}

const CHEAT_ITEMS: CheatItem[] = [
  {
    category: 'Networking & Ports',
    query: '? check what is listening on port 80',
    targetCommand: 'ss -tulpn | grep :80',
  },
  {
    category: 'Networking & Ports',
    query: '? find what is using port 8080 and kill it',
    targetCommand: 'lsof -ti :8080 | xargs -r kill -9',
  },
  {
    category: 'Networking & Ports',
    query: '? show all listening tcp and udp sockets with process names',
    targetCommand: 'ss -tulpn',
  },
  {
    category: 'Storage & Disk Management',
    query: '? find files larger than 50MB in /var/log',
    targetCommand: 'find /var/log -xdev -type f -size +50M -exec ls -lh {} +',
  },
  {
    category: 'Storage & Disk Management',
    query: '? compress all log files larger than 100MB with gzip',
    targetCommand: 'find /var/log -type f -name "*.log" -size +100M -exec gzip -v {} +',
  },
  {
    category: 'Storage & Disk Management',
    query: '? check disk usage across all mounted filesystems',
    targetCommand: 'df -hT --exclude-type=tmpfs',
  },
  {
    category: 'Memory & Processes',
    query: '? show top 10 memory consuming processes',
    targetCommand: "ps aux --sort=-%mem | awk 'NR<=11{print $1,$2,$3,$4,$11}'",
  },
  {
    category: 'Memory & Processes',
    query: '? check free ram and swap memory in gigabytes',
    targetCommand: 'free -h --si',
  },
  {
    category: 'Memory & Processes',
    query: '? capture single snapshot of cpu and load average',
    targetCommand: 'top -b -n 1 | head -n 20',
  },
  {
    category: 'Systemd Services',
    query: '? restart nginx and check service status',
    targetCommand: 'systemctl restart nginx && systemctl status nginx --no-pager',
  },
  {
    category: 'Systemd Services',
    query: '? inspect last 50 nginx error logs',
    targetCommand: 'journalctl -u nginx -n 50 --no-pager -p err..notice',
  },
  {
    category: 'Temporary Files & Cleanup',
    query: '? find and delete temporary files in /tmp older than 7 days',
    targetCommand: 'find /tmp -type f -atime +7 -delete',
  },
  {
    category: 'Docker Containers',
    query: '? show real-time cpu and memory stats for all containers',
    targetCommand: 'docker stats --no-stream --format "table {{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}"',
  },
  {
    category: 'Docker Containers',
    query: '? list all containers running and stopped with ports',
    targetCommand: 'docker ps -a --format "table {{.ID}}\\t{{.Names}}\\t{{.Status}}\\t{{.Ports}}"',
  },
];

export const CheatsheetDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectPrompt,
}) => {
  if (!isOpen) return null;

  const categories = Array.from(new Set(CHEAT_ITEMS.map((item) => item.category)));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-md bg-neutral-900 border-l border-neutral-800 h-full flex flex-col text-neutral-200 font-sans shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">Sysadmin Query Recipes</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-5 text-xs">
          <p className="text-neutral-400 text-xs leading-relaxed">
            Click any query below to run it through the local Gemma translation engine in the terminal.
          </p>

          {categories.map((cat) => (
            <div key={cat} className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                {cat}
              </div>
              <div className="space-y-1.5">
                {CHEAT_ITEMS.filter((item) => item.category === cat).map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      onSelectPrompt(item.query, true);
                      onClose();
                    }}
                    className="p-2.5 rounded bg-neutral-950/60 border border-neutral-800/80 hover:border-neutral-700 hover:bg-neutral-800/40 transition-all cursor-pointer group space-y-1"
                  >
                    <div className="flex items-center justify-between text-neutral-200 group-hover:text-cyan-300 font-medium">
                      <span className="flex items-center gap-1.5 font-mono text-xs text-cyan-400">
                        <Zap className="w-3 h-3 text-cyan-400 shrink-0" />
                        {item.query}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-cyan-400 transition-colors" />
                    </div>
                    <div className="text-[11px] font-mono text-neutral-500 truncate">
                      → {item.targetCommand}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
