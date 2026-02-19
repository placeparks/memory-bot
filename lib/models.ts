/**
 * Centralized model + provider definitions for all AI providers supported by OpenClaw.
 * Used by both onboarding (provider-config.tsx) and settings (agent-settings.tsx).
 *
 * Provider IDs must match the Prisma AIProvider enum values.
 * Model IDs use the OpenClaw format: "provider/model-name".
 */

export interface ModelOption {
  id: string
  name: string
  description: string
}

export interface ProviderDefinition {
  id: string // matches AIProvider enum
  name: string
  description: string
  badge?: string
  models: ModelOption[]
  defaultModel: string
  getKeyUrl: string
  envVar: string // environment variable name for the API key
  noKeyRequired?: boolean // true for local providers like Ollama
}

export const PROVIDERS: ProviderDefinition[] = [
  {
    id: 'ANTHROPIC',
    name: 'Anthropic',
    description: 'Claude models — best reasoning and long context',
    badge: 'Recommended',
    defaultModel: 'anthropic/claude-sonnet-4-5-20250929',
    getKeyUrl: 'https://console.anthropic.com/settings/keys',
    envVar: 'ANTHROPIC_API_KEY',
    models: [
      { id: 'anthropic/claude-opus-4-6', name: 'Claude Opus 4.6', description: 'Most powerful, extended thinking' },
      { id: 'anthropic/claude-opus-4-5', name: 'Claude Opus 4.5', description: 'Previous flagship' },
      { id: 'anthropic/claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', description: 'Balanced' },
      { id: 'anthropic/claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', description: 'Fast & cheap' },
    ],
  },
  {
    id: 'OPENAI',
    name: 'OpenAI',
    description: 'GPT & o-series — fast and versatile',
    defaultModel: 'openai/gpt-5.2',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    envVar: 'OPENAI_API_KEY',
    models: [
      { id: 'openai/gpt-5.3-codex', name: 'GPT-5.3 Codex', description: 'Latest codex model' },
      { id: 'openai/gpt-5.2', name: 'GPT-5.2', description: 'Latest flagship' },
      { id: 'openai/gpt-5.2-codex', name: 'GPT-5.2 Codex', description: 'Code specialist' },
      { id: 'openai/gpt-5.1', name: 'GPT-5.1', description: 'Previous flagship' },
      { id: 'openai/gpt-5.1-codex', name: 'GPT-5.1 Codex', description: 'Code specialist' },
      { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', description: 'Efficient' },
      { id: 'openai/gpt-4.1', name: 'GPT-4.1', description: 'Stable' },
      { id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Fast' },
      { id: 'openai/gpt-4.1-nano', name: 'GPT-4.1 Nano', description: 'Ultra-fast' },
      { id: 'openai/o4-mini', name: 'o4-mini', description: 'Latest reasoning' },
      { id: 'openai/o3', name: 'o3', description: 'Reasoning' },
      { id: 'openai/o3-pro', name: 'o3-pro', description: 'Pro reasoning' },
      { id: 'openai/o3-mini', name: 'o3-mini', description: 'Fast reasoning' },
      { id: 'openai/gpt-4o', name: 'GPT-4o', description: 'Legacy all-rounder' },
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', description: 'Legacy cheap' },
    ],
  },
  {
    id: 'OPENAI_CODEX',
    name: 'OpenAI Codex',
    description: 'Dedicated code generation endpoint',
    defaultModel: 'openai-codex/gpt-5.2',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    envVar: 'OPENAI_API_KEY',
    models: [
      { id: 'openai-codex/gpt-5.2', name: 'GPT-5.2 Codex', description: 'Latest codex' },
      { id: 'openai-codex/gpt-5.1', name: 'GPT-5.1 Codex', description: 'Previous codex' },
    ],
  },
  {
    id: 'OPENCODE',
    name: 'OpenCode Zen',
    description: 'Zen coding assistant — focused code generation',
    defaultModel: 'opencode/claude-opus-4-5',
    getKeyUrl: 'https://opencode.ai',
    envVar: 'OPENCODE_API_KEY',
    models: [
      { id: 'opencode/claude-opus-4-5', name: 'Claude Opus 4.5', description: 'Via OpenCode' },
    ],
  },
  {
    id: 'GOOGLE',
    name: 'Google Gemini',
    description: 'Gemini models — multimodal and fast',
    defaultModel: 'google/gemini-2.5-pro',
    getKeyUrl: 'https://aistudio.google.com/apikey',
    envVar: 'GEMINI_API_KEY',
    models: [
      { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro', description: 'Latest, most capable' },
      { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'Latest, fast' },
      { id: 'google/gemini-3-flash-lite', name: 'Gemini 3 Flash Lite', description: 'Latest, ultra-fast' },
      { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Stable flagship' },
      { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fast & efficient' },
      { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Budget option' },
      { id: 'google/gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Legacy' },
    ],
  },
  {
    id: 'GOOGLE_VERTEX',
    name: 'Google Vertex AI',
    description: 'Enterprise Gemini via Google Cloud — service account auth',
    defaultModel: 'google-vertex/gemini-3-pro-preview',
    getKeyUrl: 'https://console.cloud.google.com/apis/credentials',
    envVar: 'GOOGLE_APPLICATION_CREDENTIALS',
    models: [
      { id: 'google-vertex/gemini-3-pro-preview', name: 'Gemini 3 Pro', description: 'Latest via Vertex' },
      { id: 'google-vertex/gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'Fast via Vertex' },
      { id: 'google-vertex/gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Stable via Vertex' },
      { id: 'google-vertex/gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Efficient via Vertex' },
    ],
  },
  {
    id: 'ZAI',
    name: 'Z.AI (GLM)',
    description: 'GLM models from Zhipu AI',
    defaultModel: 'zai/glm-4.7',
    getKeyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    envVar: 'ZAI_API_KEY',
    models: [
      { id: 'zai/glm-4.7', name: 'GLM 4.7', description: 'Latest flagship' },
      { id: 'zai/glm-4.6', name: 'GLM 4.6', description: 'Previous generation' },
    ],
  },
  {
    id: 'VERCEL_AI_GATEWAY',
    name: 'Vercel AI Gateway',
    description: 'Route to any provider via Vercel — unified billing',
    defaultModel: 'vercel-ai-gateway/anthropic/claude-opus-4.5',
    getKeyUrl: 'https://vercel.com/dashboard/settings/ai-gateway',
    envVar: 'VERCEL_AI_GATEWAY_API_KEY',
    models: [
      { id: 'vercel-ai-gateway/anthropic/claude-opus-4.5', name: 'Claude Opus 4.5', description: 'Via Vercel' },
      { id: 'vercel-ai-gateway/anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', description: 'Via Vercel' },
      { id: 'vercel-ai-gateway/openai/gpt-5.2', name: 'GPT-5.2', description: 'Via Vercel' },
      { id: 'vercel-ai-gateway/google/gemini-3-pro-preview', name: 'Gemini 3 Pro', description: 'Via Vercel' },
    ],
  },
  {
    id: 'XAI',
    name: 'xAI',
    description: 'Grok models — real-time knowledge',
    defaultModel: 'xai/grok-4-1-fast-non-reasoning',
    getKeyUrl: 'https://console.x.ai',
    envVar: 'XAI_API_KEY',
    models: [
      { id: 'xai/grok-4-1-fast-reasoning', name: 'Grok 4.1 Thinking', description: 'Latest reasoning' },
      { id: 'xai/grok-4-1-fast-non-reasoning', name: 'Grok 4.1 Fast', description: 'Latest fast' },
      { id: 'xai/grok-4-0709', name: 'Grok 4', description: 'Reasoning' },
      { id: 'xai/grok-4-fast-reasoning', name: 'Grok 4 Thinking', description: 'Reasoning' },
      { id: 'xai/grok-4-fast-non-reasoning', name: 'Grok 4 Fast', description: 'Fast' },
      { id: 'xai/grok-3', name: 'Grok 3', description: 'Stable' },
      { id: 'xai/grok-3-mini', name: 'Grok 3 Mini', description: 'Lightweight' },
      { id: 'xai/grok-2-vision-1212', name: 'Grok 2 Vision', description: 'Vision model' },
    ],
  },
  {
    id: 'GROQ',
    name: 'Groq',
    description: 'Ultra-fast inference on open models',
    defaultModel: 'groq/llama-3.3-70b-versatile',
    getKeyUrl: 'https://console.groq.com/keys',
    envVar: 'GROQ_API_KEY',
    models: [
      { id: 'groq/llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'Best quality' },
      { id: 'groq/llama3-70b-8192', name: 'Llama 3 70B', description: '8K context' },
      { id: 'groq/llama-3.1-8b-instant', name: 'Llama 3.1 8B', description: 'Fastest' },
      { id: 'groq/llama3-8b-8192', name: 'Llama 3 8B', description: '8K context' },
      { id: 'groq/mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: '32K context' },
      { id: 'groq/gemma2-9b-it', name: 'Gemma 2 9B', description: 'Google open model' },
      { id: 'groq/qwen3-32b', name: 'Qwen 3 32B', description: 'Alibaba model' },
      { id: 'groq/gpt-oss-120b', name: 'GPT-OSS 120B', description: 'OpenAI open-weight' },
      { id: 'groq/deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 70B', description: 'Reasoning' },
      { id: 'groq/qwen-qwq-32b', name: 'Qwen QWQ 32B', description: 'Reasoning (Qwen)' },
    ],
  },
  {
    id: 'MISTRAL',
    name: 'Mistral',
    description: 'European AI — strong multilingual',
    defaultModel: 'mistral/mistral-large-latest',
    getKeyUrl: 'https://console.mistral.ai/api-keys',
    envVar: 'MISTRAL_API_KEY',
    models: [
      { id: 'mistral/mistral-large-latest', name: 'Mistral Large', description: 'Most capable' },
      { id: 'mistral/mistral-medium-latest', name: 'Mistral Medium', description: 'Balanced' },
      { id: 'mistral/mistral-small-latest', name: 'Mistral Small', description: 'Fast & cheap' },
      { id: 'mistral/codestral-latest', name: 'Codestral', description: 'Code specialist' },
    ],
  },
  {
    id: 'DEEPSEEK',
    name: 'DeepSeek',
    description: 'Open-weight models — reasoning and code',
    defaultModel: 'deepseek/deepseek-chat',
    getKeyUrl: 'https://platform.deepseek.com/api_keys',
    envVar: 'DEEPSEEK_API_KEY',
    models: [
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', description: 'General purpose' },
      { id: 'deepseek/deepseek-reasoner', name: 'DeepSeek R1', description: 'Reasoning' },
    ],
  },
  {
    id: 'CEREBRAS',
    name: 'Cerebras',
    description: 'Fastest inference — hardware-accelerated',
    defaultModel: 'cerebras/qwen-3-32b',
    getKeyUrl: 'https://cloud.cerebras.ai/',
    envVar: 'CEREBRAS_API_KEY',
    models: [
      { id: 'cerebras/qwen-3-235b-thinking', name: 'Qwen 3 235B Thinking', description: 'Reasoning' },
      { id: 'cerebras/qwen-3-235b-instruct', name: 'Qwen 3 235B', description: 'Most capable' },
      { id: 'cerebras/qwen-3-32b', name: 'Qwen 3 32B', description: 'Fast' },
      { id: 'cerebras/gpt-oss-120b', name: 'GPT-OSS 120B', description: 'OpenAI open-weight' },
      { id: 'cerebras/llama-3.3-70b', name: 'Llama 3.3 70B', description: 'Good quality' },
      { id: 'cerebras/llama-3.1-8b', name: 'Llama 3.1 8B', description: 'Ultra-fast' },
      { id: 'cerebras/zai-glm-4.7', name: 'GLM 4.7', description: 'Z.AI model' },
      { id: 'cerebras/zai-glm-4.6', name: 'GLM 4.6', description: 'Z.AI previous gen' },
    ],
  },
  {
    id: 'VENICE',
    name: 'Venice',
    description: 'Privacy-first AI — uncensored, zero data retention',
    badge: 'Privacy',
    defaultModel: 'venice/llama-3.3-70b',
    getKeyUrl: 'https://venice.ai/settings/api',
    envVar: 'VENICE_API_KEY',
    models: [
      // Private models (zero data retention)
      { id: 'venice/llama-3.3-70b', name: 'Llama 3.3 70B', description: 'Private, best quality' },
      { id: 'venice/deepseek-v3.2', name: 'DeepSeek V3.2', description: 'Private' },
      { id: 'venice/qwen3-235b-a22b-thinking-2507', name: 'Qwen 3 235B Thinking', description: 'Private, reasoning' },
      { id: 'venice/qwen3-235b-a22b-instruct-2507', name: 'Qwen 3 235B', description: 'Private' },
      { id: 'venice/qwen3-coder-480b-a35b-instruct', name: 'Qwen 3 Coder 480B', description: 'Private, code' },
      { id: 'venice/qwen3-next-80b', name: 'Qwen 3 Next 80B', description: 'Private' },
      { id: 'venice/hermes-3-llama-3.1-405b', name: 'Hermes 3 405B', description: 'Private, uncensored' },
      { id: 'venice/venice-uncensored', name: 'Venice Uncensored', description: 'Private, no filters' },
      { id: 'venice/openai-gpt-oss-120b', name: 'GPT-OSS 120B', description: 'Private' },
      { id: 'venice/mistral-31-24b', name: 'Mistral 31 24B', description: 'Private' },
      { id: 'venice/google-gemma-3-27b-it', name: 'Gemma 3 27B', description: 'Private' },
      { id: 'venice/zai-org-glm-4.7', name: 'GLM 4.7', description: 'Private' },
      // Anonymized models (privacy-routed)
      { id: 'venice/claude-opus-45', name: 'Claude Opus 4.5', description: 'Anonymized' },
      { id: 'venice/claude-sonnet-45', name: 'Claude Sonnet 4.5', description: 'Anonymized' },
      { id: 'venice/openai-gpt-52', name: 'GPT-5.2', description: 'Anonymized' },
      { id: 'venice/openai-gpt-52-codex', name: 'GPT-5.2 Codex', description: 'Anonymized' },
      { id: 'venice/gemini-3-pro-preview', name: 'Gemini 3 Pro', description: 'Anonymized' },
      { id: 'venice/gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'Anonymized' },
      { id: 'venice/grok-41-fast', name: 'Grok 4.1 Fast', description: 'Anonymized' },
      { id: 'venice/grok-code-fast-1', name: 'Grok Code', description: 'Anonymized' },
      { id: 'venice/kimi-k2-thinking', name: 'Kimi K2 Thinking', description: 'Anonymized' },
      { id: 'venice/minimax-m21', name: 'MiniMax M2.1', description: 'Anonymized' },
    ],
  },
  {
    id: 'MOONSHOT',
    name: 'Moonshot (Kimi)',
    description: 'Kimi models — long context and coding',
    defaultModel: 'moonshot/kimi-k2.5',
    getKeyUrl: 'https://platform.moonshot.cn/console/api-keys',
    envVar: 'MOONSHOT_API_KEY',
    models: [
      { id: 'moonshot/kimi-k2.5', name: 'Kimi K2.5', description: 'Latest, most capable' },
      { id: 'moonshot/kimi-k2-thinking', name: 'Kimi K2 Thinking', description: 'Reasoning' },
      { id: 'moonshot/kimi-k2-thinking-turbo', name: 'Kimi K2 Thinking Turbo', description: 'Fast reasoning' },
      { id: 'moonshot/kimi-k2-0905-preview', name: 'Kimi K2 Preview', description: 'Preview' },
      { id: 'moonshot/kimi-k2-turbo-preview', name: 'Kimi K2 Turbo', description: 'Fast' },
    ],
  },
  {
    id: 'KIMI_CODE',
    name: 'Kimi Code',
    description: 'Dedicated coding model from Moonshot',
    defaultModel: 'kimi-code/kimi-for-coding',
    getKeyUrl: 'https://platform.moonshot.cn/console/api-keys',
    envVar: 'MOONSHOT_API_KEY',
    models: [
      { id: 'kimi-code/kimi-for-coding', name: 'Kimi for Coding', description: 'Code specialist' },
    ],
  },
  {
    id: 'MINIMAX',
    name: 'MiniMax',
    description: 'MiniMax models — coding and reasoning',
    defaultModel: 'minimax/MiniMax-M2.1',
    getKeyUrl: 'https://www.minimaxi.com/platform',
    envVar: 'MINIMAX_API_KEY',
    models: [
      { id: 'minimax/MiniMax-M2.1', name: 'MiniMax M2.1', description: 'Code-focused' },
      { id: 'minimax/MiniMax-M2.1-lightning', name: 'MiniMax M2.1 Lightning', description: 'Fast variant' },
    ],
  },
  {
    id: 'QWEN',
    name: 'Qwen (Alibaba)',
    description: 'Qwen models — strong reasoning and code',
    defaultModel: 'qwen-portal/coder-model',
    getKeyUrl: 'https://dashscope.console.aliyun.com/apiKey',
    envVar: 'QWEN_API_KEY',
    models: [
      { id: 'qwen-portal/coder-model', name: 'Qwen Coder', description: 'Code specialist' },
      { id: 'qwen-portal/vision-model', name: 'Qwen Vision', description: 'Multimodal' },
    ],
  },
  {
    id: 'SYNTHETIC',
    name: 'Synthetic',
    description: 'HuggingFace model wrapper — run any HF model',
    defaultModel: 'synthetic/hf:MiniMaxAI/MiniMax-M2.1',
    getKeyUrl: 'https://huggingface.co/settings/tokens',
    envVar: 'HUGGINGFACE_API_KEY',
    models: [
      { id: 'synthetic/hf:MiniMaxAI/MiniMax-M2.1', name: 'MiniMax M2.1', description: 'Via Synthetic' },
    ],
  },
  {
    id: 'TOGETHER',
    name: 'Together AI',
    description: 'Open-source models with fast inference',
    defaultModel: 'together/meta-llama/Llama-3.3-70B-Instruct-Turbo',
    getKeyUrl: 'https://api.together.xyz/settings/api-keys',
    envVar: 'TOGETHER_API_KEY',
    models: [
      { id: 'together/moonshotai/Kimi-K2.5', name: 'Kimi K2.5', description: 'Via Together' },
      { id: 'together/meta-llama/Llama-3.3-70B-Instruct-Turbo', name: 'Llama 3.3 70B Turbo', description: 'Fast' },
      { id: 'together/meta-llama/Llama-4-Scout-17B-16E-Instruct', name: 'Llama 4 Scout', description: 'Latest Llama' },
      { id: 'together/meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8', name: 'Llama 4 Maverick', description: 'Latest Llama' },
      { id: 'together/deepseek-ai/DeepSeek-V3.1', name: 'DeepSeek V3.1', description: 'Via Together' },
      { id: 'together/deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1', description: 'Via Together' },
    ],
  },
  {
    id: 'NVIDIA',
    name: 'NVIDIA',
    description: 'NVIDIA NIM — optimized inference',
    defaultModel: 'nvidia/llama-3.1-nemotron-70b-instruct',
    getKeyUrl: 'https://build.nvidia.com/',
    envVar: 'NVIDIA_API_KEY',
    models: [
      { id: 'nvidia/llama-3.1-nemotron-70b-instruct', name: 'Nemotron 70B', description: 'Default' },
      { id: 'nvidia/meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', description: 'Via NVIDIA' },
      { id: 'nvidia/mistral-nemo-minitron-8b-8k-instruct', name: 'Minitron 8B', description: 'Fast' },
    ],
  },
  {
    id: 'HUGGINGFACE',
    name: 'Hugging Face',
    description: 'Open models via Inference API',
    defaultModel: 'huggingface/meta-llama/Llama-3.3-70B-Instruct',
    getKeyUrl: 'https://huggingface.co/settings/tokens',
    envVar: 'HUGGINGFACE_API_KEY',
    models: [
      { id: 'huggingface/deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1', description: 'Reasoning' },
      { id: 'huggingface/deepseek-ai/DeepSeek-V3.2', name: 'DeepSeek V3.2', description: 'General purpose' },
      { id: 'huggingface/meta-llama/Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B', description: 'Quality' },
      { id: 'huggingface/meta-llama/Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B', description: 'Fast' },
      { id: 'huggingface/Qwen/Qwen3-32B', name: 'Qwen 3 32B', description: 'Alibaba model' },
      { id: 'huggingface/Qwen/Qwen3-8B', name: 'Qwen 3 8B', description: 'Lightweight' },
      { id: 'huggingface/openai/gpt-oss-120b', name: 'GPT-OSS 120B', description: 'OpenAI open-weight' },
      { id: 'huggingface/zai-org/GLM-4.7', name: 'GLM 4.7', description: 'Z.AI model' },
      { id: 'huggingface/moonshotai/Kimi-K2.5', name: 'Kimi K2.5', description: 'Moonshot model' },
    ],
  },
  {
    id: 'OPENROUTER',
    name: 'OpenRouter',
    description: 'Gateway to 300+ models from all providers',
    badge: 'Most Models',
    defaultModel: 'openrouter/anthropic/claude-sonnet-4-5',
    getKeyUrl: 'https://openrouter.ai/keys',
    envVar: 'OPENROUTER_API_KEY',
    models: [
      { id: 'openrouter/anthropic/claude-opus-4-6', name: 'Claude Opus 4.6', description: 'Via OpenRouter' },
      { id: 'openrouter/anthropic/claude-sonnet-4-5', name: 'Claude Sonnet 4.5', description: 'Via OpenRouter' },
      { id: 'openrouter/openai/gpt-5.2', name: 'GPT-5.2', description: 'Via OpenRouter' },
      { id: 'openrouter/openai/gpt-5-mini', name: 'GPT-5 Mini', description: 'Via OpenRouter' },
      { id: 'openrouter/openai/gpt-4.1', name: 'GPT-4.1', description: 'Via OpenRouter' },
      { id: 'openrouter/google/gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'Via OpenRouter' },
      { id: 'openrouter/google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Via OpenRouter' },
      { id: 'openrouter/meta-llama/llama-3.3-70b', name: 'Llama 3.3 70B', description: 'Via OpenRouter' },
      { id: 'openrouter/deepseek/deepseek-r1', name: 'DeepSeek R1', description: 'Via OpenRouter' },
      { id: 'openrouter/deepseek/deepseek-chat', name: 'DeepSeek V3', description: 'Via OpenRouter' },
      { id: 'openrouter/mistralai/mistral-large', name: 'Mistral Large', description: 'Via OpenRouter' },
      { id: 'openrouter/moonshotai/kimi-k2.5', name: 'Kimi K2.5', description: 'Via OpenRouter' },
      { id: 'openrouter/qwen/qwen-2.5-72b', name: 'Qwen 2.5 72B', description: 'Via OpenRouter' },
      { id: 'openrouter/openrouter/auto', name: 'Auto (best match)', description: 'Auto-routing' },
    ],
  },
  {
    id: 'GITHUB_COPILOT',
    name: 'GitHub Copilot',
    description: 'Use your Copilot subscription — requires GitHub auth',
    defaultModel: 'github-copilot/gpt-4o',
    getKeyUrl: 'https://github.com/settings/copilot',
    envVar: 'GITHUB_TOKEN',
    models: [
      { id: 'github-copilot/gpt-4o', name: 'GPT-4o', description: 'Via Copilot' },
      { id: 'github-copilot/gpt-4o-mini', name: 'GPT-4o Mini', description: 'Via Copilot' },
      { id: 'github-copilot/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', description: 'Via Copilot' },
    ],
  },
  {
    id: 'OLLAMA',
    name: 'Ollama (Local)',
    description: 'Run models locally — no API key needed',
    badge: 'Local',
    defaultModel: 'ollama/llama3.3',
    getKeyUrl: 'https://ollama.com/download',
    envVar: 'OLLAMA_HOST',
    noKeyRequired: true,
    models: [
      { id: 'ollama/llama3.3', name: 'Llama 3.3', description: 'Best local quality' },
      { id: 'ollama/llama3.1', name: 'Llama 3.1', description: 'Stable' },
      { id: 'ollama/qwen3', name: 'Qwen 3', description: 'Alibaba model' },
      { id: 'ollama/deepseek-r1', name: 'DeepSeek R1', description: 'Reasoning' },
      { id: 'ollama/mistral', name: 'Mistral', description: 'Lightweight' },
      { id: 'ollama/gemma2', name: 'Gemma 2', description: 'Google open model' },
      { id: 'ollama/phi3', name: 'Phi 3', description: 'Microsoft model' },
    ],
  },
  {
    id: 'BEDROCK',
    name: 'Amazon Bedrock',
    description: 'AWS-managed models — Claude, Llama, and more',
    defaultModel: 'bedrock/anthropic.claude-sonnet-4-5-v1',
    getKeyUrl: 'https://console.aws.amazon.com/bedrock',
    envVar: 'AWS_ACCESS_KEY_ID',
    models: [
      { id: 'bedrock/anthropic.claude-opus-4-5-v1', name: 'Claude Opus 4.5', description: 'Via Bedrock' },
      { id: 'bedrock/anthropic.claude-sonnet-4-5-v1', name: 'Claude Sonnet 4.5', description: 'Via Bedrock' },
      { id: 'bedrock/anthropic.claude-haiku-4-5-v1', name: 'Claude Haiku 4.5', description: 'Via Bedrock' },
      { id: 'bedrock/meta.llama3-3-70b-instruct-v1', name: 'Llama 3.3 70B', description: 'Via Bedrock' },
      { id: 'bedrock/mistral.mistral-large-v1', name: 'Mistral Large', description: 'Via Bedrock' },
    ],
  },
]

/** Get provider definition by ID */
export function getProviderDef(id: string): ProviderDefinition | undefined {
  return PROVIDERS.find(p => p.id === id)
}

/** Get models for a provider */
export function getModelsForProvider(providerId: string): ModelOption[] {
  return getProviderDef(providerId)?.models || []
}

/** Get the default model for a provider */
export function getDefaultModel(providerId: string): string {
  return getProviderDef(providerId)?.defaultModel || 'anthropic/claude-sonnet-4-5-20250929'
}

/** Get the env var name for a provider's API key */
export function getProviderEnvVar(providerId: string): string {
  return getProviderDef(providerId)?.envVar || 'ANTHROPIC_API_KEY'
}
