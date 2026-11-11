import readline from 'readline';

const PROXY_URL = process.env.MCP_PROXY_URL || 'http://localhost:3000/';
const API_KEY = process.env.MCP_API_KEY || 'key_enterprise_999';

// Setup line reader for standard input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

/**
  Forwards JSON-RPC payload received from local AI client to Guardrail Proxy
 */
async function forwardToProxy(rawLine: string) {
  const trimmed = rawLine.trim();
  if (!trimmed) return;

  try {
    const payload = JSON.parse(trimmed);

    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const responseData = await res.json();
    
    // Output standard JSON-RPC string back to stdout for the LLM desktop app
    process.stdout.write(JSON.stringify(responseData) + '\n');
  } catch (err: any) {
    const errorResponse = {
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: `Bridge Transport Error: ${err.message}`,
      },
      id: null,
    };
    process.stdout.write(JSON.stringify(errorResponse) + '\n');
  }
}

rl.on('line', (line) => {
  forwardToProxy(line);
});

// Redirect log output to stderr to prevent corrupting stdout JSON streams
console.error(`[MCP Bridge] Bridge active. Routing stdio -> ${PROXY_URL}`);
