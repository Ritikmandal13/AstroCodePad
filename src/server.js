import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Store active users and their cursors
const activeUsers = new Map();
const documentStates = new Map();
const codeVersions = new Map();

// Generate a unique session ID
const generateSessionId = () => {
  return crypto.randomBytes(4).toString('hex');
};

// Store session information
const sessions = new Map();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Add this helper function at the top
const isWindows = process.platform === 'win32';

// Create a new session
app.post('/api/sessions', (req, res) => {
  try {
    const sessionId = generateSessionId();
    const initialCode = req.body.initialCode || '';
    const username = req.body.username || 'Anonymous';
    
    sessions.set(sessionId, {
      id: sessionId,
      createdAt: new Date(),
      code: initialCode,
      versions: [{
        code: initialCode,
        timestamp: new Date(),
        author: username
      }]
    });

    // Initialize document state
    documentStates.set(sessionId, initialCode);
    
    res.json({ sessionId });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get session information
app.get('/api/sessions/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  const session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json(session);
});

// Save a new version of the code
app.post('/api/sessions/:sessionId/versions', (req, res) => {
  const sessionId = req.params.sessionId;
  const { code, author } = req.body;
  
  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  const version = {
    code,
    timestamp: new Date(),
    author
  };
  
  session.versions.push(version);
  session.code = code;
  
  res.json(version);
});

// Get all versions for a session
app.get('/api/sessions/:sessionId/versions', (req, res) => {
  const sessionId = req.params.sessionId;
  const session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json(session.versions);
});

// Restore a specific version
app.post('/api/sessions/:sessionId/restore', (req, res) => {
  const sessionId = req.params.sessionId;
  const { versionIndex } = req.body;
  
  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  if (versionIndex < 0 || versionIndex >= session.versions.length) {
    return res.status(400).json({ error: 'Invalid version index' });
  }
  
  const version = session.versions[versionIndex];
  session.code = version.code;
  
  // Broadcast the restored version to all connected clients
  io.to(sessionId).emit('code-restored', version);
  
  res.json(version);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user joining
  socket.on('join-document', ({ documentId, username }) => {
    try {
      if (!documentId) {
        throw new Error('Document ID is required');
      }

      // Create new session if it doesn't exist
      if (!sessions.has(documentId)) {
        sessions.set(documentId, {
          id: documentId,
          createdAt: new Date(),
          code: '',
          versions: [{
            code: '',
            timestamp: new Date(),
            author: username
          }]
        });
        documentStates.set(documentId, '');
      }

      socket.join(documentId);
      activeUsers.set(socket.id, { id: socket.id, username, documentId });
      
      // Send current document state to new user
      const currentState = documentStates.get(documentId) || '';
      socket.emit('document-state', currentState);
      
      // Broadcast updated user list to all users in the document
      const usersInDocument = Array.from(activeUsers.values())
        .filter(user => user.documentId === documentId);
      io.to(documentId).emit('users-update', usersInDocument);

      // Notify other users about new user joining
      socket.to(documentId).emit('user-joined', { username });

      console.log(`User ${username} joined document ${documentId}`);
    } catch (error) {
      console.error('Error joining document:', error);
      socket.emit('error', { message: 'Failed to join document' });
    }
  });

  // Handle cursor movement
  socket.on('cursor-move', (position) => {
    const user = activeUsers.get(socket.id);
    if (user) {
      io.to(user.documentId).emit('cursor-update', {
        userId: socket.id,
        username: user.username,
        position
      });
    }
  });

  // Handle text changes
  socket.on('text-change', ({ documentId, changes, author }) => {
    try {
      documentStates.set(documentId, changes);
      socket.to(documentId).emit('text-change', changes);
      
      // Save version
      const session = sessions.get(documentId);
      if (session) {
        const version = {
          code: changes,
          timestamp: new Date(),
          author
        };
        session.versions.push(version);
        session.code = changes;
      }
    } catch (error) {
      console.error('Error handling text change:', error);
    }
  });

  // Handle user disconnection
  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      activeUsers.delete(socket.id);
      const usersInDocument = Array.from(activeUsers.values())
        .filter(u => u.documentId === user.documentId);
      io.to(user.documentId).emit('users-update', usersInDocument);
      io.to(user.documentId).emit('user-left', { username: user.username });
    }
    console.log('User disconnected:', socket.id);
  });
});

// Create a dedicated directory for code execution
const CODE_DIR = '/tmp/code_execution';
if (!fs.existsSync(CODE_DIR)) {
  fs.mkdirSync(CODE_DIR, { recursive: true });
}

