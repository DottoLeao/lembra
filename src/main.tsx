import '@fontsource-variable/fraunces';
import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/500.css';
import '@fontsource/instrument-sans/600.css';
import './ui/theme/tokens.css';
import './ui/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { db } from './data/db';
import { getSettings } from './data/settings';
import { ErrorScreen } from './ui/components/ErrorScreen';
import { applyTheme } from './ui/theme/applyTheme';

const root = createRoot(document.getElementById('root')!);

db.open()
  .then(async () => {
    // o banco é a fonte de verdade do tema; o index.html só adiantou a cópia do localStorage
    applyTheme((await getSettings()).theme);
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((error: unknown) => root.render(<ErrorScreen error={error} />));
