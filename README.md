# WeCode - Real-time Collaborative Code Editor

WeCode is a real-time collaborative code editor that allows developers to write, execute, and debug code together in the same environment. It supports multiple programming languages and provides a seamless coding experience with instant synchronization.

## 🚀 Features

-   **Real-time Collaboration**: Code comfortably with friends or colleagues in real-time using Socket.io.
-   **Integrated Video & Audio Chat**: Communicate seamlessly with your team via built-in video and voice calling. Includes mute/video-off controls and a draggable interface.
-   **Multi-language Support**: Write and execute code in JavaScript, Python, C++, and Java.
-   **Secure Code Execution**: User code runs inside isolated Docker containers to ensure security and stability.
-   **Instant Feedback**: View output and compilation errors instantly in the built-in terminal.
-   **Room-based Access**: Create or join unique rooms to collaborate on specific projects.
-   **Responsive Design**: Built with Tailwind CSS for a clean and modern user interface.

## 🛠️ Tech Stack

### Frontend
-   **React** (Vite) - Fast and modern UI library.
-   **Tailwind CSS** - Utility-first CSS framework for styling.
-   **CodeMirror** - Versatile text editor component.
-   **Socket.io Client** - Real-time bidirectional event-based communication.
-   **WebRTC** - Peer-to-peer real-time communication for video/audio.
-   **React Router** - Client-side routing.
-   **React Hot Toast** - Elegant toast notifications.

### Backend
-   **Node.js & Express** - Scalable server-side runtime and framework.
-   **Socket.io** - Enables real-time, bi-directional communication.
-   **Docker** - Containerization for secure code execution.

## ⚙️ Installation & Setup

### Prerequisites
-   [Node.js](https://nodejs.org/) (v16 or higher)
-   [Docker](https://www.docker.com/) (Required for code execution features)

### 1. Clone the repository
```bash
git clone https://github.com/debangshumukherjee/wecode-colab.git
cd wecode-colab
```

### 2. Backend Setup
Navigate to the backend directory and install dependencies:
```bash
cd backend
npm init -y
```

Start the backend server:
```bash
npm run dev
# Server runs on http://localhost:5000 by default
```

> **Note**: Ensure Docker is running on your machine for the code execution feature to work.

### 3. Frontend Setup
Open a new terminal, navigate to the frontend directory, and install dependencies:
```bash
cd frontend
npm install
```

Start the frontend development server:
```bash
npm run dev
# Application usually runs on http://localhost:5173
```

## 🔧 Environment Variables

### Frontend
Create a `.env` file in the `frontend` folder (optional if running locally on default ports):
```env
VITE_BACKEND_URL=http://localhost:5000
```

### Backend
You can configure the port in the `server.js` or via environment variables:
```env
PORT=5000
```

## 🖥️ Usage

1.  Open the frontend URL in your browser.
2.  Enter a **Room ID** and your **Username** to join or create a room.
3.  Share the Room ID with collaborators.
4.  Write code in the editor, and see changes update instantly on all connected clients.
5.  Use the **Video Dock** to collaborate face-to-face.
6.  Click **Run** to execute the code and view the output.

## 🛡️ Security

Code execution is handled via **Docker** containers. Each execution request spins up a temporary container with resource limits (CPU, Memory) and mounts the code as a volume. The container is removed immediately after execution to prevent resource leaks and ensure isolation.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

