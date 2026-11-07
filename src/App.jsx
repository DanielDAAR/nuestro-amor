import { ScrapbookPage } from './components/ScrapbookPage';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <ScrapbookPage />
    </ErrorBoundary>
  );
}

export default App;