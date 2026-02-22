# WeCode - Real-time Collaborative Code Editor

WeCode is a powerful real-time collaborative code editor that enables developers to write, execute, and debug code together in a synchronized environment. It features instant code syncing and high-quality video/audio communication, making it perfect for pair programming, interviews, and remote teamwork.

## 🚀 Features

-   **Real-time Collaboration**: Code seamlessly with others using Socket.io for instant updates.
-   **Integrated Video & Audio Chat**: Crystal-clear voice and video calling powered by **LiveKit** (WebRTC). Includes screen sharing, mute controls, and a draggable interface.
-   **Multi-language Support**: Write and execute code in **JavaScript**, **Python**, **C++**, and **Java**.
-   **Secure Code Execution**: User code is executed safely inside isolated **Docker** containers.
-   **Instant Feedback**: View output and compilation errors immediately in the integrated terminal.
-   **Room-based Access**: Create or join private rooms to collaborate on specific projects.
-   **Modern UI**: A clean, dark-themed interface built with **React** and **Tailwind CSS**.

## 🛠️ Tech Stack

### Frontend
-   **React** (Vite) - Fast and modular UI library.
-   **Tailwind CSS** - Utility-first CSS framework for modern styling.
-   **CodeMirror** - Professional text editor component with syntax highlighting.
-   **LiveKit Client** - SDK for high-quality, scalable video & audio conferences.
-   **Socket.io Client** - Real-time bidirectional communication for code updates.
-   **React Hot Toast** - Elegant notification system.

### Backend
-   **Node.js & Express** - Robust server-side runtime and API framework.
-   **Socket.io** - WebSocket server for managing collaboration events.
-   **LiveKit Server SDK** - Handles video room management and secure token generation.
-   **Docker** - Container platform for executing untrusted user code in isolation.

## ⚙️ Installation & Setup

### Prerequisites
-   [Node.js](https://nodejs.org/) (v16 or higher)
-   [Docker](https://www.docker.com/) (Required for code execution)
-   [LiveKit Account](https://livekit.io/) (Required for video/audio features)

### 1. Clone the repository
```bash
git clone https://github.com/debangshumukherjee/wecode.git
cd wecode-colab
```

### 2. Backend Setup
Navigate to the backend directory and install dependencies:
```bash
cd backend
npm init -y
```

Create a `.env` file in the `backend` folder and add your credentials:
```env
PORT=5000
# Get these keys from your LiveKit Project Dashboard
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
```

Start the backend server:
```bash
npm run dev
# Server runs on http://localhost:5000
```
> **Note**: Ensure Docker is running strictly for the code execution feature. The project works without Docker, but "Run Code" will fail.

### 3. Frontend Setup
Navigate to the frontend directory and install dependencies:
```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` folder:
```env
VITE_BACKEND_URL=http://localhost:5000
# The WebSocket URL for your LiveKit project (e.g., wss://project-id.livekit.cloud)
VITE_LIVEKIT_URL=wss://your-project.livekit.cloud
```

Start the frontend development server:
```bash
npm run dev
# Application available at http://localhost:5173
```

## 🖥️ Usage

1.  Open the frontend application in your browser.
2.  Enter a unique **Room ID**, **Username**, and your **Email** (for avatar generation) to join.
3.  Share the Room ID with your peers.
4.  **Code Together**: Type in the editor and watch changes sync instantly.
5.  **Talk Together**: Use the draggable Video Dock to see and hear your teammates.
6.  **Run Code**: Click the "Run" button to compile and execute your code in a secure container.

## 🛡️ Security

Code execution is sandboxed using **Docker** containers.
-   Each run request spawns a temporary, isolated container.
-   Resource limits (CPU, Memory) are applied to prevent abuse.
-   Containers are automatically destroyed after execution.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

