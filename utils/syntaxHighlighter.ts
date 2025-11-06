// utils/syntaxHighlighter.ts
import { EditorLanguage } from '../types';
import { SYNTAX_HIGHLIGHTING_CLASS_PREFIX } from '../constants';

interface HighlightPattern {
  pattern: RegExp;
  type: string;
}

export class QuantumSyntaxHighlighter {
  private languagePatterns: { [key in EditorLanguage]: HighlightPattern[] };
  private currentLanguage: EditorLanguage;
  private debounceTimer: number | null = null;
  private debounceDelay = 50;

  constructor() {
    this.languagePatterns = {
      javascript: this.getJavaScriptPatterns(),
      typescript: this.getTypeScriptPatterns(),
      html: this.getHTMLPatterns(),
      css: this.getCSSPatterns(),
      python: this.getPythonPatterns(),
      php: this.getPHPPatterns(),
      sql: this.getSQLPatterns(),
      markdown: this.getMarkdownPatterns(),
      json: this.getJSONPatterns(),
      jsx: this.getJSXPatterns(),
      tsx: this.getTSXPatterns(),
      xml: this.getXMLPatterns(),
      yaml: this.getYAMLPatterns(),
      // FIX: Added 'yml' property to satisfy the EditorLanguage type.
      yml: this.getYAMLPatterns(),
    };
    this.currentLanguage = 'javascript';
  }

