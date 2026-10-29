import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// Initialize GoogleGenAI client utility for server-side usage if API key is present
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

interface TranslateRequest {
  prompt: string;
  cwd?: string;
  modelConfig?: {
    provider?: 'ollama' | 'localai' | 'gemini' | 'auto';
    endpoint?: string;
    modelName?: string;
  };
}

interface CommandFlag {
  flag: string;
  desc: string;
}

interface TranslationResult {
  command: string;
  explanation: string;
  flags: CommandFlag[];
  safetyLevel: 'safe' | 'warning' | 'destructive';
  dangerousTokens?: string[];
  engineUsed: string;
}

// Built-in intelligent rule & pattern matcher for common sysadmin queries
// Ensures instant, rock-solid response even when offline or testing without a running Ollama daemon
function generateSysadminRuleMatch(prompt: string, cwd: string = '/home/admin'): TranslationResult | null {
  const q = prompt.trim().toLowerCase();

  // Port and socket inspection
  if (q.includes('port') || q.includes('listening') || q.includes('sockets')) {
    const portMatch = q.match(/\b(?:port\s*)?(\d{2,5})\b/);
    if (portMatch) {
      const port = portMatch[1];
      if (q.includes('kill') || q.includes('free') || q.includes('terminate')) {
        return {
          command: `lsof -ti :${port} | xargs -r kill -9`,
          explanation: `Finds any active process listening on port ${port} and safely terminates it to free up the socket.`,
          flags: [
            { flag: '-t', desc: 'Terse output showing process IDs only' },
            { flag: '-i', desc: `Selects IPv4 and IPv6 network files on port ${port}` },
            { flag: '-r', desc: 'xargs flag to not run command if stdin is empty' },
            { flag: '-9', desc: 'SIGKILL signal to force immediate process termination' }
          ],
          safetyLevel: 'warning',
          dangerousTokens: ['kill -9'],
          engineUsed: 'Rule-Based Engine (Gemma Offline Spec)'
        };
      }
      return {
        command: `ss -tulpn | grep :${port}`,
        explanation: `Inspects all TCP and UDP listening sockets and filters for port ${port} along with the owning process names and PIDs.`,
        flags: [
          { flag: '-t', desc: 'Display TCP sockets' },
          { flag: '-u', desc: 'Display UDP sockets' },
          { flag: '-l', desc: 'Show only listening sockets' },
          { flag: '-p', desc: 'Show process using socket' },
          { flag: '-n', desc: 'Do not resolve service names (numeric ports)' }
        ],
        safetyLevel: 'safe',
        engineUsed: 'Rule-Based Engine (Gemma Offline Spec)'
      };
    }
    return {
      command: `ss -tulpn`,
      explanation: `Lists all listening TCP and UDP sockets with numeric port numbers and owning process details.`,
      flags: [
        { flag: '-t', desc: 'Display TCP sockets' },
        { flag: '-u', desc: 'Display UDP sockets' },
        { flag: '-l', desc: 'Show only listening sockets' },
        { flag: '-p', desc: 'Show process using socket' },
        { flag: '-n', desc: 'Show numeric port and address numbers' }
      ],
      safetyLevel: 'safe',
      engineUsed: 'Rule-Based Engine (Gemma Offline Spec)'
    };
  }

  // Memory & RAM usage
  if (q.includes('memory') || q.includes('ram') || q.includes('swap')) {
    if (q.includes('top') || q.includes('highest') || q.includes('consume') || q.includes('eating') || q.includes('process')) {
      return {
        command: `ps aux --sort=-%mem | awk 'NR<=11{print $1,$2,$3,$4,$11}'`,
        explanation: `Lists the top 10 memory-consuming processes sorted in descending order of RAM consumption.`,
        flags: [
          { flag: 'aux', desc: 'Show processes for all users with terminal & process details' },
          { flag: '--sort=-%mem', desc: 'Sort processes by memory percentage in descending order' }
        ],
        safetyLevel: 'safe',
        engineUsed: 'Rule-Based Engine (Gemma Offline Spec)'
      };
    }
    return {
      command: `free -h --si`,
      explanation: `Displays total, used, available, and swap memory in human-readable gigabyte/megabyte format.`,
      flags: [
        { flag: '-h', desc: 'Human readable output in powers of 1024 (GiB, MiB)' },
        { flag: '--si', desc: 'Show power of 1000 standard metric units' }
      ],
      safetyLevel: 'safe',
      engineUsed: 'Rule-Based Engine (Gemma Offline Spec)'
    };
  }

  // Disk space and storage
  if (q.includes('disk') || q.includes('storage') || q.includes('filesystem') || q.includes('space') || q.includes('partition')) {
    if (q.includes('big') || q.includes('large') || q.includes('largest') || q.includes('size')) {
      const targetDir = q.includes('var') ? '/var/log' : (cwd || '/var');
      return {
        command: `find ${targetDir} -xdev -type f -size +50M -exec ls -lh {} + 2>/dev/null | sort -k 5 -hr | head -n 10`,
        explanation: `Finds files larger than 50MB in ${targetDir} on the same filesystem, formats sizes human-readably, and shows the top 10 largest.`,
        flags: [
          { flag: '-xdev', desc: 'Do not traverse directories on other filesystems (protects network mounts)' },
          { flag: '-type f', desc: 'Matches regular files only' },
          { flag: '-size +50M', desc: 'Filters files strictly exceeding 50 megabytes' },
          { flag: '-exec ls -lh {} +', desc: 'Executes human-readable file listing in batch mode' }
        ],
        safetyLevel: 'safe',
        engineUsed: 'Rule-Based Engine (Gemma Offline Spec)'
      };
    }
    return {
      command: `df -hT --exclude-type=tmpfs --exclude-type=devtmpfs`,
      explanation: `Shows disk usage and free space across all physical mounted storage volumes with filesystem types in human-readable sizes.`,
      flags: [
        { flag: '-h', desc: 'Human-readable sizes (GB/MB)' },
        { flag: '-T', desc: 'Print filesystem type (ext4, xfs, btrfs)' },
        { flag: '--exclude-type', desc: 'Hides virtual in-memory temporary filesystems' }
      ],
      safetyLevel: 'safe',
      engineUsed: 'Rule-Based Engine (Gemma Offline Spec)'
    };
  }

  // Finding files & compressing logs
  if (q.includes('compress') || q.includes('gzip') || (q.includes('log') && q.includes('clean'))) {
    return {
      command: `find /var/log -type f -name "*.log" -size +100M -exec gzip -v {} +`,
      explanation: `Scans /var/log for uncompressed log files larger than 100MB and compresses them with gzip while preserving timestamps.`,
      flags: [
        { flag: '-type f', desc: 'Selects regular files' },
        { flag: '-name "*.log"', desc: 'Filters for files ending in .log' },
        { flag: '-size +100M', desc: 'Only files greater than 100 Megabytes' },
        { flag: '-v', desc: 'Verbose gzip output showing compression ratio' }
      ],
      safetyLevel: 'warning',
      dangerousTokens: ['gzip -v'],
      engineUsed: 'Rule-Based Engine (Gemma Offline Spec)'
    };
  }

  // Delete old files / cleanup /tmp
  if (q.includes('delete') || q.includes('remove') || q.includes('clean') || q.includes('purge')) {
    if (q.includes('tmp') || q.includes('temp') || q.includes('cache')) {
      return {
        command: `find /tmp -type f -atime +7 -delete`,
        explanation: `Finds and deletes temporary files in /tmp that have not been accessed in over 7 days.`,
        flags: [
          { flag: '-type f', desc: 'Target only regular files' },
          { flag: '-atime +7', desc: 'Accessed more than 7 days ago' },
          { flag: '-delete', desc: 'Removes matched files directly without spawning subshells' }
        ],
        safetyLevel: 'destructive',
        dangerousTokens: ['-delete'],
        engineUsed: 'Rule-Based Engine (Gemma Offline Spec)'
      };
    }
    if (q.includes('log')) {
      return {
        command: `journalctl --vacuum-time=7d`,
        explanation: `Safely vacuums and purges systemd journal log archives older than 7 days, freeing disk space.`,
        flags: [
          { flag: '--vacuum-time=7d', desc: 'Removes journal files older than 7 days' }
        ],
        safetyLevel: 'warning',
        dangerousTokens: ['--vacuum-time'],
        engineUsed: 'Rule-Based Engine (Gemma Offline Spec)'
      };
    }
  }

  // Service management (systemctl)
  if (q.includes('service') || q.includes('systemctl') || q.includes('restart') || q.includes('nginx') || q.includes('docker') || q.includes('postgres') || q.includes('mysql')) {
    const serviceName = q.includes('nginx') ? 'nginx' : q.includes('docker') ? 'docker' : q.includes('postgres') ? 'postgresql' : q.includes('mysql') ? 'mysql' : q.includes('ssh') ? 'sshd' : 'nginx';
    
    if (q.includes('restart') || q.includes('reload')) {
      return {
        command: `systemctl restart ${serviceName} && systemctl status ${serviceName} --no-pager`,
        explanation: `Restarts the ${serviceName} daemon and immediately outputs its active unit status without pagination.`,
        flags: [
          { flag: 'restart', desc: `Stops and restarts the specified ${serviceName} service` },
          { flag: '--no-pager', desc: 'Prints output directly to terminal without opening less/more pager' }
        ],
        safetyLevel: 'warning',
        dangerousTokens: ['systemctl restart'],
        engineUsed: 'Rule-Based Engine (Gemma Offline Spec)'
      };
    }

    if (q.includes('log') || q.includes('error') || q.includes('failed')) {
      return {
        command: `journalctl -u ${serviceName} -n 50 --no-pager -p err..notice`,
        explanation: `Fetches the last 50 log entries for ${serviceName} filtered for warnings and errors without pagination.`,
        flags: [
          { flag: '-u', desc: `Filter logs specifically by systemd unit (${serviceName})` },
          { flag: '-n 50', desc: 'Show the 50 most recent journal lines' },
          { flag: '-p err..notice', desc: 'Filter by priority from error to notice' },
          { flag: '--no-pager', desc: 'Direct stdout output' }
        ],
        safetyLevel: 'safe',
        engineUsed: 'Rule-Based Engine (Gemma Offline Spec)'
      };
    }

    return {
      command: `systemctl status ${serviceName} --no-pager`,
      explanation: `Checks current runtime status, PID, memory consumption, and recent log messages for ${serviceName}.`,
      flags: [
        { flag: 'status', desc: 'Displays runtime status of service' },
        { flag: '--no-pager', desc: 'Prevents interactive pager output' }
      ],
      safetyLevel: 'safe',
      engineUsed: 'Rule-Based Engine (Gemma Offline Spec)'
    };
  }

  // Docker inspection
  if (q.includes('docker') || q.includes('container')) {
    if (q.includes('stats') || q.includes('cpu') || q.includes('mem') || q.includes('usage')) {
      return {
        command: `docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"`,
        explanation: `Produces a single-snapshot tabular view of CPU, Memory, and Network I/O metrics across all running Docker containers.`,
        flags: [
          { flag: '--no-stream', desc: 'Outputs the first data snapshot and exits immediately instead of continuous polling' },
          { flag: '--format', desc: 'Custom tabular output layout' }
        ],
        safetyLevel: 'safe',
        engineUsed: 'Rule-Based Engine (Gemma Offline Spec)'
      };
    }
    return {
      command: `docker ps -a --format "table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}"`,
      explanation: `Lists all Docker containers (both running and stopped) with container IDs, names, uptime status, and port bindings.`,
      flags: [
        { flag: '-a', desc: 'Show all containers, not just currently running ones' },
        { flag: '--format', desc: 'Formats output as a clean aligned table' }
      ],
      safetyLevel: 'safe',
      engineUsed: 'Rule-Based Engine (Gemma Offline Spec)'
    };
  }

  // CPU and load average
  if (q.includes('cpu') || q.includes('load') || q.includes('bottleneck')) {
    return {
      command: `top -b -n 1 | head -n 20`,
      explanation: `Captures a batch snapshot of current server load averages, CPU state percentages, and top active tasks.`,
      flags: [
        { flag: '-b', desc: 'Batch mode operation suitable for non-interactive output' },
        { flag: '-n 1', desc: 'Take 1 iteration then exit' }
      ],
      safetyLevel: 'safe',
      engineUsed: 'Rule-Based Engine (Gemma Offline Spec)'
    };
  }

  // Network / IP / DNS check
  if (q.includes('ip') || q.includes('network') || q.includes('interface') || q.includes('dns')) {
    return {
      command: `ip -br -c addr show`,
      explanation: `Displays a brief, colorized table of network interfaces with their link states (UP/DOWN) and assigned IPv4/IPv6 addresses.`,
      flags: [
        { flag: '-br', desc: 'Brief tabular output format' },
        { flag: '-c', desc: 'Colorize output' }
      ],
      safetyLevel: 'safe',
      engineUsed: 'Rule-Based Engine (Gemma Offline Spec)'
    };
  }

  return null;
}

