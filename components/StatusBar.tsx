// components/StatusBar.tsx
import React, { useRef, useEffect } from 'react';
import { EditorStatus, MemoryMetrics } from '../types';
import { initQuantumThreads } from '../utils/quantumEffects';

interface StatusBarProps {
  fileName: string | null;
  editorStatus: EditorStatus;
  memoryMetrics: MemoryMetrics;
}

const StatusBar: React.FC<StatusBarProps> = ({ fileName, editorStatus, memoryMetrics }) => {
  const quantumThreadsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cleanupThreads = initQuantumThreads(quantumThreadsRef);
    return () => {
      cleanupThreads();
    };
  }, []);

  return (
    <div id="status-bar" className="relative bg-status-bg flex justify-between items-center px-3 py-1 text-xs">
      <div ref={quantumThreadsRef} className="absolute inset-0 pointer-events-none opacity-30" />
      <div id="file-meta" className="relative z-10">{fileName || 'No File Loaded'}</div>
      <div id="editor-meta" className="relative z-10">
        Cursor: {editorStatus.cursor.line}:{editorStatus.cursor.col} | Lines: {editorStatus.lines} | Chars: {editorStatus.chars} | History: {editorStatus.historySize}
        {editorStatus.quantumModeActive ? ` | Quantum: ${editorStatus.hyperthreadingActive ? 'Hyperthreaded' : 'Standard'}` : ' | Classical Mode'}
        {editorStatus.multiAgentModeActive ? ' | Multi-Agent' : ' | Single-Agent'}
      </div>
      <div id="memory-status" className={`relative z-10 px-1.5 py-0.5 rounded-sm text-[10px] ${memoryMetrics.className}`}>
        {memoryMetrics.text}
      </div>
    </div>
  );
};

export default StatusBar;
