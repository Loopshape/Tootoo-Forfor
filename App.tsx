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
  AIStudio, // Import AIStudio interface
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
    // FIX: Removed aistudio declaration from here. It's now globally declared in types.ts to prevent type conflicts.
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
      await addLog(AgentType.NEXUS, 'Generating genesis hash from current code...', LogType.GENESIS);
      const genesisHash = await sha256('GENESIS' + Date.now().toString() + editorContext);
      await addLog(AgentType.NEXUS, `Genesis: ${genesisHash.substring(0, 16)}...`, LogType.GENESIS);

      await addLog(AgentType.NEXUS, 'Generating origin hashes for agents...', LogType.ORIGIN);
      const agents: AgentInfo[] = [];
      const agentCount = state.settings.agentCount;

      for (let i = 0; i < agentCount; i++) {
        const agentId = `agent-${i}`;
        // FIX: Corrected call to generateFractalHash. The second argument must be a number (depth), not a string.
        // Concatenated agentId with genesisHash to create a unique seed for each agent.
        const originHash = await generateFractalHash(genesisHash + agentId);
        agents.push({ id: agentId, origin: originHash });
        await addLog(AgentType.NEXUS, `${agentId}: ${originHash.substring(0, 12)}...`, LogType.ORIGIN);
      }

      await addLog(AgentType.NEXUS, 'Creating event log entry...', LogType.EVENT);
      const eventId = generateEventId();
      await addLog(AgentType.NEXUS, `Event: ${eventId} logged`, LogType.EVENT);
      setAgentStatus(AgentType.COGNITO, `<div class="quantum-spinner"></div>Spawning ${agentCount} fractal agents...`, true);

      // Corrected type to CandidateFragment[]
      const allCandidates: CandidateFragment[] = [];
      const maxRounds = state.settings.maxRounds;

      // Fixed typo: maxRrounds -> maxRounds
      for (let round = 0; round < maxRounds; round++) {
        await addLog(AgentType.RELAY, `<div class="quantum-spinner"></div>Round ${round + 1}/${maxRounds}...`, LogType.INFO);
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
          await addLog(AgentType.SENTINEL, `Fragment from ${agent.id} (round ${round + 1})`, LogType.FRAGMENT);

          allCandidates.push(fragment);
          return fragment;
        });

        await Promise.all(roundPromises);
        await new Promise(r => setTimeout(r, 500)); // Brief pause between rounds
      }

      await addLog(AgentType.SENTINEL, `<div class="quantum-spinner"></div>Assembling final consensus...`, LogType.INFO);
      setAgentStatus(AgentType.SENTINEL, `Evaluating ${allCandidates.length} fragments for consensus...`, true);
      const consensus = await assembleFinalAnswer(allCandidates, genesisHash); // Pass CandidateFragment[]

      setAgentStatus(AgentType.ECHO, `<div class="quantum-spinner"></div>Reassembling script from consensus...`, true);
      await addLog(AgentType.ECHO, `Assembly started. Verified Genesis: ${consensus.genesis.substring(0, 12)}...`, LogType.CONSENSUS);
      await new Promise(r => setTimeout(r, 250));
      await addLog(AgentType.ECHO, `Selected candidate from Agent ${consensus.rootAgent} with score ${consensus.score}.`, LogType.CONSENSUS);
      await new Promise(r => setTimeout(r, 250));

      const finalCodeHash = await sha256(consensus.selectedCandidate);
      await addLog(AgentType.ECHO, `Verified final code hash: ${finalCodeHash.substring(0, 12)}...`, LogType.CONSENSUS);
      await new Promise(r => setTimeout(r, 250));
      await addLog(AgentType.ECHO, `Reassembly complete. Quantum script generated.`, LogType.CONSENSUS);

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

    if (scoredGroups.length === 0) {
      return {
        genesis,
        selectedCandidate: "// No valid candidates were generated by the agents.",
        score: '0', agentCount: 0, roundCount: 0, avgEntropy: '0',
        rootAgent: 'N/A', rootEntropy: '0', allGroups: []
      };
    }

    scoredGroups.sort((a, b) => b.score - a.score);
    const topGroup = scoredGroups[0];
    const rootCandidate = topGroup.candidates.reduce((best, current) =>
      current.entropy > best.entropy ? current : best
    );

    return {
      genesis,
      selectedCandidate: topGroup.candidates[0].candidate,
      score: topGroup.score.toFixed(3),
      agentCount: topGroup.agentCount,
      roundCount: topGroup.roundCount,
      avgEntropy: topGroup.avgEntropy.toFixed(3),
      rootAgent: rootCandidate.agentId,
      rootEntropy: rootCandidate.entropy.toFixed(3),
      allGroups: scoredGroups,
    };
  }, []);

  const handleQuantumAction = useCallback((action: 'optimize' | 'document' | 'refactor' | 'orchestrate') => {
    if (!state.settings.multiAgentMode) {
      quantumNotify('Multi-Agent Consensus must be enabled in settings for Quantum Actions.', 'warn');
      return;
    }
    let prompt = '';
    switch (action) {
      case 'optimize':
        prompt = 'Optimize this code for performance and readability';
        break;
      case 'document':
        prompt = 'Add comprehensive documentation and comments to this code';
        break;
      case 'refactor':
        prompt = 'Refactor this code to improve its structure, maintainability, and apply modern best practices';
        break;
      case 'orchestrate':
      default:
        // No specific prompt for orchestrate, it uses current prompt input
        break;
    }
    if (promptInputRef.current) {
      promptInputRef.current.value = prompt;
    }
    runEnhancedOrchestrator(prompt);
  }, [state.settings.multiAgentMode, runEnhancedOrchestrator]);


  const handleSendPrompt = useCallback(() => {
    const prompt = promptInputRef.current?.value.trim();
    if (!prompt) return;

    if (state.settings.multiAgentMode) {
      runEnhancedOrchestrator(prompt);
    } else {
      // Single-agent mode, simple API call
      setState(prevState => ({ ...prevState, showOrchestrationPanel: true }));
      setAgentStatus(AgentType.NEXUS, '<div class="quantum-spinner"></div>Sending prompt to single agent...', true);
      geminiService.generateGeminiContent(prompt, 'gemini-2.5-flash').then(response => {
        setAgentStatus(AgentType.ECHO, response);
        addLog(AgentType.ECHO, 'Single agent response received.', LogType.CONSENSUS);
        setAgentStatus(AgentType.NEXUS, 'Single agent task complete');
      }).catch(error => {
        addLog(AgentType.ECHO, `Single agent error: ${error.message}`, LogType.INFO);
        setAgentStatus(AgentType.ECHO, `<span class="text-error-color">Error: ${error.message}</span>`);
        setAgentStatus(AgentType.NEXUS, 'Single agent task failed');
      }).finally(() => {
        setState(prevState => ({ ...prevState, isGenerating: false }));
        setAgentStatus(AgentType.NEXUS, INITIAL_AGENTS_STATE.nexus.content, false);
      });
    }
  }, [state.settings.multiAgentMode, state.isGenerating, runEnhancedOrchestrator, setAgentStatus, addLog]);

  // --- Consensus Action Handlers ---
  const handleCopyAssembledCode = useCallback(() => {
    if (state.quantumConsensusCode) {
      navigator.clipboard.writeText(state.quantumConsensusCode).then(() => {
        quantumNotify('Assembled code copied to clipboard!', 'success');
      });
    }
  }, [state.quantumConsensusCode]);

  const handleApplyAssembledCode = useCallback(() => {
    if (state.quantumConsensusCode) {
      editorRef.current?.setContent(state.quantumConsensusCode);
      quantumNotify('Assembled code applied!', 'success');
    }
  }, [state.quantumConsensusCode]);

  // --- UI Interactions ---
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);

  const toggleLeftPanel = useCallback(() => {
    setIsLeftPanelOpen(prev => !prev);
  }, []);

  const handleRenderHtml = useCallback(() => {
    if (state.currentFileType !== 'html' && state.currentFileType !== 'jsx' && state.currentFileType !== 'tsx') {
      quantumNotify('Only HTML, JSX, or TSX files can be directly rendered.', 'warn');
      return;
    }
    setState(prevState => ({
      ...prevState,
      showPreviewPanel: true,
      previewHtml: state.editorContent,
    }));
  }, [state.editorContent, state.currentFileType]);

  const setPromptInput = useCallback((prompt: string) => {
    if (promptInputRef.current) {
      promptInputRef.current.value = prompt;
    }
  }, []);

  // --- Prompt Suggestions ---
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<PromptSuggestion[]>([]);

  const handlePromptInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length < 2) {
      setShowSuggestions(false);
      return;
    }

    const suggestions = COMMON_PROMPT_SUGGESTIONS.filter(cmd =>
      cmd.toLowerCase().includes(value.toLowerCase())
    ).slice(0, 5).map(s => ({
      text: s,
      onClick: (val: string) => {
        if (promptInputRef.current) promptInputRef.current.value = val;
        setShowSuggestions(false);
      }
    }));
    setFilteredSuggestions(suggestions);
    setShowSuggestions(suggestions.length > 0);
  }, []);

  const handlePromptInputBlur = useCallback(() => {
    // Delay hiding suggestions to allow click events on suggestions
    setTimeout(() => setShowSuggestions(false), 200);
  }, []);

  const handlePromptInputFocus = useCallback(() => {
    const value = promptInputRef.current?.value || '';
    if (value.length >= 2) {
      const suggestions = COMMON_PROMPT_SUGGESTIONS.filter(cmd =>
        cmd.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5).map(s => ({
        text: s,
        onClick: (val: string) => {
          if (promptInputRef.current) promptInputRef.current.value = val;
          setShowSuggestions(false);
        }
      }));
      setFilteredSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      <header className="relative bg-header-bg border-b border-[#22241e] flex items-center justify-between px-3 py-1.5 overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-quantum-glow to-transparent animate-[quantumScan_3s_infinite_linear] opacity-30"></div>
        <div className="flex gap-3 items-center relative z-20">
          <button onClick={toggleLeftPanel} className="p-1 text-sm bg-err-color hover:bg-hover-blue text-[#f0f0e0] rounded-sm">
            {isLeftPanelOpen ? '✕' : '☰'}
          </button>
          <div className="font-extrabold text-white animate-[quantumPulse_2s_infinite_alternate]">Nemodian 2244-1 :: Quantum Fractal AI</div>
        </div>
        <div className="flex gap-2 items-center relative z-20">
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${state.aiConnectionStatus === AiConnectionStatus.READY ? 'bg-accent-color' : 'bg-err-color'} ${state.aiConnectionStatus === AiConnectionStatus.PROBING ? 'animate-pulse' : ''}`} />
            <div className="text-xs text-[#cfcfbd]">Quantum AI: {state.aiConnectionStatus}</div>
          </div>
          <input type="file" id="file-input" accept=".js,.html,.css,.txt,.json,.ts,.jsx,.tsx,.py,.php,.sql,.md,.xml,.yaml,.yml" className="hidden" onChange={handleFileOpen} />
          <button onClick={() => document.getElementById('file-input')?.click()} className="small bg-err-color hover:bg-hover-blue text-[#f0f0e0] px-2 py-1 text-xs rounded-sm">Open</button>
          <button onClick={quantumSaveFile} className="small bg-err-color hover:bg-hover-blue text-[#f0f0e0] px-2 py-1 text-xs rounded-sm">Save</button>
          <button onClick={quantumSaveAsFile} className="small bg-err-color hover:bg-hover-blue text-[#f0f0e0] px-2 py-1 text-xs rounded-sm">Save As</button>
          <button onClick={handleRenderHtml} className="small bg-warn-bg text-panel-bg hover:bg-hover-blue hover:text-[#f0f0e0] px-2 py-1 text-xs rounded-sm">Render HTML</button>
          <button onClick={handleSendPrompt} disabled={state.isGenerating} className="small bg-info-bg hover:bg-hover-blue text-[#f0f0e0] px-2 py-1 text-xs rounded-sm">Quantum AI</button>
          <button onClick={() => handleQuantumAction('orchestrate')} disabled={state.isGenerating || !state.settings.multiAgentMode} className="small bg-accent-color hover:bg-hover-blue text-[#f0f0e0] px-2 py-1 text-xs rounded-sm">Orchestrator</button>
        </div>
      </header>

      <StatusBar
        fileName={state.currentFileName}
        editorStatus={state.editorStatus}
        memoryMetrics={state.memoryMetrics}
      />

      <div className={`flex-1 grid bg-theme-bg overflow-hidden relative transition-all duration-300 ease-in-out ${isLeftPanelOpen ? 'grid-cols-[240px_1fr]' : 'grid-cols-[0px_1fr]'}`}>
        <LeftPanel
          isOpen={isLeftPanelOpen}
          settings={state.settings}
          onSettingChange={handleSettingChange}
          onEditorAction={handleEditorAction}
          onQuantumAction={handleQuantumAction}
          onMemoryAction={handleMemoryAction}
          recentFiles={state.recentFiles}
          onRecentFileClick={(filename) => {
            const file = state.recentFiles.find(f => f.filename === filename);
            if (file) {
              editorRef.current?.setContent(file.contentPreview); // Use contentPreview for quick load
              setState(prevState => ({
                ...prevState,
                currentFileName: filename,
                currentFileType: editorRef.current?.getHighlighter().detectLanguage(filename) || 'javascript',
              }));
              quantumNotify(`Loaded recent file: ${filename}`, 'success');
            }
          }}
          onRenderHtml={handleRenderHtml}
          setPromptInput={setPromptInput}
        />
        <Editor
          ref={editorRef}
          content={state.editorContent}
          onContentChange={handleEditorContentChange}
          currentFileType={state.currentFileType}
          onEditorStatusChange={handleEditorStatusChange}
          settings={state.settings}
        />
      </div>

      <footer className="flex-shrink-0 flex items-center justify-between px-3 py-1.5 bg-header-bg border-t border-[#22241e] h-footer-h">
        <input
          ref={promptInputRef}
          id="prompt-input"
          placeholder="Enter quantum command (e.g., 'create a function to sort arrays')"
          className="flex-1 mr-2 px-2 py-1 bg-status-bg border border-accent-color text-[#f0f0e0] font-['Fira_Code'] rounded-sm text-base"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              handleSendPrompt();
            }
          }}
          onChange={handlePromptInputChange}
          onFocus={handlePromptInputFocus}
          onBlur={handlePromptInputBlur}
          disabled={state.isGenerating}
        />
        <button onClick={handleSendPrompt} disabled={state.isGenerating} className="bg-accent-color hover:bg-hover-blue text-[#f0f0e0] px-3 py-1.5 rounded-sm">
          {state.isGenerating ? <div className="quantum-spinner" /> : 'QUANTUM PROCESS'}
        </button>
        {showSuggestions && (
          <div ref={suggestionsPanelRef} className="absolute bottom-[calc(theme(spacing.footer-h)+5px)] left-3 bg-panel-bg border border-accent-color rounded-md max-h-52 overflow-y-auto z-[1000] shadow-lg w-[calc(100%-120px)]">
            {filteredSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="px-2 py-1 border-b border-muted-text last:border-b-0 cursor-pointer hover:bg-white/[0.1] text-xs"
                onMouseDown={(e) => { // Use onMouseDown to prevent blur event from firing
                  e.preventDefault();
                  suggestion.onClick(suggestion.text);
                }}
              >
                {suggestion.text}
              </div>
            ))}
          </div>
        )}
      </footer>

      <OrchestrationPanel
        agents={state.agents}
        consensusResult={state.consensusResult}
        show={state.showOrchestrationPanel}
        onClose={() => setState(prevState => ({ ...prevState, showOrchestrationPanel: false }))}
        onCopyAssembledCode={handleCopyAssembledCode}
        onApplyAssembledCode={handleApplyAssembledCode}
        onRerunOrchestration={() => runEnhancedOrchestrator()}
        editorLanguage={state.currentFileType}
      />

      <PreviewPanel
        show={state.showPreviewPanel}
        onClose={() => setState(prevState => ({ ...prevState, showPreviewPanel: false }))}
        htmlContent={state.previewHtml}
      />
    </div>
  );
};

export default App;