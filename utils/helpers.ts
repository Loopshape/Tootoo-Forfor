// utils/helpers.ts
import { EditorLanguage } from '../types';

export function getMimeType(fileType: EditorLanguage): string {
  const mimeMap: { [key in EditorLanguage]: string } = {
    'javascript': 'application/javascript',
    'jsx': 'application/javascript',
    'typescript': 'application/typescript',
    'tsx': 'application/typescript',
    'html': 'text/html',
    'css': 'text/css',
    'python': 'text/x-python',
    'php': 'application/x-httpd-php',
    'sql': 'application/sql',
    'markdown': 'text/markdown',
    'json': 'application/json',
    'xml': 'application/xml',
    'yaml': 'application/x-yaml',
    'yml': 'application/x-yaml',
  };
  return mimeMap[fileType] || 'text/plain';
}

export async function sha256(str: string): Promise<string> {
  const textAsBuffer = new TextEncoder().encode(str);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', textAsBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashAsHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashAsHex;
}

export function generateFractalHash(agentName: string, depth = 3): string {
  const base = agentName + Date.now().toString();
  let hash = '';

  for (let i = 0; i < depth; i++) {
    let current = base;
    for (let j = 0; j <= i; j++) {
      current = btoa(current).substring(0, 16);
    }
    hash += current;
  }

  return btoa(hash).substring(0, 32);
}

export function calculateEntropy(hash: string): number {
  const charCounts: { [key: string]: number } = {};
  for (const char of hash) {
    charCounts[char] = (charCounts[char] || 0) + 1;
  }
  let entropy = 0;
  const length = hash.length;
  for (const char in charCounts) {
    const probability = charCounts[char] / length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}

export function generateEventId(): string {
  return 'event_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
}

export function stripCodeBlock(content: string): string {
  const trimmed = content.trim();
  const codeBlockRegex = /^```(?:\w+)?\n([\s\S]*?)\n```$/;
  const match = trimmed.match(codeBlockRegex);
  if (match && match[1]) {
      return match[1].trim();
  }
  return trimmed;
}

// Function to get the caret position relative to the start of the editor content.
export function getCaretPosition(element: HTMLElement): { line: number; col: number; offset: number } {
  const selection = window.getSelection();
  let line = 0;
  let col = 0;
  let offset = 0;

  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    const preCaretText = preCaretRange.toString();
    const preCaretLines = preCaretText.split('\n');

    line = preCaretLines.length;
    col = preCaretLines[preCaretLines.length - 1].length;
    offset = preCaretText.length;
  }

  return { line, col, offset };
}

// Function to set the caret position in the editor content.
export function setCaretPosition(element: HTMLElement, offset: number): void {
  const range = document.createRange();
  const selection = window.getSelection();

  let currentNode: Node | null = element;
  let currentOffset = 0;

  function traverseNodes(node: Node) {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      if (currentOffset + (node.textContent?.length || 0) >= offset) {
        range.setStart(node, offset - currentOffset);
        range.collapse(true);
        return true;
      }
      currentOffset += node.textContent?.length || 0;
    } else {
      for (const childNode of Array.from(node.childNodes)) {
        if (traverseNodes(childNode)) return true;
      }
    }
    return false;
  }

  if (traverseNodes(element)) {
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
}
