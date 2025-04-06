import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import Login from '../components/Login';
import TaskPane from '../components/TaskPane';
import { useAuth } from '../contexts/AuthContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? <TaskPane /> : <Login />;
};

export default App;