// Function to call local LLM (llama.cpp on port 8888, Ollama, or OpenAI-compatible server)
async function callLocalLLM(prompt: string, endpoint: string, modelName: string, cwd: string): Promise<TranslationResult | null> {
  const cleanEndpoint = (endpoint || 'http://localhost:8888').replace(/\/+$/, '');
  const baseEndpoint = cleanEndpoint.replace(/\/v1\/?$/, '');
  const model = modelName || 'gemma-2b-it';

  const isLlamaCpp = cleanEndpoint.includes('8888') || cleanEndpoint.includes('llamacpp');

  const systemPrompt = `You are a Linux server administration assistant.
Translate the user's natural language request into a single structured, safe, production-grade Linux Bash command.
Current working directory: ${cwd}

Respond ONLY with a valid JSON object matching this schema:
{
  "command": "string (the exact bash command)",
  "explanation": "string (concise explanation of what the command does)",
  "flags": [
    { "flag": "string", "desc": "string" }
  ],
  "safetyLevel": "safe" | "warning" | "destructive",
  "dangerousTokens": ["string"]
}

Guidelines:
- Prefer modern Linux tools (ss over netstat, ip over ifconfig).
- Flag any destructive commands (rm, wipefs, dd, kill, mkfs, fdisk) as "destructive" or "warning".
- Return pure valid JSON only without markdown formatting.`;

  // Helper to extract JSON from model text
  const extractJson = (rawText: string): any => {
    try {
      return JSON.parse(rawText.trim());
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {}
      }
    }
    return null;
  };

  // 1. If llama.cpp / port 8888 or OpenAI format, query /v1/chat/completions first
  if (isLlamaCpp || cleanEndpoint.includes('v1') || cleanEndpoint.includes('openai')) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${baseEndpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = extractJson(content);
          if (parsed && parsed.command) {
            return {
              command: parsed.command,
              explanation: parsed.explanation || 'Generated by local llama.cpp server.',
              flags: Array.isArray(parsed.flags) ? parsed.flags : [],
              safetyLevel: parsed.safetyLevel || 'safe',
              dangerousTokens: parsed.dangerousTokens || [],
              engineUsed: `llama.cpp Server (${model} on port ${cleanEndpoint.split(':').pop() || '8888'})`
            };
          }
        }
      }
    } catch {
      // Failed to connect to llama.cpp /v1/chat/completions
    }

    // Try llama.cpp native /completion endpoint if /v1 was not enabled
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${baseEndpoint}/completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `<|system|>\n${systemPrompt}<|user|>\n${prompt}<|assistant|>\n`,
          n_predict: 256,
          temperature: 0.1,
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const content = data.content;
        if (content) {
          const parsed = extractJson(content);
          if (parsed && parsed.command) {
            return {
              command: parsed.command,
              explanation: parsed.explanation || 'Generated by local llama.cpp server.',
              flags: Array.isArray(parsed.flags) ? parsed.flags : [],
              safetyLevel: parsed.safetyLevel || 'safe',
              dangerousTokens: parsed.dangerousTokens || [],
              engineUsed: `llama.cpp Server (port 8888)`
            };
          }
        }
      }
    } catch {}
  }

  // 2. Try Ollama endpoint /api/generate
  try {
    const formattedPrompt = `<start_of_turn>user\n${systemPrompt}\n\nUser query: ${prompt}<end_of_turn>\n<start_of_turn>model\n`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(`${baseEndpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: formattedPrompt,
        stream: false,
        format: 'json',
        options: { temperature: 0.1, top_p: 0.9 },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const rawText = data.response;
      if (rawText) {
        const parsed = extractJson(rawText);
        if (parsed && parsed.command) {
          return {
            command: parsed.command,
            explanation: parsed.explanation || 'Generated by local Gemma model.',
            flags: Array.isArray(parsed.flags) ? parsed.flags : [],
            safetyLevel: parsed.safetyLevel || 'safe',
            dangerousTokens: parsed.dangerousTokens || [],
            engineUsed: `Local Engine (${model} via Ollama)`
          };
        }
      }
    }
  } catch {}

  // 3. Fallback generic /v1/chat/completions (OpenAI Compatible)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${baseEndpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        const parsed = extractJson(content);
        if (parsed && parsed.command) {
          return {
            command: parsed.command,
            explanation: parsed.explanation || 'Generated by local model.',
            flags: Array.isArray(parsed.flags) ? parsed.flags : [],
            safetyLevel: parsed.safetyLevel || 'safe',
            dangerousTokens: parsed.dangerousTokens || [],
            engineUsed: `Local Server (${model})`
          };
        }
      }
    }
  } catch {}

  return null;
}

// Function to call Gemini API if key is present
async function callGemini(prompt: string, cwd: string): Promise<TranslationResult | null> {
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Translate this plain English server administration query into a structured, production-grade Linux Bash command.
Current working directory: ${cwd}
User Query: "${prompt}"`,
      config: {
        systemInstruction: `You are an expert Linux system administrator assistant. Transform English inputs into concise, safe, single-line Bash commands.
Analyze command safety:
- "safe": read-only inspection (ls, ps, ss, df, journalctl, cat, grep)
- "warning": service reloads, systemctl restarts, file moves, non-destructive archives
- "destructive": deletes (rm, kill -9, shred, dd, wipefs, mkfs, truncate)
Break down any flags or pipes used. Return JSON strictly matching the response schema.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            command: { type: Type.STRING, description: 'The exact bash command to execute' },
            explanation: { type: Type.STRING, description: 'Clear explanation of what the command does' },
            safetyLevel: {
              type: Type.STRING,
              description: 'Risk assessment: safe, warning, or destructive',
            },
            flags: {
              type: Type.ARRAY,
              description: 'Breakdown of flags and arguments',
              items: {
                type: Type.OBJECT,
                properties: {
                  flag: { type: Type.STRING },
                  desc: { type: Type.STRING },
                },
                required: ['flag', 'desc'],
              },
            },
            dangerousTokens: {
              type: Type.ARRAY,
              description: 'Any high risk tokens detected',
              items: { type: Type.STRING },
            },
          },
          required: ['command', 'explanation', 'safetyLevel', 'flags'],
        },
      },
    });

    const text = response.text;
    if (text) {
      const parsed = JSON.parse(text);
      return {
        command: parsed.command,
        explanation: parsed.explanation,
        flags: parsed.flags || [],
        safetyLevel: parsed.safetyLevel || 'safe',
        dangerousTokens: parsed.dangerousTokens || [],
        engineUsed: 'Gemini Cloud Engine (Gemma-Trained Fallback)',
      };
    }
  } catch (error) {
    console.error('Gemini API call failed:', error);
  }
  return null;
}

// Endpoint: Health check for local model and server
app.get('/api/health-check', async (req: Request, res: Response) => {
  const endpoint = (typeof req.query.endpoint === 'string' ? req.query.endpoint : 'http://localhost:8888').replace(/\/+$/, '');
  const baseEndpoint = endpoint.replace(/\/v1\/?$/, '');

  let isConnected = false;
  let backendType = 'unknown';
  let models: string[] = [];

  // 1. Check llama.cpp / OpenAI /v1/models or /health
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const resp = await fetch(`${baseEndpoint}/v1/models`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (resp.ok) {
      isConnected = true;
      backendType = 'llamacpp';
      const data = await resp.json();
      if (Array.isArray(data.data)) {
        models = data.data.map((m: { id?: string }) => m.id || '').filter(Boolean);
      }
    }
  } catch {}

  // 2. Check llama.cpp /health endpoint
  if (!isConnected) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      const resp = await fetch(`${baseEndpoint}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (resp.ok) {
        isConnected = true;
        backendType = 'llamacpp';
        models = ['gemma-2b-it (llama.cpp)'];
      }
    } catch {}
  }

  // 3. Check Ollama /api/tags
  if (!isConnected) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const resp = await fetch(`${baseEndpoint}/api/tags`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (resp.ok) {
        isConnected = true;
        backendType = 'ollama';
        const data = await resp.json();
        if (Array.isArray(data.models)) {
          models = data.models.map((m: { name?: string }) => m.name || '').filter(Boolean);
        }
      }
    } catch {}
  }

  res.json({
    status: 'ok',
    ollamaConnected: isConnected,
    isConnected,
    backendType,
    endpoint,
    detectedModels: models,
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    embeddedEngineReady: true,
  });
});

