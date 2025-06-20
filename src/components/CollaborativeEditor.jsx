import React, { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { Container, Button, Form, Spinner, Alert, Tabs, Tab, Dropdown } from "react-bootstrap";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/global.css";
import ChatBot from "./ChatBot";
import { FaComments } from "react-icons/fa";
import Modal from "react-bootstrap/Modal";

// Judge0 language mapping
const JUDGE0_LANGUAGES = [
  { id: 54, value: "cpp", label: "C++ (GCC 9.2.0)" },
  { id: 62, value: "java", label: "Java (OpenJDK 13.0.1)" },
  { id: 71, value: "python", label: "Python (3.8.1)" },
  { id: 63, value: "javascript", label: "JavaScript (Node.js 12.14.0)" },
  { id: 50, value: "c", label: "C (GCC 9.2.0)" },
  { id: 51, value: "pascal", label: "Pascal (FPC 3.0.4)" },
  { id: 68, value: "php", label: "PHP (7.4.1)" },
  { id: 70, value: "python2", label: "Python2 (2.7.17)" },
  { id: 72, value: "ruby", label: "Ruby (2.7.0)" },
  { id: 73, value: "rust", label: "Rust (1.40.0)" },
  { id: 74, value: "typescript", label: "TypeScript (3.7.4)" },
  { id: 60, value: "go", label: "Go (1.13.5)" },
  { id: 61, value: "haskell", label: "Haskell (GHC 8.6.5)" },
  { id: 65, value: "perl", label: "Perl (5.28.1)" },
  { id: 67, value: "python3", label: "Python3 (3.8.1)" },
  // Add more as needed
];

const DEFAULT_CODE = {
  cpp: `#include <iostream>

int main() {
    int num1, num2, sum;
    std::cout << "Enter first number: " << std::endl;
    std::cin >> num1;
    std::cout << "Enter second number: " << std::endl;
    std::cin >> num2;
    sum = num1 + num2;
    std::cout << "The sum of the two numbers is: " << sum << std::endl;
    return 0;
}`,
  java: `// Java code here\npublic class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, World!");\n  }\n}`,
  python: `# Python code here\nprint("Hello, World!")`,
  javascript: `// JavaScript code here\nconsole.log("Hello, World!");`,
  c: `// C code here\n#include <stdio.h>\nint main() {\n  printf("Hello, World!\\n");\n  return 0;\n}`,
  typescript: `// TypeScript code here\nconsole.log("Hello, World!");`,
  go: `// Go code here\npackage main\nimport "fmt"\nfunc main() {\n  fmt.Println("Hello, World!")\n}`,
  ruby: `# Ruby code here\nputs "Hello, World!"`,
  rust: `// Rust code here\nfn main() {\n  println!("Hello, World!");\n}`,
  php: `<?php\necho "Hello, World!";\n?>`,
  haskell: `-- Haskell code here\nmain = putStrLn "Hello, World!"`,
  perl: `# Perl code here\nprint "Hello, World!\\n";`,
  pascal: `// Pascal code here\nprogram Hello;\nbegin\n  writeln('Hello, World!');\nend.`,
  python2: `# Python2 code here\nprint "Hello, World!"`,
  python3: `# Python3 code here\nprint("Hello, World!")`,
};

const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: undefined,
    height: undefined,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
};

