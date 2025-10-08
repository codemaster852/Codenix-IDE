
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { FileNode, ConsoleLog, ChatMessage } from './types';
import { sendMessageToModel } from './services/codenixService';
import { FileIcon, PlayIcon, ShareIcon, UploadCloudIcon, SparklesIcon, CopyIcon, DownloadIcon, FolderPlusIcon, TrashIcon, TerminalIcon, MessageSquareIcon, SendIcon, RefreshCwIcon, ExpandIcon, MinimizeIcon } from './components/icons';

// --- Reusable UI Components ---

interface FileExplorerProps {
  files: FileNode[];
  activeFile: string | null;
  onFileSelect: (fileName: string) => void;
  onAddFile: () => void;
  renamingFile: string | null;
  onRenameStart: (fileName: string) => void;
  onRenameConfirm: (oldName: string, newName: string) => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ files, activeFile, onFileSelect, onAddFile, renamingFile, onRenameStart, onRenameConfirm }) => (
  <div className="bg-gray-900/70 backdrop-blur-sm border-r border-gray-700/50 p-4 flex flex-col h-full">
    <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-300">File Explorer</h2>
        <button onClick={onAddFile} className="p-1.5 rounded-md hover:bg-gray-700 transition-colors" title="Add new file">
            <FolderPlusIcon className="w-5 h-5 text-gray-400"/>
        </button>
    </div>
    <div className="flex-grow overflow-y-auto">
      {files.length === 0 ? (
        <p className="text-gray-500 text-sm">Chat with the AI to generate files.</p>
      ) : (
        <ul>
          {files.map((file) => (
            <li key={file.name}>
              {renamingFile === file.name ? (
                <input
                  type="text"
                  defaultValue={file.name}
                  autoFocus
                  onBlur={(e) => onRenameConfirm(file.name, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); }
                    if (e.key === 'Escape') { onRenameConfirm(file.name, file.name); }
                  }}
                  className="w-full bg-gray-700 text-white p-1.5 rounded-md text-sm border border-blue-500 focus:outline-none"
                />
              ) : (
                <button
                  onClick={() => onFileSelect(file.name)}
                  onDoubleClick={() => onRenameStart(file.name)}
                  className={`w-full text-left flex items-center gap-2 p-2 rounded-md text-sm transition-colors duration-200 ${
                    activeFile === file.name ? 'bg-blue-600/30 text-blue-300' : 'hover:bg-gray-700/50 text-gray-400'
                  }`}
                  title="Double-click to rename"
                >
                  <FileIcon className="w-4 h-4 text-gray-500" />
                  <span>{file.name}</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>
);

// --- Syntax Highlighting Logic ---
const highlightSyntax = (code: string, language: 'html' | 'css' | 'javascript' | 'unknown') => {
  if (language === 'unknown') {
    return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  let highlightedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const rules = {
    html: [
        { pattern: /(&lt;!--.*?--&gt;)/gs, className: 'token-comment' },
        { pattern: /(&lt;\/?)([a-zA-Z0-9\-]+)/g, replace: '$1<span class="token-tag">$2</span>' },
        { pattern: /([a-zA-Z\-]+)=(".*?")/g, replace: '<span class="token-attr-name">$1</span>=<span class="token-attr-value">$2</span>' },
    ],
    css: [
        { pattern: /(\/\*.*?\*\/)/gs, className: 'token-comment' },
        { pattern: /([#.]?[\w-]+)(?=\s*\{)/g, className: 'token-selector' },
        { pattern: /([\w-]+)(?=\s*:)/g, className: 'token-property' },
        { pattern: /([:;,{}()])/g, className: 'token-punctuation' },
        { pattern: /"(.*?)"/g, className: 'token-string' },
    ],
    javascript: [
        { pattern: /(\/\*.*?\*\/|\/\/.*)/g, className: 'token-comment' },
        { pattern: /('.*?'|".*?"|`.*?`)/g, className: 'token-string' },
        { pattern: /\b(const|let|var|function|return|if|else|for|while|import|export|from|as|async|await|new|class|extends)\b/g, className: 'token-keyword' },
        { pattern: /([a-zA-Z_]\w*)(?=\s*\()/g, className: 'token-function' },
        { pattern: /([=+\-*/%<>!&|?])/g, className: 'token-operator' },
        { pattern: /([.,;:[\]{}()])/g, className: 'token-punctuation' },
        { pattern: /\b(\d+)\b/g, className: 'token-number' },
    ]
  };

  (rules[language] || []).forEach(rule => {
      if ('className' in rule) {
          highlightedCode = highlightedCode.replace(rule.pattern, `<span class="${rule.className}">$1</span>`);
      } else if ('replace' in rule) {
          highlightedCode = highlightedCode.replace(rule.pattern, rule.replace);
      }
  });

  return highlightedCode;
};


interface CodeEditorProps {
  content: string;
  onContentChange: (newContent: string) => void;
  fileName: string | null;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ content, onContentChange, fileName }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const preRef = useRef<HTMLPreElement>(null);
    
    const language = useMemo(() => {
        if (!fileName) return 'unknown';
        const extension = fileName.split('.').pop();
        if (extension === 'js' || extension === 'jsx' || extension === 'ts' || extension === 'tsx') return 'javascript';
        if (extension === 'css') return 'css';
        if (extension === 'html') return 'html';
        return 'unknown';
    }, [fileName]);

    const highlightedContent = useMemo(() => highlightSyntax(content, language), [content, language]);

    const handleScroll = () => {
        if (preRef.current && textareaRef.current) {
            preRef.current.scrollTop = textareaRef.current.scrollTop;
            preRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    };
    
    return (
        <div className="flex-1 flex flex-col bg-gray-800/50 overflow-hidden">
            <div className="bg-gray-900/80 px-4 py-2 border-b border-gray-700/50">
                <h3 className="text-sm text-gray-300">{fileName || 'No file selected'}</h3>
            </div>
            <div className="flex-1 w-full relative group">
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => onContentChange(e.target.value)}
                    onScroll={handleScroll}
                    className="absolute inset-0 w-full h-full p-4 bg-transparent text-transparent caret-white font-mono text-sm resize-none focus:outline-none leading-relaxed z-10"
                    placeholder="Select a file or ask the AI to generate one."
                    spellCheck="false"
                />
                <pre
                    ref={preRef}
                    aria-hidden="true"
                    className="syntax-highlight absolute inset-0 w-full h-full p-4 font-mono text-sm overflow-auto pointer-events-none leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: highlightedContent + '\n' }} 
                />
            </div>
        </div>
    );
};

interface PreviewProps {
  htmlContent: string;
  key: number;
}

const Preview: React.FC<PreviewProps> = ({ htmlContent, key }) => (
    <iframe
        key={key}
        srcDoc={htmlContent}
        title="Live Preview"
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin"
    />
);

interface ChatPanelProps {
    messages: ChatMessage[];
    isLoading: boolean;
}
  
const ChatPanel: React.FC<ChatPanelProps> = ({ messages, isLoading }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    return (
        <div className="h-full flex flex-col p-4 overflow-y-auto bg-gray-800/30">
        {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 my-2 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
            {msg.sender === 'ai' && <SparklesIcon className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />}
            <div className={`max-w-md rounded-lg px-4 py-2 overflow-x-auto ${msg.sender === 'user' ? 'bg-blue-600' : msg.isError ? 'bg-red-500/50' : 'bg-gray-700'} `}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
            </div>
        ))}
        {isLoading && (
            <div className="flex items-start gap-3 my-2">
                <SparklesIcon className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1 animate-pulse" />
                <div className="max-w-md rounded-lg px-4 py-2 bg-gray-700">
                    <div className="flex items-center justify-center space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
        </div>
    );
};

interface ConsoleOutputProps {
    logs: ConsoleLog[];
    onClear: () => void;
}

const ConsoleOutput: React.FC<ConsoleOutputProps> = ({ logs, onClear }) => {
    return (
        <div className="h-full flex flex-col bg-gray-900/80">
             <div className="flex items-center justify-between px-4 py-1.5 border-b border-t border-gray-700/50">
                <h3 className="text-sm font-semibold text-gray-300">Console</h3>
                <button onClick={onClear} className="p-1.5 rounded-md hover:bg-gray-700 transition-colors" title="Clear console">
                    <TrashIcon className="w-4 h-4 text-gray-400"/>
                </button>
            </div>
            <div className="flex-1 p-2 font-mono text-xs overflow-y-auto">
                {logs.length === 0 ? (
                    <p className="text-gray-500">Console is empty. Logs from your project will appear here.</p>
                ) : (
                    logs.map((log, index) => (
                        <div key={index} className={`flex items-start gap-2 border-b border-gray-800/50 py-1 ${log.type === 'error' ? 'text-red-400' : 'text-gray-300'}`}>
                            <span className="text-gray-500">{log.timestamp}</span>
                            <div className="flex-1 whitespace-pre-wrap break-all">{log.message.join(' ')}</div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

interface ResizerProps {
    onDrag: (dx: number, dy: number) => void;
    direction: 'horizontal' | 'vertical';
}

const Resizer: React.FC<ResizerProps> = ({ onDrag, direction }) => {
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            onDrag(dx, dy);
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [onDrag]);

    return (
        <div
            onMouseDown={handleMouseDown}
            className={`absolute ${direction === 'horizontal' ? 'top-0 bottom-0 w-2 cursor-col-resize' : 'left-0 right-0 h-2 cursor-row-resize'} z-20 hover:bg-blue-500/50 transition-colors duration-200`}
        />
    );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [message, setMessage] = useState<string>('');
  const [files, setFiles] = useState<FileNode[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { sender: 'ai', content: "Hello! I'm Nix 1.5. Describe the website you want to build, or ask me anything." }
  ]);
  const [activeTab, setActiveTab] = useState<'preview' | 'chat'>('chat');
  const [previewKey, setPreviewKey] = useState<number>(0);
  
  // State for resizable panels
  const [explorerWidth, setExplorerWidth] = useState(256);
  const [rightPanelWidth, setRightPanelWidth] = useState(window.innerWidth * 0.33);
  const [consoleHeight, setConsoleHeight] = useState(0); // Initially hidden
  const [isConsoleVisible, setIsConsoleVisible] = useState(false);
  const [isPreviewFullScreen, setIsPreviewFullScreen] = useState(false);
  
  const handleFileSelect = (fileName: string) => {
    setActiveFile(fileName);
  };

  const handleContentChange = (newContent: string) => {
    if (!activeFile) return;
    setFiles(files.map((file) => file.name === activeFile ? { ...file, content: newContent } : file));
  };
  
  const handleSendMessage = useCallback(async () => {
    if (!message.trim()) return;
    const userMessage: ChatMessage = { sender: 'user', content: message };
    setChatHistory(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);
    const response = await sendMessageToModel(message);
    setIsLoading(false);
    
    if (response.success === false) {
      setChatHistory(prev => [...prev, { sender: 'ai', content: response.error, isError: true }]);
      setIsConsoleVisible(true);
      setConsoleHeight(192); // Show console on error
      setActiveTab('chat');
      return;
    }
    const aiResponseContent = response.message;
    setChatHistory(prev => [...prev, { sender: 'ai', content: aiResponseContent }]);
    const contentFile: FileNode = { name: 'content', content: aiResponseContent, type: 'file' };
    setFiles(prevFiles => {
        const otherFiles = prevFiles.filter(f => f.name !== 'content');
        return [...otherFiles, contentFile];
    });
    setActiveFile('content');
    setActiveTab('preview');
  }, [message]);

  const handleAddNewFile = () => {
    const fileName = window.prompt("Enter the name for the new file (e.g., 'about.html', 'utils.js'):");
    if (fileName) {
        if (files.some(f => f.name === fileName)) {
            alert(`A file named "${fileName}" already exists.`);
            return;
        }
        const newFile: FileNode = { name: fileName, content: '', type: 'file' };
        setFiles(prevFiles => [...prevFiles, newFile]);
        setActiveFile(fileName);
    }
  };

  const handleDownloadProject = () => {
    if (files.length === 0) return;
    const zip = new (window as any).JSZip();
    files.forEach(file => { zip.file(file.name, file.content); });
    zip.generateAsync({ type: 'blob' }).then((content: any) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'codenix-project.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
  };

  const handleRenameFile = (oldName: string, newName: string) => {
    const trimmedNewName = newName.trim();
    if (!trimmedNewName || trimmedNewName === oldName) {
      setRenamingFile(null);
      return;
    }
    if (files.some(f => f.name === trimmedNewName)) {
      alert(`A file named "${trimmedNewName}" already exists.`);
      return;
    }
    setFiles(files.map(f => (f.name === oldName ? { ...f, name: trimmedNewName } : f)));
    if (activeFile === oldName) { setActiveFile(trimmedNewName); }
    setRenamingFile(null);
  };
  
  const activeFileContent = files.find((file) => file.name === activeFile)?.content || '';

  const previewContent = useMemo(() => {
    const htmlFile = files.find(f => f.name === 'content') || files.find(f => f.name.endsWith('.html'));
    if (!htmlFile) return '<h1>No HTML file found to preview.</h1>';
    const cssFiles = files.filter(f => f.name.endsWith('.css'));
    const jsFiles = files.filter(f => f.name.endsWith('.js'));
    const styles = cssFiles.map(f => `<style>${f.content}</style>`).join('\n');
    const scripts = jsFiles.map(f => `<script type="module">${f.content}</script>`).join('\n');
    let finalHtml = htmlFile.content;
    if (finalHtml.includes('</head>')) {
        finalHtml = finalHtml.replace('</head>', `${styles}\n</head>`);
    } else { finalHtml += styles; }
    if (finalHtml.includes('</body>')) {
        finalHtml = finalHtml.replace('</body>', `${scripts}\n</body>`);
    } else { finalHtml += scripts; }
    return finalHtml;
  }, [files]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isPreviewFullScreen) {
            setIsPreviewFullScreen(false);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreviewFullScreen]);

  const toggleConsole = () => {
    setIsConsoleVisible(prev => {
        setConsoleHeight(prev ? 0 : 192);
        return !prev;
    });
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gradient-to-br from-gray-900 to-gray-800 text-gray-200 overflow-hidden">
      <header className="flex items-center justify-between p-3 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50 shadow-md z-30">
        <div className="flex items-center gap-3">
          <SparklesIcon className="w-6 h-6 text-blue-400" />
          <h1 className="text-xl font-bold tracking-wider">Codenix IDE</h1>
          <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">Nix 1.5</span>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={handleDownloadProject} disabled={files.length === 0} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors bg-gray-600/50 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
                <DownloadIcon className="w-4 h-4" /> Download
            </button>
        </div>
      </header>
      
      <main className="flex flex-1 overflow-hidden">
        <div style={{ width: `${explorerWidth}px` }}>
            <FileExplorer 
                files={files} activeFile={activeFile} onFileSelect={handleFileSelect} 
                onAddFile={handleAddNewFile} renamingFile={renamingFile}
                onRenameStart={setRenamingFile} onRenameConfirm={handleRenameFile}
            />
        </div>
        <div className="relative">
            <Resizer direction="horizontal" onDrag={(dx) => setExplorerWidth(w => Math.max(200, w + dx))} />
        </div>
        
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex overflow-hidden">
            <CodeEditor content={activeFileContent} onContentChange={handleContentChange} fileName={activeFile} />
            <div className="relative">
                <Resizer direction="horizontal" onDrag={(dx) => setRightPanelWidth(w => Math.max(200, w - dx))} />
            </div>
            <div style={{ width: `${rightPanelWidth}px` }} className="flex flex-col bg-gray-900/70 border-l border-gray-700/50">
              <div className="bg-gray-900/80 px-2 py-1.5 border-b border-gray-700/50 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button onClick={() => setActiveTab('preview')} className={`flex items-center gap-2 px-3 py-1 text-sm rounded-md ${activeTab === 'preview' ? 'bg-gray-700' : 'hover:bg-gray-800'}`}>
                    <PlayIcon className="w-4 h-4" /> Live Preview
                  </button>
                  <button onClick={() => setActiveTab('chat')} className={`flex items-center gap-2 px-3 py-1 text-sm rounded-md ${activeTab === 'chat' ? 'bg-gray-700' : 'hover:bg-gray-800'}`}>
                    <MessageSquareIcon className="w-4 h-4" /> Chat
                  </button>
                </div>
                {activeTab === 'preview' && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => setPreviewKey(k => k + 1)} className="p-1.5 rounded-md hover:bg-gray-700 transition-colors" title="Refresh Preview">
                            <RefreshCwIcon className="w-4 h-4 text-gray-400"/>
                        </button>
                        <button onClick={() => setIsPreviewFullScreen(p => !p)} className="p-1.5 rounded-md hover:bg-gray-700 transition-colors" title="Toggle Fullscreen">
                           {isPreviewFullScreen ? <MinimizeIcon className="w-4 h-4 text-gray-400"/> : <ExpandIcon className="w-4 h-4 text-gray-400"/>}
                        </button>
                    </div>
                )}
              </div>
              <div className="flex-1 bg-white relative" onDoubleClick={() => activeTab === 'preview' && setIsPreviewFullScreen(true)}>
                {activeTab === 'preview' ? <Preview htmlContent={previewContent} key={previewKey} /> : <ChatPanel messages={chatHistory} isLoading={isLoading} />}
              </div>
            </div>
          </div>
          <div className="relative">
              <Resizer direction="vertical" onDrag={(_, dy) => setConsoleHeight(h => Math.max(0, h - dy))} />
          </div>
          <div style={{ height: `${consoleHeight}px` }} className="overflow-hidden">
              <ConsoleOutput logs={consoleLogs} onClear={() => setConsoleLogs([])} />
          </div>
          <div className="bg-gray-900/80 border-t border-gray-700/50 p-3 flex gap-3 items-center">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Chat with Nix 1.5 or describe what you want to build..."
              className="flex-1 bg-gray-700/50 border border-gray-600 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
            />
            <button onClick={toggleConsole} className="relative p-2 border border-gray-600 bg-gray-700/50 rounded-md hover:bg-gray-700" title="Toggle Console">
                <TerminalIcon className="w-5 h-5" />
                {consoleLogs.length > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs">{consoleLogs.length}</span>}
            </button>
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !message.trim()}
              className="flex items-center justify-center gap-2 px-5 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed"
            >
              {isLoading ? ( <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> ) : ( <SendIcon className="w-5 h-5" /> )}
            </button>
          </div>
        </div>
      </main>
       {isPreviewFullScreen && (
        <div className="fixed inset-0 bg-white z-50" onDoubleClick={() => setIsPreviewFullScreen(false)}>
            <button onClick={() => setIsPreviewFullScreen(false)} className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/80 z-50">
                <MinimizeIcon className="w-6 h-6" />
            </button>
            <Preview htmlContent={previewContent} key={previewKey + 1} />
        </div>
      )}
    </div>
  );
};

export default App;
