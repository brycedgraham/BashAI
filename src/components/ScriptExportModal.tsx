import React from 'react';
import { TerminalEntry } from '../types/terminal';
import { X, Download, Copy, Check, FileCode } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entries: TerminalEntry[];
}

export const ScriptExportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  entries,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  // Filter commands that were actually executed
  const executedCommands = entries.filter(
    (e) => e.type === 'command' && e.commandText && !e.commandText.startsWith('?') && e.commandText !== 'clear'
  );

  const scriptContent = `#!/usr/bin/env bash
# ==============================================================================
# BashAI Server Administration Script
# Host: srv-us-east-01
# Generated: ${new Date().toISOString()}
# Engine: Small Local LLM (Gemma 2B / Gemma 4 E2B)
# ==============================================================================

set -euo pipefail

echo "==> Starting server administration script execution..."

${
  executedCommands.length > 0
    ? executedCommands
        .map((cmd, i) => {
          return `# Step ${i + 1} (Directory: ${cmd.cwd})\necho "==> Executing: ${cmd.commandText?.replace(/"/g, '\\"')}"\n${cmd.commandText}\n`;
        })
        .join('\n')
    : '# No executed shell commands recorded in this session yet.\n'
}
echo "==> Administration commands completed successfully."
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([scriptContent], { type: 'text/x-sh' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bashai-admin-${new Date().toISOString().substring(0, 10)}.sh`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-700/80 rounded-xl shadow-2xl text-neutral-200 overflow-hidden font-sans flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <FileCode className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">Export Session as Shell Script</h2>
              <p className="text-xs text-neutral-400">
                {executedCommands.length} command{executedCommands.length === 1 ? '' : 's'} recorded from this session
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Script code preview */}
        <div className="p-4 flex-1 overflow-y-auto">
          <pre className="p-4 rounded bg-black/80 border border-neutral-800 font-mono text-xs text-neutral-300 overflow-x-auto whitespace-pre leading-relaxed select-all">
            {scriptContent}
          </pre>
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-800 bg-neutral-950/40">
          <div className="text-xs text-neutral-400">
            Executable format: <code className="text-neutral-300 font-mono">chmod +x script.sh && ./script.sh</code>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 hover:text-white transition-all cursor-pointer border border-neutral-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Script'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .sh</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
