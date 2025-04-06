import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';

const renderApp = () => {
  let rootElement = document.getElementById('root');
  if (!rootElement) {
    rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);
  }

  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

if (window.Office) {
  Office.onReady(() => {
    renderApp();
  });
} else {
  window.addEventListener('DOMContentLoaded', renderApp);
}