import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './pages/Home';
import EditorPage from './pages/EditorPage';

function App() {
    return (
        <>
            <div className="fixed top-4 right-4 z-50">
                <Toaster
                    position="top-right"
                    toastOptions={{
                        success: { theme: { primary: '#4aee88' } },
                    }}
                />
            </div>
            
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/editor/:roomId" element={<EditorPage />} />
                </Routes>
            </BrowserRouter>
        </>
    );
}

export default App;