import { IS_PUTER } from "./puter.js";
import {
  createTwoFilesPatch,
  parsePatch,
} from "https://cdn.jsdelivr.net/npm/diff@5.1.0/lib/index.mjs";
import { OPENROUTER_API_KEY } from "../env.js";
import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";

// ADDED: Markdown options
marked.setOptions({
  gfm: true,
  breaks: true,
  highlight: function (code, lang) {
    if (monaco && lang) {
      const model = monaco.editor.createModel(code, lang);
      const tokens = monaco.editor.tokenize(code, lang);
      model.dispose();

      let html = "";
      let currentLine = 0;
      tokens.forEach((line) => {
        if (currentLine > 0) html += "\n";
        line.forEach((token) => {
          const content = code.substring(
            token.offset,
            token.offset + token.length
          );
          html += `<span class="token ${token.type}">${content}</span>`;
        });
        currentLine++;
      });
      return html;
    }
    return code;
  },
});

// ADDED: Markdown styles
const markdownStyles = document.createElement("style");
markdownStyles.textContent = `
    .markdown-content {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #d4d4d4;
    }
    
    .markdown-content h1,
    .markdown-content h2,
    .markdown-content h3,
    .markdown-content h4,
    .markdown-content h5,
    .markdown-content h6 {
        margin-top: 24px;
        margin-bottom: 16px;
        font-weight: 600;
        line-height: 1.25;
    }
    
    .markdown-content h1 { font-size: 2em; }
    .markdown-content h2 { font-size: 1.5em; }
    .markdown-content h3 { font-size: 1.25em; }
    .markdown-content h4 { font-size: 1em; }
    .markdown-content h5 { font-size: 0.875em; }
    .markdown-content h6 { font-size: 0.85em; }
    
    .markdown-content p {
        margin-top: 0;
        margin-bottom: 16px;
    }
    
    .markdown-content a {
        color: #58a6ff;
        text-decoration: none;
    }
    
    .markdown-content a:hover {
        text-decoration: underline;
    }
    
    .markdown-content code {
        font-family: 'JetBrains Mono', monospace;
        padding: 0.2em 0.4em;
        margin: 0;
        font-size: 85%;
        background-color: rgba(110, 118, 129, 0.4);
        border-radius: 6px;
    }
    
    .markdown-content pre {
        padding: 16px;
        overflow: auto;
        font-size: 85%;
        line-height: 1.45;
        background-color: #1e1e1e;
        border-radius: 6px;
        margin-bottom: 16px;
    }
    
    .markdown-content pre code {
        padding: 0;
        margin: 0;
        font-size: 100%;
        word-break: normal;
        white-space: pre;
        background: transparent;
        border: 0;
    }
    
    .markdown-content ul,
    .markdown-content ol {
        margin-top: 0;
        margin-bottom: 16px;
        padding-left: 2em;
    }
    
    .markdown-content li {
        margin-bottom: 0.25em;
    }
    
    .markdown-content blockquote {
        margin: 0 0 16px;
        padding: 0 1em;
        color: #8b949e;
        border-left: 0.25em solid #30363d;
    }
    
    .markdown-content img {
        max-width: 100%;
        box-sizing: border-box;
    }
    
    .markdown-content hr {
        height: 0.25em;
        padding: 0;
        margin: 24px 0;
        background-color: #30363d;
        border: 0;
    }
    
    .markdown-content table {
        border-spacing: 0;
        border-collapse: collapse;
        margin-bottom: 16px;
        width: 100%;
    }
    
    .markdown-content table th,
    .markdown-content table td {
        padding: 6px 13px;
        border: 1px solid #30363d;
    }
    
    .markdown-content table tr {
        background-color: #0d1117;
        border-top: 1px solid #30363d;
    }
    
    .markdown-content table tr:nth-child(2n) {
        background-color: #161b22;
    }
    
    /* Syntax highlighting tokens */
    .token.comment { color: #6a9955; }
    .token.string { color: #ce9178; }
    .token.number { color: #b5cea8; }
    .token.keyword { color: #569cd6; }
    .token.operator { color: #d4d4d4; }
    .token.class-name { color: #4ec9b0; }
    .token.function { color: #dcdcaa; }
    .token.variable { color: #9cdcfe; }
    .token.parameter { color: #9cdcfe; }
    .token.property { color: #9cdcfe; }
    .token.punctuation { color: #d4d4d4; }
`;
document.head.appendChild(markdownStyles);

const API_KEY = ""; // Get yours at https://platform.sulu.sh/apis/judge0

const AUTH_HEADERS = API_KEY
  ? {
      Authorization: `Bearer ${API_KEY}`,
    }
  : {};

const CE = "CE";
const EXTRA_CE = "EXTRA_CE";

const AUTHENTICATED_CE_BASE_URL = "https://judge0-ce.p.sulu.sh";
const AUTHENTICATED_EXTRA_CE_BASE_URL = "https://judge0-extra-ce.p.sulu.sh";

var AUTHENTICATED_BASE_URL = {};
AUTHENTICATED_BASE_URL[CE] = AUTHENTICATED_CE_BASE_URL;
AUTHENTICATED_BASE_URL[EXTRA_CE] = AUTHENTICATED_EXTRA_CE_BASE_URL;

const UNAUTHENTICATED_CE_BASE_URL = "https://ce.judge0.com";
const UNAUTHENTICATED_EXTRA_CE_BASE_URL = "https://extra-ce.judge0.com";

var UNAUTHENTICATED_BASE_URL = {};
UNAUTHENTICATED_BASE_URL[CE] = UNAUTHENTICATED_CE_BASE_URL;
UNAUTHENTICATED_BASE_URL[EXTRA_CE] = UNAUTHENTICATED_EXTRA_CE_BASE_URL;

// ADDED: AI models
const AI_MODELS = {
  "DeepSeek-R1": "deepseek/deepseek-r1:free",
  "Mistral 7B Instruct": "mistralai/mistral-7b-instruct:free",
  "Microsoft Phi-3 Medium 128K Instruct":
    "microsoft/phi-3-medium-128k-instruct:free",
  "Meta Llama 3 8B Instruct": "meta-llama/llama-3-8b-instruct:free",
  "OpenChat 3.5 7B": "openchat/openchat-7b:free",
  "Microsoft Phi-3 Mini 128K Instruct":
    "microsoft/phi-3-mini-128k-instruct:free",
  "Gemini 2.0 Flash": "google/gemini-2.0-flash-001",
  "Qwen 2.5 Coder 32B Instruct": "qwen/qwen-2.5-coder-32b-instruct",
};

const INITIAL_WAIT_TIME_MS = 0;
const WAIT_TIME_FUNCTION = (i) => 100;
const MAX_PROBE_REQUESTS = 50;

var fontSize = 13;

var layout;

var sourceEditor;
var stdinEditor;
var stdoutEditor;
var aiChatEditor;

var $selectLanguage;
var $compilerOptions;
var $commandLineArguments;
var $runBtn;
var $statusLine;

var timeStart;

var sqliteAdditionalFiles;
var languages = {};

var layoutConfig = {
  settings: {
    showPopoutIcon: false,
    reorderEnabled: true,
  },
  content: [
    {
      type: "row",
      content: [
        {
          type: "column",
          width: 50,
          content: [
            {
              type: "component",
              componentName: "source",
              id: "source",
              title: "Source Code",
              isClosable: false,
              componentState: {
                readOnly: false,
              },
            },
          ],
        },
        {
          type: "column",
          width: 25,
          content: [
            {
              type: "component",
              componentName: "stdin",
              id: "stdin",
              title: "Input",
              isClosable: false,
              componentState: {
                readOnly: false,
              },
            },
            {
              type: "component",
              componentName: "stdout",
              id: "stdout",
              title: "Output",
              isClosable: false,
              componentState: {
                readOnly: true,
              },
            },
          ],
        },
        {
          // ADDED: AI chat column configuration
          type: "column",
          width: 25,
          content: [
            {
              type: "component",
              componentName: "ai-chat",
              id: "ai-chat",
              title: "Chat",
              isClosable: false,
              componentState: {
                readOnly: false,
              },
            },
          ],
        },
      ],
    },
  ],
};

var gPuterFile;

var lastFileState = "";
var previousModel = "";

// ADDED: Code pattern tips
const DIFF_TIPS = {
  "<Link": "Ensure proper Link component usage",
  function: "Maintain function signature and documentation",
  class: "Preserve class structure and inheritance",
  import: "Group related imports together",
  def: "Maintain Python function definition style",
};

