import { ModelConfig, TranslatedCommand } from '../types/terminal';

export async function translateQuery(
  prompt: string,
  cwd: string,
  modelConfig: ModelConfig
): Promise<TranslatedCommand> {
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        cwd,
        modelConfig: {
          provider: modelConfig.provider,
          endpoint: modelConfig.endpoint,
          modelName: modelConfig.modelName,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    return data as TranslatedCommand;
  } catch (error) {
    console.error('Translation fetch failed:', error);
    // Return graceful fallback with advice
    return {
      command: `echo "Error translating query: ${prompt}"`,
      explanation: 'Connection to translation backend failed. Please verify your connection or local Ollama daemon status.',
      flags: [],
      safetyLevel: 'safe',
      engineUsed: 'Client Fallback Alert',
    };
  }
}

export async function checkServerHealth(endpoint: string): Promise<{
  ollamaConnected: boolean;
  detectedModels: string[];
  hasGeminiKey: boolean;
}> {
  try {
    const res = await fetch(`/api/health-check?endpoint=${encodeURIComponent(endpoint)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Health check failed', e);
  }
  return {
    ollamaConnected: false,
    detectedModels: [],
    hasGeminiKey: false,
  };
}

export async function explainCommand(command: string): Promise<TranslatedCommand> {
  try {
    const res = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Explain failed', err);
  }
  return {
    command,
    explanation: `Executes the command '${command}' in the shell.`,
    flags: [],
    safetyLevel: 'safe',
    engineUsed: 'Rule-Based Parser',
  };
}
