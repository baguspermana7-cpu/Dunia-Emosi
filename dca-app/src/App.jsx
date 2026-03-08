import './App.css';
import DCAApp from './DCA_Intelligence_v4';
import { ThemeProvider } from './ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <DCAApp />
    </ThemeProvider>
  );
}

export default App;