// ADDED: Diff styles
const diffStyles = document.createElement("style");
diffStyles.textContent = `
    .diff-preview {
        background: #1e1e1e;
        border-radius: 4px;
        overflow: hidden;
        margin: 10px 0;
    }

    .diff-header {
        padding: 8px;
        border-bottom: 1px solid #3c3c3c;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .diff-controls {
        display: flex;
        align-items: center;
        gap: 15px;
    }

    .expand-btn {
        background: none;
        border: none;
        color: #d4d4d4;
        cursor: pointer;
        padding: 2px 6px;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
    }

    .expand-btn:hover {
        background: #3c3c3c;
    }

    .expand-icon {
        transition: transform 0.3s ease;
        display: inline-block;
        transform: rotate(0deg);
    }

    .expand-icon.expanded {
        transform: rotate(180deg);
    }

    .diff-legend {
        display: flex;
        gap: 15px;
        font-size: 12px;
    }

    .diff-legend span::before {
        content: '●';
        margin-right: 4px;
    }

    .added-legend::before {
        color: #4CAF50;
    }

    .removed-legend::before {
        color: #f44336;
    }

    .diff-content {
        padding: 8px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        overflow-x: auto;
    }

    .diff-line {
        padding: 2px 4px;
        white-space: pre;
    }

    .diff-line.added {
        background: rgba(76, 175, 80, 0.2);
        border-left: 3px solid #4CAF50;
    }

    .diff-line.removed {
        background: rgba(244, 67, 54, 0.2);
        border-left: 3px solid #f44336;
    }

    .diff-actions {
        padding: 8px;
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        border-top: 1px solid #3c3c3c;
    }

    .diff-actions button {
        padding: 6px 12px;
        border-radius: 4px;
        border: none;
        cursor: pointer;
        font-size: 12px;
    }

    .accept-btn {
        background: #4CAF50;
        color: white;
    }

    .reject-btn {
        background: #f44336;
        color: white;
    }

    .loading-message, .linting-message {
        font-style: italic;
        opacity: 0.8;
    }
`;
document.head.appendChild(diffStyles);

// ADDED: Inline suggestion styles
const inlineSuggestionStyles = document.createElement("style");
inlineSuggestionStyles.textContent = `
    .monaco-editor .inline-completion-text {
        color: #808080 !important;
        opacity: 0.8 !important;
        font-style: italic !important;
    }

    .monaco-editor .inline-completion-text.ghost-text {
        color: #808080 !important;
        opacity: 0.8 !important;
        font-style: italic !important;
    }

    .monaco-editor .inline-completion-text.ghost-text-decoration {
        color: #808080 !important;
        opacity: 0.8 !important;
        font-style: italic !important;
    }

    .monaco-editor .suggest-widget {
        background-color: #1e1e1e !important;
        border: 1px solid #3c3c3c !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4) !important;
    }

    .monaco-editor .suggest-widget .monaco-list-row.focused {
        background-color: #2d2d2d !important;
    }

    .monaco-editor .inline-completion-toolbar {
        background: var(--vscode-editorWidget-background) !important;
        border: 1px solid var(--vscode-editorWidget-border) !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4) !important;
    }

    .monaco-editor .inline-completion-toolbar-status {
        color: var(--vscode-editorWidget-foreground) !important;
        font-style: italic !important;
    }

    .monaco-editor .inline-completion-toolbar-button {
        color: var(--vscode-editorWidget-foreground) !important;
        opacity: 0.8 !important;
    }

    .monaco-editor .inline-completion-toolbar-button:hover {
        opacity: 1 !important;
        background-color: var(--vscode-toolbar-hoverBackground) !important;
    }
`;
document.head.appendChild(inlineSuggestionStyles);

// ADDED: Autocomplete debounce time
const AUTOCOMPLETE_DEBOUNCE_MS = 1500;

// ADDED: Autocomplete debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
// ADDED: Auto-complete suggestions
async function getAutoComplete(text, cursorOffset, language = "plaintext") {
  try {
    const apiKey = await getOpenRouterApiKey();

    const beforeCursor = text.substring(0, cursorOffset);
    const lines = beforeCursor.split("\n");
    const currentLine = lines[lines.length - 1];
    const currentIndent = currentLine.match(/^\s*/)[0];

    let syntaxIndentLevel = 0;
    if (language === "python") {
      const endsWithColon = currentLine.trim().endsWith(":");
      let controlLineIndex = lines.length - 1;
      while (controlLineIndex >= 0) {
        const line = lines[controlLineIndex];
        if (line.trim().endsWith(":")) {
          syntaxIndentLevel = Math.floor(line.match(/^\s*/)[0].length / 4) + 1;
          break;
        } else if (line.trim().length > 0) {
          syntaxIndentLevel = Math.floor(line.match(/^\s*/)[0].length / 4);
          break;
        }
        controlLineIndex--;
      }
      if (endsWithColon) syntaxIndentLevel++;
    } else {
      syntaxIndentLevel = Math.floor(currentIndent.length / 4);
    }

    const requestBody = {
      model: "google/gemini-2.0-flash-001",
      messages: [
        {
          role: "system",
          content: `You are a Python code completion AI. Strictly follow these rules:
                            1. NEVER repeat existing code
                            2. Use EXACTLY 4 spaces per indentation level
                            3. Ignore any existing indentation mistakes in the code
                            4. Maintain proper block structure`,
        },
        {
          role: "user",
          content: `Complete this code (▼ shows cursor position):\n${beforeCursor}▼`,
        },
      ],
      temperature: 0.1,
      max_tokens: 50,
      stream: false,
    };

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.href,
          "X-Title": "Cursor IDE",
        },
        body: JSON.stringify(requestBody),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      if (data.error?.code === 429) {
        console.error("Rate limit exceeded. Please try again later.");
        return null;
      }
      throw new Error(
        data.error?.message || `HTTP error! status: ${response.status}`
      );
    }

    if (!data.choices?.[0]?.message?.content) {
      console.error("Invalid response format:", data);
      return null;
    }

    let completion = data.choices[0].message.content;

    completion = completion
      .replace(/```.*?```/gs, "")
      .replace(/^\s+|\s+$/g, "");

    completion = completion
      .split("\n")
      .map((line) => {
        const spaces = line.match(/^ */)[0].length;
        const indentLevel = Math.floor(spaces / 4);
        return "    ".repeat(indentLevel) + line.trimLeft();
      })
      .join("\n");

    const finalIndent = "    ".repeat(syntaxIndentLevel);
    completion = completion
      .split("\n")
      .map((line) => line.replace(finalIndent, ""))
      .join("\n");

    return completion;
  } catch (error) {
    console.error("Autocomplete error:", error);
    return null;
  }
}

// ADDED: Sometimes models will yap despite prompting
function cleanDiffOutput(diff) {
  diff.hunks.forEach((hunk) => {
    hunk.lines = hunk.lines
      .filter((line) => !line.includes("\\ No newline at end of file"))
      .map((line) => {
        if (
          line.includes("```") ||
          line.includes("I've") ||
          line.includes("maintained")
        ) {
          return line.split("```")[0].split("I've")[0].trim();
        }
        return line;
      });
  });
  return diff;
}

// ADDED: Uses the diff library to generate a diff
function generateDiff(currentCode, proposedCode) {
  if (!currentCode.endsWith("\n")) currentCode += "\n";
  if (!proposedCode.endsWith("\n")) proposedCode += "\n";

  const diff = createTwoFilesPatch(
    "current",
    "proposed",
    currentCode,
    proposedCode,
    "",
    "",
    { context: 2 }
  );
  return cleanDiffOutput(parsePatch(diff)[0]);
}

// ADDED: Constructs the file ( Pre-diff code + diff code + post-diff code)
function createCompleteFileView(originalCode, diff) {
  const lines = originalCode.split("\n");
  const result = [];
  let currentLine = 0;

  diff.hunks.forEach((hunk) => {
    const hunkStart = hunk.oldStart - 1;

    while (currentLine < hunkStart) {
      result.push(lines[currentLine]);
      currentLine++;
    }

    hunk.lines.forEach((line) => {
      if (line.startsWith("-")) {
        result.push("-" + lines[currentLine]);
        currentLine++;
      } else if (line.startsWith("+")) {
        result.push("+" + line.substring(1));
      } else {
        result.push(lines[currentLine]);
        currentLine++;
      }
    });
  });

  while (currentLine < lines.length) {
    result.push(lines[currentLine]);
    currentLine++;
  }

  return result.join("\n");
}

// ADDED: Custom line decorations for added/removed lines
// ADDED: Key down handler to prevent editing of deletion lines
function applyDiffDecorations(editor, content) {
  const lines = content.split("\n");
  const decorations = [];
  let lineNumber = 1;

  const deletionLines = new Set();

  lines.forEach((line) => {
    if (line[0] === "+") {
      decorations.push({
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: true,
          className: "diff-line-addition",
          glyphMarginClassName: "diff-gutter-addition",
        },
      });
    } else if (line[0] === "-") {
      decorations.push({
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: true,
          className: "diff-line-deletion editor-line-readonly",
          glyphMarginClassName: "diff-gutter-deletion",
        },
      });
      deletionLines.add(lineNumber);
    }
    lineNumber++;
  });

  editor.onKeyDown((e) => {
    const selections = editor.getSelections();
    if (!selections) return;

    const isInDeletionLine = selections.some((selection) => {
      if (!selection) return false;
      const startLine = selection.startLineNumber;
      const endLine = selection.endLineNumber;
      // Check if any line in the selection is a deletion line
      for (let line = startLine; line <= endLine; line++) {
        if (deletionLines.has(line)) return true;
      }
      return false;
    });

    if (isInDeletionLine) {
      e.stopPropagation();
      e.preventDefault();
    }
  });

  return editor.deltaDecorations([], decorations);
}

