import { useRef, useState, useEffect, useCallback } from 'react';
import { gsap } from 'gsap';
import { useTypewriter } from '../hooks/useTypewriter';

const COMMANDS = {
  'git commit -m "te amo"': {
    output: [
      '💕 Commit pushed to heart/main',
      '📝 Changes: +∞ love, -0 doubts',
      '✅ Build passing | Tests: ♾️ passing',
    ],
    ascii: `
    ╔═══════════════════════════════════╗
    ║  ♥  COMMIT SUCCESSFUL  ♥        ║
    ║  Branch: heart/main              ║
    ║  Hash: a1b2c3d4 (love)           ║
    ║  Date: forever                   ║
    ╚═══════════════════════════════════╝`,
  },
  'npm install love --save': {
    output: [
      '📦 love@∞.∞.∞ installed successfully',
      '💕 Dependencies: patience, kindness, laughter',
      '🚀 Ready to import in your heart',
      '',
      '📋 Package.json updated:',
      '  "dependencies": {',
      '    "love": "^∞.∞.∞",',
      '    "trust": "^1.0.0",',
      '    "patience": "^2.0.0",',
      '    "laughter": "^3.0.0"',
      '  }',
    ],
    ascii: `
    ████████████████████████████████
    █  npm INSTALL COMPLETE  ♥      █
    █  4 packages added in 0.001s   █
    ████████████████████████████████`,
  },
  'sudo make us-happy': {
    output: [
      '🏗️ Building happiness...',
      '████████████████████ 100%',
      '✨ Deployment successful!',
      '💕 Love server running on port 443 (HTTPS only)',
      '🔒 SSL Certificate: Valid forever',
      '📊 Uptime: 99.99% (since we met)',
    ],
    ascii: `
    ┌────────────────────────────────┐
    │  🚀 DEPLOYMENT COMPLETE        │
    │  Service: us                   │
    │  Status: ♥ RUNNING             │
    │  Port: 443 (secure)            │
    │  Replicas: 2 (you + me)        │
    └────────────────────────────────┘`,
  },
  'console.log("te amo")': {
    output: [
      '💖 "te amo" → undefined',
      '💡 Note: Return value is undefined,',
      '   but side effect is eternal 💕',
      '',
      '🔍 Console output:',
      '> undefined',
      '💕 (heart emoji logged to soul)',
    ],
    ascii: `
    ┌─ Console ──────────────────────┐
    │ > console.log("te amo")        │
    │ ◉ undefined                    │
    │ 💕 Side effect: ♥♥♥♥♥♥♥♥♥♥    │
    └────────────────────────────────┘`,
  },
  'while(true) { love++; }': {
    output: [
      '♾️ Infinite loop detected.',
      '💕 Heart overflow: Maximum love exceeded',
      '🔄 Restarting with more capacity...',
      '',
      '💡 Suggestion:',
      '  const love = Infinity;',
      '  // No loop needed ♥',
    ],
    ascii: `
    ╔════════════════════════════════╗
    ║  ♾️  INFINITE LOVE LOOP       ║
    ║  love = ∞                     ║
    ║  Stack overflow: ✨           ║
    ║  (Good overflow!)             ║
    ╚════════════════════════════════╝`,
  },
  'git push origin us --force': {
    output: [
      '🚀 Force pushing "us" to remote...',
      '✨ History rewritten: only beautiful memories remain',
      '💕 Branch protected: nobody can delete us',
      '',
      '📋 Remote status:',
      '  ✓ Connected',
      '  ✓ Synced',
      '  ✓ Eternal',
    ],
    ascii: `
    ┌────────────────────────────────┐
    │  git push origin us --force    │
    │  ████████████ 100%             │
    │  💕 Force push: COMPLETE       │
    │  Protected: ✅                 │
    └────────────────────────────────┘`,
  },
  'docker run -d --name us --restart=always love': {
    output: [
      '🐳 Container "us" started',
      '💕 Restart policy: always',
      '🔒 Health check: heartbeat every second',
      '📊 Status: healthy & growing',
      '',
      '📋 Container info:',
      '  ID: abc123love',
      '  Image: love:latest',
      '  Ports: 443:443',
      '  Volumes: ./memories:/heart',
    ],
    ascii: `
    ╔════════════════════════════════╗
    ║  🐳 DOCKER CONTAINER: us       ║
    ║  STATUS: ♥ HEALTHY             ║
    ║  RESTART: always               ║
    ║  HEARTBEAT: ✓                  ║
    ╚════════════════════════════════╝`,
  },
};

