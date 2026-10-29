import React from 'react';
import { ModelConfig } from '../types/terminal';
import { checkServerHealth } from '../services/commandTranslator';
import { X, Cpu, Check, Copy, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: ModelConfig;
  onSaveConfig: (newConfig: ModelConfig) => void;
}

export const ModelConfigModal: React.FC<Props> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [formData, setFormData] = React.useState<ModelConfig>(config);
  const [isTesting, setIsTesting] = React.useState(false);
  const [testStatus, setTestStatus] = React.useState<{
    tested: boolean;
    success: boolean;
    message: string;
    detectedModels: string[];
  }>({
    tested: false,
    success: false,
    message: '',
    detectedModels: [],
  });
  const [copiedCmd, setCopiedCmd] = React.useState<string | null>(null);

  React.useEffect(() => {
    setFormData(config);
  }, [config]);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestStatus({ tested: false, success: false, message: '', detectedModels: [] });
    try {
      const health = await checkServerHealth(formData.endpoint);
      if (health.ollamaConnected) {
        setTestStatus({
          tested: true,
          success: true,
          message: `Connected successfully to local engine at ${formData.endpoint}`,
          detectedModels: health.detectedModels,
        });
        setFormData((prev) => ({
          ...prev,
          isConnected: true,
          detectedModels: health.detectedModels,
        }));
      } else {
        setTestStatus({
          tested: true,
          success: false,
          message: `Could not reach local Ollama daemon at ${formData.endpoint}. The app's built-in offline sysadmin rule compiler is active and ready as fallback.`,
          detectedModels: [],
        });
        setFormData((prev) => ({
          ...prev,
          isConnected: false,
        }));
      }
    } catch {
      setTestStatus({
        tested: true,
        success: false,
        message: 'Connection attempt failed. Using embedded offline rule engine.',
        detectedModels: [],
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-700/80 rounded-xl shadow-2xl text-neutral-200 overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">Local Small LLM Model Engine</h2>
              <p className="text-xs text-neutral-400">Configure on-device inference (Gemma 2B / Gemma 4 E2B)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
          {/* Provider Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
              Inference Provider
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() =>
                  setFormData((p) => ({
                    ...p,
                    provider: 'llamacpp',
                    endpoint: 'http://localhost:8888',
                    modelName: 'gemma-2b-it',
                  }))
                }
                className={`p-2.5 rounded border text-left cursor-pointer transition-all ${
                  formData.provider === 'llamacpp' || formData.endpoint.includes('8888')
                    ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200'
                    : 'border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="font-semibold text-xs text-white">llama.cpp (Port 8888)</div>
                <div className="text-[11px] text-neutral-400 font-normal">OpenAI-compatible server</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setFormData((p) => ({
                    ...p,
                    provider: 'ollama',
                    endpoint: 'http://localhost:11434',
                    modelName: 'gemma:2b',
                  }))
                }
                className={`p-2.5 rounded border text-left cursor-pointer transition-all ${
                  formData.provider === 'ollama' && !formData.endpoint.includes('8888')
                    ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200'
                    : 'border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="font-semibold text-xs text-white">Ollama (Port 11434)</div>
                <div className="text-[11px] text-neutral-400 font-normal">Ollama daemon runtime</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setFormData((p) => ({
                    ...p,
                    provider: 'auto',
                  }))
                }
                className={`p-2.5 rounded border text-left cursor-pointer transition-all ${
                  formData.provider === 'auto'
                    ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
                    : 'border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="font-semibold text-xs text-white">Auto Fallback</div>
                <div className="text-[11px] text-neutral-400 font-normal">Local + offline rules</div>
              </button>
            </div>
          </div>

          {/* Endpoint URL & Model name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">OpenAI / LLM Endpoint URL</label>
              <input
                type="text"
                value={formData.endpoint}
                onChange={(e) => setFormData((p) => ({ ...p, endpoint: e.target.value }))}
                placeholder="http://localhost:8888"
                className="w-full px-3 py-2 rounded bg-neutral-950 border border-neutral-800 font-mono text-xs text-neutral-200 focus:outline-hidden focus:border-cyan-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">Model Name</label>
              <input
                type="text"
                value={formData.modelName}
                onChange={(e) => setFormData((p) => ({ ...p, modelName: e.target.value }))}
                placeholder="gemma-2b-it"
                className="w-full px-3 py-2 rounded bg-neutral-950 border border-neutral-800 font-mono text-xs text-neutral-200 focus:outline-hidden focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Connection Test Button & Alert */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors border border-neutral-700 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testing connection...' : 'Test Local Endpoint'}</span>
            </button>

            <div className="text-xs text-neutral-400">
              {formData.isConnected ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Connected
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Standby (Offline Ready)
                </span>
              )}
            </div>
          </div>

          {testStatus.tested && (
            <div
              className={`p-3 rounded text-xs font-sans border ${
                testStatus.success
                  ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-800/80 text-amber-300'
              }`}
            >
              <div className="font-semibold">{testStatus.message}</div>
              {testStatus.detectedModels.length > 0 && (
                <div className="mt-1 text-[11px] text-emerald-400/80 font-mono">
                  Installed models: {testStatus.detectedModels.join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Step-by-step setup helper */}
          <div className="p-3.5 rounded bg-neutral-950/80 border border-neutral-800/80 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>How to run Gemma 2B locally on Linux / Mac / WSL:</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded bg-black/60 border border-neutral-800/80">
                <span className="text-neutral-300 select-all">curl -fsSL https://ollama.com/install.sh | sh</span>
                <button
                  type="button"
                  onClick={() => handleCopy('curl -fsSL https://ollama.com/install.sh | sh', 'c1')}
                  className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 ml-2 shrink-0 cursor-pointer"
                >
                  {copiedCmd === 'c1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-black/60 border border-neutral-800/80">
                <span className="text-emerald-400 select-all">ollama run gemma:2b</span>
                <button
                  type="button"
                  onClick={() => handleCopy('ollama run gemma:2b', 'c2')}
                  className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 ml-2 shrink-0 cursor-pointer"
                >
                  {copiedCmd === 'c2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-neutral-400 font-sans">
              Gemma 2B requires ~1.6 GB of RAM and executes in under 200ms on CPU.
            </p>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 transition-all shadow-sm cursor-pointer"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
