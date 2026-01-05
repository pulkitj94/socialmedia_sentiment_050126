import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { APP_CONFIG } from './config';
import CommandCenter from './pages/CommandCenter';
import SentimentHealth from './pages/SentimentHealth';

function Navigation() {
  const location = useLocation();

  const navLinks = [
    { path: '/', label: 'Social Command Center', icon: '🤖' },
    { path: '/sentiment', label: 'Platform Sentiment Health', icon: '🌍' }
  ];

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
                {APP_CONFIG.appName}
              </h1>
              <p className="text-xs text-gray-600">{APP_CONFIG.appTagline}</p>
            </div>
            <div className="flex gap-1">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span>{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-success-500"></span>
              </span>
              Online
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
        <Navigation />
        <Routes>
          <Route path="/" element={<CommandCenter />} />
          <Route path="/sentiment" element={<SentimentHealth />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