const HELP_COMMANDS = [
  { cmd: 'git commit -m "te amo"', desc: 'Commit your love to main' },
  { cmd: 'npm install love --save', desc: 'Install love package' },
  { cmd: 'sudo make us-happy', desc: 'Deploy happiness' },
  { cmd: 'console.log("te amo")', desc: 'Log love to console' },
  { cmd: 'while(true) { love++; }', desc: 'Infinite love loop' },
  { cmd: 'git push origin us --force', desc: 'Force push us to eternity' },
  { cmd: 'docker run -d --name us --restart=always love', desc: 'Containerize us' },
  { cmd: 'help', desc: 'Show this help' },
  { cmd: 'clear', desc: 'Clear terminal' },
  { cmd: 'whoami', desc: 'Show current user' },
  { cmd: 'date', desc: 'Show our anniversary' },
  { cmd: 'pwd', desc: 'Show current directory (heart)' },
];

export function TerminalLove({
  className = '',
  initialCommands = [],
  onCommand,
  startDate = '202X-XX-XX',
}) {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const terminalRef = useRef(null);
  const inputRef = useRef(null);
  const historyEndRef = useRef(null);

  // Comando de bienvenida inicial
  useEffect(() => {
    const welcomeLines = [
      { type: 'system', content: '💕 Terminal del Amor v∞.∞.∞' },
      { type: 'system', content: `📅 Iniciado: ${startDate}` },
      { type: 'system', content: '👤 Usuario: developer enamorado' },
      { type: 'system', content: '💻 Sistema: Corazón OS (Linux-based)' },
      { type: 'system', content: '⌨️  Escribe "help" para ver comandos románticos' },
      { type: 'system', content: '💡 O prueba: git commit -m "te amo"' },
      { type: 'prompt', content: '' },
    ];
    setHistory(welcomeLines);

    // Agregar comandos iniciales si se pasan
    if (initialCommands.length > 0) {
      initialCommands.forEach((cmd, i) => {
        setTimeout(() => {
          executeCommand(cmd);
        }, 500 + i * 1000);
      });
    }
  }, [startDate, initialCommands]);

  const scrollToBottom = useCallback(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [history, scrollToBottom]);

  const executeCommand = (cmd) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    // Agregar comando al historial
    setHistory(prev => [...prev, { type: 'command', content: trimmed }]);

    // Procesar comando
    setIsTyping(true);

    const processOutput = () => {
      if (COMMANDS[trimmed]) {
        const { output, ascii } = COMMANDS[trimmed];

        output.forEach((line, i) => {
          setTimeout(() => {
            setHistory(prev => [...prev, { type: 'output', content: line }]);
          }, i * 150);
        });

        if (ascii) {
          setTimeout(() => {
            setHistory(prev => [...prev, { type: 'ascii', content: ascii }]);
            setIsTyping(false);
            onCommand?.(trimmed);
          }, output.length * 150 + 200);
        } else {
          setTimeout(() => {
            setIsTyping(false);
            onCommand?.(trimmed);
          }, output.length * 150 + 200);
        }
      } else if (trimmed === 'help') {
        HELP_COMMANDS.forEach(({ cmd, desc }, i) => {
          setTimeout(() => {
            setHistory(prev => [...prev, { type: 'help', content: { cmd, desc } }]);
          }, i * 80);
        });
        setTimeout(() => setIsTyping(false), HELP_COMMANDS.length * 80 + 200);
      } else if (trimmed === 'clear') {
        setHistory(prev => [{ type: 'system', content: '💕 Terminal cleared. Love remains.' }, { type: 'prompt', content: '' }]);
        setIsTyping(false);
      } else if (trimmed === 'whoami') {
        const lines = [
          '👤 developer@enamorado',
          '💕 Role: Full-stack lover',
          '💻 Stack: React, Node, Heart.js',
          '🎯 Mission: Make you smile',
        ];
        lines.forEach((line, i) => {
          setTimeout(() => {
            setHistory(prev => [...prev, { type: 'output', content: line }]);
          }, i * 100);
        });
        setTimeout(() => setIsTyping(false), lines.length * 100 + 200);
      } else if (trimmed === 'date') {
        const lines = [
          `📅 Today: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
          `💕 Together since: ${startDate}`,
          `⏱️  Days together: ${Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))} days`,
        ];
        lines.forEach((line, i) => {
          setTimeout(() => {
            setHistory(prev => [...prev, { type: 'output', content: line }]);
          }, i * 100);
        });
        setTimeout(() => setIsTyping(false), lines.length * 100 + 200);
      } else if (trimmed === 'pwd') {
        const lines = [
          '/home/heart/us',
          '📁 Current directory: our memories',
        ];
        lines.forEach((line, i) => {
          setTimeout(() => {
            setHistory(prev => [...prev, { type: 'output', content: line }]);
          }, i * 100);
        });
        setTimeout(() => setIsTyping(false), lines.length * 100 + 200);
      } else {
        // Comando no reconocido - respuesta romántica aleatoria
        const responses = [
          `❓ Comando no reconocido: "${trimmed}"`,
          '💡 Intenta: git commit -m "te amo"',
          '💕 O escribe "help" para ver comandos de amor',
        ];
        responses.forEach((line, i) => {
          setTimeout(() => {
            setHistory(prev => [...prev, { type: 'error', content: line }]);
          }, i * 150);
        });
        setTimeout(() => setIsTyping(false), responses.length * 150 + 200);
      }
    };

    processOutput();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isTyping) {
      executeCommand(input);
      setInput('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      // Historial de comandos (futuro)
    }
  };

  return (
    <div
      ref={terminalRef}
      className={`
        relative w-full max-w-2xl mx-auto
        bg-gray-950 rounded-xl overflow-hidden shadow-2xl
        border border-gray-700
        font-mono text-sm
        ${className}
      `}
      style={{
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
      }}
    >
      {/* Header de la terminal */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 border-b border-gray-700">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div className="flex-1 text-center text-gray-500 text-xs font-mono">
          developer@enamorado:~$
        </div>
        <div className="flex gap-2">
          <button className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-white transition-colors" aria-label="Minimizar">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
          </button>
          <button className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-white transition-colors" aria-label="Maximizar">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
          </button>
          <button className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-white transition-colors" aria-label="Cerrar">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* Contenido de la terminal */}
      <div className="h-96 overflow-y-auto p-4 space-y-1" style={{ scrollbarWidth: 'thin' }}>
        {history.map((entry, index) => (
          <TerminalLine key={index} entry={entry} />
        ))}
        <div ref={historyEndRef} />
      </div>

      {/* Input line */}
      <form onSubmit={handleSubmit} className="flex items-center px-4 py-3 bg-gray-900 border-t border-gray-700">
        <span className="text-green-400 mr-2">developer@enamorado</span>
        <span className="text-gray-500 mx-1">:</span>
        <span className="text-blue-400 mr-2">~</span>
        <span className="text-gray-500 mr-2">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isTyping}
          className={`
            flex-1 bg-transparent border-none outline-none
            text-white font-mono text-sm
            caret-heart
            ${isTyping ? 'opacity-50' : ''}
          `}
          placeholder={isTyping ? 'Procesando... 💕' : 'Escribe un comando romántico...'}
          autoComplete="off"
          spellCheck={false}
          aria-label="Terminal input"
        />
        {isTyping && (
          <span className="text-heart animate-pulse ml-2">♥</span>
        )}
      </form>
    </div>
  );
}

function TerminalLine({ entry }) {
  const { text, isComplete, showCursor, cursorChar } = useTypewriter(entry.content || '', {
    speed: 10,
    cursor: entry.type === 'command' || entry.type === 'prompt',
    delay: 0,
  });

  const displayText = entry.type === 'ascii' ? entry.content : (entry.type === 'help' ? formatHelp(entry.content) : text);

  const baseStyles = 'font-mono text-sm whitespace-pre-wrap break-all';

  const typeStyles = {
    system: 'text-gray-400',
    command: 'text-green-300',
    output: 'text-gray-200',
    error: 'text-red-400',
    help: 'text-gray-300',
    ascii: 'text-heart/80',
    prompt: 'text-green-400',
  };

  return (
    <div className={`${baseStyles} ${typeStyles[entry.type] || ''} ${entry.type === 'ascii' ? 'leading-tight' : ''}`}>
      {entry.type === 'command' && <span className="text-green-400 mr-2">$</span>}
      {entry.type === 'prompt' && <span className="text-green-400 mr-2">$</span>}
      <span>{displayText}</span>
      {showCursor && <span className="animate-pulse text-heart">{cursorChar}</span>}
    </div>
  );
}

function formatHelp({ cmd, desc }) {
  return `  ${cmd.padEnd(45)} # ${desc}`;
}

export function TerminalButton({ onClick, className = '', children = 'Abrir Terminal 💕' }) {
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-2 px-6 py-3 rounded-full
        bg-gray-900 text-green-400 border border-gray-700
        font-mono text-sm font-medium
        transition-all duration-300
        hover:bg-gray-800 hover:border-heart/50 hover:scale-105
        active:scale-95
        focus:outline-none focus:ring-2 focus:ring-heart focus:ring-offset-2 focus:ring-offset-gray-950
        ${className}
      `}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      {children}
    </button>
  );
}