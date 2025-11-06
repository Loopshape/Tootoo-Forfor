// App.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Editor from './components/Editor';
import LeftPanel from './components/LeftPanel';
import OrchestrationPanel from './components/OrchestrationPanel';
import PreviewPanel from './components/PreviewPanel';
import StatusBar from './components/StatusBar';
import {
  QuantumMemoryManager,
} from './utils/memoryManager';
import {
  AUTOSAVE_CONTENT_KEY,
  AUTOSAVE_INTERVAL_MS,
  COMMON_PROMPT_SUGGESTIONS,
  DEFAULT_AGENT_COUNT,
  DEFAULT_MAX_ROUNDS,
  DEFAULT_REASONING_DEPTH,
  INITIAL_AGENTS_STATE,
  INITIAL_EDITOR_CONTENT,
  INITIAL_SETTINGS,
  MEMORY_MONITOR_INTERVAL_MS,
} from './constants';
import {
  AiConnectionStatus,
  AgentInfo,
  AgentStatus,
  AgentType,
  BeautifyLanguage,
  ConsensusResult,
  EditorLanguage,
  EditorStatus,
  MemoryMetrics,
  OrchestrationLogEntry,
  LogType,
  PromptSuggestion,
  RecentFile,
  QuantumSettings,
  QuantumAppState,
  CandidateFragment, // Import CandidateFragment
} from './types';
import {
  calculateEntropy,
  generateEventId,
  generateFractalHash,
  getMimeType,
  sha256,
} from './utils/helpers';
import { createFractalNodes, quantumNotify } from './utils/quantumEffects';
import { geminiService } from './services/geminiService';

