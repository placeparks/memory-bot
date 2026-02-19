/**
 * Simple HTTP server that wraps OpenClaw CLI commands
 * This runs INSIDE the OpenClaw container alongside OpenClaw
 */

const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PAIRING_API_PORT || 18800;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'openclaw-pairing-api' });
});

// List pending pairing requests
app.get('/pairing/list/:channel', async (req, res) => {
  const { channel } = req.params;

  try {
    const { stdout, stderr } = await execAsync(`openclaw pairing list ${channel}`);

    // Parse the output
    const lines = stdout.trim().split('\n').filter(line => line.trim());
    const requests = lines.map(line => {
      const match = line.match(/^(\S+)\s+-\s+user_id:(\d+)\s+-\s+expires:\s+(.+)$/);
      if (match) {
        return {
          code: match[1],
          userId: match[2],
          expires: match[3]
        };
      }
      return { raw: line };
    });

    res.json({
      success: true,
      channel,
      requests,
      raw: stdout
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stderr: error.stderr
    });
  }
});

// Approve pairing
app.post('/pairing/approve', async (req, res) => {
  const { channel, code } = req.body;

  if (!channel || !code) {
    return res.status(400).json({
      success: false,
      error: 'channel and code are required'
    });
  }

  try {
    const { stdout, stderr } = await execAsync(`openclaw pairing approve ${channel} ${code}`);

    res.json({
      success: true,
      message: 'Pairing approved successfully',
      output: stdout
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      output: error.stdout,
      stderr: error.stderr
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`OpenClaw Pairing API listening on port ${PORT}`);
});
