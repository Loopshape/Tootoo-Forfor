// types.ts

export interface RecentFile {
  filename: string;
  contentPreview: string; // Truncated content for display
  timestamp: number;
}

export interface QuantumSettings {
  quantumMode: boolean;
  hyperthreading: boolean;
  multiAgentMode: boolean;
  autoSave: boolean;
  agentCount: number;
  maxRounds: number;
  reasoningDepth: number;
}

export enum AgentType {
  NEXUS = 'nexus',
  COGNITO = 'cognito',
  RELAY = 'relay',
  SENTINEL = 'sentinel',
  ECHO = 'echo',
}

export enum LogType {
  INFO = 'info',
  GENESIS = 'genesis',
  ORIGIN = 'origin',
  EVENT = 'event',
  FRAGMENT = 'fragment',
  CONSENSUS = 'consensus',
}

export interface OrchestrationLogEntry {
  timestamp: string;
  message: string;
  type: LogType;
}

export interface AgentStatus {
  content: string;
  log: OrchestrationLogEntry[];
  isActive: boolean;
}

export interface AgentInfo {
  id: string;
  origin: string;
}

export interface CandidateFragment {
  agentId: string;
  origin: string;
  round: number;
  candidate: string;
  entropy: number;
  timestamp: number;
}

export interface CandidateGroup {
  key: string;
  candidates: CandidateFragment[];
  score: number;
  agentCount: number;
  roundCount: number;
  avgEntropy: number;
}

export interface ConsensusResult {
  genesis: string;
  selectedCandidate: string;
  score: string;
  agentCount: number;
  roundCount: number;
  avgEntropy: string;
  rootAgent: string;
  rootEntropy: string;
  allGroups: CandidateGroup[];
}

export enum AiConnectionStatus {
  PROBING = 'Probing...',
  READY = 'Ready',
  NO_KEY = 'No Key',
}

export enum MemoryStatusEnum {
  OK = 'OK',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export interface MemoryMetrics {
  text: string;
  className: string;
}

export interface EditorStatus {
  cursor: { line: number; col: number };
  lines: number;
  chars: number;
  historySize: number;
  quantumModeActive: boolean;
  hyperthreadingActive: boolean;
  multiAgentModeActive: boolean;
}

export type EditorLanguage = 'javascript' | 'typescript' | 'html' | 'css' | 'python' | 'php' | 'sql' | 'markdown' | 'json' | 'jsx' | 'tsx' | 'xml' | 'yaml' | 'yml';

export type BeautifyLanguage = 'js' | 'html' | 'css';

export interface PromptSuggestion {
  text: string;
  onClick: (value: string) => void;
}

export type QuantumAppState = {
  isGenerating: boolean;
  aiConnectionStatus: AiConnectionStatus;
  recentFiles: RecentFile[];
  settings: QuantumSettings;
  editorContent: string;
  currentFileName: string | null;
  currentFileType: EditorLanguage;
  editorStatus: EditorStatus;
  memoryMetrics: MemoryMetrics;
  agents: { [key in AgentType]: AgentStatus };
  consensusResult: ConsensusResult | null;
  showOrchestrationPanel: boolean;
  showPreviewPanel: boolean;
  previewHtml: string;
  quantumConsensusCode: string | null;
};

// Define the AIStudio interface for global declaration
export interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

// FIX: Added global declaration for window.aistudio to centralize the type and fix declaration errors.
declare global {
  interface Window {
    aistudio: AIStudio;
  }
}
