import React from 'react';
import { TranslatedCommand } from '../types/terminal';
import { Play, Edit3, X, AlertTriangle, ShieldCheck, AlertOctagon, Copy, Check } from 'lucide-react';

interface Props {
  translation: TranslatedCommand;
  onExecute: (cmd: string) => void;
  onEdit: (cmd: string) => void;
  onCancel: () => void;
}

export const TranslationPreview: React.FC<Props> = ({
  translation,
  onExecute,
  onEdit,
  onCancel,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(translation.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSafetyBadge = (level: string) => {
    switch (level) {
      case 'destructive':
        return (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 bg-rose-950/60 border border-rose-800/80 px-2.5 py-0.5 rounded">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
            <span>High Risk / Destructive</span>
          </div>
        );
      case 'warning':
        return (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2.5 py-0.5 rounded">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Elevated Risk</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-0.5 rounded">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Safe (Read-Only / Nominal)</span>
          </div>
        );
    }
  };

  return (
    <div className="my-3 rounded-lg border border-neutral-700/80 bg-neutral-900/95 shadow-xl text-neutral-200 overflow-hidden font-mono text-xs sm:text-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-neutral-950/70 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-semibold tracking-wide flex items-center gap-1">
            <span className="text-neutral-500">?</span> Translated Command
          </span>
          <span className="text-neutral-500">·</span>
          <span className="text-xs text-neutral-400 font-normal">
            {translation.engineUsed || 'Local Gemma Engine'}
          </span>
        </div>
        <div>{getSafetyBadge(translation.safetyLevel)}</div>
      </div>

      {/* Main command card */}
      <div className="p-3.5 space-y-3">
        {/* Command code block */}
        <div className="relative group rounded bg-black/80 border border-neutral-800 p-3">
          <div className="font-mono text-emerald-400 font-medium break-all select-all pr-12 text-sm leading-relaxed">
            <span className="text-neutral-600 select-none mr-2">$</span>
            {translation.command}
          </div>
          <button
            onClick={handleCopy}
            className="absolute top-2.5 right-2.5 p-1.5 rounded bg-neutral-800/90 text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors"
            title="Copy command to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Explanation */}
        <div className="text-xs sm:text-sm text-neutral-300 font-sans leading-relaxed">
          {translation.explanation}
        </div>

        {/* Flag breakdown */}
        {translation.flags && translation.flags.length > 0 && (
          <div className="pt-2 border-t border-neutral-800/80">
            <div className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-2 font-sans">
              Parameter Breakdown:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {translation.flags.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-neutral-950/40 p-1.5 rounded border border-neutral-800/60">
                  <code className="text-amber-400 font-bold shrink-0">{item.flag}</code>
                  <span className="text-neutral-400 font-sans text-xs">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-neutral-800 font-sans">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onExecute(translation.command)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-sm cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Execute Command</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] bg-emerald-800/80 rounded border border-emerald-700">Enter</kbd>
            </button>

            <button
              onClick={() => onEdit(translation.command)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 hover:text-white transition-all cursor-pointer border border-neutral-700"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit in Prompt</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] bg-neutral-700 rounded border border-neutral-600">Tab</kbd>
            </button>
          </div>

          <button
            onClick={onCancel}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/80 transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] bg-neutral-800 rounded border border-neutral-700">Esc</kbd>
          </button>
        </div>
      </div>
    </div>
  );
};
