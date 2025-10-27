
import React, { useState, useEffect, useCallback, createContext } from 'react';
import { HashRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { EditorView } from './components/EditorView';
import { ClientView, PublishedProjectView } from './components/ClientView';
import { getProjects, getAssets, initializeData } from './services/storageService';
import type { Project, Asset } from './types';

// --- Helper Components ---

interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error';
}

const Toast: React.FC<ToastMessage & { onDismiss: (id: number) => void }> = ({ id, message, type, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';

  return (
    <div className={`w-full max-w-sm rounded-md shadow-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden ${bgColor}`}>
      <div className="p-4">
        <p className="text-sm font-medium text-white">{message}</p>
      </div>
    </div>
  );
};

// --- App Context ---

export const AppContext = createContext<{
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  addToast: (message: string, type: 'success' | 'error') => void;
}>({
  projects: [],
  setProjects: () => {},
  assets: [],
  setAssets: () => {},
  addToast: () => {},
});

// --- Main App Component ---

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    initializeData();
    setProjects(getProjects());
    setAssets(getAssets());
  }, []);

  const addToast = useCallback((message: string, type: 'success' | 'error' = 'error') => {
    setToasts((currentToasts) => [
      ...currentToasts,
      { id: Date.now(), message, type },
    ]);
  }, []);

  const dismissToast = (id: number) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would be a secure authentication check.
    if (password === 'password') {
      setIsAuthenticated(true);
      addToast('Login successful!', 'success');
    } else {
      addToast('Incorrect password. The password is "password".', 'error');
    }
  };

  const EditorWrapper: React.FC = () => {
    if (!isAuthenticated) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-900">
          <div className="bg-gray-800 p-8 rounded-lg shadow-lg text-center w-full max-w-sm">
            <h1 className="text-2xl font-bold mb-4 text-white">Editor Login</h1>
            <p className="text-gray-400 mb-6">Enter password to access the studio. (Hint: password)</p>
            <form onSubmit={handleLogin}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-md px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Password"
              />
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
              >
                Login
              </button>
            </form>
          </div>
        </div>
      );
    }
    return <EditorView />;
  };
  
  return (
    <AppContext.Provider value={{ projects, setProjects, assets, setAssets, addToast }}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<ClientView />} />
          <Route path="/project/:projectId" element={<PublishedProjectView />} />
          <Route path="/editor" element={<EditorWrapper />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </HashRouter>

      {/* Toast Container */}
      <div className="fixed bottom-0 right-0 p-4 space-y-2 w-full max-w-sm">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onDismiss={dismissToast} />
        ))}
      </div>
    </AppContext.Provider>
  );
};

export default App;
