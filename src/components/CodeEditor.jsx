import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import axios from "axios";
import { Container, Button, Form, Spinner, Alert, Tabs, Tab } from "react-bootstrap";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/global.css";
import ChatBot from "./ChatBot";

function CodeEditor() {
  const [code, setCode] = useState(`// C++ code here\n#include <iostream>\nint main() {\n  std::cout << "Hello, World!" << std::endl;\n  return 0;\n}`);
  const [language, setLanguage] = useState("cpp");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
  };

  const runCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post("http://localhost:5000/run", { code, language });
      setOutput(response.data.output);
    } catch (err) {
      setError(err.response?.data?.error || "Error running code");
      setOutput(err.response?.data?.output || "");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="code-editor-container">
      <PanelGroup direction="horizontal" className="panel-group">
        <Panel defaultSize={60} minSize={30} maxSize={80}>
          <div className="editor-container">
            <div className="d-flex justify-content-between align-items-center p-2 bg-dark text-white">
              <h5 className="m-0">Code</h5>
              <Form.Group className="m-0" style={{ width: "120px" }}>
                <Form.Select size="sm" value={language} onChange={handleLanguageChange}>
                  <option value="cpp">C++</option>
                  <option value="java">Java</option>
                </Form.Select>
              </Form.Group>
            </div>
            <Editor
              height="calc(100% - 40px)"
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

export default CodeEditor;
