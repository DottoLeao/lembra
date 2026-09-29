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
import { ErrorScreen } from './ui/components/ErrorScreen';

const root = createRoot(document.getElementById('root')!);

db.open()
  .then(() =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )
  .catch((error: unknown) => root.render(<ErrorScreen error={error} />));
