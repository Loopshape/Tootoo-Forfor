// components/LeftPanel.tsx
import React, { useCallback, useEffect, useRef } from 'react';
import { RecentFile, QuantumSettings, BeautifyLanguage, EditorLanguage } from '../types';
import { COMMON_PROMPT_SUGGESTIONS } from '../constants';
import { quantumNotify } from '../utils/quantumEffects';

interface LeftPanelProps {
  isOpen: boolean;
  settings: QuantumSettings;
  onSettingChange: (key: keyof QuantumSettings, value: any) => void;
  onEditorAction: (action: 'undo' | 'redo' | 'beautify', lang?: BeautifyLanguage) => void;
  onQuantumAction: (action: 'optimize' | 'document' | 'refactor' | 'orchestrate') => void;
  onMemoryAction: (action: 'clearCache' | 'optimizeMemory' | 'exportSession') => void;
  recentFiles: RecentFile[];
  onRecentFileClick: (filename: string) => void;
  onRenderHtml: () => void;
  setPromptInput: (prompt: string) => void;
}

const LeftPanel: React.FC<LeftPanelProps> = ({
  isOpen,
  settings,
  onSettingChange,
  onEditorAction,
  onQuantumAction,
  onMemoryAction,
  recentFiles,
  onRecentFileClick,
  onRenderHtml,
  setPromptInput
}) => {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // This effect is mostly for initial render and ensuring the state aligns with actual DOM,
    // as settings are managed by parent component.
    if (panelRef.current) {
      (panelRef.current.querySelector('#agent-count') as HTMLInputElement).value = settings.agentCount.toString();
      (panelRef.current.querySelector('#max-rounds') as HTMLInputElement).value = settings.maxRounds.toString();
      (panelRef.current.querySelector('#reasoning-depth') as HTMLInputElement).value = settings.reasoningDepth.toString();
    }
  }, [settings]); // Depend on settings to update inputs if they change

  const handleSettingChange = useCallback((key: keyof QuantumSettings, value: any) => {
    onSettingChange(key, value);
  }, [onSettingChange]);

  const handleNumericSettingChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, key: keyof QuantumSettings) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      onSettingChange(key, value);
    }
  }, [onSettingChange]);

  const handleRecentFileClick = useCallback((filename: string, contentPreview: string) => {
    onRecentFileClick(filename);
    quantumNotify(`Loaded file: ${filename}`, 'info');
  }, [onRecentFileClick]);

  return (
    <aside ref={panelRef} id="left-panel" className={`bg-panel-bg border-r border-[#22241e] p-2 flex flex-col gap-2 overflow-y-auto w-60 z-30 transition-transform duration-300 ease-in-out
      md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full md:w-0 md:p-0 md:border-0'}`}>
      
      {/* Editor Actions */}
      <button onClick={() => onEditorAction('undo')} className="small bg-err-color hover:bg-hover-blue text-[#f0f0e0] px-2 py-1 text-xs rounded-sm">UNDO</button>
      <button onClick={() => onEditorAction('redo')} className="small bg-err-color hover:bg-hover-blue text-[#f0f0e0] px-2 py-1 text-xs rounded-sm">REDO</button>
      <button onClick={() => onEditorAction('beautify', 'js')} className="small bg-err-color hover:bg-hover-blue text-[#f0f0e0] px-2 py-1 text-xs rounded-sm">Beautify (JS)</button>
      <button onClick={onRenderHtml} className="small bg-warn-bg text-panel-bg hover:bg-hover-blue hover:text-[#f0f0e0] px-2 py-1 text-xs rounded-sm">Render HTML</button>

      {/* Quantum AI Commands Guide */}
      <div className="mt-5 text-xs text-muted-text">
        <p className="font-bold">Quantum AI Commands:</p>
        <ul className="pl-4 list-disc list-inside">
          {COMMON_PROMPT_SUGGESTIONS.slice(0, 5).map((suggestion, index) => (
            <li key={index} className="cursor-pointer hover:text-accent-color" onClick={() => setPromptInput(suggestion)}>
              {suggestion}
            </li>
          ))}
        </ul>
      </div>

      {/* Quantum Actions */}
      <div className="mt-5 text-xs text-muted-text">
        <p className="font-bold">Quantum Actions:</p>
        <button onClick={() => onQuantumAction('optimize')} className="small w-full mb-1 bg-err-color hover:bg-hover-blue text-[#f0f0e0] px-2 py-1 text-xs rounded-sm">Quantum Optimize</button>
        <button onClick={() => onQuantumAction('document')} className="small w-full mb-1 bg-err-color hover:bg-hover-blue text-[#f0f0e0] px-2 py-1 text-xs rounded-sm">Fractal Document</button>
        <button onClick={() => onQuantumAction('refactor')} className="small w-full bg-err-color hover:bg-hover-blue text-[#f0f0e0] px-2 py-1 text-xs rounded-sm">Hyper Refactor</button>
        <button onClick={() => onQuantumAction('orchestrate')} className="small w-full mt-1 bg-accent-color hover:bg-hover-blue text-[#f0f0e0] px-2 py-1 text-xs rounded-sm">Multi-Agent Consensus</button>
      </div>

      {/* Memory Management */}
      <div className="mt-5 text-xs text-muted-text">
        <p className="font-bold">Memory Management:</p>
        <button onClick={() => onMemoryAction('clearCache')} className="small w-full mb-1 bg-err-color hover:bg-hover-blue text-[#f0f0e0] px-2 py-1 text-xs rounded-sm">Clear Cache</button>
        <button onClick={() => onMemoryAction('optimizeMemory')} className="small w-full mb-1 bg-info-bg hover:bg-hover-blue text-[#f0f0e0] px-2 py-1 text-xs rounded-sm">Optimize Memory</button>
        <button onClick={() => onMemoryAction('exportSession')} className="small w-full bg-err-color hover:bg-hover-blue text-[#f0f0e0] px-2 py-1 text-xs rounded-sm">Export Session</button>
      </div>

      {/* Quantum Settings */}
      <div className="mt-5 text-xs text-muted-text">
        <p className="font-bold">Quantum Settings:</p>
        <div className="flex items-center gap-2 mb-1">
          <input
            type="checkbox"
            id="quantum-mode"
            checked={settings.quantumMode}
            onChange={(e) => handleSettingChange('quantumMode', e.target.checked)}
            className="form-checkbox h-3 w-3 text-accent-color rounded-sm border-gray-600 focus:ring-accent-color bg-gray-700"
          />
          <label htmlFor="quantum-mode">Quantum Fractal Mode</label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="hyperthreading"
            checked={settings.hyperthreading}
            onChange={(e) => handleSettingChange('hyperthreading', e.target.checked)}
            className="form-checkbox h-3 w-3 text-accent-color rounded-sm border-gray-600 focus:ring-accent-color bg-gray-700"
          />
          <label htmlFor="hyperthreading">Hyperthreading</label>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <input
            type="checkbox"
            id="multi-agent-mode"
            checked={settings.multiAgentMode}
            onChange={(e) => handleSettingChange('multiAgentMode', e.target.checked)}
            className="form-checkbox h-3 w-3 text-accent-color rounded-sm border-gray-600 focus:ring-accent-color bg-gray-700"
          />
          <label htmlFor="multi-agent-mode">Multi-Agent Consensus</label>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <input
            type="checkbox"
            id="auto-save"
            checked={settings.autoSave}
            onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
            className="form-checkbox h-3 w-3 text-accent-color rounded-sm border-gray-600 focus:ring-accent-color bg-gray-700"
          />
          <label htmlFor="auto-save">Auto Save</label>
        </div>
      </div>

      {/* Orchestrator Settings */}
      <div className="mt-5 text-xs text-muted-text">
        <p className="font-bold">Orchestrator Settings:</p>
        <div className="mb-1 flex items-center gap-2">
          <label htmlFor="agent-count" className="w-fit">Agent Count:</label>
          <input
            type="number"
            id="agent-count"
            min="2"
            max="8"
            value={settings.agentCount}
            onChange={(e) => handleNumericSettingChange(e, 'agentCount')}
            className="w-16 bg-status-bg text-white border border-muted-text p-0.5 rounded-sm text-xs"
          />
        </div>
        <div className="mb-1 flex items-center gap-2">
          <label htmlFor="max-rounds" className="w-fit">Max Rounds:</label>
          <input
            type="number"
            id="max-rounds"
            min="1"
            max="10"
            value={settings.maxRounds}
            onChange={(e) => handleNumericSettingChange(e, 'maxRounds')}
            className="w-16 bg-status-bg text-white border border-muted-text p-0.5 rounded-sm text-xs"
          />
        </div>
        <div className="mb-1 flex items-center gap-2">
          <label htmlFor="reasoning-depth" className="w-fit">Reasoning Depth:</label>
          <input
            type="number"
            id="reasoning-depth"
            min="1"
            max="5"
            value={settings.reasoningDepth}
            onChange={(e) => handleNumericSettingChange(e, 'reasoningDepth')}
            className="w-16 bg-status-bg text-white border border-muted-text p-0.5 rounded-sm text-xs"
          />
        </div>
      </div>

      {/* Recent Files */}
      <div className="mt-5 text-xs text-muted-text">
        <p className="font-bold">Recent Files:</p>
        <div id="recent-files" className="max-h-24 overflow-y-auto">
          {recentFiles.length > 0 ? (
            recentFiles.map((file, index) => (
              <div key={index} className="px-2 py-1 border-b border-muted-text last:border-b-0 cursor-pointer hover:bg-white/[0.1]" onClick={() => handleRecentFileClick(file.filename, file.contentPreview)}>
                <div className="font-bold">{file.filename}</div>
                <div className="text-[9px] text-muted-text">{new Date(file.timestamp).toLocaleDateString()}</div>
              </div>
            ))
          ) : (
            <div className="p-2 text-muted-text text-xs">No recent files</div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default LeftPanel;