  private getJavaScriptPatterns(): HighlightPattern[] {
    return [
      { pattern: /\/\/.*$/gm, type: 'comment' },
      { pattern: /\/\*[\s\S]*?\*\//g, type: 'comment' },
      { pattern: /`(?:\\.|[^`\\])*`/g, type: 'template-string' },
      { pattern: /'(?:\\.|[^'\\])*'/g, type: 'string' },
      { pattern: /"(?:\\.|[^"\\])*"/g, type: 'string' },
      { pattern: /\/(?![*\/])(?:\\.|[^\/\\\n])+\/[gimuy]*/g, type: 'regex' },
      { pattern: /\b\d+(\.\d+)?\b/g, type: 'number' },
      { pattern: /\b0x[a-fA-F0-9]+\b/g, type: 'number' },
      { pattern: /\b(?:function|class|const|let|var|if|else|for|while|do|switch|case|break|continue|return|try|catch|finally|throw|new|this|super|extends|implements|import|export|from|default|async|await|yield|static|public|private|protected|readonly|abstract|interface|type|namespace|module|declare|get|set|of|in|instanceof|typeof|void|delete)\b/g, type: 'keyword' },
      { pattern: /\b(?:console|Math|Date|Array|Object|String|Number|Boolean|Symbol|Map|Set|Promise|JSON|RegExp|Error|Function|Proxy|Reflect)\b/g, type: 'type' },
      { pattern: /\b[a-zA-Z_$][\w$]*(?=\s*\()/g, type: 'function' },
      { pattern: /[+\-*/%=<>!&|^~?:.,;]/g, type: 'operator' },
      { pattern: /[{}()[\]<>]/g, type: 'bracket' }
    ];
  }

  private getTypeScriptPatterns(): HighlightPattern[] {
    const jsPatterns = this.getJavaScriptPatterns();
    jsPatterns.push(
      { pattern: /\b(?:interface|type|implements|namespace|module|declare|readonly|abstract|public|private|protected)\b/g, type: 'keyword' },
      { pattern: /:\s*\w+/g, type: 'type' }
    );
    return jsPatterns;
  }

  private getHTMLPatterns(): HighlightPattern[] {
    return [
      { pattern: /<!--[\s\S]*?-->/g, type: 'comment' },
      { pattern: /<\/?[\w][\w-]*/g, type: 'tag' },
      { pattern: /(?<=<\/?[\w][\w-]*\s+)[\w-]+(?=\s*=)/g, type: 'property' },
      { pattern: /"(?:\\.|[^"\\])*"/g, type: 'string' },
      { pattern: /'(?:\\.|[^'\\])*'/g, type: 'string' },
      { pattern: /<!DOCTYPE\s+[^>]+>/gi, type: 'keyword' }
    ];
  }

  private getCSSPatterns(): HighlightPattern[] {
    return [
      { pattern: /\/\*[\s\S]*?\*\//g, type: 'comment' },
      { pattern: /[.#]?[\w-]+\s*(?={)/g, type: 'css-selector' },
      { pattern: /[\w-]+(?=\s*:)/g, type: 'css-property' },
      { pattern: /:\s*[^;]+/g, type: 'css-value' },
      { pattern: /!important/gi, type: 'keyword' },
      { pattern: /@\w+/g, type: 'keyword' }
    ];
  }

  private getPythonPatterns(): HighlightPattern[] {
    return [
      { pattern: /#.*$/gm, type: 'comment' },
      { pattern: /"""(?:.|\n)*?"""/g, type: 'string' },
      { pattern: /'''(?:.|\n)*?'''/g, type: 'string' },
      { pattern: /"(?:\\.|[^"\\])*"/g, type: 'string' },
      { pattern: /'(?:\\.|[^'\\])*'/g, type: 'string' },
      { pattern: /\b\d+(\.\d+)?\b/g, type: 'number' },
      { pattern: /\b(?:def|class|if|elif|else|for|while|try|except|finally|with|import|from|as|return|yield|async|await|lambda|None|True|False|and|or|not|in|is|global|nonlocal|del|pass|break|continue|raise)\b/g, type: 'keyword' },
      { pattern: /\b[a-zA-Z_][\w]*(?=\s*\()/g, type: 'function' },
      { pattern: /@\w+/g, type: 'function' }
    ];
  }

  private getPHPPatterns(): HighlightPattern[] {
    return [
      { pattern: /\/\/.*$/gm, type: 'comment' },
      { pattern: /#.*$/gm, type: 'comment' },
      { pattern: /\/\*[\s\S]*?\*\//g, type: 'comment' },
      { pattern: /<\?php|\?>/g, type: 'tag' },
      { pattern: /'(?:\\.|[^'\\])*'/g, type: 'string' },
      { pattern: /"(?:\\.|[^"\\])*"/g, type: 'string' },
      { pattern: /\$\w+/g, type: 'variable' },
      { pattern: /\b(?:function|class|interface|trait|namespace|use|public|private|protected|static|final|abstract|const|if|else|elseif|for|foreach|while|do|switch|case|break|continue|return|try|catch|finally|throw|new|clone|instanceof|echo|print|die|exit|isset|unset|empty)\b/g, type: 'keyword' }
    ];
  }

  private getSQLPatterns(): HighlightPattern[] {
    return [
      { pattern: /--.*$/gm, type: 'comment' },
      { pattern: /\/\*[\s\S]*?\*\//g, type: 'comment' },
      { pattern: /'(?:\\.|[^'\\])*'/g, type: 'string' },
      { pattern: /"(?:\\.|[^"\\])*"/g, type: 'string' },
      { pattern: /\b(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|INNER|LEFT|RIGHT|OUTER|ON|AND|OR|NOT|IN|BETWEEN|LIKE|IS|NULL|ORDER BY|GROUP BY|HAVING|LIMIT|OFFSET|UNION|CREATE|ALTER|DROP|TABLE|INDEX|VIEW|DATABASE|TRIGGER|PROCEDURE|FUNCTION|VALUES|SET|DEFAULT|PRIMARY KEY|FOREIGN KEY|REFERENCES|CASCADE|UNIQUE|CHECK|EXISTS|CASE|WHEN|THEN|ELSE|END|DISTINCT|COUNT|SUM|AVG|MIN|MAX)\b/gi, type: 'keyword' },
      { pattern: /\b\d+(\.\d+)?\b/g, type: 'number' }
    ];
  }

  private getMarkdownPatterns(): HighlightPattern[] {
    return [
      { pattern: /^#{1,6}\s+.+$/gm, type: 'keyword' },
      { pattern: /\*\*(.*?)\*\*/g, type: 'keyword' },
      { pattern: /\*(.*?)\*/g, type: 'comment' },
      { pattern: /`[^`]*`/g, type: 'string' },
      { pattern: /```[\s\S]*?```/g, type: 'template-string' },
      { pattern: /\[([^\]]+)\]\(([^)]+)\)/g, type: 'function' },
      { pattern: /^\s*[\-\*\+]\s+/gm, type: 'operator' },
      { pattern: /^\s*\d+\.\s+/gm, type: 'number' }
    ];
  }

  private getJSONPatterns(): HighlightPattern[] {
    return [
      { pattern: /"(?:\\.|[^"\\])*"(?=\s*:)/g, type: 'key' },
      { pattern: /"(?:\\.|[^"\\])*"/g, type: 'string' },
      { pattern: /\b\d+(\.\d+)?\b/g, type: 'number' },
      { pattern: /\b(?:true|false|null)\b/g, type: 'keyword' }
    ];
  }

  private getJSXPatterns(): HighlightPattern[] {
    const jsPatterns = this.getJavaScriptPatterns();
    jsPatterns.push(
      { pattern: /<\/?[A-Z][\w]*|<\/?[a-z][\w-]*/g, type: 'jsx-tag' },
      { pattern: /(?<=<[A-Z][\w]*\s+)[\w-]+(?=\s*=)/g, type: 'jsx-attribute' }
    );
    return jsPatterns;
  }

  private getTSXPatterns(): HighlightPattern[] {
    const tsPatterns = this.getTypeScriptPatterns();
    tsPatterns.push(
      { pattern: /<\/?[A-Z][\w]*|<\/?[a-z][\w-]*/g, type: 'jsx-tag' },
      { pattern: /(?<=<[A-Z][\w]*\s+)[\w-]+(?=\s*=)/g, type: 'jsx-attribute' }
    );
    return tsPatterns;
  }

  private getXMLPatterns(): HighlightPattern[] {
    return [
      { pattern: /<!--[\s\S]*?-->/g, type: 'comment' },
      { pattern: /<\/?[\w][\w-]*/g, type: 'tag' },
      { pattern: /(?<=<\/?[\w][\w-]*\s+)[\w-]+(?=\s*=)/g, type: 'property' },
      { pattern: /"(?:\\.|[^"\\])*"/g, type: 'string' },
      { pattern: /'(?:\\.|[^'\\])*'/g, type: 'string' }
    ];
  }

  private getYAMLPatterns(): HighlightPattern[] {
    return [
      { pattern: /#.*$/gm, type: 'comment' },
      { pattern: /"(?:\\.|[^"\\])*"/g, type: 'string' },
      { pattern: /'(?:\\.|[^'\\])*'/g, type: 'string' },
      { pattern: /\b\d+(\.\d+)?\b/g, type: 'number' },
      { pattern: /^(?:\s*)[\w-]+(?=\s*:)/gm, type: 'key' },
      { pattern: /\b(?:true|false|null|yes|no|on|off)\b/gi, type: 'keyword' }
    ];
  }

  public detectLanguage(filename: string): EditorLanguage {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: EditorLanguage } = {
      'js': 'javascript', 'jsx': 'jsx', 'ts': 'typescript', 'tsx': 'tsx',
      'html': 'html', 'htm': 'html', 'css': 'css', 'py': 'python',
      'php': 'php', 'sql': 'sql', 'md': 'markdown', 'json': 'json',
      'txt': 'javascript', 'xml': 'xml', 'yaml': 'yaml', 'yml': 'yml'
    };
    return languageMap[ext || ''] || 'javascript';
  }

  public setLanguage(language: EditorLanguage): void {
    this.currentLanguage = language;
  }

  public escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  public highlightText(text: string, language: EditorLanguage | null = null): string {
    const lang = language || this.currentLanguage;
    if (!text) return '';

    const patterns = this.languagePatterns[lang] || this.languagePatterns.javascript;

    const tokens: { start: number; end: number; type: string; priority: number; length: number; }[] = [];
    patterns.forEach(({ pattern, type }, priority) => {
      const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
      for (const match of text.matchAll(globalPattern)) {
        if (match[0].length === 0) continue;
        tokens.push({
          start: match.index as number,
          end: (match.index as number) + match[0].length,
          type: type,
          priority: priority,
          length: match[0].length,
        });
      }
    });

    tokens.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      if (b.length !== a.length) return b.length - a.length;
      return a.priority - b.priority;
    });

    const filteredTokens: typeof tokens = [];
    let lastEnd = -1;
    for (const token of tokens) {
      if (token.start >= lastEnd) {
        filteredTokens.push(token);
        lastEnd = token.end;
      }
    }

    let result = '';
    let lastIndex = 0;
    filteredTokens.forEach(token => {
      result += this.escapeHtml(text.substring(lastIndex, token.start));
      const tokenText = text.substring(token.start, token.end);
      result += `<span class="${SYNTAX_HIGHLIGHTING_CLASS_PREFIX}${token.type}">${this.escapeHtml(tokenText)}</span>`;
      lastIndex = token.end;
    });

    if (lastIndex < text.length) {
      result += this.escapeHtml(text.substring(lastIndex));
    }

    return result;
  }

  public highlightElement(element: HTMLElement, language: EditorLanguage | null = null): void {
    const text = element.textContent || '';

    const selection = window.getSelection();
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    let startOffset = range ? range.startOffset : 0;
    let startContainer = range ? range.startContainer : null;

    let path: number[] = [];
    let node: Node | null = startContainer;
    while (node && node !== element) {
      let i = 0;
      let sibling: Node | null = node;
      while ((sibling = sibling.previousSibling) != null) i++;
      path.unshift(i);
      node = node.parentNode;
    }

    element.innerHTML = this.highlightText(text, language);

    try {
      if (startContainer) {
        node = element;
        path.forEach(index => {
          if (node && node.childNodes[index]) {
            node = node.childNodes[index];
          } else {
            node = null; // Path invalidates, break
          }
        });
        if (node) {
          const newRange = document.createRange();
          newRange.setStart(node, Math.min(startOffset, node.textContent?.length || 0));
          newRange.collapse(true);
          selection?.removeAllRanges();
          selection?.addRange(newRange);
        }
      }
    } catch (e) {
      console.warn("Could not restore cursor position.", e);
    }
  }

  public enableRealtimeHighlighting(editorElement: HTMLElement, language: EditorLanguage | null = null): () => void {
    let isComposing = false;

    const highlight = () => {
      if (isComposing) return;

      if (this.debounceTimer !== null) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = window.setTimeout(() => {
        this.highlightElement(editorElement, language);
        this.debounceTimer = null;
      }, this.debounceDelay);
    };

    const handleCompositionStart = () => { isComposing = true; };
    const handleCompositionEnd = () => {
      isComposing = false;
      highlight();
    };
    const handlePaste = () => setTimeout(highlight, 10); // Short delay for paste content to settle

    editorElement.addEventListener('input', highlight);
    editorElement.addEventListener('compositionstart', handleCompositionStart);
    editorElement.addEventListener('compositionend', handleCompositionEnd);
    editorElement.addEventListener('paste', handlePaste);

    // Initial highlight
    highlight();

    // Return a cleanup function
    return () => {
      if (this.debounceTimer !== null) {
        clearTimeout(this.debounceTimer);
      }
      editorElement.removeEventListener('input', highlight);
      editorElement.removeEventListener('compositionstart', handleCompositionStart);
      editorElement.removeEventListener('compositionend', handleCompositionEnd);
      editorElement.removeEventListener('paste', handlePaste);
    };
  }
}