app.post('/run', (req, res) => {
  const { code, language } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Code cannot be empty' });
  }
  
  // Create a random execution ID for isolation
  const executionId = crypto.randomBytes(8).toString('hex');
  const executionDir = path.join(CODE_DIR, executionId);
  
  // Create directory for this execution
  fs.mkdirSync(executionDir, { recursive: true });
  
  if (language === 'cpp') {
    runCpp(code, executionDir, res);
  } else if (language === 'java') {
    runJava(code, executionDir, res);
  } else if (language === 'python') {
    runPython(code, executionDir, res);
  } else {
    // Clean up the directory if language is not supported
    try {
      fs.rmSync(executionDir, { recursive: true, force: true });
    } catch (err) {
      console.error('Error cleaning up directory:', err);
    }
    res.status(400).json({ error: 'Unsupported language' });
  }
});

function runCpp(code, dir, res) {
  const srcFile = path.join(dir, 'main.cpp');
  const exeFile = path.join(dir, isWindows ? 'main.exe' : 'main.out');
  
  // Write code to file
  fs.writeFile(srcFile, code, (err) => {
    if (err) {
      cleanupDir(dir);
      return res.status(500).json({ error: 'Server error', output: err.message });
    }
    
    // Compile with resource limits and security constraints
    const compileCmd = `g++ "${srcFile}" -o "${exeFile}" -Wall -std=c++17`;
    
    exec(compileCmd, { timeout: 5000 }, (compileErr, compileStdout, compileStderr) => {
      if (compileErr) {
        cleanupDir(dir);
        return res.status(400).json({ error: 'Compilation error', output: compileStderr });
      }
      
      // Run with resource limits
      const runCmd = isWindows ?
        `"${exeFile}"` :
        `timeout 3s "${exeFile}"`;
      
      exec(runCmd, { timeout: 5000 }, (runErr, runStdout, runStderr) => {
        cleanupDir(dir);
        
        if (runErr && runErr.killed) {
          return res.status(400).json({ 
            error: 'Execution timeout', 
            output: 'Your program took too long to execute (>3s)' 
          });
        } else if (runErr) {
          return res.status(400).json({ error: 'Runtime error', output: runStderr });
        }
        
        return res.json({ output: runStdout });
      });
    });
  });
}

function runJava(code, dir, res) {
  // Extract class name (required for Java)
  const classNameMatch = code.match(/public\s+class\s+(\w+)/);
  if (!classNameMatch) {
    cleanupDir(dir);
    return res.status(400).json({ 
      error: 'Syntax error', 
      output: 'Could not find a public class name in your Java code' 
    });
  }
  
  const className = classNameMatch[1];
  const srcFile = path.join(dir, `${className}.java`);
  
  // Write code to file
  fs.writeFile(srcFile, code, (err) => {
    if (err) {
      cleanupDir(dir);
      return res.status(500).json({ error: 'Server error', output: err.message });
    }
    
    // Compile with resource limits
    exec(`javac "${srcFile}"`, 
      { timeout: 5000 }, 
      (compileErr, compileStdout, compileStderr) => {
        if (compileErr) {
          cleanupDir(dir);
          return res.status(400).json({ error: 'Compilation error', output: compileStderr });
        }
        
        // Run with resource limits
        const timeoutCmd = isWindows ?
          `powershell -Command "$process = Start-Process -NoNewWindow -FilePath 'java' -ArgumentList '${className}' -WorkingDirectory '${dir}' -PassThru; Start-Sleep -Seconds 3; if (!$process.HasExited) { Stop-Process -Id $process.Id -Force; Write-Output 'Execution timeout' }"` :
          `cd "${dir}" && timeout 3s java ${className}`;
        
        exec(timeoutCmd, { timeout: 5000 }, (runErr, runStdout, runStderr) => {
          cleanupDir(dir);
          
          if (runErr && runErr.killed) {
            return res.status(400).json({ 
              error: 'Execution timeout', 
              output: 'Your program took too long to execute (>3s)' 
            });
          } else if (runErr) {
            return res.status(400).json({ error: 'Runtime error', output: runStderr });
          }
          
          return res.json({ output: runStdout });
        });
      }
    );
  });
}

async function runPython(code, dir, res) {
  const srcFile = path.join(dir, 'main.py');
  
  try {
    // Write code to file
    fs.writeFileSync(srcFile, code);
    
    // Execute the code
    const executeProcess = spawn('python3', [srcFile], { cwd: dir });
    
    const result = await new Promise((resolve, reject) => {
      let output = '';
      let error = '';
      
      executeProcess.stdout.on('data', (data) => output += data);
      executeProcess.stderr.on('data', (data) => error += data);
      
      executeProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Execution failed: ${error}`));
        } else {
          resolve(output);
        }
      });
    });

    // Clean up
    try {
      fs.unlinkSync(srcFile);
    } catch (err) {
      console.error('Error cleaning up files:', err);
    }

    res.json({ output: result });
  } catch (error) {
    cleanupDir(dir);
    res.status(500).json({ error: 'Server error', output: error.message });
  }
}

function cleanupDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (err) {
    console.error('Error cleaning up directory:', err);
  }
}

// Start the server
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});