// Endpoint: Translate natural language query
app.post('/api/translate', async (req: Request, res: Response) => {
  try {
    const { prompt, cwd = '/home/admin', modelConfig } = req.body as TranslateRequest;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    const provider = modelConfig?.provider || 'auto';
    const endpoint = modelConfig?.endpoint || 'http://localhost:11434';
    const modelName = modelConfig?.modelName || 'gemma:2b';

    let result: TranslationResult | null = null;

    // 1. If user specifically requested local or auto, attempt local inference first
    if (provider === 'ollama' || provider === 'localai' || provider === 'auto') {
      result = await callLocalLLM(prompt, endpoint, modelName, cwd);
    }

    // 2. If local wasn't available or returned null, try the high-accuracy offline sysadmin rule compiler
    if (!result) {
      const ruleResult = generateSysadminRuleMatch(prompt, cwd);
      if (ruleResult) {
        result = ruleResult;
      }
    }

    // 3. If still unresolved and Gemini is enabled, use Gemini
    if (!result && ai) {
      result = await callGemini(prompt, cwd);
    }

    // 4. Fallback default if not matched by rules and offline
    if (!result) {
      result = {
        command: `echo "Query: ${prompt.replace(/"/g, '\\"')}" && man bash`,
        explanation: `Unable to connect to local Gemma model at ${endpoint} and no exact offline template matched. Check your Ollama daemon status.`,
        flags: [{ flag: 'man bash', desc: 'Displays standard Linux command manual' }],
        safetyLevel: 'safe',
        engineUsed: 'Offline Fallback Handler',
      };
    }

    res.json(result);
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({
      error: 'Failed to process command translation',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Endpoint: Explain any arbitrary command
app.post('/api/explain', async (req: Request, res: Response) => {
  try {
    const { command } = req.body;
    if (!command) {
      res.status(400).json({ error: 'Command is required' });
      return;
    }

    // First try rule matching
    const ruleMatch = generateSysadminRuleMatch(command);
    if (ruleMatch && ruleMatch.command === command) {
      res.json(ruleMatch);
      return;
    }

    if (ai) {
      const resp = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Explain this Linux bash command in detail: "${command}".
Break down each flag, pipe, and parameter. Rate its safety (safe, warning, or destructive).`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              command: { type: Type.STRING },
              explanation: { type: Type.STRING },
              safetyLevel: { type: Type.STRING },
              flags: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    flag: { type: Type.STRING },
                    desc: { type: Type.STRING },
                  },
                  required: ['flag', 'desc'],
                },
              },
            },
            required: ['command', 'explanation', 'safetyLevel', 'flags'],
          },
        },
      });

      if (resp.text) {
        res.json(JSON.parse(resp.text));
        return;
      }
    }

    res.json({
      command,
      explanation: `Executes the command '${command}' in the active shell environment.`,
      safetyLevel: command.includes('rm') || command.includes('kill') ? 'destructive' : 'safe',
      flags: [],
      engineUsed: 'Rule-Based Parser',
    });
  } catch (error) {
    res.status(500).json({ error: 'Explanation failed' });
  }
});

// Endpoint: Serve bashai.sh directly for native Linux terminal / SSH sessions
app.get('/bashai.sh', (_req: Request, res: Response) => {
  const filePath = path.join(__dirname, 'public', 'bashai.sh');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.sendFile(filePath);
  }
  res.status(404).send('bashai.sh not found');
});

// Endpoint: 1-line installer with configurable OpenAI / llama.cpp settings
app.get('/install.sh', (_req: Request, res: Response) => {
  const filePath = path.join(__dirname, 'public', 'install.sh');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.sendFile(filePath);
  }
  res.status(404).send('install.sh not found');
});



async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // In dev: mount Vite middlewares
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production: serve built assets from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`BashAI server running on http://0.0.0.0:${port}`);
  });
}

startServer();
