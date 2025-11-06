// components/Editor.tsx
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { QuantumSyntaxHighlighter } from '../utils/syntaxHighlighter';
import { DEBOUNCE_DELAY_MS, MAX_HISTORY_SIZE } from '../constants';
import { EditorLanguage, EditorStatus, QuantumSettings } from '../types';
import { getCaretPosition, setCaretPosition } from '../utils/helpers';
import { quantumNotify } from '../utils/quantumEffects';

interface EditorProps {
  content: string;
  onContentChange: (newContent: string) => void;
  currentFileType: EditorLanguage;
  onEditorStatusChange: (status: EditorStatus) => void;
  settings: QuantumSettings;
}

const highlighter = new QuantumSyntaxHighlighter(); // Singleton for highlighting

// FIX: Wrapped component in React.forwardRef to allow parent components to pass a ref.
const Editor = React.forwardRef<any, EditorProps>(({
  content,
  onContentChange,
  currentFileType,
  onEditorStatusChange,
  settings,
}, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const quantumThinkingRef = useRef<HTMLDivElement>(null);

  const historyStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const isComposing = useRef(false);
  const debounceTimer = useRef<number | null>(null);

  // Initialize history with initial content
  useEffect(() => {
    historyStack.current = [content];
    redoStack.current = [];
    if (editorRef.current) {
      editorRef.current.textContent = content; // Set initial content directly
      highlighter.setLanguage(currentFileType);
      highlighter.highlightElement(editorRef.current, currentFileType);
      updateLineNumbers();
      updateStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, currentFileType]); // Re-run if content or type changes externally

  const updateLineNumbers = useCallback(() => {
    if (editorRef.current && lineNumbersRef.current) {
      const text = editorRef.current.textContent || '';
      const lineCount = text.split('\n').length;
      let lineNumbersHTML = '';
      for (let i = 1; i <= lineCount; i++) {
        lineNumbersHTML += i + '<br>';
      }
      lineNumbersRef.current.innerHTML = lineNumbersHTML;
    }
  }, []);

  const updateStatus = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.textContent || '';
    const lines = text.split('\n');

    const { line: lineNum, col: colNum } = getCaretPosition(editorRef.current);

    onEditorStatusChange({
      cursor: { line: lineNum, col: colNum },
      lines: lines.length,
      chars: text.length,
      historySize: historyStack.current.length,
      quantumModeActive: settings.quantumMode,
      hyperthreadingActive: settings.hyperthreading,
      multiAgentModeActive: settings.multiAgentMode,
    });
  }, [onEditorStatusChange, settings.quantumMode, settings.hyperthreading, settings.multiAgentMode]);

  const pushHistory = useCallback(() => {
    if (!editorRef.current) return;
    const currentContent = editorRef.current.textContent || '';
    if (historyStack.current.length && historyStack.current[historyStack.current.length - 1] === currentContent) return;

    historyStack.current.push(currentContent);
    redoStack.current = [];

    if (historyStack.current.length > MAX_HISTORY_SIZE) {
      historyStack.current.shift();
    }
    updateStatus();
  }, [updateStatus]);

  const applyContentAndHighlight = useCallback((newContent: string) => {
    if (editorRef.current) {
      const { offset } = getCaretPosition(editorRef.current);
      editorRef.current.textContent = newContent;
      highlighter.highlightElement(editorRef.current, currentFileType);
      setCaretPosition(editorRef.current, offset);
      onContentChange(newContent);
      updateLineNumbers();
      updateStatus();
    }
  }, [currentFileType, onContentChange, updateLineNumbers, updateStatus]);

  const handleInput = useCallback(() => {
    if (isComposing.current) return;

    if (debounceTimer.current !== null) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = window.setTimeout(() => {
      pushHistory();
      if (editorRef.current) {
        onContentChange(editorRef.current.textContent || '');
        highlighter.highlightElement(editorRef.current, currentFileType);
      }
      updateLineNumbers();
      updateStatus();
      debounceTimer.current = null;
    }, DEBOUNCE_DELAY_MS);
  }, [pushHistory, onContentChange, currentFileType, updateLineNumbers, updateStatus]);

  const insertText = useCallback((text: string) => {
    if (editorRef.current) {
      document.execCommand('insertText', false, text);
      handleInput(); // Trigger input handling to update state and history
    }
  }, [handleInput]);

  const undo = useCallback(() => {
    if (historyStack.current.length > 1) {
      redoStack.current.push(historyStack.current.pop() as string);
      applyContentAndHighlight(historyStack.current[historyStack.current.length - 1]);
    } else {
      quantumNotify('No more undo history.', 'info');
    }
  }, [applyContentAndHighlight]);

  const redo = useCallback(() => {
    if (redoStack.current.length) {
      const poppedContent = redoStack.current.pop() as string;
      historyStack.current.push(poppedContent);
      applyContentAndHighlight(poppedContent);
    } else {
      quantumNotify('No more redo history.', 'info');
    }
  }, [applyContentAndHighlight]);

  const beautifyCode = useCallback((language: 'js' | 'html' | 'css') => {
    if (!editorRef.current) return;
    const currentContent = editorRef.current.textContent || '';
    let beautified = currentContent;

    if (typeof (window as any).js_beautify === 'undefined') {
      quantumNotify('Beautify library not loaded. Make sure js-beautify CDN is included.', 'warn');
      return;
    }
    const options = { indent_size: 2, space_in_empty_paren: true };

    try {
      if (language === 'js') {
        beautified = (window as any).js_beautify(currentContent, options);
      } else if (language === 'html') {
        beautified = (window as any).html_beautify(currentContent, options);
      } else if (language === 'css') {
        beautified = (window as any).css_beautify(currentContent, { indent_size: 2 });
      }
      applyContentAndHighlight(beautified);
      quantumNotify('Code beautified', 'success');
    } catch (error) {
      console.error("Beautify error:", error);
      quantumNotify('Beautification failed', 'error');
    }
  }, [applyContentAndHighlight]);


  const handleKeydown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      insertText('    ');
    }

    if (event.ctrlKey || event.metaKey) {
      if (event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (event.key === 'z' && event.shiftKey) {
        event.preventDefault();
        redo();
      } else if (event.key === 'y') {
        event.preventDefault();
        redo();
      } else if (event.key === 'd') {
        event.preventDefault();
        duplicateLine();
      }
    } else if (event.key === 'F2') {
      event.preventDefault();
      renameVariable();
    }
  }, [insertText, undo, redo]);


  const duplicateLine = useCallback(() => {
    if (!editorRef.current) return;
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const editorText = editorRef.current.textContent || '';
    const lines = editorText.split('\n');

    let startLine = 0;
    let endLine = 0;
    let currentOffset = 0;

    for (let i = 0; i < lines.length; i++) {
        const lineLength = lines[i].length + (i < lines.length - 1 ? 1 : 0); // +1 for newline
        if (range.startOffset + (range.startContainer.textContent?.length || 0) >= currentOffset &&
            range.startOffset + (range.startContainer.textContent?.length || 0) < currentOffset + lineLength) {
            startLine = i;
        }
        if (range.endOffset + (range.endContainer.textContent?.length || 0) >= currentOffset &&
            range.endOffset + (range.endContainer.textContent?.length || 0) < currentOffset + lineLength) {
            endLine = i;
        }
        currentOffset += lineLength;
    }
    
    // Ensure startLine is always less than or equal to endLine
    if (startLine > endLine) {
        [startLine, endLine] = [endLine, startLine];
    }

    const linesToDuplicate = lines.slice(startLine, endLine + 1).join('\n');
    insertText('\n' + linesToDuplicate);
  }, [insertText]);


  const renameVariable = useCallback(() => {
    if (!editorRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim(); // Trim whitespace from selection

    if (selectedText) {
      const newName = prompt('Rename variable:', selectedText);
      if (newName !== null && newName.trim() !== '' && newName !== selectedText) {
        document.execCommand('insertText', false, newName);
        handleInput();
      } else if (newName === null) {
          // User cancelled, do nothing.
      } else {
          quantumNotify('Variable name cannot be empty or the same.', 'warn');
      }
    } else {
      quantumNotify('Select a variable to rename', 'warn');
    }
  }, [handleInput]);


  const syncScroll = useCallback(() => {
    if (editorRef.current && lineNumbersRef.current && editorRef.current.parentElement) {
      lineNumbersRef.current.scrollTop = editorRef.current.parentElement.scrollTop;
    }
  }, []);

  useEffect(() => {
    const editorElement = editorRef.current;
    const parentElement = editorRef.current?.parentElement;

    if (editorElement && parentElement) {
      highlighter.setLanguage(currentFileType);
      const cleanupHighlighting = highlighter.enableRealtimeHighlighting(editorElement, currentFileType);

      editorElement.addEventListener('compositionstart', () => isComposing.current = true);
      editorElement.addEventListener('compositionend', () => {
        isComposing.current = false;
        handleInput();
      });
      editorElement.addEventListener('click', updateStatus);
      editorElement.addEventListener('keyup', updateStatus);
      parentElement.addEventListener('scroll', syncScroll);

      // Initial updates
      updateLineNumbers();
      updateStatus();

      return () => {
        cleanupHighlighting();
        editorElement.removeEventListener('compositionstart', () => isComposing.current = true);
        editorElement.removeEventListener('compositionend', () => {
          isComposing.current = false;
          handleInput();
        });
        editorElement.removeEventListener('click', updateStatus);
        editorElement.removeEventListener('keyup', updateStatus);
        parentElement.removeEventListener('scroll', syncScroll);
        if (debounceTimer.current !== null) {
          clearTimeout(debounceTimer.current);
        }
      };
    }
  }, [currentFileType, handleInput, syncScroll, updateLineNumbers, updateStatus]);

  // Expose editor actions via ref for parent to call
  // FIX: Used the forwarded `ref` and removed invalid spreading of DOM element properties.
  React.useImperativeHandle(ref, () => ({
    undo: undo,
    redo: redo,
    beautify: (lang: 'js' | 'html' | 'css') => beautifyCode(lang),
    setContent: (newContent: string) => applyContentAndHighlight(newContent),
    getContent: () => editorRef.current?.textContent || '',
    getCurrentFileType: () => currentFileType,
    getHighlighter: () => highlighter,
  }));

  return (
    <div className="relative flex flex-1 bg-theme-bg overflow-auto">
      <div ref={quantumThinkingRef} className="absolute inset-0 pointer-events-none z-10" />
      <div ref={lineNumbersRef} className="w-[var(--ln-width)] p-2 pr-2 bg-panel-bg text-muted-text font-['Fira_Code'] tabular-nums text-right select-none leading-baseline flex-shrink-0 sticky left-0 z-10 text-xs-editor" />
      <div
        ref={editorRef}
        id="editor"
        className="flex-1 min-h-full p-2 pl-3 box-border whitespace-pre leading-baseline font-['Fira_Code'] tab-size-4 caret-accent-color outline-none overflow-auto sh-text"
        contentEditable="true"
        spellCheck="false"
        data-gramm="false"
        data-gramm_editor="false"
        data-enable-grammarly="false"
        onInput={handleInput}
        onKeyDown={handleKeydown}
        onClick={updateStatus}
        onKeyUp={updateStatus}
      >
        {content}
      </div>

      {/* Syntax Highlighting Styles - Directly embedded for simplicity with CDN Tailwind */}
      <style>{`
        .sh-token { transition: opacity 0.08s ease; pointer-events: none; }
        .sh-comment { color: #64748b; font-style: italic; opacity: 0.8; }
        .sh-string { color: #a3e635; font-weight: 500; }
        .sh-number { color: #f59e0b; font-weight: 600; }
        .sh-keyword { color: #f472b6; font-weight: 600; }
        .sh-type { color: #7dd3fc; font-weight: 500; }
        .sh-bracket { color: #c084fc; font-weight: 700; }
        .sh-id { color: #94a3b8; }
        .sh-op { color: #94a3b8; font-weight: 500; }
        .sh-ws { opacity: 0.3; }
        .sh-key { color: #7dd3fc; font-weight: 500; }
        .sh-number2 { color: #f59e0b; font-weight: 600; }
        .sh-text { color: #e2e8f0; }
        .sh-unknown { color: #f87171; }
        .sh-tag { color: #f472b6; font-weight: 600; }
        .sh-property { color: #7dd3fc; font-weight: 500; }
        .sh-function { color: #4ac94a; font-weight: 500; }
        .sh-operator { color: #93c5fd; font-weight: 600; }
        .sh-regex { color: #fbbf24; }
        .sh-html-entity { color: #f59e0b; }
        .sh-css-selector { color: #c084fc; }
        .sh-css-property { color: #60a5fa; }
        .sh-css-value { color: #34d399; }
        .sh-jsx-tag { color: #f472b6; }
        .sh-jsx-attribute { color: #7dd3fc; }
        .sh-template-string { color: #a3e635; font-weight: 500; }
        .sh-variable { color: #67e8f9; }
        .editor-content::selection { background: rgba(74, 201, 74, 0.3); }
        .editor-container::-webkit-scrollbar { width: 12px; }
        .editor-container::-webkit-scrollbar-track { background: var(--panel-bg); }
        .editor-container::-webkit-scrollbar-thumb { background: var(--muted-text); border-radius: 6px; }
        .editor-container::-webkit-scrollbar-thumb:hover { background: var(--accent-color); }
        .typing-active { caret-color: lime; animation: blink 1s infinite; }
      `}</style>
    </div>
  );
});

export default Editor;
