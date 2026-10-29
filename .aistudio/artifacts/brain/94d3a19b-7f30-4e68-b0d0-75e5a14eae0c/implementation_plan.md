# BashAI: Local Small LLM-Powered Linux Server Administration Shell

BashAI provides a high-fidelity interactive Linux shell terminal with an intelligent English-to-Bash translation engine designed to run with **small locally hosted LLM models** (such as Gemma 2B, Gemma 4 E2B, or Llama 3.2 via Ollama, llama.cpp, or local inference servers). System administrators can manage their infrastructure with standard bash commands or prefix plain English queries with `?` (e.g., `? check memory usage` or `? compress logs older than 7 days`) to generate structured, safe bash commands directly on-device without cloud dependencies.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed and govern the revised architecture:

- **Confirmed Local Small LLM Engine (Revised)**: Native support for small on-machine models such as **Gemma 2B / Gemma 4 E2B**, running locally via Ollama (`http://localhost:11434`), llama.cpp server, or OpenAI-compatible local daemons. A model configuration drawer lets users configure their local endpoint, test connection latency, or switch models.
- **Embedded Zero-Config Local Engine**: To guarantee immediate functionality out-of-the-box, the application includes a built-in local pattern and rule compiler for hundreds of sysadmin tasks, so users can test immediately while connecting their local Ollama/Gemma instance.
- **Confirmed Trigger Syntax**: Queries prefixed with `?` (e.g., `? check open ports` or `? restart failed systemd services`) invoke the translation engine; regular inputs execute as standard bash commands.
- **Confirmed Execution & Safety Policy**: Every generated bash command presents an interactive dry-run preview card inside the terminal with an explanation, risk level assessment (Safe, Warning, Destructive), flag breakdown, and quick keyboard actions (`[Enter] Run`, `[Tab] Edit in prompt`, `[Esc] Cancel`).
- **Confirmed Shell & Tooling Experience**: Rich interactive Linux terminal with an active virtual Linux filesystem (`/var/log`, `/etc`, `/proc`, `/home/admin`), live server resource monitor (CPU, RAM, Disk partitions, active services), and session script recorder.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms natural language server administration queries into structured, validated Linux CLI commands using small, fast local models (Gemma 2B / Gemma 4 E2B). Eliminates memorization hurdles while preserving full offline capability and data privacy.
- **Target Audience / Persona**: DevOps engineers, server admins, and homelab / edge server operators who require air-gapped, private, or low-latency CLI assistance without sending terminal telemetry to third-party cloud services.
- **Key Value**: Real-time translation on commodity CPUs/GPUs, absolute privacy for server hostnames/IPs/passwords, and intelligent safety guardrails preventing catastrophic accidental deletions.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Local LLM Status & Endpoint Config**:
   - The top navigation bar displays the active model badge: `Engine: Gemma 2B (Local Ollama)` with connection status and latency.
   - Clicking opens a concise Local Model Settings modal allowing custom endpoint configuration (`http://localhost:11434`, `http://localhost:8080`), model selector (`gemma:2b`, `gemma:7b`, `llama3.2:1b`, `custom`), and setup instructions (`ollama run gemma:2b`).
2. **Interactive Natural Language Shell Execution**:
   - User types: `? find all docker containers using more than 1GB ram`
   - Prompt accent highlights in cyan with a local inference indicator.
   - The terminal renders an inline translation preview card:
     - **Synthesized Command**: `docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}" | sort -k 2 -hr`
     - **Flag Breakdown**: Detailed explanation of `--no-stream`, `--format`, and the piped `sort`.
     - **Safety Rating**: `Safe (Read-Only)`.
     - **Action Keys**: Press `Enter` to run in the virtual shell, `Tab` to insert into the input line for manual edits, or `Esc` to cancel.
3. **Simulated Server Administration & Virtual FS**:
   - Real-time command execution with stdout/stderr formatting for `systemctl`, `journalctl`, `ps`, `top`, `df`, `grep`, `find`, `curl`, and standard filesystem navigation.
4. **Live Server Telemetry Sidebar**:
   - Collapsible panel showcasing real-time CPU, RAM, Disk partition usage, listening ports, and service statuses (`nginx`, `postgresql`, `docker`).
5. **Session Script Exporter**:
   - Export successful commands as an annotated `.sh` bash script with generated documentation comments.

### Visual Identity & Theme

- **Aesthetic Direction**: High-precision utilitarian developer console inspired by modern terminal emulators (Ghostty, Alacritty) paired with clean SaaS telemetry dashboards.
- **Color Palette & Theme Tokens**:
  - Canvas: Deep obsidian slate (`--background: #0B0F17`)
  - Terminal Surface: Dark terminal pane (`--surface: #111827`, border `#1F2937`)
  - Accent / Focus: Electric emerald (`--accent: #10B981`) and cyan prompt (`#06B6D4`)
  - Warning / Risk: Warm amber (`#F59E0B`) and crimson alert (`#EF4444`)
  - Text: Bright terminal output (`#F9FAFB`), muted comments/flags (`#9CA3AF`)
- **Typography & Hierarchy**:
  - Terminal & Code: `JetBrains Mono` / `font-mono` with `tabular-nums` for alignment of PIDs, timestamps, file sizes, and memory offsets.
  - Interface Headers & Controls: `Plus Jakarta Sans` for clean, modern readability.
