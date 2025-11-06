// components/OrchestrationPanel.tsx
import React, { useRef, useEffect, useCallback } from 'react';
import {
  AgentType,
  AgentStatus,
  ConsensusResult,
  OrchestrationLogEntry,
  LogType,
} from '../types';
import { AGENT_NAMES_MAP } from '../constants';
import { QuantumSyntaxHighlighter } from '../utils/syntaxHighlighter';
import { animateAgentCard } from '../utils/quantumEffects';

interface OrchestrationPanelProps {
  agents: { [key in AgentType]: AgentStatus };
  consensusResult: ConsensusResult | null;
  show: boolean;
  onClose: () => void;
  onCopyAssembledCode: () => void;
  onApplyAssembledCode: () => void;
  onRerunOrchestration: () => void;
  editorLanguage: string;
}

const OrchestrationPanel: React.FC<OrchestrationPanelProps> = ({
  agents,
  consensusResult,
  show,
  onClose,
  onCopyAssembledCode,
  onApplyAssembledCode,
  onRerunOrchestration,
  editorLanguage,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const logRefs = {
    [AgentType.NEXUS]: useRef<HTMLDivElement>(null),
    [AgentType.COGNITO]: useRef<HTMLDivElement>(null),
    [AgentType.RELAY]: useRef<HTMLDivElement>(null),
    [AgentType.SENTINEL]: useRef<HTMLDivElement>(null),
    [AgentType.ECHO]: useRef<HTMLDivElement>(null),
  };
  const highlighter = new QuantumSyntaxHighlighter();

  const getLogEntryClass = useCallback((type: LogType) => {
    switch (type) {
      case LogType.GENESIS: return 'border-l-agent-nexus text-agent-nexus';
      case LogType.ORIGIN: return 'border-l-agent-cognito text-agent-cognito';
      case LogType.EVENT: return 'border-l-agent-relay text-agent-relay';
      case LogType.FRAGMENT: return 'border-l-agent-sentinel text-agent-sentinel';
      case LogType.CONSENSUS: return 'border-l-accent-color text-accent-color';
      default: return 'border-l-muted-text text-muted-text';
    }
  }, []);

  useEffect(() => {
    if (show && panelRef.current) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight;
    }
    Object.values(AgentType).forEach((agentType) => {
      if (agents[agentType].isActive) {
        animateAgentCard(agentType, true);
        const logElement = logRefs[agentType as AgentType].current;
        if (logElement) logElement.scrollTop = logElement.scrollHeight;
      } else {
        animateAgentCard(agentType, false);
      }
    });
  }, [show, agents, logRefs]);

  if (!show) return null;

  return (
    <div id="ai-response-panel" ref={panelRef} className="fixed bottom-16 right-5 w-[500px] max-h-[600px] bg-panel-bg border border-accent-color rounded-md p-4 overflow-y-auto z-50 shadow-xl
      sm:w-[calc(100%-40px)] sm:left-5">
      <button onClick={onClose} className="absolute top-1 right-1 bg-transparent border-none text-muted-text text-lg cursor-pointer">×</button>
      <div id="ai-response-content">
        {Object.values(AgentType).map((agentType) => (
          <div key={agentType} id={`${agentType}-card`} className={`agent-card ${agentType === AgentType.NEXUS ? 'agent-nexus' : ''} ${agents[agentType].isActive ? 'active' : ''}
              bg-panel-bg rounded-lg p-3 mb-2 border-l-4 transition-all duration-300 relative overflow-hidden
              ${agentType === AgentType.NEXUS ? 'border-l-agent-nexus' : ''}
              ${agentType === AgentType.COGNITO ? 'border-l-agent-cognito' : ''}
              ${agentType === AgentType.RELAY ? 'border-l-agent-relay' : ''}
              ${agentType === AgentType.SENTINEL ? 'border-l-agent-sentinel' : ''}
              ${agentType === AgentType.ECHO ? 'border-l-accent-color' : ''}
              `}>
            <div className={`font-bold text-sm mb-1
              ${agentType === AgentType.NEXUS ? 'text-agent-nexus' : ''}
              ${agentType === AgentType.COGNITO ? 'text-agent-cognito' : ''}
              ${agentType === AgentType.RELAY ? 'text-agent-relay' : ''}
              ${agentType === AgentType.SENTINEL ? 'text-agent-sentinel' : ''}
              ${agentType === AgentType.ECHO ? 'text-accent-color' : ''}
              `}>{AGENT_NAMES_MAP[agentType]}</div>
            <div className="text-xs text-muted-text mb-1">{
              agentType === AgentType.NEXUS ? 'Quantum Orchestrator (Fractal Core)' :
              agentType === AgentType.COGNITO ? 'Fractal Analyzer (Quantum Loop)' :
              agentType === AgentType.RELAY ? 'Quantum Communicator (2244)' :
              agentType === AgentType.SENTINEL ? 'Quantum Monitor (Fractal Coin)' :
              'Quantum Assembler (Final Code)'
            }</div>
            <div className="text-xs leading-tight min-h-5">{agents[agentType].content}</div>
            <div ref={logRefs[agentType as AgentType]} className="bg-black/30 rounded-sm p-2 mt-2 max-h-32 overflow-y-auto text-xs font-['Fira_Code']">
              {agents[agentType].log.map((entry, idx) => (
                <div key={idx} className={`mb-1 pl-2 border-l-2 ${getLogEntryClass(entry.type)}`}>
                  [{entry.timestamp}] {entry.message}
                </div>
              ))}
            </div>
            {agentType === AgentType.NEXUS && (
              <div className="flex items-center gap-1 text-xs mt-1">
                <div className="w-2 h-2 rounded-full bg-accent-color animate-[quantumPulseDot_2s_infinite]"></div>
                <span>Quantum State: Entangled</span>
              </div>
            )}
          </div>
        ))}

        {consensusResult && (
          <div id="consensus-panel" className="bg-panel-bg border border-agent-nexus rounded-lg p-3 mt-4 max-h-[300px] overflow-y-auto">
            <div className="font-bold text-agent-nexus mb-2 flex justify-between items-center">
              <span>Multi-Agent Consensus Results</span>
              <span id="consensus-score" className="bg-agent-nexus text-white px-1.5 py-0.5 rounded-xl text-xs">Score: {consensusResult.score}</span>
            </div>
            <div id="candidates-list">
              {consensusResult.allGroups.map((group, index) => (
                <div key={index} className={`bg-white/[0.05] rounded-sm p-2 mb-2 border-l-3 border-agent-cognito
                  ${index === 0 ? 'selected-candidate border-l-accent-color bg-accent-color/[0.1]' : ''}`}>
                  <div className="text-xs text-muted-text flex justify-between mb-1">
                    <span>Agents: {group.agentCount} | Rounds: {group.roundCount}</span>
                    <span>Score: {group.score.toFixed(2)} | Entropy: {group.avgEntropy.toFixed(3)}</span>
                  </div>
                  <pre className="text-xs font-['Fira_Code'] whitespace-pre-wrap max-h-20 overflow-hidden text-sh-text">{
                    highlighter.highlightText(group.candidates[0].candidate.substring(0, 200), editorLanguage)}
                    {group.candidates[0].candidate.length > 200 ? '...' : ''}
                  </pre>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-2 border-t border-muted-text flex gap-2">
              <button className="flex-1 px-2 py-1 text-xs rounded-sm bg-accent-color hover:bg-hover-blue text-[#f0f0e0]" onClick={onCopyAssembledCode}>Copy Assembled Code</button>
              <button className="flex-1 px-2 py-1 text-xs rounded-sm bg-info-bg hover:bg-hover-blue text-[#f0f0e0]" onClick={onApplyAssembledCode}>Apply Assembled Code</button>
              <button className="flex-1 px-2 py-1 text-xs rounded-sm bg-agent-nexus hover:bg-hover-blue text-[#f0f0e0]" onClick={onRerunOrchestration}>Rerun Orchestration</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrchestrationPanel;
