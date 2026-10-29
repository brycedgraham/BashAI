import React, { useRef, useEffect } from 'react';
import { TerminalEntry, ModelConfig, DaemonService, TranslatedCommand } from '../types/terminal';
import { virtualFS } from '../services/virtualFs';
import { translateQuery } from '../services/commandTranslator';
import { TranslationPreview } from './TranslationPreview';
import { Loader2 } from 'lucide-react';

interface Props {
  entries: TerminalEntry[];
  setEntries: React.Dispatch<React.SetStateAction<TerminalEntry[]>>;
  cwd: string;
  setCwd: React.Dispatch<React.SetStateAction<string>>;
  services: DaemonService[];
  setServices: React.Dispatch<React.SetStateAction<DaemonService[]>>;
  modelConfig: ModelConfig;
  onOpenModelConfig: () => void;
  onOpenCheatsheet: () => void;
  onOpenExport: () => void;
}

export const Terminal: React.FC<Props> = ({
  entries,
  setEntries,
  cwd,
  setCwd,
  services,
  setServices,
  modelConfig,
}) => {
  const [inputVal, setInputVal] = React.useState('');
  const [historyIndex, setHistoryIndex] = React.useState<number | null>(null);
  const [isTranslating, setIsTranslating] = React.useState(false);
  const [pendingTranslation, setPendingTranslation] = React.useState<TranslatedCommand | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Command history for up/down arrow
  const commandHistory = React.useMemo(() => {
    return entries
      .filter((e) => e.type === 'command' && e.commandText)
      .map((e) => e.commandText as string);
  }, [entries]);

  // Keep input focused
  useEffect(() => {
    inputRef.current?.focus();
  }, [entries, isTranslating, pendingTranslation]);

  // Auto scroll to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, pendingTranslation, isTranslating]);

  const displayPath = React.useMemo(() => {
    if (cwd === '/home/admin') return '~';
    if (cwd.startsWith('/home/admin/')) return '~' + cwd.slice(11);
    return cwd;
  }, [cwd]);

  // Execute standard bash commands against the virtual filesystem & system state
  const executeBashCommand = (rawCmd: string) => {
    const trimmed = rawCmd.trim();
    if (!trimmed) return;

    // Add command to entries
    const cmdId = Date.now().toString();
    const newCommandEntry: TerminalEntry = {
      id: cmdId,
      timestamp: Date.now(),
      type: 'command',
      cwd,
      commandText: trimmed,
    };

    if (trimmed === 'clear') {
      setEntries([]);
      setInputVal('');
      return;
    }

    // Split pipes if simple piped command
    const parts = trimmed.split('&&').map((c) => c.trim());
    let combinedOutput = '';

    for (const subCmd of parts) {
      const tokens = subCmd.split(/\s+/);
      const cmd = tokens[0];
      const args = tokens.slice(1);

      switch (cmd) {
        case 'pwd': {
          combinedOutput += `${cwd}\n`;
          break;
        }

        case 'whoami': {
          combinedOutput += `admin\n`;
          break;
        }

        case 'uname': {
          if (args.includes('-a')) {
            combinedOutput += `Linux srv-us-east-01 6.1.0-21-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.90-1 x86_64 GNU/Linux\n`;
          } else {
            combinedOutput += `Linux\n`;
          }
          break;
        }

        case 'uptime': {
          combinedOutput += ` 19:38:50 up 14 days,  8:22,  1 user,  load average: 0.18, 0.24, 0.19\n`;
          break;
        }

        case 'cd': {
          const target = args[0] || '~';
          const resolved = virtualFS.resolvePath(target, cwd);
          const node = virtualFS.getNode(resolved, cwd);
          if (!node) {
            combinedOutput += `bash: cd: ${target}: No such file or directory\n`;
          } else if (node.type !== 'dir') {
            combinedOutput += `bash: cd: ${target}: Not a directory\n`;
          } else {
            setCwd(resolved);
          }
          break;
        }

        case 'ls': {
          const showAll = args.some((a) => a.includes('a'));
          const showLong = args.some((a) => a.includes('l'));
          const pathArg = args.find((a) => !a.startsWith('-')) || '.';
          const nodes = virtualFS.listDirectory(pathArg, cwd);

          if (!nodes) {
            combinedOutput += `ls: cannot access '${pathArg}': No such file or directory\n`;
          } else {
            const filtered = showAll ? nodes : nodes.filter((n) => !n.name.startsWith('.'));
            if (showLong) {
              combinedOutput += `total ${filtered.length * 4}\n`;
              filtered.forEach((n) => {
                const sizeStr = (n.size || 4096).toString().padStart(8);
                combinedOutput += `${n.permissions} 1 admin admin ${sizeStr} ${n.updatedAt} ${n.name}${n.type === 'dir' ? '/' : ''}\n`;
              });
            } else {
              combinedOutput += filtered.map((n) => (n.type === 'dir' ? `${n.name}/` : n.name)).join('  ') + '\n';
            }
          }
          break;
        }

        case 'cat': {
          if (!args[0]) {
            combinedOutput += `cat: missing operand\n`;
            break;
          }
          const content = virtualFS.readFile(args[0], cwd);
          if (content === null) {
            combinedOutput += `cat: ${args[0]}: No such file or directory\n`;
          } else {
            combinedOutput += content + (content.endsWith('\n') ? '' : '\n');
          }
          break;
        }

        case 'mkdir': {
          if (!args[0]) {
            combinedOutput += `mkdir: missing operand\n`;
            break;
          }
          const ok = virtualFS.makeDir(args[0], cwd);
          if (!ok) {
            combinedOutput += `mkdir: cannot create directory '${args[0]}': File exists or parent missing\n`;
          }
          break;
        }

        case 'touch': {
          if (!args[0]) {
            combinedOutput += `touch: missing file operand\n`;
            break;
          }
          virtualFS.writeFile(args[0], '', cwd);
          break;
        }

        case 'rm': {
          if (!args[0]) {
            combinedOutput += `rm: missing operand\n`;
            break;
          }
          const target = args.find((a) => !a.startsWith('-')) || '';
          if (!target) {
            combinedOutput += `rm: missing operand\n`;
            break;
          }
          const ok = virtualFS.remove(target, cwd);
          if (!ok) {
            combinedOutput += `rm: cannot remove '${target}': No such file or directory\n`;
          }
          break;
        }

        case 'free': {
          combinedOutput += `               total        used        free      shared  buff/cache   available\nMem:            16Gi       4.2Gi       4.8Gi       140Mi       7.0Gi        11Gi\nSwap:          4.0Gi          0B       4.0Gi\n`;
          break;
        }

        case 'df': {
          combinedOutput += `Filesystem     Type      Size  Used Avail Use% Mounted on\n/dev/sda1      ext4      256G  108G  148G  42% /\nudev           devtmpfs  7.9G     0  7.9G   0% /dev\n/dev/sdb1      ext4      1.0T  320G  680G  32% /data\n`;
          break;
        }

        case 'ps': {
          combinedOutput += `USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\nroot         1  0.0  0.1 168420 12840 ?        Ss   Oct14   0:14 /sbin/init\nroot       412  0.0  0.2  84210 18400 ?        Ss   Oct14   0:08 /lib/systemd/systemd-journald\nwww-data  1420  0.8  1.4 340200 48200 ?        S    Oct20   2:42 nginx: worker process\npostgres  2140  0.4  2.8 520400 98200 ?        S    Oct20   1:18 postgres: main process\nroot      3180  1.2  3.4 980100 124000 ?       Ssl  Oct20   8:30 /usr/bin/dockerd\nadmin     4892  0.0  0.1  24800  4200 pts/0    Ss   19:35   0:00 -bash\n`;
          break;
        }

        case 'top': {
          combinedOutput += `top - 19:38:52 up 14 days,  8:22,  1 user,  load average: 0.18, 0.24, 0.19\nTasks: 142 total,   1 running, 141 sleeping,   0 stopped,   0 zombie\n%Cpu(s):  2.4 us,  1.1 sy,  0.0 ni, 96.2 id,  0.2 wa,  0.0 hi,  0.1 si\nMiB Mem :  16384.0 total,   4820.1 free,   4210.8 used,   7353.1 buff/cache\nMiB Swap:   4096.0 total,   4096.0 free,      0.0 used.  11894.2 avail Mem\n\n  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND\n 3180 root      20   0  980100 124000  42100 S   1.2   3.4   8:30.12 dockerd\n 1420 www-data  20   0  340200  48200  18400 S   0.8   1.4   2:42.50 nginx\n 2140 postgres  20   0  520400  98200  32100 S   0.4   2.8   1:18.42 postgres\n 4892 admin     20   0   24800   4200   2800 R   0.1   0.1   0:00.08 top\n`;
          break;
        }

        case 'ss': {
          combinedOutput += `Netid State  Recv-Q Send-Q   Local Address:Port   Peer Address:Port Process\ntcp   LISTEN 0      128            0.0.0.0:22          0.0.0.0:*     users:(("sshd",pid=784,fd=3))\ntcp   LISTEN 0      511            0.0.0.0:80          0.0.0.0:*     users:(("nginx",pid=1420,fd=6))\ntcp   LISTEN 0      511            0.0.0.0:443         0.0.0.0:*     users:(("nginx",pid=1420,fd=7))\ntcp   LISTEN 0      128          127.0.0.1:5432        0.0.0.0:*     users:(("postgres",pid=2140,fd=5))\ntcp   LISTEN 0      128          127.0.0.1:11434       0.0.0.0:*     users:(("ollama",pid=1980,fd=4))\n`;
          break;
        }

        case 'systemctl': {
          const action = args[0];
          const svcName = args[1]?.replace(/\.service$/, '') || 'nginx';

          if (action === 'status') {
            const svc = services.find((s) => s.name === svcName);
            combinedOutput += `● ${svcName}.service - ${svc?.description || 'Service Unit'}\n     Loaded: loaded (/lib/systemd/system/${svcName}.service; enabled; vendor preset: enabled)\n     Active: active (running) since Mon 2026-10-20 12:00:00 UTC; 8 days ago\n   Main PID: 1420 (${svcName})\n      Tasks: 4 (limit: 19124)\n     Memory: 48.2M\n        CPU: 2min 42.500s\n     CGroup: /system.slice/${svcName}.service\n             └─1420 /usr/sbin/${svcName} -g daemon on; master_process on;\n`;
          } else if (action === 'restart' || action === 'reload') {
            setServices((prev) =>
              prev.map((s) => (s.name === svcName ? { ...s, status: 'active', uptime: 'just now' } : s))
            );
            combinedOutput += `[ ok ] Restarting ${svcName} (via systemctl): ${svcName}.service.\n`;
          } else if (action === 'stop') {
            setServices((prev) =>
              prev.map((s) => (s.name === svcName ? { ...s, status: 'inactive' } : s))
            );
            combinedOutput += `[ ok ] Stopped ${svcName}.service.\n`;
          } else if (action === 'start') {
            setServices((prev) =>
              prev.map((s) => (s.name === svcName ? { ...s, status: 'active' } : s))
            );
            combinedOutput += `[ ok ] Started ${svcName}.service.\n`;
          } else {
            combinedOutput += `systemctl: Unknown action '${action}'\n`;
          }
          break;
        }

        case 'journalctl': {
          combinedOutput += `-- Journal begins at Wed 2026-10-14 00:00:00 UTC, ends at Wed 2026-10-28 19:38:52 UTC. --\nOct 28 19:25:12 srv-us-east-01 systemd[1]: Starting Nginx HTTP Server...\nOct 28 19:25:13 srv-us-east-01 nginx[1420]: Configuration file /etc/nginx/nginx.conf test is successful\nOct 28 19:25:13 srv-us-east-01 systemd[1]: Started Nginx HTTP Server.\nOct 28 19:35:10 srv-us-east-01 sshd[3840]: Accepted publickey for admin from 192.168.1.45 port 54820 ssh2\n`;
          break;
        }

        case 'docker': {
          if (args[0] === 'ps') {
            combinedOutput += `CONTAINER ID   IMAGE          COMMAND                  CREATED        STATUS        PORTS                               NAMES\na1b2c3d4e5f6   postgres:16    "docker-entrypoint.s…"   2 days ago     Up 2 days     0.0.0.0:5432->5432/tcp              prod-postgres\n7f8e9d0c1b2a   redis:7-alpine "docker-entrypoint.s…"   2 days ago     Up 2 days     0.0.0.0:6379->6379/tcp              prod-redis\n`;
          } else if (args[0] === 'stats') {
            combinedOutput += `CONTAINER ID   NAME            CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O\na1b2c3d4e5f6   prod-postgres   0.45%     98.2MiB / 15.62GiB    0.61%     42.1MB / 89.4MB   12.4MB / 84.1MB\n7f8e9d0c1b2a   prod-redis      0.12%     18.4MiB / 15.62GiB    0.11%     14.2MB / 12.1MB   0B / 4.1MB\n`;
          } else {
            combinedOutput += `Usage: docker [ps|stats|images|run|stop]\n`;
          }
          break;
        }

        case 'find': {
          const pathArg = args[0] || '.';
          const nodes = virtualFS.listDirectory(pathArg, cwd);
          if (nodes) {
            combinedOutput += nodes.map((n) => `${pathArg}/${n.name}`).join('\n') + '\n';
          } else {
            combinedOutput += `find: '${pathArg}': No such file or directory\n`;
          }
          break;
        }

        case 'grep': {
          if (args.length < 2) {
            combinedOutput += `Usage: grep <pattern> <file>\n`;
            break;
          }
          const pattern = args[0];
          const file = args[1];
          const content = virtualFS.readFile(file, cwd);
          if (content === null) {
            combinedOutput += `grep: ${file}: No such file or directory\n`;
          } else {
            const matches = content
              .split('\n')
              .filter((line) => line.toLowerCase().includes(pattern.toLowerCase()));
            combinedOutput += matches.join('\n') + (matches.length > 0 ? '\n' : '');
          }
          break;
        }

        case 'echo': {
          const redirectIdx = args.indexOf('>');
          if (redirectIdx !== -1) {
            const text = args.slice(0, redirectIdx).join(' ').replace(/^["']|["']$/g, '');
            const targetFile = args[redirectIdx + 1];
            if (targetFile) {
              virtualFS.writeFile(targetFile, text + '\n', cwd);
            }
          } else {
            combinedOutput += args.join(' ').replace(/^["']|["']$/g, '') + '\n';
          }
          break;
        }

        case 'help': {
          combinedOutput += `BashAI Linux Shell Assistant (Debian 12 GNU/Linux)\n
  Natural Language Commands:
    Prefix with '?' to translate plain English into structured bash:
      ? check disk usage
      ? find files larger than 100MB in /var/log
      ? show top 10 memory consuming processes
      ? what is using port 8080 and free it

  Supported Virtual Shell Commands:
    ls, cd, pwd, cat, touch, mkdir, rm, echo, grep, find
    ps, top, free, df, uptime, uname, whoami
    systemctl (status, restart, stop, start)
    journalctl, docker (ps, stats), ss, clear, help, history
`;
          break;
        }

        case 'history': {
          combinedOutput += commandHistory
            .map((cmd, i) => `  ${(i + 1).toString().padStart(4)}  ${cmd}`)
            .join('\n') + '\n';
          break;
        }

        case 'ssh-setup': {
          combinedOutput += `==> BashAI Native SSH Shell Integration:
To run this directly inside your actual Linux shell when SSH'd into any server:
  1. Run this command on your remote server:
     curl -fsSL https://ais-pre-tbwnhtb4nr7op64fqnrl5k-897745590882.us-east1.run.app/install.sh | bash
  2. Activate in your current shell:
     source ~/.bashrc
  3. Start using it directly:
     ? check disk space
     ? restart nginx and verify status
`;
          break;
        }

        default: {
          combinedOutput += `bash: ${cmd}: command not found (type 'help' or prefix with '?' to translate English intent)\n`;
          break;
        }
      }
    }

    setEntries((prev) => [
      ...prev,
      newCommandEntry,
      {
        id: (Date.now() + 1).toString(),
        timestamp: Date.now(),
        type: combinedOutput.includes('not found') || combinedOutput.includes('cannot') ? 'error' : 'output',
        cwd,
        output: combinedOutput,
      },
    ]);

    setInputVal('');
    setHistoryIndex(null);
  };

  // Form submission: either a '?' natural language query or a direct bash command
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed) return;

    // Check if query is prefixed with '?'
    if (trimmed.startsWith('?')) {
      const naturalQuery = trimmed.slice(1).trim();
      if (!naturalQuery) return;

      // Add user query to terminal log
      setEntries((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          timestamp: Date.now(),
          type: 'command',
          cwd,
          commandText: trimmed,
        },
      ]);

      setInputVal('');
      setIsTranslating(true);
      setPendingTranslation(null);

      // Invoke local LLM / sysadmin translator
      const translation = await translateQuery(naturalQuery, cwd, modelConfig);
      setIsTranslating(false);
      setPendingTranslation(translation);
    } else {
      executeBashCommand(trimmed);
    }
  };

  // Handle keyboard shortcuts (Enter to run preview, Tab to edit, Esc to dismiss, Up/Down for history)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // If a translation preview is actively waiting for confirmation
    if (pendingTranslation) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const cmdToRun = pendingTranslation.command;
        // Commit the preview to history
        setEntries((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: 'preview',
            cwd,
            translation: pendingTranslation,
          },
        ]);
        setPendingTranslation(null);
        executeBashCommand(cmdToRun);
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        setInputVal(pendingTranslation.command);
        setPendingTranslation(null);
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setPendingTranslation(null);
        return;
      }
    }

    // Up arrow: previous command
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIndex = historyIndex === null ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInputVal(commandHistory[nextIndex] || '');
      return;
    }

    // Down arrow: next command
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === null) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= commandHistory.length) {
        setHistoryIndex(null);
        setInputVal('');
      } else {
        setHistoryIndex(nextIndex);
        setInputVal(commandHistory[nextIndex] || '');
      }
      return;
    }

    // Tab autocomplete
    if (e.key === 'Tab' && !pendingTranslation) {
      e.preventDefault();
      const tokens = inputVal.split(' ');
      const lastToken = tokens[tokens.length - 1];
      if (lastToken) {
        const nodes = virtualFS.listDirectory(cwd);
        if (nodes) {
          const match = nodes.find((n) => n.name.startsWith(lastToken));
          if (match) {
            tokens[tokens.length - 1] = match.name + (match.type === 'dir' ? '/' : '');
            setInputVal(tokens.join(' '));
          }
        }
      }
      return;
    }

    // Ctrl+L to clear screen
    if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      setEntries([]);
      return;
    }

    // Ctrl+C to abort current input
    if (e.ctrlKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      setEntries((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          timestamp: Date.now(),
          type: 'command',
          cwd,
          commandText: inputVal + '^C',
        },
      ]);
      setInputVal('');
      setPendingTranslation(null);
      return;
    }
  };

  const isQueryMode = inputVal.startsWith('?');

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="flex-1 bg-black/95 text-neutral-100 font-mono text-xs sm:text-sm p-4 overflow-y-auto flex flex-col select-text"
    >
      {/* Welcome Banner */}
      {entries.length === 0 && (
        <div className="mb-4 text-neutral-400 space-y-1.5 leading-relaxed font-mono">
          <div className="text-emerald-400 font-semibold flex items-center gap-2">
            <span>BashAI Server Terminal</span>
            <span className="text-neutral-600">·</span>
            <span className="text-xs text-neutral-400 font-normal">
              Debian GNU/Linux 12 (bookworm) — Linux 6.1.0-21-amd64
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            Type regular bash commands, or prefix with{' '}
            <span className="text-cyan-400 font-bold">?</span> to translate plain English into structured bash via{' '}
            <span className="text-cyan-300 font-semibold">{modelConfig.modelName}</span>.
          </p>
          <div className="text-[11px] text-neutral-500 pt-1">
            Try: <code className="text-neutral-300">? check disk usage</code> or{' '}
            <code className="text-neutral-300">? find files over 50MB in /var/log</code> or{' '}
            <code className="text-neutral-300">help</code>
          </div>
        </div>
      )}

      {/* Terminal Output Log */}
      <div className="space-y-2">
        {entries.map((entry) => (
          <div key={entry.id} className="space-y-1">
            {entry.type === 'command' && (
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-semibold">admin@srv-us-east-01</span>
                <span className="text-neutral-500">:</span>
                <span className="text-cyan-400 font-semibold">
                  {entry.cwd === '/home/admin' ? '~' : entry.cwd}
                </span>
                <span className="text-neutral-500 font-bold">$</span>
                <span
                  className={
                    entry.commandText?.startsWith('?') ? 'text-cyan-300 font-medium' : 'text-neutral-200'
                  }
                >
                  {entry.commandText}
                </span>
              </div>
            )}

            {entry.type === 'preview' && entry.translation && (
              <TranslationPreview
                translation={entry.translation}
                onExecute={(cmd) => executeBashCommand(cmd)}
                onEdit={(cmd) => setInputVal(cmd)}
                onCancel={() => {}}
              />
            )}

            {(entry.type === 'output' || entry.type === 'error') && entry.output && (
              <pre
                className={`whitespace-pre-wrap leading-relaxed ${
                  entry.type === 'error' ? 'text-rose-400' : 'text-neutral-300'
                }`}
              >
                {entry.output}
              </pre>
            )}
          </div>
        ))}
      </div>

      {/* Ongoing Translation Spinner */}
      {isTranslating && (
        <div className="my-3 flex items-center gap-2.5 text-cyan-400 text-xs py-2 px-3 rounded bg-neutral-900/60 border border-neutral-800">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Synthesizing bash command with local {modelConfig.modelName} model...</span>
        </div>
      )}

      {/* Inline Confirmation Preview Card */}
      {pendingTranslation && (
        <TranslationPreview
          translation={pendingTranslation}
          onExecute={(cmd) => {
            setEntries((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                timestamp: Date.now(),
                type: 'preview',
                cwd,
                translation: pendingTranslation,
              },
            ]);
            setPendingTranslation(null);
            executeBashCommand(cmd);
          }}
          onEdit={(cmd) => {
            setInputVal(cmd);
            setPendingTranslation(null);
          }}
          onCancel={() => setPendingTranslation(null)}
        />
      )}

      {/* Active Input Line */}
      <form onSubmit={handleFormSubmit} className="flex items-center gap-2 mt-2 shrink-0">
        <div className="flex items-center gap-1.5 shrink-0 select-none">
          <span className="text-emerald-400 font-semibold">admin@srv-us-east-01</span>
          <span className="text-neutral-500">:</span>
          <span className="text-cyan-400 font-semibold">{displayPath}</span>
          <span className="text-neutral-500 font-bold">$</span>
        </div>

        {isQueryMode && (
          <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-[10px] text-cyan-300 font-sans font-semibold shrink-0">
            ? {modelConfig.modelName}
          </span>
        )}

        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          className="flex-1 bg-transparent border-0 outline-hidden font-mono text-neutral-100 placeholder:text-neutral-600 focus:ring-0 p-0"
          placeholder={pendingTranslation ? "Press [Enter] to run, [Tab] to edit, or [Esc] to cancel" : "Type bash command or '? plain english query'"}
        />
      </form>

      <div ref={terminalEndRef} />
    </div>
  );
};