- **Zero-Pill Discipline & Anti-Slop**:
  - Clean unboxed metadata with typographic separators (`·`, `/`).
  - Strict absence of decorative pulsing dots, fake version tags, or comment header clichés.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Local LLM Integration Architecture (Ollama / LocalAI / Gemma)
- **Chosen Approach**: Full-stack backend proxy (`/api/translate`) supporting both local inference backends (Ollama `POST /api/generate` or `/v1/chat/completions` with Gemma prompt format) and Gemini API as an optional fallback when local Ollama is offline.
- **Why**: Allows users running Gemma 2B / Gemma 4 E2B locally on their machine or server to achieve zero-cost, private translation, while retaining immediate full functionality via proxying or fallback.
- **Prompt Engineering for Small Models**: Uses Gemma-specific prompt formatting (`<start_of_turn>user ... <end_of_turn><start_of_turn>model...`) with strict JSON schema instructions so that 2B parameter models produce clean, structured commands without hallucinated commentary.

### Decision 2: Stateful Virtual Linux Filesystem & Command Simulator
- **Chosen Approach**: In-memory stateful Linux file tree (`/etc`, `/var/log`, `/home/admin`, `/usr/bin`, `/tmp`, `/proc`) with real directory traversal, file inspection, and process management.
- **Why**: Gives administrators a realistic playground to safely test destructive or complex translated commands without bricking their host OS.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BASHAI SHELL INTERFACE                          │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ┌──────────────────────────────────┐  ┌───────────────────────────┐  │
│   │        TOP NAVIGATION BAR        │  │   ENGINE & SERVER VITALS  │  │
│   │ BashAI · Host: srv-01 · bash 5.2 │  │ [Gemma 2B Local] · CPU 18%│  │
│   └──────────────────────────────────┘  └───────────────────────────┘  │
│                                                                        │
│   ┌──────────────────────────────────────┐  ┌────────────────────────┐ │
│   │           TERMINAL WORKSPACE         │  │     SERVER MONITOR     │ │
│   │                                      │  │                        │ │
│   │  [admin@srv-01 ~]$ ? find big files  │  │  · Active Services     │ │
│   │  ┌────────────────────────────────┐  │  │    nginx (active)      │ │
│   │  │ TRANSLATION PREVIEW CARD       │  │  │    docker (active)     │ │
│   │  │ Model: Gemma 2B (Local Engine) │  │  │    postgresql (active) │ │
│   │  │ Command: find /var -size +100M │  │  │                        │ │
│   │  │ Risk: Safe · [Run] [Edit] [Esc]│  │  │  · Storage Partitions  │ │
│   │  └────────────────────────────────┘  │  │    /dev/sda1  38%      │ │
│   │  [admin@srv-01 ~]$                   │  │                        │ │
│   │                                      │  │  · Local LLM Config    │ │
│   │  Interactive Input + Tab Completion  │  │    Ollama :11434 [OK]  │ │
│   └──────────────────────────────────────┘  └────────────────────────┘ │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                         POST /api/translate
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    NODE.JS EXPRESS BACKEND PROXY                       │
│                                                                        │
│  - Routes:                                                             │
│    · POST /api/translate (dispatches to selected engine)               │
│    · GET  /api/health-check (pings local Ollama/Gemma server)          │
│                                                                        │
│  - Inference Engines Supported:                                        │
│    1. Local Ollama Engine (Gemma 2B / Gemma 4 E2B, Llama 3.2)          │
│    2. Local OpenAI-Compatible Server (llama.cpp, vLLM, LocalAI)        │
│    3. Embedded Smart Sysadmin Rule Compiler (zero-latency fallback)    │
│    4. Server-Side Gemini API (optional cloud backup)                   │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State

- **`ModelConfig`**: `{ provider: 'ollama' | 'localai' | 'gemini' | 'embedded', endpoint: string, modelName: string, isConnected: boolean }`
- **`TranslatedCommand`**: `{ command: string, explanation: string, safetyLevel: 'safe' | 'warning' | 'destructive', flags: { flag: string, desc: string }[], dangerousTokens?: string[], engineUsed: string }`
- **`TerminalHistoryItem`**: `{ id: string, type: 'command' | 'output' | 'preview' | 'error', text?: string, timestamp: number, commandData?: TranslatedCommand, exitCode?: number }`
- **`VirtualFileSystem`**: Stateful tree structure supporting `cd`, `ls`, `mkdir`, `rm`, `cat`, `echo`, `touch`, `grep`, `find`.
- **`ServerState`**: Hostname, uptime, load averages, process table (PID, CPU, MEM, CMD), and service daemons.

### Interactive Component & State Mapping

- **Input Prompt (`?` prefix detector)**: Toggles AI query mode when `?` is entered. On Enter, calls `/api/translate` passing current working directory and context.
- **Model Config Modal**: Allows testing local Ollama connection, switching between Gemma 2B, Gemma 4 E2B, or embedded offline parser, with copyable setup instructions (`ollama run gemma:2b`).
- **Inline Preview Card**: Captures `Enter` (run), `Tab` (paste to prompt), `Esc` (dismiss).
- **Execution & Shell Output**: Evaluates command in virtual shell, renders syntax-highlighted terminal output, updates virtual server state.
