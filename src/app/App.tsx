import { createHashRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { AutoBackup } from '../ui/components/AutoBackup';
import { ErrorBoundary, RouteError } from '../ui/components/ErrorScreen';
import { ToastProvider } from '../ui/components/Toast';
import { UpdatePrompt } from '../ui/components/UpdatePrompt';
import { isNativeApp } from '../ui/platform';
import CardEditor from '../ui/screens/CardEditor';
import DeckScreen from '../ui/screens/Deck';
import Decks from '../ui/screens/Decks';
import Import from '../ui/screens/Import';
import SessionEnd from '../ui/screens/SessionEnd';
import SettingsScreen from '../ui/screens/Settings';
import Study from '../ui/screens/Study';
import Today from '../ui/screens/Today';
import Welcome from '../ui/screens/Welcome';

const router = createHashRouter([
  {
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <Today /> },
      { path: '/welcome', element: <Welcome /> },
      { path: '/decks', element: <Decks /> },
      { path: '/deck/:id', element: <DeckScreen /> },
      { path: '/study', element: <Study /> },
      { path: '/study/end', element: <SessionEnd /> },
      { path: '/card/new', element: <CardEditor /> },
      { path: '/card/:id/edit', element: <CardEditor /> },
      { path: '/import', element: <Import /> },
      { path: '/settings', element: <SettingsScreen /> },
    ],
  },
]);

export function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <RouterProvider router={router} />
        <AutoBackup />
        {!isNativeApp() && <UpdatePrompt />}
      </ToastProvider>
    </ErrorBoundary>
  );
}
