import { BrowserRouter } from 'react-router-dom';
import { IconContext } from '@phosphor-icons/react';
import { useTheme } from '../theme/useTheme.js';
import Layout from './Layout.jsx';

export default function App() {
  const [theme, setTheme] = useTheme();
  // One icon family, one weight, sized to the surrounding text.
  return (
    <IconContext.Provider value={{ weight: 'regular', size: '1em' }}>
      <BrowserRouter><Layout theme={theme} setTheme={setTheme} /></BrowserRouter>
    </IconContext.Provider>
  );
}