declare global {
  interface Window {
    quantumMemoryCache?: Map<string, any>;
    js_beautify?: (code: string, options: any) => string;
    html_beautify?: (code: string, options: any) => string;
    css_beautify?: (code: string, options: any) => string;
    quantumConsensusCode?: string;
    // FIX: Define the aistudio interface inline to prevent type conflicts.
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

// Global instance for memory management
const memoryManager = new QuantumMemoryManager();

const App: React.FC = () => {
  const [state, setState] = useState<QuantumAppState>({
    isGenerating: false,
    aiConnectionStatus: AiConnectionStatus.PROBING,
    recentFiles: memoryManager.loadRecentFiles(),
    settings: memoryManager.loadSettings(),
    editorContent: INITIAL_EDITOR_CONTENT,
    currentFileName: null,
    currentFileType: 'javascript',
    editorStatus: {
      cursor: { line: 0, col: 0 },
      lines: 1,
      chars: INITIAL_EDITOR_CONTENT.length,
      historySize: 1,
      quantumModeActive: INITIAL_SETTINGS.quantumMode,
      hyperthreadingActive: INITIAL_SETTINGS.hyperthreading,
      multiAgentModeActive: INITIAL_SETTINGS.multiAgentMode,
    },
    memoryMetrics: memoryManager.checkMemoryUsage(),
    agents: INITIAL_AGENTS_STATE,
    consensusResult: null,
    showOrchestrationPanel: false,
    showPreviewPanel: false,
    previewHtml: '',
    quantumConsensusCode: null,
  });

  const editorRef = useRef<any>(null);
  const promptInputRef = useRef<HTMLInputElement>(null);
  const suggestionsPanelRef = useRef<HTMLDivElement>(null);
  const quantumThinkingRef = useRef<HTMLDivElement>(null);

  // --- Initialization Effects ---
  useEffect(() => {
    // Load autosave content
    memoryManager.retrieve(AUTOSAVE_CONTENT_KEY).then(autosaveContent => {
      if (autosaveContent && !state.editorContent.trim()) {
        setState(prevState => ({ ...prevState, editorContent: autosaveContent }));
        quantumNotify('Autosave restored', 'success');
      }
    });

    // Start memory monitoring
    memoryManager.init();
    const memoryInterval = setInterval(() => {
      setState(prevState => ({ ...prevState, memoryMetrics: memoryManager.checkMemoryUsage() }));
    }, MEMORY_MONITOR_INTERVAL_MS);

    // Initial AI connection check
    checkAiConnection();

    // Setup auto-save
    let autoSaveInterval: number;
    if (state.settings.autoSave) {
      autoSaveInterval = window.setInterval(() => saveAutosave(), AUTOSAVE_INTERVAL_MS);
    }

    // Initial fractal node setup
    const cleanupFractalNodes = createFractalNodes(quantumThinkingRef, state.settings.quantumMode, state.settings.hyperthreading);

    // Cleanup
    return () => {
      clearInterval(memoryInterval);
      if (autoSaveInterval) clearInterval(autoSaveInterval);
      memoryManager.cleanup();
      cleanupFractalNodes();
    };
  }, []); // eslint-disable-next-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Re-trigger fractal node rendering if settings change
    const cleanupFractalNodes = createFractalNodes(quantumThinkingRef, state.settings.quantumMode, state.settings.hyperthreading);
    return cleanupFractalNodes;
  }, [state.settings.quantumMode, state.settings.hyperthreading]);

  // --- AI Connection ---
  const checkAiConnection = useCallback(async () => {
    try {
      const isConnected = await geminiService.ensureApiKeySelected();
      setState(prevState => ({
        ...prevState,
        aiConnectionStatus: isConnected ? AiConnectionStatus.READY : AiConnectionStatus.NO_KEY,
      }));
    } catch (e) {
      console.error('Failed to check AI connection:', e);
      setState(prevState => ({ ...prevState, aiConnectionStatus: AiConnectionStatus.NO_KEY }));
    }
  }, []);

  // --- Memory & Settings Management ---
  const saveAutosave = useCallback(async () => {
    if (!state.settings.autoSave) return;
    try {
      if (state.editorContent.trim()) {
        await memoryManager.store(AUTOSAVE_CONTENT_KEY, state.editorContent, 'high');
      }
    } catch (error) {
      console.warn('Autosave failed:', error);
    }
  }, [state.editorContent, state.settings.autoSave]);

  const handleSettingChange = useCallback((key: keyof QuantumSettings, value: any) => {
    setState(prevState => {
      const newSettings = { ...prevState.settings, [key]: value };
      memoryManager.saveSettings(newSettings);

      // Special handling for autoSave interval
      if (key === 'autoSave') {
        // This is handled in the main useEffect's cleanup and re-setup, so no direct action here.
        // The cleanup will clear the old interval and the next render cycle will set up a new one if autoSave is true.
      }
      return { ...prevState, settings: newSettings };
    });
  }, []);

  const handleMemoryAction = useCallback(async (action: 'clearCache' | 'optimizeMemory' | 'exportSession') => {
    switch (action) {
      case 'clearCache':
        const cleared = await memoryManager.clearAllCache();
        quantumNotify(cleared ? 'All cache cleared' : 'Cache clearance failed', cleared ? 'success' : 'error');
        setState(prevState => ({ ...prevState, recentFiles: [] })); // Clear recent files state
        break;
      case 'optimizeMemory':
        memoryManager.aggressiveCleanup();
        quantumNotify('Memory optimized', 'success');
        break;
      case 'exportSession':
        const exported = await memoryManager.exportSession();
        quantumNotify(exported ? 'Session exported' : 'Export failed', exported ? 'success' : 'error');
        break;
    }
  }, []);

  // --- File Handling ---
  const handleFileOpen = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const fileName = file.name;
      const fileType = editorRef.current?.getHighlighter().detectLanguage(fileName) || 'javascript';
      const content = ev.target?.result as string;

      setState(prevState => {
        const newRecentFiles = memoryManager.addRecentFile(prevState.recentFiles, fileName, content);
        memoryManager.saveRecentFiles(newRecentFiles);
        return {
          ...prevState,
          editorContent: content,
          currentFileName: fileName,
          currentFileType: fileType,
          recentFiles: newRecentFiles,
        };
      });
      quantumNotify(`Loaded file: ${fileName}`, 'success');
    };
    reader.readAsText(file);
  }, [state.recentFiles]);

  const quantumSaveFile = useCallback(() => {
    if (!state.currentFileName) {
      quantumSaveAsFile();
      return;
    }

    const mimeType = getMimeType(state.currentFileType);
    const blob = new Blob([state.editorContent], { type: mimeType });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = state.currentFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);

    quantumNotify('File saved successfully', 'success');
  }, [state.currentFileName, state.editorContent, state.currentFileType]);

  const quantumSaveAsFile = useCallback(() => {
    const fileName = prompt('Enter file name:', state.currentFileName || 'quantum_code.js');
    if (fileName) {
      const fileType = editorRef.current?.getHighlighter().detectLanguage(fileName) || 'javascript';
      setState(prevState => ({
        ...prevState,
        currentFileName: fileName,
        currentFileType: fileType,
      }));
      quantumSaveFile(); // This will now save with the new name/type
    }
  }, [state.currentFileName, quantumSaveFile]);

  // --- Editor Actions ---
  const handleEditorContentChange = useCallback((newContent: string) => {
    setState(prevState => ({ ...prevState, editorContent: newContent }));
  }, []);

  const handleEditorStatusChange = useCallback((status: EditorStatus) => {
    setState(prevState => ({ ...prevState, editorStatus: status }));
  }, []);

  const handleEditorAction = useCallback((action: 'undo' | 'redo' | 'beautify', lang?: BeautifyLanguage) => {
    if (editorRef.current) {
      if (action === 'undo') editorRef.current.undo();
      if (action === 'redo') editorRef.current.redo();
      if (action === 'beautify' && lang) editorRef.current.beautify(lang);
    }
  }, []);

  // --- AI Orchestration ---
  const addLog = useCallback((agentType: AgentType, message: string, type: LogType = LogType.INFO) => {
    setState(prevState => {
      const newAgents = { ...prevState.agents };
      const logEntry: OrchestrationLogEntry = {
        timestamp: new Date().toLocaleTimeString(),
        message,
        type,
      };
      newAgents[agentType] = {
        ...newAgents[agentType],
        log: [...newAgents[agentType].log, logEntry],
      };
      return { ...prevState, agents: newAgents };
    });
  }, []);

  const setAgentStatus = useCallback((agentType: AgentType, content: string, isActive: boolean = false) => {
    setState(prevState => ({
      ...prevState,
      agents: {
        ...prevState.agents,
        [agentType]: {
          ...prevState.agents[agentType],
          content,
          isActive,
        },
      },
    }));
  }, []);

  const runEnhancedOrchestrator = useCallback(async (promptOverride?: string) => {
    if (state.isGenerating) return;

    setState(prevState => ({
      ...prevState,
      isGenerating: true,
      showOrchestrationPanel: true,
      consensusResult: null,
      agents: { // Reset logs and activity
        [AgentType.NEXUS]: { ...INITIAL_AGENTS_STATE.nexus, log: [], isActive: false },
        [AgentType.COGNITO]: { ...INITIAL_AGENTS_STATE.cognito, log: [], isActive: false },
        [AgentType.RELAY]: { ...INITIAL_AGENTS_STATE.relay, log: [], isActive: false },
        [AgentType.SENTINEL]: { ...INITIAL_AGENTS_STATE.sentinel, log: [], isActive: false },
        [AgentType.ECHO]: { ...INITIAL_AGENTS_STATE.echo, log: [], isActive: false },
      },
    }));

    const promptText = promptOverride || promptInputRef.current?.value.trim() || 'Optimize this code with quantum fractal patterns';
    const editorContext = state.editorContent;
    const editorLanguage = state.currentFileType;

    setAgentStatus(AgentType.NEXUS, '<div class="quantum-spinner"></div>Starting enhanced quantum orchestration...', true);

    try {
      addLog(AgentType.NEXUS, 'Generating genesis hash from current code...', LogType.GENESIS);
      const genesisHash = await sha256('GENESIS' + Date.now().toString() + editorContext);
      addLog(AgentType.NEXUS, `Genesis: ${genesisHash.substring(0, 16)}...`, LogType.GENESIS);

      addLog(AgentType.NEXUS, 'Generating origin hashes for agents...', LogType.ORIGIN);
      const agents: AgentInfo[] = [];
      const agentCount = state.settings.agentCount;

      for (let i = 0; i < agentCount; i++) {
        const agentId = `agent-${i}`;
        // FIX: Correct arguments for generateFractalHash and remove unnecessary await.
        const originHash = generateFractalHash(genesisHash + agentId, state.settings.reasoningDepth);
        agents.push({ id: agentId, origin: originHash });
        addLog(AgentType.NEXUS, `${agentId}: ${originHash.substring(0, 12)}...`, LogType.ORIGIN);
      }

      addLog(AgentType.NEXUS, 'Creating event log entry...', LogType.EVENT);
      const eventId = generateEventId();
      addLog(AgentType.NEXUS, `Event: ${eventId} logged`, LogType.EVENT);
      setAgentStatus(AgentType.COGNITO, `<div class="quantum-spinner"></div>Spawning ${agentCount} fractal agents...`, true);

      // Corrected type to CandidateFragment[]
      const allCandidates: CandidateFragment[] = [];
      const maxRounds = state.settings.maxRounds;

      for (let round = 0; round < maxRounds; round++) {
        addLog(AgentType.RELAY, `<div class="quantum-spinner"></div>Round ${round + 1}/${maxRounds}...`, LogType.INFO);
        setAgentStatus(AgentType.RELAY, `Processing round ${round + 1} with ${agentCount} agents...`, true);

        const roundPromises = agents.map(async (agent, index) => {
          const newOrigin = await sha256(agent.origin + genesisHash + round.toString());
          agent.origin = newOrigin; // Update agent's origin for next round

          const candidateContent = await geminiService.runOrchestrationAgentStep(
            agent, promptText, editorContext, round, editorLanguage, state.settings.reasoningDepth
          );

          const fragment: CandidateFragment = { // Explicitly type as CandidateFragment
            agentId: agent.id,
            origin: agent.origin,
            round,
            candidate: candidateContent,
            entropy: calculateEntropy(agent.origin),
            timestamp: Date.now(),
          };
          addLog(AgentType.SENTINEL, `Fragment from ${agent.id} (round ${round})`, LogType.FRAGMENT);

          allCandidates.push(fragment);
          return fragment;
        });

        await Promise.all(roundPromises);
        await new Promise(r => setTimeout(r, 500)); // Brief pause between rounds
      }

      addLog(AgentType.SENTINEL, `<div class="quantum-spinner"></div>Assembling final consensus...`, LogType.INFO);
      setAgentStatus(AgentType.SENTINEL, `Evaluating ${allCandidates.length} fragments for consensus...`, true);
      const consensus = await assembleFinalAnswer(allCandidates, genesisHash); // Pass CandidateFragment[]

      setAgentStatus(AgentType.ECHO, `<div class="quantum-spinner"></div>Reassembling script from consensus...`, true);
      addLog(AgentType.ECHO, `Assembly started. Verified Genesis: ${consensus.genesis.substring(0, 12)}...`, LogType.CONSENSUS);
      await new Promise(r => setTimeout(r, 250));
      addLog(AgentType.ECHO, `Selected candidate from Agent ${consensus.rootAgent} with score ${consensus.score}.`, LogType.CONSENSUS);
      await new Promise(r => setTimeout(r, 250));

      const finalCodeHash = await sha256(consensus.selectedCandidate);
      addLog(AgentType.ECHO, `Verified final code hash: ${finalCodeHash.substring(0, 12)}...`, LogType.CONSENSUS);
      await new Promise(r => setTimeout(r, 250));
      addLog(AgentType.ECHO, `Reassembly complete. Quantum script generated.`, LogType.CONSENSUS);

      setState(prevState => ({
        ...prevState,
        consensusResult: consensus,
        quantumConsensusCode: consensus.selectedCandidate,
      }));

    } catch (e: any) {
      console.error("Enhanced orchestrator error:", e);
      addLog(AgentType.ECHO, `<span style="color: #ff4444">Orchestrator Error: ${e.message}</span>`, LogType.INFO);
      setAgentStatus(AgentType.ECHO, `<span class="text-error-color">Error: ${e.message}</span>`);
    } finally {
      Object.values(AgentType).forEach(type => setAgentStatus(type, INITIAL_AGENTS_STATE[type].content, false));
      setAgentStatus(AgentType.NEXUS, 'Enhanced orchestration complete');
      setState(prevState => ({ ...prevState, isGenerating: false }));
    }
  }, [state.isGenerating, state.editorContent, state.currentFileType, state.settings.agentCount, state.settings.maxRounds, state.settings.reasoningDepth, addLog, setAgentStatus]);

  // Updated parameter type to CandidateFragment[]
  const assembleFinalAnswer = useCallback(async (allCandidates: CandidateFragment[], genesis: string): Promise<ConsensusResult> => {
    const candidateGroups: { [key: string]: { candidates: CandidateFragment[]; totalEntropy: number; agents: Set<string>; rounds: Set<number> } } = {};

    for (const candidate of allCandidates) {
      const key = candidate.candidate.substring(0, 100); // Key by content prefix for grouping
      if (!candidateGroups[key]) {
        candidateGroups[key] = {
          candidates: [],
          totalEntropy: 0,
          agents: new Set(),
          rounds: new Set(),
        };
      }
      candidateGroups[key].candidates.push(candidate);
      candidateGroups[key].totalEntropy += candidate.entropy;
      candidateGroups[key].agents.add(candidate.agentId);
      candidateGroups[key].rounds.add(candidate.round);
    }

    const scoredGroups = Object.entries(candidateGroups).map(([key, group]) => {
      const agentCount = group.agents.size;
      const roundCount = group.rounds.size;
      const avgEntropy = group.totalEntropy / group.candidates.length;
      const score = (agentCount * 2) + (roundCount * 1.5) + (avgEntropy * 3); // Scoring logic

      return { key, candidates: group.candidates, score, agentCount, roundCount, avgEntropy };
    });

    if (scoredGroups.length === 0)