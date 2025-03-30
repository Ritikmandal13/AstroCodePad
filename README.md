# Astro Code Editor

A web-based code editor built with Astro and React that allows you to write, compile, and run C++ and Java code.

## Setup and Running the Application

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- C++ compiler (g++) for C++ code execution
- Java Development Kit (JDK) for Java code execution

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

### Running the Application

**Step 1: Start the backend server**

```bash
npm run server
```

This will start the backend server on port 5000, which handles code compilation and execution. The server uses ES modules (not CommonJS).

**Step 2: Start the Astro frontend**

In a new terminal:

```bash
npm run dev
```

This will start the Astro development server, typically on port 4321.

### Accessing the Application

Open your browser and navigate to:

```
http://localhost:4321
```

## Features

- Write and execute C++ and Java code
- Syntax highlighting
- Real-time compilation and execution
- Error reporting
- Responsive design

## Technology Stack

- Astro
- React
- Monaco Editor
- Bootstrap
- Express.js backend
- Node.js