// ADDED: Diff preview
function renderDiffPreview(diff, proposedCode) {
  const container = document.createElement("div");
  container.className = "diff-preview";

  const diffLines = [];
  diff.hunks.forEach((hunk) => {
    if (hunk.header) diffLines.push(hunk.header);
    hunk.lines.forEach((line) => {
      diffLines.push(line);
    });
  });

  const diffContent = diffLines.join("\n");

  const editorContainer = document.createElement("div");
  editorContainer.style.cssText = `
        height: 200px;
        margin: 8px;
        border: 1px solid #3c3c3c;
        border-radius: 4px;
        overflow: hidden;
        position: relative;
        transition: height 0.3s ease;
    `;
  container.appendChild(editorContainer);

  // ADDED: Monaco editor instance for diff preview
  const diffEditor = monaco.editor.create(editorContainer, {
    value: diffContent,
    language: "plaintext",
    theme: "vs-dark",
    readOnly: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: true,
    renderLineHighlight: "none",
    fontFamily: "JetBrains Mono",
    fontSize: 12,
    lineNumbers: "on",
    glyphMargin: true,
    automaticLayout: true,
    scrollbar: {
      vertical: "visible",
      horizontal: "visible",
      useShadows: true,
      verticalHasArrows: true,
      horizontalHasArrows: true,
    },
  });

  applyDiffDecorations(diffEditor, diffContent);

  const actions = document.createElement("div");
  actions.className = "diff-actions";
  actions.innerHTML = `
        <button class="show-in-source-btn">Show in Source Code</button>
        <button class="accept-btn">Accept Changes</button>
        <button class="reject-btn">Reject Changes</button>
    `;
  container.appendChild(actions);

  container.addEventListener("remove", () => {
    if (diffEditor) {
      diffEditor.dispose();
    }
  });

  const buttonStyles = document.createElement("style");
  buttonStyles.textContent = `
        .diff-actions button {
            padding: 6px 12px;
            border-radius: 4px;
            border: none;
            cursor: pointer;
            font-size: 12px;
            margin-left: 8px;
        }
        
        .show-in-source-btn {
            background: #2d2d2d;
            color: white;
        }
        
        .show-in-source-btn:hover {
            background: #3d3d3d;
        }
        
        .accept-btn {
            background: #4CAF50;
            color: white;
        }
        
        .accept-btn:hover {
            background: #45a049;
        }
        
        .reject-btn {
            background: #f44336;
            color: white;
        }
        
        .reject-btn:hover {
            background: #da190b;
        }
    `;
  document.head.appendChild(buttonStyles);

  return container;
}

// ADDED: Monaco editor styles to include read-only styling
const monacoStyles = document.createElement("style");
monacoStyles.textContent = `
    .diff-line-addition {
        background: rgba(76, 175, 80, 0.2) !important;
    }
    .diff-line-deletion {
        background: rgba(244, 67, 54, 0.2) !important;
        opacity: 0.7 !important;
    }
    .diff-gutter-addition {
        border-left: 3px solid #4CAF50 !important;
        margin-left: 3px;
    }
    .diff-gutter-deletion {
        border-left: 3px solid #f44336 !important;
        margin-left: 3px;
    }
    /* Styles for read-only lines */
    div:has(>.editor-line-readonly) {
        background-color: rgba(244, 67, 54, 0.1);
        cursor: not-allowed !important;
        z-index: 999 !important; /* Move above the code line to make it not selectable */
        pointer-events: none !important;
    }
`;
document.head.appendChild(monacoStyles);

