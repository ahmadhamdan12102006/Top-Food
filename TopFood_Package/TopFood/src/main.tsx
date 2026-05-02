import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './admin.css';
import App from './App.tsx';
import { CartFxProvider } from './components/animations/CartFxProvider.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CartFxProvider>
      <App />
    </CartFxProvider>
  </StrictMode>
);