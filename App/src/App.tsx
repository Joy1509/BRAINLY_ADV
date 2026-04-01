import './App.css'
import './index.css'; 
import HomePage from './pages/HomePage';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage';
import SharedPage from './pages/SharedPage';
import OAuthCallback from './pages/OAuthCallback';
import ProfilePage from './pages/ProfilePage';
import { NotificationProvider } from './components/NotificationUi/NotificationProvider';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <div className="min-h-screen dark:bg-[#0f0f1a] bg-gray-50">
          <BrowserRouter>
            <Routes>
              <Route path='/home' element={<HomePage />} />
              <Route path='/' element={<RegisterPage />} />
              <Route path='/share/:id' element={<SharedPage />} />
              <Route path='/oauth-callback' element={<OAuthCallback />} />
              <Route path='/profile' element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/home" />} />
            </Routes>
          </BrowserRouter>
        </div>
      </NotificationProvider>
    </ThemeProvider>
  )
}

export default App