// ADDED: Append message to chat history
function appendMessage(role, content) {
  const chatHistory = document.getElementById("chat-history");
  if (!chatHistory) return;

  const messageDiv = document.createElement("div");
  messageDiv.className = `chat-message ${role}-message`;
  messageDiv.style.cssText = `
        padding: 8px 12px;
        border-radius: 4px;
        max-width: 85%;
        margin: 4px 0;
        ${role === "user" ? "align-self: flex-end;" : "align-self: flex-start;"}
        background: ${role === "user" ? "#0e639c" : "#2d2d2d"};
        border: 1px solid ${role === "user" ? "#1177bb" : "#3c3c3c"};
    `;

  const contentDiv = document.createElement("div");
  contentDiv.className = "markdown-content";

  if (role === "user") {
    contentDiv.textContent = content;
  } else {
    try {
      contentDiv.innerHTML = marked.parse(content);

      contentDiv.querySelectorAll("pre code").forEach((block) => {
        const copyButton = document.createElement("button");
        copyButton.className = "code-copy-btn";
        copyButton.innerHTML = "📋";
        copyButton.style.cssText = `
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: transparent;
                    border: none;
                    color: #d4d4d4;
                    cursor: pointer;
                    font-size: 14px;
                    opacity: 0;
                    transition: opacity 0.2s;
                `;

        const codeContainer = document.createElement("div");
        codeContainer.style.position = "relative";

        block.parentNode.insertBefore(codeContainer, block);
        codeContainer.appendChild(block.parentNode);
        codeContainer.appendChild(copyButton);

        codeContainer.addEventListener("mouseenter", () => {
          copyButton.style.opacity = "1";
        });
        codeContainer.addEventListener("mouseleave", () => {
          copyButton.style.opacity = "0";
        });

        copyButton.addEventListener("click", async () => {
          const code = block.textContent;
          await navigator.clipboard.writeText(code);

          const originalText = copyButton.innerHTML;
          copyButton.innerHTML = "✓";
          setTimeout(() => {
            copyButton.innerHTML = originalText;
          }, 2000);
        });
      });

      contentDiv.querySelectorAll("a").forEach((link) => {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      });
    } catch (error) {
      console.error("Error parsing markdown:", error);
      contentDiv.textContent = content;
    }
  }

  messageDiv.appendChild(contentDiv);
  chatHistory.appendChild(messageDiv);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

// ADDED: Apply smart diff comparing original content to proposed changes
async function applySmartDiff(originalContent, proposedChanges) {
  const apiKey = await getOpenRouterApiKey();

  const tips = [];
  for (const [pattern, tip] of Object.entries(DIFF_TIPS)) {
    if (proposedChanges.includes(pattern)) {
      tips.push(` - ${tip}`);
    }
  }

  const cleanProposedChanges = proposedChanges
    .replace(/^```[\w.]*\n/, "")
    .replace(/```$/, "")
    .trim();

  const prompt = `You are a senior software engineer that applies code changes to a file. Given the <original-content>, the <diff>, and the <adjustments>, apply the changes to the content. 

                    - You must apply the <adjustments> provided even if this conflicts with the original diff
                    - You must follow instructions from within comments in <diff> (e.g. <!-- remove this -->)
                    - You must maintain the layout of the file especially in languages/formats where it matters
                    - Do NOT include markdown code fences (\`\`\`) or language tags in your response
                    - Do NOT include "Here is the updated content..." or similar phrases
                    - DO NOT include non-code content without explicitly commenting it out
                    - Respond ONLY with the raw code content

                    <original-content>
                    ${originalContent}
                    </original-content>

                    <diff>
                    ${cleanProposedChanges}
                    </diff>

                    <adjustments>
                    ${tips.join("\n")}
                    - Maintain proper code structure and indentation
                    - Remove any duplicate code sections
                    - Ensure proper placement of new code
                    </adjustments>`;

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.href,
          "X-Title": "Cursor IDE",
        },
        body: JSON.stringify({
          model: getSelectedModel(),
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.1,
          max_tokens: 2000,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;

    content = content
      .replace(/^Here is the[^]*?:\n*/i, "")
      .replace(/^```[\w.]*\n/m, "")
      .replace(/```$/m, "")
      .replace(/^Here are the changes[^]*?:\n*/i, "")
      .trim();

    content = content.replace(/\r\n/g, "\n");

    if (!content.endsWith("\n")) {
      content += "\n";
    }

    return content;
  } catch (error) {
    console.error("Error in applySmartDiff:", error);
    return proposedChanges;
  }
}

// ADDED: Agentic process for handling user input and overall ai chat flow
async function agenticProcess(userInput) {
  lastFileState = sourceEditor.getValue();
  const maxAttempts = 3;
  let attempts = 0;
  let hasError = true;
  let needsNewPrompt = false;
  let lastSuggestion = "";
  const chatHistory = document.getElementById("chat-history");
  if (!chatHistory) {
    console.error("Chat history element not found");
    return false;
  }
  const selectedModel = getSelectedModel();
  let hasNewModel = false;
  if (selectedModel !== previousModel) {
    previousModel = selectedModel;
    hasNewModel = true;
  }
  while (hasError && attempts < maxAttempts) {
    try {
      const loadingMessage = document.createElement("div");
      loadingMessage.className = "chat-message loading-message";
      loadingMessage.textContent = "Thinking...";
      chatHistory.appendChild(loadingMessage);

      const prompt = await generatePrompt(
        userInput,
        hasNewModel,
        needsNewPrompt,
        lastSuggestion
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const apiKey = await getOpenRouterApiKey();

      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.href,
            "X-Title": "Cursor IDE",
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      loadingMessage.remove();

      let proposedChanges;
      let explanation = aiResponse;
      const codeMatch = aiResponse.match(/```[\s\S]*?\n([\s\S]*?)```/);

      if (codeMatch) {
        proposedChanges = codeMatch[1];
        explanation = aiResponse.replace(/```[\s\S]*?```/g, "").trim();

        if (explanation) {
          appendMessage("assistant", explanation);
        }
      } else {
        appendMessage("assistant", aiResponse);
        return true;
      }

      appendMessage("assistant", "Applying changes intelligently...");

      const currentCode = sourceEditor.getValue();
      const proposedCode = await applySmartDiff(currentCode, proposedChanges);

      const diff = generateDiff(currentCode, proposedCode);
      const diffPreview = renderDiffPreview(diff, proposedCode);

      const userDecision = new Promise((resolve) => {
        const acceptBtn = diffPreview.querySelector(".accept-btn");
        const rejectBtn = diffPreview.querySelector(".reject-btn");
        const showInSourceBtn = diffPreview.querySelector(
          ".show-in-source-btn"
        );

        let isShowingInSource = false;
        let sourceDecorations = [];
        const originalCode = sourceEditor.getValue();

        showInSourceBtn.addEventListener("click", () => {
          isShowingInSource = true;
          const completeFileView = createCompleteFileView(originalCode, diff);
          sourceEditor.setValue(completeFileView);
          sourceDecorations = applyDiffDecorations(
            sourceEditor,
            completeFileView
          );

          showInSourceBtn.style.display = "none";
          acceptBtn.textContent = "Apply Changes";
          rejectBtn.textContent = "Cancel";
        });

        acceptBtn.addEventListener("click", () => {
          if (isShowingInSource) {
            const currentContent = sourceEditor.getValue();
            const cleanContent = currentContent
              .split("\n")
              .map((line) => {
                if (line.startsWith("+")) return line.substring(1);
                if (line.startsWith("-")) return null;
                return line;
              })
              .filter((line) => line !== null)
              .join("\n");

            sourceEditor.setValue(cleanContent);
            sourceEditor.deltaDecorations(sourceDecorations, []);
          } else {
            sourceEditor.setValue(proposedCode);
          }
          diffPreview.remove();
          appendMessage("assistant", "Changes applied successfully.");
          resolve(true);
        });

        rejectBtn.addEventListener("click", () => {
          if (isShowingInSource) {
            sourceEditor.setValue(originalCode);
            sourceEditor.deltaDecorations(sourceDecorations, []);
          }
          diffPreview.remove();
          appendMessage("assistant", "Changes rejected.");
          resolve(false);
        });

        diffPreview.addEventListener("remove", () => {
          if (isShowingInSource && !accepted) {
            sourceEditor.setValue(originalCode);
            sourceEditor.deltaDecorations(sourceDecorations, []);
          }
        });
      });

      const previewMessage = document.createElement("div");
      previewMessage.className = "chat-message assistant-message";
      previewMessage.appendChild(diffPreview);
      chatHistory.appendChild(previewMessage);
      chatHistory.scrollTop = chatHistory.scrollHeight;

      const accepted = await userDecision;
      hasError = !accepted;
      needsNewPrompt = hasError;
      lastSuggestion = proposedChanges;
    } catch (error) {
      if (error.message.includes("API key not found")) {
        appendMessage(
          "assistant",
          "Error: OpenRouter API key not configured. Please check your .env file."
        );
      } else {
        appendMessage("assistant", `Error: ${error.message}`);
      }
      console.error("Error in agenticProcess:", error);
      attempts++;
    }
  }

  if (attempts >= maxAttempts) {
    appendMessage(
      "assistant",
      "Maximum attempts reached. Please try rephrasing your request."
    );
  }

  return !hasError;
}

// ADDED: Generate prompt for ai chat (Kind of outdated due to new models)
async function generatePrompt(
  userInput,
  hasNewModel,
  needsNewPrompt,
  lastSuggestion
) {
  const selectedLanguage = await getSelectedLanguage();
  const selectedModel = getSelectedModel();
  const codeContext = lastFileState
    ? `\nCurrent code context:\n\`\`\`${selectedLanguage.name}\n${lastFileState}\n\`\`\``
    : "";
  const safetyPrompt =
    "Always validate inputs, handle edge cases, and include security considerations.";
  const chatHistory = document.getElementById("chat-history");
  const chatHistoryContent = chatHistory ? chatHistory.innerHTML : "";
  const chatHistoryPrompt = hasNewModel
    ? `\nChat history:\n${chatHistoryContent}`
    : "";

  switch (selectedModel) {
    case "DeepSeek-R1":
      return `[SYSTEM] As a ${selectedLanguage.name} expert, provide production-grade code with:
                    1) Brief analysis 2) Optimized solution 3) Key considerations
                    ${safetyPrompt}
                    ${codeContext}
                    ${chatHistoryPrompt}
                    Query: ${userInput}`;

    case "Mistral 7B Instruct":
      return `<s>[INST] You are an expert ${selectedLanguage.name} developer. Format:
                    1. Problem analysis (1 sentence)
                    2. Secure solution code
                    3. Implementation notes (bulleted)
                    ${safetyPrompt}
                    Context:${codeContext}
                    ${chatHistoryPrompt}
                    Task: ${userInput} [/INST]`;

    case "Microsoft Phi-3 Medium 128K Instruct":
      return `[SYSTEM] As a senior ${selectedLanguage.name} engineer:
                    - Analyze security requirements first
                    - Write modular, safe code
                    - Explain security patterns used
                    ${codeContext}
                    ${chatHistoryPrompt}
                    [USER] ${userInput}
                    ${safetyPrompt}`;

    case "Meta Llama 3 8B Instruct":
      return `[INST] <<SYS>>
                    You are a pragmatic ${selectedLanguage.name} developer. Prioritize:
                    1. Secure input validation
                    2. Readable code
                    3. Error handling
                    ${safetyPrompt}
                    <</SYS>>
                    ${codeContext}
                    ${chatHistoryPrompt}
                    ${userInput} [/INST]`;

    case "OpenChat 3.5 7B":
      return `[CODE_EXPERT] Language: ${selectedLanguage.name}
                    ${safetyPrompt}
                    Context:${codeContext}
                    ${chatHistoryPrompt}
                    Task: ${userInput}
                    Response format:
                    '''
                    // Secure ${selectedLanguage.name} solution
'''
Key security considerations:`;

    case "Microsoft Phi-3 Mini 128K Instruct":
      return `[TASK] ${userInput}
                    [REQUIREMENTS]
                    - ${selectedLanguage.name} best practices
                    - Security-first approach
                    - <50 lines with comments
                    ${safetyPrompt}
                    [CONTEXT]${codeContext}
                    ${chatHistoryPrompt}`;

    default:
      return `[INST] As a ${selectedLanguage.name} expert:
                    1. Secure solution code
                    2. Security explanation
                    3. Alternative safe approaches
                    ${safetyPrompt}
                    Context:${codeContext}
                    ${chatHistoryPrompt}
                    ${
                      needsNewPrompt
                        ? `This is the last attempt but the user is not satisfied. Please iterate on this and offer a new solution. Identify the exact problem and reduce the suggested code to directly solve only that problem. \nLast suggestion: ${lastSuggestion}`
                        : ""
                    }
                    Query: ${userInput} [/INST]`;
  }
}

function encode(str) {
  return btoa(unescape(encodeURIComponent(str || "")));
}

function decode(bytes) {
  var escaped = escape(atob(bytes || ""));
  try {
    return decodeURIComponent(escaped);
  } catch {
    return unescape(escaped);
  }
}

function showError(title, content) {
  $("#judge0-site-modal #title").html(title);
  $("#judge0-site-modal .content").html(content);

  let reportTitle = encodeURIComponent(`Error on ${window.location.href}`);
  let reportBody = encodeURIComponent(
    `**Error Title**: ${title}\n` +
      `**Error Timestamp**: \`${new Date()}\`\n` +
      `**Origin**: ${window.location.href}\n` +
      `**Description**:\n${content}`
  );

  $("#report-problem-btn").attr(
    "href",
    `https://github.com/judge0/ide/issues/new?title=${reportTitle}&body=${reportBody}`
  );
  $("#judge0-site-modal").modal("show");
}

function showHttpError(jqXHR) {
  showError(
    `${jqXHR.statusText} (${jqXHR.status})`,
    `<pre>${JSON.stringify(jqXHR, null, 4)}</pre>`
  );
}

function handleRunError(jqXHR) {
  showHttpError(jqXHR);
  $runBtn.removeClass("disabled");

  window.top.postMessage(
    JSON.parse(
      JSON.stringify({
        event: "runError",
        data: jqXHR,
      })
    ),
    "*"
  );
}

function handleResult(data) {
  const tat = Math.round(performance.now() - timeStart);
  console.log(`It took ${tat}ms to get submission result.`);

  const status = data.status;
  const stdout = decode(data.stdout);
  const compileOutput = decode(data.compile_output);
  const time = data.time === null ? "-" : data.time + "s";
  const memory = data.memory === null ? "-" : data.memory + "KB";

  $statusLine.html(`${status.description}, ${time}, ${memory} (TAT: ${tat}ms)`);

  const output = [compileOutput, stdout].join("\n").trim();

  stdoutEditor.setValue(output);

  $runBtn.removeClass("disabled");

  window.top.postMessage(
    JSON.parse(
      JSON.stringify({
        event: "postExecution",
        status: data.status,
        time: data.time,
        memory: data.memory,
        output: output,
      })
    ),
    "*"
  );
}

async function getSelectedLanguage() {
  return getLanguage(getSelectedLanguageFlavor(), getSelectedLanguageId());
}

function getSelectedLanguageId() {
  return parseInt($selectLanguage.val());
}

function getSelectedLanguageFlavor() {
  return $selectLanguage.find(":selected").attr("flavor");
}

function run() {
  if (sourceEditor.getValue().trim() === "") {
    showError("Error", "Source code can't be empty!");
    return;
  } else {
    $runBtn.addClass("disabled");
  }

  stdoutEditor.setValue("");
  $statusLine.html("");

  let x = layout.root.getItemsById("stdout")[0];
  x.parent.header.parent.setActiveContentItem(x);

  let sourceValue = encode(sourceEditor.getValue());
  let stdinValue = encode(stdinEditor.getValue());
  let languageId = getSelectedLanguageId();
  let compilerOptions = $compilerOptions.val();
  let commandLineArguments = $commandLineArguments.val();

  let flavor = getSelectedLanguageFlavor();

  if (languageId === 44) {
    sourceValue = sourceEditor.getValue();
  }

  let data = {
    source_code: sourceValue,
    language_id: languageId,
    stdin: stdinValue,
    compiler_options: compilerOptions,
    command_line_arguments: commandLineArguments,
    redirect_stderr_to_stdout: true,
  };

  let sendRequest = function (data) {
    window.top.postMessage(
      JSON.parse(
        JSON.stringify({
          event: "preExecution",
          source_code: sourceEditor.getValue(),
          language_id: languageId,
          flavor: flavor,
          stdin: stdinEditor.getValue(),
          compiler_options: compilerOptions,
          command_line_arguments: commandLineArguments,
        })
      ),
      "*"
    );

    timeStart = performance.now();
    $.ajax({
      url: `${AUTHENTICATED_BASE_URL[flavor]}/submissions?base64_encoded=true&wait=false`,
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify(data),
      headers: AUTH_HEADERS,
      success: function (data, textStatus, request) {
        console.log(`Your submission token is: ${data.token}`);
        let region = request.getResponseHeader("X-Judge0-Region");
        setTimeout(
          fetchSubmission.bind(null, flavor, region, data.token, 1),
          INITIAL_WAIT_TIME_MS
        );
      },
      error: handleRunError,
    });
  };

  if (languageId === 82) {
    if (!sqliteAdditionalFiles) {
      $.ajax({
        url: `./data/additional_files_zip_base64.txt`,
        contentType: "text/plain",
        success: function (responseData) {
          sqliteAdditionalFiles = responseData;
          data["additional_files"] = sqliteAdditionalFiles;
          sendRequest(data);
        },
        error: handleRunError,
      });
    } else {
      data["additional_files"] = sqliteAdditionalFiles;
      sendRequest(data);
    }
  } else {
    sendRequest(data);
  }
}

function fetchSubmission(flavor, region, submission_token, iteration) {
  if (iteration >= MAX_PROBE_REQUESTS) {
    handleRunError(
      {
        statusText: "Maximum number of probe requests reached.",
        status: 504,
      },
      null,
      null
    );
    return;
  }

  $.ajax({
    url: `${UNAUTHENTICATED_BASE_URL[flavor]}/submissions/${submission_token}?base64_encoded=true`,
    headers: {
      "X-Judge0-Region": region,
    },
    success: function (data) {
      if (data.status.id <= 2) {
        // In Queue or Processing
        $statusLine.html(data.status.description);
        setTimeout(
          fetchSubmission.bind(
            null,
            flavor,
            region,
            submission_token,
            iteration + 1
          ),
          WAIT_TIME_FUNCTION(iteration)
        );
      } else {
        handleResult(data);
      }
    },
    error: handleRunError,
  });
}

function setSourceCodeName(name) {
  $(".lm_title")[0].innerText = name;
}

function getSourceCodeName() {
  return $(".lm_title")[0].innerText;
}

function openFile(content, filename) {
  clear();
  sourceEditor.setValue(content);
  selectLanguageForExtension(filename.split(".").pop());
  setSourceCodeName(filename);
}

function saveFile(content, filename) {
  const blob = new Blob([content], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

async function openAction() {
  if (IS_PUTER) {
    gPuterFile = await puter.ui.showOpenFilePicker();
    openFile(await (await gPuterFile.read()).text(), gPuterFile.name);
  } else {
    document.getElementById("open-file-input").click();
  }
}

async function saveAction() {
  if (IS_PUTER) {
    if (gPuterFile) {
      gPuterFile.write(sourceEditor.getValue());
    } else {
      gPuterFile = await puter.ui.showSaveFilePicker(
        sourceEditor.getValue(),
        getSourceCodeName()
      );
      setSourceCodeName(gPuterFile.name);
    }
  } else {
    saveFile(sourceEditor.getValue(), getSourceCodeName());
  }
}

function setFontSizeForAllEditors(fontSize) {
  sourceEditor.updateOptions({ fontSize: fontSize });
  stdinEditor.updateOptions({ fontSize: fontSize });
  stdoutEditor.updateOptions({ fontSize: fontSize });
}

async function loadLangauges() {
  return new Promise((resolve, reject) => {
    let options = [];

    $.ajax({
      url: UNAUTHENTICATED_CE_BASE_URL + "/languages",
      success: function (data) {
        for (let i = 0; i < data.length; i++) {
          let language = data[i];
          let option = new Option(language.name, language.id);
          option.setAttribute("flavor", CE);
          option.setAttribute(
            "langauge_mode",
            getEditorLanguageMode(language.name)
          );

          if (language.id !== 89) {
            options.push(option);
          }

          if (language.id === DEFAULT_LANGUAGE_ID) {
            option.selected = true;
          }
        }
      },
      error: reject,
    }).always(function () {
      $.ajax({
        url: UNAUTHENTICATED_EXTRA_CE_BASE_URL + "/languages",
        success: function (data) {
          for (let i = 0; i < data.length; i++) {
            let language = data[i];
            let option = new Option(language.name, language.id);
            option.setAttribute("flavor", EXTRA_CE);
            option.setAttribute(
              "langauge_mode",
              getEditorLanguageMode(language.name)
            );

            if (
              options.findIndex((t) => t.text === option.text) === -1 &&
              language.id !== 89
            ) {
              options.push(option);
            }
          }
        },
        error: reject,
      }).always(function () {
        options.sort((a, b) => a.text.localeCompare(b.text));
        $selectLanguage.append(options);
        resolve();
      });
    });
  });
}

async function loadSelectedLanguage(skipSetDefaultSourceCodeName = false) {
  monaco.editor.setModelLanguage(
    sourceEditor.getModel(),
    $selectLanguage.find(":selected").attr("langauge_mode")
  );

  if (!skipSetDefaultSourceCodeName) {
    setSourceCodeName((await getSelectedLanguage()).source_file);
  }
}

function selectLanguageByFlavorAndId(languageId, flavor) {
  let option = $selectLanguage.find(`[value=${languageId}][flavor=${flavor}]`);
  if (option.length) {
    option.prop("selected", true);
    $selectLanguage.trigger("change", { skipSetDefaultSourceCodeName: true });
  }
}

function selectLanguageForExtension(extension) {
  let language = getLanguageForExtension(extension);
  selectLanguageByFlavorAndId(language.language_id, language.flavor);
}

async function getLanguage(flavor, languageId) {
  return new Promise((resolve, reject) => {
    if (languages[flavor] && languages[flavor][languageId]) {
      resolve(languages[flavor][languageId]);
      return;
    }

    $.ajax({
      url: `${UNAUTHENTICATED_BASE_URL[flavor]}/languages/${languageId}`,
      success: function (data) {
        if (!languages[flavor]) {
          languages[flavor] = {};
        }

        languages[flavor][languageId] = data;
        resolve(data);
      },
      error: reject,
    });
  });
}

function setDefaults() {
  setFontSizeForAllEditors(fontSize);
  sourceEditor.setValue(DEFAULT_SOURCE);
  stdinEditor.setValue(DEFAULT_STDIN);
  $compilerOptions.val(DEFAULT_COMPILER_OPTIONS);
  $commandLineArguments.val(DEFAULT_CMD_ARGUMENTS);

  $statusLine.html("");

  loadSelectedLanguage();
}

function clear() {
  sourceEditor.setValue("");
  stdinEditor.setValue("");
  $compilerOptions.val("");
  $commandLineArguments.val("");

  $statusLine.html("");
}

function refreshSiteContentHeight() {
  const navigationHeight = document.getElementById(
    "judge0-site-navigation"
  ).offsetHeight;

  const siteContent = document.getElementById("judge0-site-content");
  siteContent.style.height = `${window.innerHeight}px`;
  siteContent.style.paddingTop = `${navigationHeight}px`;
}

function refreshLayoutSize() {
  refreshSiteContentHeight();
  layout.updateSize();
}

window.addEventListener("resize", refreshLayoutSize);
document.addEventListener("DOMContentLoaded", async function () {
  $("#select-language").dropdown();
  $("[data-content]").popup({
    lastResort: "left center",
  });

  refreshSiteContentHeight();

  console.log(
    "Hey, Judge0 IDE is open-sourced: https://github.com/judge0/ide. Have fun!"
  );

  $selectLanguage = $("#select-language");
  $selectLanguage.change(function (event, data) {
    let skipSetDefaultSourceCodeName =
      (data && data.skipSetDefaultSourceCodeName) || !!gPuterFile;
    loadSelectedLanguage(skipSetDefaultSourceCodeName);
  });

  await loadLangauges();

  $compilerOptions = $("#compiler-options");
  $commandLineArguments = $("#command-line-arguments");

  $runBtn = $("#run-btn");
  $runBtn.click(run);

  $("#open-file-input").change(function (e) {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = function (e) {
        openFile(e.target.result, selectedFile.name);
      };

      reader.onerror = function (e) {
        showError("Error", "Error reading file: " + e.target.error);
      };

      reader.readAsText(selectedFile);
    }
  });

  $statusLine = $("#judge0-status-line");

  $(document).on("keydown", "body", function (e) {
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case "Enter": // Ctrl+Enter, Cmd+Enter
          e.preventDefault();
          run();
          break;
        case "s": // Ctrl+S, Cmd+S
          e.preventDefault();
          save();
          break;
        case "o": // Ctrl+O, Cmd+O
          e.preventDefault();
          open();
          break;
        case "+": // Ctrl+Plus
        case "=": // Some layouts use '=' for '+'
          e.preventDefault();
          fontSize += 1;
          setFontSizeForAllEditors(fontSize);
          break;
        case "-": // Ctrl+Minus
          e.preventDefault();
          fontSize -= 1;
          setFontSizeForAllEditors(fontSize);
          break;
        case "0": // Ctrl+0
          e.preventDefault();
          fontSize = 13;
          setFontSizeForAllEditors(fontSize);
          break;
      }
    }
  });

  // ADDED: Monaco editor setup
  // ADDED: Autocomplete setup
  require(["vs/editor/editor.main"], function (ignorable) {
    layout = new GoldenLayout(layoutConfig, $("#judge0-site-content"));

    layout.registerComponent("source", function (container, state) {
      // ADDED: Suggestions provider setup
      const suggestionsProvider = {
        provideCompletionItems: async function (
          model,
          position,
          context,
          token
        ) {
          try {
            const text = model.getValue();
            const cursorOffset = model.getOffsetAt(position);
            const language = model.getLanguageId();

            const completion = await getAutoComplete(
              text,
              cursorOffset,
              language
            );

            if (!completion || completion.trim() === "") {
              return { suggestions: [] };
            }

            const lines = completion.split("\n");
            const insertText = completion;

            const wordUntilPosition = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              startColumn: wordUntilPosition.startColumn,
              endLineNumber: position.lineNumber,
              endColumn: wordUntilPosition.endColumn,
            };

            const suggestion = {
              label: {
                label: lines[0] + (lines.length > 1 ? "..." : ""),
                description: "AI Suggestion",
              },
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: insertText,
              detail: "AI Code Completion",
              documentation: {
                value: "```" + language + "\n" + completion + "\n```",
                isTrusted: true,
                supportThemeIcons: true,
              },
              range: range,
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              sortText: "0000",
              filterText: lines[0],
              command: {
                id: "editor.action.triggerSuggest",
                title: "Re-trigger completions...",
              },
            };

            return {
              suggestions: [suggestion],
              incomplete: true,
            };
          } catch (error) {
            console.error("Error in completion:", error);
            return { suggestions: [] };
          }
        },

        triggerCharacters: [".", "(", "{", "[", " ", "\n", "\t"],
      };

      // ADDED: Inline completions setup
      const inlineProvider = {
        async provideInlineCompletions(model, position, context, token) {
          try {
            const text = model.getValue();
            const cursorOffset = model.getOffsetAt(position);
            const language = model.getLanguageId();

            const completion = await getAutoComplete(
              text,
              cursorOffset,
              language
            );

            if (!completion || completion.trim() === "") {
              return { items: [] };
            }

            // Create a proper range for the completion
            const wordUntilPosition = model.getWordUntilPosition(position);
            const range = new monaco.Range(
              position.lineNumber,
              wordUntilPosition.startColumn,
              position.lineNumber + completion.split("\n").length - 1,
              position.column + completion.length
            );

            return {
              items: [
                {
                  insertText: completion,
                  range: range,
                },
              ],
              suppressSuggestions: false,
              dispose: () => {}, // Add dispose method
            };
          } catch (error) {
            console.error("Error in inline completion:", error);
            return { items: [], dispose: () => {} };
          }
        },

        freeInlineCompletions: (completions) => {
          if (completions?.dispose) {
            completions.dispose();
          }
        },

        handleItemDidShow: () => {},
      };

      // ADDED: Register both providers
      const suggestionDisposable =
        monaco.languages.registerCompletionItemProvider(
          "*",
          suggestionsProvider
        );
      const inlineDisposable =
        monaco.languages.registerInlineCompletionsProvider("*", inlineProvider);

      const editorConfig = {
        automaticLayout: true,
        scrollBeyondLastLine: true,
        readOnly: state.readOnly,
        language: "cpp",
        fontFamily: "JetBrains Mono",
        minimap: {
          enabled: true,
        },
        inlineCompletionsOptions: {
          enabled: true,
          showToolbar: "always",
          mode: "subword",
        },
        suggest: {
          preview: true,
          showStatusBar: true,
          showInlineDetails: true,
          snippetsPreventQuickSuggestions: false,
          showIcons: true,
          showMethods: true,
          showFunctions: true,
          showConstructors: true,
          filterGraceful: false,
          localityBonus: true,
          shareSuggestSelections: true,
          previewMode: "prefix",
          insertMode: "insert",
          snippetSuggestions: "inline",
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: "on",
          selectionMode: "always",
          showDeprecated: false,
          matchOnWordStartOnly: false,
          maxVisibleSuggestions: 12,
          hideSuggestionsOnType: false,
        },
        quickSuggestions: {
          other: "on",
          comments: "on",
          strings: "on",
        },
        parameterHints: {
          enabled: true,
          cycle: true,
        },
        hover: {
          enabled: true,
          delay: 300,
        },
        tabCompletion: "on",
        wordBasedSuggestions: "matchingDocuments",
        suggestSelection: "first",
        suggestFontSize: 14,
        suggestLineHeight: 24,
      };

      sourceEditor = monaco.editor.create(
        container.getElement()[0],
        editorConfig
      );

      // ADDED: Trigger suggestions setup
      setTimeout(() => {
        const debouncedTriggerSuggestions = debounce(() => {
          const model = sourceEditor.getModel();
          const position = sourceEditor.getPosition();

          const lineContent = model.getLineContent(position.lineNumber);
          const charBeforeCursor = lineContent[position.column - 2] || "";
          const triggerChars = [".", "(", "{", "[", " ", "\n"];

          if (
            position.column < lineContent.length &&
            !triggerChars.includes(charBeforeCursor)
          ) {
            return;
          }

          sourceEditor.trigger(
            "keyboard",
            "editor.action.inlineSuggest.trigger",
            {}
          );
        }, AUTOCOMPLETE_DEBOUNCE_MS);

        // ADDED: Keyboard shortcut for triggering inline suggestions
        sourceEditor.addCommand(
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space,
          () => {
            sourceEditor.trigger(
              "keyboard",
              "editor.action.inlineSuggest.trigger",
              {}
            );
          }
        );

        // ADDED: Keyboard shortcut for accepting inline suggestion
        sourceEditor.addCommand(
          monaco.KeyMod.Alt | monaco.KeyCode.RightArrow,
          () => {
            sourceEditor.trigger(
              "keyboard",
              "editor.action.inlineSuggest.commit",
              {}
            );
          }
        );

        // ADDED: Keyboard shortcut for showing next inline suggestion
        sourceEditor.addCommand(
          monaco.KeyMod.Alt | monaco.KeyCode.BracketRight,
          () => {
            sourceEditor.trigger(
              "keyboard",
              "editor.action.inlineSuggest.showNext",
              {}
            );
          }
        );

        // ADDED: Event listener for cursor position changes
        sourceEditor.onDidChangeCursorPosition((e) => {
          if (e.reason === monaco.editor.CursorChangeReason.ContentChange) {
            debouncedTriggerSuggestions();
          }
        });

        // ADDED: Event listener for content changes
        sourceEditor.onDidChangeModelContent((e) => {
          debouncedTriggerSuggestions();
        });

        addAIChatContextMenu(sourceEditor);
        sourceEditor.addCommand(
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
          run
        );
      }, 100);

      // ADDED: Handle container resize
      container.on("resize", () => {
        if (sourceEditor) {
          sourceEditor.layout();
        }
      });

      // ADDED: Handle container destroy
      container.on("destroy", () => {
        if (suggestionDisposable) {
          suggestionDisposable.dispose();
        }
        if (inlineDisposable) {
          inlineDisposable.dispose();
        }
        if (sourceEditor) {
          sourceEditor.dispose();
        }
      });
    });

    layout.registerComponent("stdin", function (container, state) {
      stdinEditor = monaco.editor.create(container.getElement()[0], {
        automaticLayout: true,
        scrollBeyondLastLine: false,
        readOnly: state.readOnly,
        language: "plaintext",
        fontFamily: "JetBrains Mono",
        minimap: {
          enabled: false,
        },
      });

      addAIChatContextMenu(stdinEditor);
    });

    layout.registerComponent("stdout", function (container, state) {
      stdoutEditor = monaco.editor.create(container.getElement()[0], {
        automaticLayout: true,
        scrollBeyondLastLine: false,
        readOnly: state.readOnly,
        language: "plaintext",
        fontFamily: "JetBrains Mono",
        minimap: {
          enabled: false,
        },
      });

      addAIChatContextMenu(stdoutEditor);

      // ADDED: Content change listener for offering help in chat
      stdoutEditor.onDidChangeModelContent((e) => {
        const content = stdoutEditor.getValue();
        if (content.trim().length > 0) {
          analyzeOutputError(content);
        }
      });
    });

    // ADDED: AI chat setup layout setup
    layout.registerComponent("ai-chat", function (container, state) {
      const chatContainer = document.createElement("div");
      chatContainer.id = "chat-container";
      chatContainer.style.cssText = `
                height: 100%;
                width: 100%;
                display: flex;
                flex-direction: column;
                background: #1e1e1e;
                color: #d4d4d4;
                font-family: 'JetBrains Mono', monospace;
            `;

      // ADDED: Model selector setup
      const modelSelector = document.createElement("select");
      modelSelector.id = "ai-model-selector";
      modelSelector.style.cssText = `
                margin: 10px;
                padding: 5px;
                background: #2d2d2d;
                color: #d4d4d4;
                border: 1px solid #3c3c3c;
                border-radius: 4px;
                font-family: inherit;
            `;
      Object.entries(AI_MODELS).forEach(([name, value]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = name;
        modelSelector.appendChild(option);
      });

      // ADDED: Chat history area setup
      const chatHistory = document.createElement("div");
      chatHistory.id = "chat-history";
      chatHistory.style.cssText = `
                flex-grow: 1;
                overflow-y: auto;
                padding: 10px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;

      // ADDED: Input container setup
      const inputContainer = document.createElement("div");
      inputContainer.style.cssText = `
                display: flex;
                gap: 10px;
                padding: 10px;
                border-top: 1px solid #3c3c3c;
                margin-bottom: 22px;
                align-items: flex-end;
            `;

      // ADDED: Textarea for input setup
      const textarea = document.createElement("textarea");
      textarea.id = "chat-input";
      textarea.placeholder = "Type your message here...";
      textarea.style.cssText = `
                flex-grow: 1;
                padding: 8px;
                background: #2d2d2d;
                color: #d4d4d4;
                border: 1px solid #3c3c3c;
                border-radius: 4px;
                font-family: inherit;
                min-height: 20px;
                max-height: 150px;
                height: auto;
                resize: none;
                overflow-y: hidden;
            `;

      // ADDED: Auto-resize functionality
      textarea.addEventListener("input", function () {
        this.style.height = "auto";
        const newHeight = Math.min(Math.max(this.scrollHeight, 20), 150);
        this.style.height = newHeight + "px";
      });

      setTimeout(() => {
        const event = new Event("input", { bubbles: true });
        textarea.dispatchEvent(event);
      }, 0);

      // ADDED: Submit button setup
      const submitButton = document.createElement("button");
      submitButton.id = "chat-submit";
      submitButton.textContent = "Send";
      submitButton.style.cssText = `
                padding: 8px 16px;
                background: #0e639c;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-family: inherit;
                height: 36px;
                min-height: 36px;
                align-self: flex-end;
            `;

      submitButton.addEventListener("mouseover", () => {
        submitButton.style.background = "#1177bb";
      });
      submitButton.addEventListener("mouseout", () => {
        submitButton.style.background = "#0e639c";
      });

      textarea.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleChatSubmit();
        }
      });

      submitButton.addEventListener("click", handleChatSubmit);

      inputContainer.appendChild(textarea);
      inputContainer.appendChild(submitButton);

      chatContainer.appendChild(modelSelector);
      chatContainer.appendChild(chatHistory);
      chatContainer.appendChild(inputContainer);

      container.getElement()[0].appendChild(chatContainer);
      aiChatEditor = chatContainer;

      async function handleChatSubmit() {
        const input = textarea.value.trim();
        if (!input) return;

        appendMessage("user", input);

        textarea.value = "";

        agenticProcess(input);
      }
    });

    layout.on("initialised", function () {
      setDefaults();
      refreshLayoutSize();
      window.top.postMessage({ event: "initialised" }, "*");
    });

    layout.init();
  });

  let superKey = "⌘";
  if (!/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform)) {
    superKey = "Ctrl";
  }

  [$runBtn].forEach((btn) => {
    btn.attr("data-content", `${superKey}${btn.attr("data-content")}`);
  });

  document.querySelectorAll(".description").forEach((e) => {
    e.innerText = `${superKey}${e.innerText}`;
  });

  if (IS_PUTER) {
    puter.ui.onLaunchedWithItems(async function (items) {
      gPuterFile = items[0];
      openFile(await (await gPuterFile.read()).text(), gPuterFile.name);
    });
  }

  document
    .getElementById("judge0-open-file-btn")
    .addEventListener("click", openAction);
  document
    .getElementById("judge0-save-btn")
    .addEventListener("click", saveAction);

  window.onmessage = function (e) {
    if (!e.data) {
      return;
    }

    if (e.data.action === "get") {
      window.top.postMessage(
        JSON.parse(
          JSON.stringify({
            event: "getResponse",
            source_code: sourceEditor.getValue(),
            language_id: getSelectedLanguageId(),
            flavor: getSelectedLanguageFlavor(),
            stdin: stdinEditor.getValue(),
            stdout: stdoutEditor.getValue(),
            compiler_options: $compilerOptions.val(),
            command_line_arguments: $commandLineArguments.val(),
          })
        ),
        "*"
      );
    } else if (e.data.action === "set") {
      if (e.data.source_code) {
        sourceEditor.setValue(e.data.source_code);
      }
      if (e.data.language_id && e.data.flavor) {
        selectLanguageByFlavorAndId(e.data.language_id, e.data.flavor);
      }
      if (e.data.stdin) {
        stdinEditor.setValue(e.data.stdin);
      }
      if (e.data.stdout) {
        stdoutEditor.setValue(e.data.stdout);
      }
      if (e.data.compiler_options) {
        $compilerOptions.val(e.data.compiler_options);
      }
      if (e.data.command_line_arguments) {
        $commandLineArguments.val(e.data.command_line_arguments);
      }
      if (e.data.api_key) {
        AUTH_HEADERS["Authorization"] = `Bearer ${e.data.api_key}`;
      }
    }
  };
});

const DEFAULT_SOURCE =
  "\
#include <algorithm>\n\
#include <cstdint>\n\
#include <iostream>\n\
#include <limits>\n\
#include <set>\n\
#include <utility>\n\
#include <vector>\n\
\n\
using Vertex    = std::uint16_t;\n\
using Cost      = std::uint16_t;\n\
using Edge      = std::pair< Vertex, Cost >;\n\
using Graph     = std::vector< std::vector< Edge > > >;\n\
using CostTable = std::vector< std::uint64_t >;\n\
\n\
constexpr auto kInfiniteCost{ std::numeric_limits< CostTable::value_type >::max() };\n\
\n\
auto dijkstra( Vertex const start, Vertex const end, Graph const & graph, CostTable & costTable )\n\
{\n\
    std::fill( costTable.begin(), costTable.end(), kInfiniteCost );\n\
    costTable[ start ] = 0;\n\
\n\
    std::set< std::pair< CostTable::value_type, Vertex > > minHeap;\n\
    minHeap.emplace( 0, start );\n\
\n\
    while ( !minHeap.empty() )\n\
    {\n\
        auto const vertexCost{ minHeap.begin()->first  };\n\
        auto const vertex    { minHeap.begin()->second };\n\
\n\
        minHeap.erase( minHeap.begin() );\n\
\n\
        if ( vertex == end )\n\
        {\n\
            break;\n\
        }\n\
\n\
        for ( auto const & neighbourEdge : graph[ vertex ] )\n\
        {\n\
            auto const & neighbour{ neighbourEdge.first };\n\
            auto const & cost{ neighbourEdge.second };\n\
\n\
            if ( costTable[ neighbour ] > vertexCost + cost )\n\
            {\n\
                minHeap.erase( { costTable[ neighbour ], neighbour } );\n\
                costTable[ neighbour ] = vertexCost + cost;\n\
                minHeap.emplace( costTable[ neighbour ], neighbour );\n\
            }\n\
        }\n\
    }\n\
\n\
    return costTable[ end ];\n\
}\n\
\n\
int main()\n\
{\n\
    constexpr std::uint16_t maxVertices{ 10000 };\n\
\n\
    Graph     graph    ( maxVertices );\n\
    CostTable costTable( maxVertices );\n\
\n\
    std::uint16_t testCases;\n\
    std::cin >> testCases;\n\
\n\
    while ( testCases-- > 0 )\n\
    {\n\
        for ( auto i{ 0 }; i < maxVertices; ++i )\n\
        {\n\
            graph[ i ].clear();\n\
        }\n\
\n\
        std::uint16_t numberOfVertices;\n\
        std::uint16_t numberOfEdges;\n\
\n\
        std::cin >> numberOfVertices >> numberOfEdges;\n\
\n\
        for ( auto i{ 0 }; i < numberOfEdges; ++i )\n\
        {\n\
            Vertex from;\n\
            Vertex to;\n\
            Cost   cost;\n\
\n\
            std::cin >> from >> to >> cost;\n\
            graph[ from ].emplace_back( to, cost );\n\
        }\n\
\n\
        Vertex start;\n\
        Vertex end;\n\
\n\
        std::cin >> start >> end;\n\
\n\
        auto const result{ dijkstra( start, end, graph, costTable ) };\n\
\n\
        if ( result == kInfiniteCost )\n\
        {\n\
            std::cout << \"NO\\n\";\n\
        }\n\
        else\n\
        {\n\
            std::cout << result << '\\n';\n\
        }\n\
    }\n\
\n\
    return 0;\n\
}\n\
";

const DEFAULT_STDIN =
  "\
3\n\
3 2\n\
1 2 5\n\
2 3 7\n\
1 3\n\
3 3\n\
1 2 4\n\
1 3 7\n\
2 3 1\n\
1 3\n\
3 1\n\
1 2 4\n\
1 3\n\
";

const DEFAULT_COMPILER_OPTIONS = "";
const DEFAULT_CMD_ARGUMENTS = "";
const DEFAULT_LANGUAGE_ID = 105; // C++ (GCC 14.1.0) (https://ce.judge0.com/languages/105)

function getEditorLanguageMode(languageName) {
  const DEFAULT_EDITOR_LANGUAGE_MODE = "plaintext";
  const LANGUAGE_NAME_TO_LANGUAGE_EDITOR_MODE = {
    Bash: "shell",
    C: "c",
    C3: "c",
    "C#": "csharp",
    "C++": "cpp",
    Clojure: "clojure",
    "F#": "fsharp",
    Go: "go",
    Java: "java",
    JavaScript: "javascript",
    Kotlin: "kotlin",
    "Objective-C": "objective-c",
    Pascal: "pascal",
    Perl: "perl",
    PHP: "php",
    Python: "python",
    R: "r",
    Ruby: "ruby",
    SQL: "sql",
    Swift: "swift",
    TypeScript: "typescript",
    "Visual Basic": "vb",
  };

  for (let key in LANGUAGE_NAME_TO_LANGUAGE_EDITOR_MODE) {
    if (languageName.toLowerCase().startsWith(key.toLowerCase())) {
      return LANGUAGE_NAME_TO_LANGUAGE_EDITOR_MODE[key];
    }
  }
  return DEFAULT_EDITOR_LANGUAGE_MODE;
}

const EXTENSIONS_TABLE = {
  asm: { flavor: CE, language_id: 45 }, // Assembly (NASM 2.14.02)
  c: { flavor: CE, language_id: 103 }, // C (GCC 14.1.0)
  cpp: { flavor: CE, language_id: 105 }, // C++ (GCC 14.1.0)
  cs: { flavor: EXTRA_CE, language_id: 29 }, // C# (.NET Core SDK 7.0.400)
  go: { flavor: CE, language_id: 95 }, // Go (1.18.5)
  java: { flavor: CE, language_id: 91 }, // Java (JDK 17.0.6)
  js: { flavor: CE, language_id: 102 }, // JavaScript (Node.js 22.08.0)
  lua: { flavor: CE, language_id: 64 }, // Lua (5.3.5)
  pas: { flavor: CE, language_id: 67 }, // Pascal (FPC 3.0.4)
  php: { flavor: CE, language_id: 98 }, // PHP (8.3.11)
  py: { flavor: EXTRA_CE, language_id: 25 }, // Python for ML (3.11.2)
  r: { flavor: CE, language_id: 99 }, // R (4.4.1)
  rb: { flavor: CE, language_id: 72 }, // Ruby (2.7.0)
  rs: { flavor: CE, language_id: 73 }, // Rust (1.40.0)
  scala: { flavor: CE, language_id: 81 }, // Scala (2.13.2)
  sh: { flavor: CE, language_id: 46 }, // Bash (5.0.0)
  swift: { flavor: CE, language_id: 83 }, // Swift (5.2.3)
  ts: { flavor: CE, language_id: 101 }, // TypeScript (5.6.2)
  txt: { flavor: CE, language_id: 43 }, // Plain Text
};

function getLanguageForExtension(extension) {
  return EXTENSIONS_TABLE[extension] || { flavor: CE, language_id: 43 }; // Plain Text (https://ce.judge0.com/languages/43)
}

// ADDED: Function to get selected AI model
function getSelectedModel() {
  const modelSelector = document.getElementById("ai-model-selector");
  return modelSelector.value;
}

// ADDED: Function to get OpenRouter API key
async function getOpenRouterApiKey() {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key not found in configuration");
  }
  return OPENROUTER_API_KEY;
}

// ADDED: Function to add highlighted text to the AI Chat (Context Menu)
function addAIChatContextMenu(editor) {
  editor.addAction({
    id: "add-to-ai-chat",
    label: "Add to AI Chat",
    contextMenuGroupId: "ai",
    contextMenuOrder: 1.5,
    run: function (editor) {
      const selection = editor.getSelection();
      const selectedText = editor.getModel().getValueInRange(selection);

      if (selectedText) {
        const chatInput = document.getElementById("chat-input");
        if (chatInput) {
          const currentValue = chatInput.value;
          chatInput.value =
            currentValue + (currentValue ? "\n" : "") + selectedText;
          chatInput.focus();
          chatInput.scrollTop = chatInput.scrollHeight;
          const event = new Event("input", { bubbles: true });
          chatInput.dispatchEvent(event);
        }
      }
    },
  });
}

// ADDED: Function to analyze output error sentiment
async function analyzeOutputError(output) {
  try {
    const apiKey = await getOpenRouterApiKey();
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.href,
          "X-Title": "Cursor IDE",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-001",
          messages: [
            {
              role: "user",
              content: `Analyze this code execution output and respond with only "error" or "success": ${output}`,
            },
          ],
          temperature: 0.1,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content.toLowerCase().trim();
    console.log("Analysis:", analysis);

    if (analysis === "error") {
      const chatHistory = document.getElementById("chat-history");
      if (!chatHistory) return;

      const helpMessage = document.createElement("div");
      helpMessage.className = "chat-message assistant-message";
      helpMessage.innerHTML = `
                <div style="margin-bottom: 10px;">Would you like some help with that error?</div>
                <div style="display: flex; gap: 10px;">
                    <button id="error-help-yes" class="error-help-btn" style="padding: 5px 15px; background: #0e639c; color: white; border: none; border-radius: 4px; cursor: pointer;">Yes</button>
                    <button id="error-help-no" class="error-help-btn" style="padding: 5px 15px; background: #4d4d4d; color: white; border: none; border-radius: 4px; cursor: pointer;">No</button>
                </div>
            `;
      chatHistory.appendChild(helpMessage);
      chatHistory.scrollTop = chatHistory.scrollHeight;

      return new Promise((resolve) => {
        const yesBtn = helpMessage.querySelector("#error-help-yes");
        const noBtn = helpMessage.querySelector("#error-help-no");
        let timeout;

        const cleanup = () => {
          clearTimeout(timeout);
          yesBtn.removeEventListener("click", handleYes);
          noBtn.removeEventListener("click", handleNo);
          helpMessage.remove();
        };

        const handleYes = () => {
          cleanup();
          resolve(true);
          const errorFixPrompt = `I got this error in my code. Can you help me fix it?\n\nError output:\n${output}`;
          agenticProcess(errorFixPrompt);
        };

        const handleNo = () => {
          cleanup();
          resolve(false);
        };

        yesBtn.addEventListener("click", handleYes);
        noBtn.addEventListener("click", handleNo);

        timeout = setTimeout(() => {
          cleanup();
          resolve(false);
        }, 15000);
      });
    }
  } catch (error) {
    console.error("Error analyzing output:", error);
    return false;
  }
}
