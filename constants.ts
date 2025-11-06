// constants.ts
import { AgentType, LogType } from './types';

export const MAX_CONTEXT_LENGTH = 8000;
export const MAX_HISTORY_SIZE = 50;
export const DEBOUNCE_DELAY_MS = 100;
export const AUTOSAVE_INTERVAL_MS = 30000;
export const MEMORY_MONITOR_INTERVAL_MS = 30000;

export const MEMORY_STORAGE_KEY = 'quantum_editor_cache';
export const SETTINGS_STORAGE_KEY = 'quantum_editor_settings';
export const RECENT_FILES_STORAGE_KEY = 'quantum_recent_files';
export const AUTOSAVE_CONTENT_KEY = 'autosave_content';

export const MAX_MEMORY_THRESHOLD_BYTES = 50 * 1024 * 1024; // 50 MB
export const CACHE_LIMIT = 100;

export const AGENT_NAMES_MAP: { [key in AgentType]: string } = {
  [AgentType.NEXUS]: 'Nexus',
  [AgentType.COGNITO]: 'Cognito',
  [AgentType.RELAY]: 'Relay',
  [AgentType.SENTINEL]: 'Sentinel',
  [AgentType.ECHO]: 'Echo',
};

export const REASONING_STRATEGIES: string[] = [
  "Apply recursive optimization patterns",
  "Use quantum efficiency algorithms",
  "Implement fractal code structure",
  "Apply hyperthreaded reasoning",
  "Use entropy-based selection",
  "Apply mathematical transformation",
  "Implement parallel processing",
  "Use consensus validation",
  "Apply abstract syntax tree manipulation",
  "Implement heuristic code generation",
  "Use semantic code analysis",
  "Apply pattern recognition for refactoring",
  "Generate declarative programming structures",
  "Optimize for functional purity",
  "Implement aspect-oriented programming principles",
  "Utilize genetic algorithms for code evolution",
  "Employ symbolic execution for bug detection",
  "Transform imperative to functional paradigms",
  "Apply dependency graph optimization",
  "Integrate formal verification methods"
];

export const COMMON_PROMPT_SUGGESTIONS: string[] = [
  'create a function to sort arrays',
  'optimize this code for performance',
  'add error handling to this function',
  'convert this to TypeScript',
  'explain this code',
  'refactor this code',
  'write unit tests for this function',
  'create a React component',
  'implement a database query',
  'add comments to this code',
  'fix bugs in this code',
  'improve code readability',
  'implement authentication',
  'create API endpoints',
  'optimize database queries',
  'add input validation',
  'implement caching',
  'create documentation',
  'set up logging',
  'handle edge cases',
  'debug this React component',
  'add a feature to this existing component',
  'improve the UI/UX of this section',
  'write a custom React hook',
  'integrate a third-party library',
  'secure this data transmission',
  'implement a state management solution',
  'add a responsive design breakpoint',
  'create a component library entry',
  'generate SVG for this icon',
  'write a serverless function for this task'
];

export const INITIAL_EDITOR_CONTENT = `// Quantum Fractal AI Editor - Ready
// Start coding or use the prompt below for AI assistance

function welcome() {
    return "Welcome to the Quantum Fractal AI Editor!";
}`;

export const DEFAULT_AGENT_COUNT = 5;
export const DEFAULT_MAX_ROUNDS = 3;
export const DEFAULT_REASONING_DEPTH = 3;

export const INITIAL_AGENTS_STATE = {
  [AgentType.NEXUS]: { content: 'Idle. Awaiting quantum command.', log: [], isActive: false },
  [AgentType.COGNITO]: { content: 'Ready', log: [], isActive: false },
  [AgentType.RELAY]: { content: 'Ready', log: [], isActive: false },
  [AgentType.SENTINEL]: { content: 'Ready', log: [], isActive: false },
  [AgentType.ECHO]: { content: 'Awaiting assembly instructions...', log: [], isActive: false },
};

export const INITIAL_SETTINGS = {
  quantumMode: true,
  hyperthreading: true,
  multiAgentMode: true,
  autoSave: true,
  agentCount: DEFAULT_AGENT_COUNT,
  maxRounds: DEFAULT_MAX_ROUNDS,
  reasoningDepth: DEFAULT_REASONING_DEPTH,
};

export const SYNTAX_HIGHLIGHTING_CLASS_PREFIX = 'sh-token sh-';