function CollaborativeEditor() {
  const [code, setCode] = useState(DEFAULT_CODE.cpp);
  const [language, setLanguage] = useState("cpp");
  const [output, setOutput] = useState("");
  const [stdin, setStdin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { width } = useWindowSize();
  const isMobile = width !== undefined && width <= 768;

  const handleLanguageChange = (selectedLanguage) => {
    setLanguage(selectedLanguage);
    setCode(DEFAULT_CODE[selectedLanguage] || "");
  };

  const runCode = async () => {
    setLoading(true);
    setError(null);
    setOutput("");
    try {
      // Find Judge0 language id
      const langObj = JUDGE0_LANGUAGES.find((l) => l.value === language);
      if (!langObj) throw new Error("Unsupported language");
      const response = await fetch("https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": import.meta.env.PUBLIC_JUDGE0_API_KEY,
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com"
        },
        body: JSON.stringify({
          source_code: code,
          language_id: langObj.id,
          stdin: stdin,
        }),
      });
      const data = await response.json();
      if (data.stderr) {
        setOutput(data.stderr);
      } else if (data.compile_output) {
        setOutput(data.compile_output);
      } else {
        setOutput(data.stdout || "");
      }
    } catch (err) {
      setError(err.message || "Error running code");
    } finally {
      setLoading(false);
    }
  };

  // Handler to set code from chat bot
  const setCodeFromChat = (codeFromBot) => {
    setCode(codeFromBot);
  };

  const editorPanel = (
    <Editor
      height={isMobile ? "calc(100vh - 250px)" : "100%"}
      language={language}
      theme="vs-dark"
      value={code}
      options={{
        selectOnLineNumbers: true,
        minimap: { enabled: false },
        fontSize: 14,
        renderLineHighlight: 'none',
      }}
      onChange={setCode}
    />
  );

  const outputPanel = (
    <div className="output-container">
      <div className="output-header">
        <h5>Output</h5>
        <Button className="run-btn" onClick={runCode} disabled={loading}>
          {loading ? <Spinner size="sm" animation="border" /> : "Run"}
        </Button>
      </div>
      {error && <Alert variant="danger">{error}</Alert>}
      <div className="output-window">
        <pre className="output-text">{output}</pre>
      </div>
      <div className="input-container">
        <Form.Label className="stdin-label">Input (stdin)</Form.Label>
        <Form.Control
          as="textarea"
          rows={3}
          placeholder="Provide all necessary input here before running the code. For multiple inputs, place each on a new line."
          value={stdin}
          onChange={(e) => setStdin(e.target.value)}
          className="stdin-input"
        />
      </div>
    </div>
  );

  const chatPanel = (
    <div className="chatbot-container">
      <ChatBot onCodeInsert={setCodeFromChat} />
    </div>
  );

  return (
    <Container fluid className="code-editor-container">
      <div className="editor-header">
        <div className="editor-title">
          <h2 style={{ margin: 0, color: 'var(--accent-color)' }}>AstroCodePad</h2>
          <div style={{ fontSize: '1.05rem', color: 'var(--text-muted)', marginTop: 2 }}>
            The modern, mobile-friendly code editor & runner for all your languages. Powered by Judge0 & Astro.
          </div>
        </div>
        <div className="editor-controls">
          <Dropdown onSelect={handleLanguageChange} className="language-selector-dropdown">
            <Dropdown.Toggle variant="secondary" id="language-dropdown">
              {JUDGE0_LANGUAGES.find(l => l.value === language)?.label || 'Select Language'}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {JUDGE0_LANGUAGES.map((lang) => (
                <Dropdown.Item key={lang.value} eventKey={lang.value}>{lang.label}</Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>
      
      {isMobile ? (
        <Tabs defaultActiveKey="editor" id="main-tabs" className="custom-tabs" fill>
          <Tab eventKey="editor" title="Editor">
            <div className="tab-content-wrapper editor-tab">
              {editorPanel}
            </div>
          </Tab>
          <Tab eventKey="output" title="Output">
            <div className="tab-content-wrapper">
              {outputPanel}
            </div>
          </Tab>
          <Tab eventKey="chat" title="Chat">
            <div className="tab-content-wrapper">
              {chatPanel}
            </div>
          </Tab>
        </Tabs>
      ) : (
        <PanelGroup direction="horizontal" className="panel-group main-panel-group">
          <Panel defaultSize={60} minSize={20}>
            {editorPanel}
          </Panel>
          <PanelResizeHandle className="resize-handle" />
          <Panel defaultSize={40} minSize={20}>
            <PanelGroup direction="vertical">
              <Panel defaultSize={50} minSize={20}>
                {outputPanel}
              </Panel>
              <PanelResizeHandle className="resize-handle" />
              <Panel defaultSize={50} minSize={20}>
                {chatPanel}
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      )}
    </Container>
  );
}

export default CollaborativeEditor; 