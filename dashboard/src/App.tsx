import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RoverProvider } from './context/RoverContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { OverviewPage } from './pages/OverviewPage';
import { TrackingPage } from './pages/TrackingPage';
import { LogsPage } from './pages/LogsPage';

function App() {
  return (
    <BrowserRouter>
      <RoverProvider>
        <div className="min-h-screen bg-[#eef1f5]">
          <Sidebar />
          <Header />
          <main className="lg:ml-[232px] w-full lg:w-[calc(100%-232px)] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <Routes>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/tracking" element={<TrackingPage />} />
              <Route path="/logs" element={<LogsPage />} />
            </Routes>
          </main>
        </div>
      </RoverProvider>
    </BrowserRouter>
  );
}

export default App;



