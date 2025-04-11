import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { io } from "socket.io-client";
import { Container, Button, Form, Spinner, Alert, Tabs, Tab } from "react-bootstrap";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/global.css";
import ChatBot from "./ChatBot";
import ActiveUsers from "./ActiveUsers";
import SessionManager from "./SessionManager";
import axios from "axios";

const socket = io("http://localhost:5000");

function CollaborativeEditor() {
  const [code, setCode] = useState(`// C++ code here\n#include <iostream>\nint main() {\n  std::cout << "Hello, World!" << std::endl;\n  return 0;\n}`);
  const [language, setLanguage] = useState("cpp");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState("");
  const [activeUsers, setActiveUsers] = useState([]);
  const [cursors, setCursors] = useState({});
  const [sessionId, setSessionId] = useState(null);
  const editorRef = useRef(null);
  const decorationsRef = useRef([]);

  useEffect(() => {
    // Check for session ID in URL
    const urlParams = new URLSearchParams(window.location.search);
    const sessionParam = urlParams.get('session');

    if (sessionParam) {
      // Join existing session
      setSessionId(sessionParam);
      loadSession(sessionParam);
    } else {
      // Create new session
      createNewSession();
    }

    // Prompt for username if not set
    if (!username) {
      const name = prompt("Please enter your name:");
      if (name) {
        setUsername(name);
      }
    }
  }, []);

  const createNewSession = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/sessions', {
        initialCode: code
      });
      setSessionId(response.data.sessionId);
      // Update URL with session ID
      window.history.pushState({}, '', `?session=${response.data.sessionId}`);
    } catch (err) {
      console.error('Failed to create session:', err);
      setError('Failed to create new session');
    }
  };

  const loadSession = async (sessionId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/sessions/${sessionId}`);
      setCode(response.data.code);
      if (username) {
        socket.emit("join-document", { documentId: sessionId, username });
      }
    } catch (err) {
      console.error('Failed to load session:', err);
      setError('Failed to load session');
    }
  };

  useEffect(() => {
    if (sessionId && username) {
      socket.emit("join-document", { documentId: sessionId, username });
    }
  }, [sessionId, username]);

  useEffect(() => {
    if (!socket) return;

    socket.on("document-state", (state) => {
      setCode(state);
    });

    socket.on("users-update", (users) => {
      setActiveUsers(users);
    });

    socket.on("cursor-update", ({ userId, username, position }) => {
      setCursors(prev => ({
        ...prev,
        [userId]: { username, position }
      }));
    });

    socket.on("text-change", (changes) => {
      setCode(changes);
    });

    socket.on("code-restored", (version) => {
      setCode(version.code);
    });

    return () => {
      socket.off("document-state");
      socket.off("users-update");
      socket.off("cursor-update");
      socket.off("text-change");
      socket.off("code-restored");
    };
  }, [socket]);

  // Update cursor decorations when cursors change
  useEffect(() => {
    if (editorRef.current) {
      updateCursorDecorations();
    }
  }, [cursors]);

  const updateCursorDecorations = () => {
    if (!editorRef.current) return;

    // Remove existing decorations
    if (decorationsRef.current.length > 0) {
      editorRef.current.deltaDecorations(decorationsRef.current, []);
      decorationsRef.current = [];
    }

    // Create new decorations for each cursor
    const newDecorations = Object.entries(cursors).map(([userId, { username, position }]) => {
      // Skip current user's cursor
      if (userId === socket.id) return null;

      // Create cursor decoration
      const decoration = {
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column + 1,
        },
        options: {
          className: 'cursor-decoration',
          hoverMessage: { value: username },
          zIndex: 100,
        },
      };

      // Create label decoration
      const labelDecoration = {
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        },
        options: {
          after: {
            content: username,
            inlineClassName: 'cursor-label',
          },
          zIndex: 100,
        },
      };

      return [decoration, labelDecoration];
    }).filter(Boolean).flat();

    // Apply new decorations
    if (newDecorations.length > 0) {
      decorationsRef.current = editorRef.current.deltaDecorations([], newDecorations);
    }
  };

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
    
    // Add cursor decorations
    editor.onDidChangeCursorPosition((e) => {
      const position = e.position;
      socket.emit("cursor-move", position);
    });
  };

  const handleLanguageChange = (e) => {
    const selectedLanguage = e.target.value;
    setLanguage(selectedLanguage);
    setCode(
      selectedLanguage === "cpp"
        ? `// C++ code here\n#include <iostream>\nint main() {\n  std::cout << "Hello, World!" << std::endl;\n  return 0;\n}`
        : `// Java code here\npublic class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, World!");\n  }\n}`
    );
  };

  const handleCodeChange = (newValue) => {
    setCode(newValue);
    if (sessionId) {
      socket.emit("text-change", { 
        documentId: sessionId, 
        changes: newValue,
        author: username
      });
    }
  };

  const runCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:5000/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, language }),
      });
      const data = await response.json();
      setOutput(data.output);
    } catch (err) {
      console.error("Code execution error:", err);
      setError(err.response?.data?.error || "Error running code");
      setOutput(err.response?.data?.output || "Failed to connect to code execution service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="code-editor-container">
      <div className="editor-header">
        <div className="editor-title">
          <h4>Collaborative Code Editor</h4>
        </div>
        <div className="editor-controls">
          <ActiveUsers users={activeUsers} />
          <SessionManager 
            sessionId={sessionId} 
            onSessionChange={setCode}
            username={username}
          />
          <Form.Group className="language-selector">
            <Form.Select size="sm" value={language} onChange={handleLanguageChange}>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
            </Form.Select>
          </Form.Group>
        </div>
      </div>
      
      <PanelGroup direction="horizontal" className="panel-group">
        <Panel defaultSize={60} minSize={30} maxSize={80}>
          <div className="editor-container">
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              value={code}
              options={{
                selectOnLineNumbers: true,
                minimap: { enabled: false },
                fontSize: 14,
                renderLineHighlight: 'none',
              }}
              onChange={handleCodeChange}
              onMount={handleEditorDidMount}
            />
          </div>
        </Panel>

        <PanelResizeHandle className="resize-handle" />

        <Panel defaultSize={40} minSize={20}>
          <div className="output-container">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="m-0">Output</h5>
              <Button 
                variant="success" 
                onClick={runCode} 
                disabled={loading} 
                className="run-btn"
                size="sm"
              >
                {loading ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                    <span className="ms-2">Running...</span>
                  </>
                ) : (
                  "▶ Run Code"
                )}
              </Button>
            </div>

            {error && (
              <Alert variant="danger" className="mb-3 py-2">
                <small>{error}</small>
              </Alert>
            )}

            <Tabs defaultActiveKey="output" id="output-tabs" className="mb-0 custom-tabs">
              <Tab eventKey="output" title="Program Output">
                <div className="tab-content-wrapper">
                  <pre className="output-text">{output || "Your code output will appear here..."}</pre>
                </div>
              </Tab>
              <Tab eventKey="chat" title="AI Assistant">
                <div className="tab-content-wrapper">
                  <ChatBot />
                </div>
              </Tab>
            </Tabs>
          </div>
        </Panel>
      </PanelGroup>
    </Container>
  );
}

export default CollaborativeEditor; 