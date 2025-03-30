import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { exec } from 'child_process';
import fs from 'fs';
import tmp from 'tmp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

app.post('/run', (req, res) => {
  const { code, language } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Code cannot be empty' });
  }
  
  if (language === 'cpp') {
    runCpp(code, res);
  } else if (language === 'java') {
    runJava(code, res);
  } else {
    res.status(400).json({ error: 'Unsupported language' });
  }
});

function runCpp(code, res) {
  // Create temporary directory
  tmp.dir({ unsafeCleanup: true }, (err, tmpDir, cleanupCallback) => {
    if (err) {
      return res.status(500).json({ error: 'Server error', output: err.message });
    }
    
    const srcFile = path.join(tmpDir, 'main.cpp');
    const exeFile = path.join(tmpDir, 'main.exe');
    
    // Write code to file
    fs.writeFile(srcFile, code, (err) => {
      if (err) {
        cleanupCallback();
        return res.status(500).json({ error: 'Server error', output: err.message });
      }
      
      // Compile the code
      exec(`g++ "${srcFile}" -o "${exeFile}"`, (compileErr, compileStdout, compileStderr) => {
        if (compileErr) {
          cleanupCallback();
          return res.status(400).json({ error: 'Compilation error', output: compileStderr });
        }
        
        // Run the executable
        exec(`"${exeFile}"`, { timeout: 10000 }, (runErr, runStdout, runStderr) => {
          cleanupCallback();
          
          if (runErr) {
            return res.status(400).json({ error: 'Runtime error', output: runStderr });
          }
          
          return res.json({ output: runStdout });
        });
      });
    });
  });
}

function runJava(code, res) {
  // Create temporary directory
  tmp.dir({ unsafeCleanup: true }, (err, tmpDir, cleanupCallback) => {
    if (err) {
      return res.status(500).json({ error: 'Server error', output: err.message });
    }
    
    // Extract class name (required for Java)
    const classNameMatch = code.match(/public\s+class\s+(\w+)/);
    if (!classNameMatch) {
      cleanupCallback();
      return res.status(400).json({ 
        error: 'Syntax error', 
        output: 'Could not find a public class name in your Java code' 
      });
    }
    
    const className = classNameMatch[1];
    const srcFile = path.join(tmpDir, `${className}.java`);
    
    // Write code to file
    fs.writeFile(srcFile, code, (err) => {
      if (err) {
        cleanupCallback();
        return res.status(500).json({ error: 'Server error', output: err.message });
      }
      
      // Compile the code
      exec(`javac "${srcFile}"`, (compileErr, compileStdout, compileStderr) => {
        if (compileErr) {
          cleanupCallback();
          return res.status(400).json({ error: 'Compilation error', output: compileStderr });
        }
        
        // Run the Java class
        exec(`java -cp "${tmpDir}" ${className}`, { timeout: 10000 }, (runErr, runStdout, runStderr) => {
          cleanupCallback();
          
          if (runErr) {
            return res.status(400).json({ error: 'Runtime error', output: runStderr });
          }
          
          return res.json({ output: runStdout });
        });
      });
    });
  });
}

app.listen(PORT, () => {
  console.log(`Code execution server running on port ${PORT}`);
  console.log(`Make sure you have g++ and JDK installed for code execution`);
  console.log(`Start the frontend with 'npm run dev' in a separate terminal`);
});