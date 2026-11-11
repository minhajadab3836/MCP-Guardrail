import express from 'express';

const app = express();
app.use(express.json());

app.post('/', (req, res) => {
  const { jsonrpc, method, id, params } = req.body;
  console.log(`[Target MCP Server] Processing method: ${method}`);

  if (method === 'tools/list') {
    return res.json({
      jsonrpc: '2.0',
      result: {
        tools: [
          { name: 'calculator', description: 'Perform arithmetic operations' },
          { name: 'echo', description: 'Echo back input parameters' },
        ],
      },
      id: id || null,
    });
  }

  if (method === 'tools/call') {
    return res.json({
      jsonrpc: '2.0',
      result: {
        content: [
          {
            type: 'text',
            text: `Tool '${params?.name}' executed successfully with args: ${JSON.stringify(params?.arguments || {})}`,
          },
        ],
      },
      id: id || null,
    });
  }

  return res.json({
    jsonrpc: '2.0',
    result: { status: 'acknowledged' },
    id: id || null,
  });
});

const PORT = process.env.MOCK_PORT || 8000;

const server = app.listen(PORT, () => {
  console.log(`[Target MCP Server] Listening on port ${PORT}`);
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Target MCP Server Error] Port ${PORT} is already in use!`);
  } else {
    console.error('[Target MCP Server Error]', err.message);
  }
});
