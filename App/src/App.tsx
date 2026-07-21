import './App.css'
import './index.css'; 
import HomePage from './pages/HomePage';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage';
import SharedPage from './pages/SharedPage';
import OAuthCallback from './pages/OAuthCallback';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { NotificationProvider } from './components/NotificationUi/NotificationProvider';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
        <NotificationProvider>
          <div className="min-h-screen dark:bg-[#0f0f1a] bg-gray-50">
            <BrowserRouter>
              <Routes>
                <Route path='/' element={<RegisterPage />} />
                <Route path='/oauth-callback' element={<OAuthCallback />} />
                <Route path='/share/:id' element={<SharedPage />} />
                
                {/* Protected User Routes */}
                <Route path='/home' element={
                  <ProtectedRoute requiredRole='user'>
                    <HomePage />
                  </ProtectedRoute>
                } />
                <Route path='/profile' element={
                  <ProtectedRoute requiredRole='user'>
                    <ProfilePage />
                  </ProtectedRoute>
                } />
                
                {/* Protected Admin Routes */}
                <Route path='/admin' element={
                  <ProtectedRoute requiredRole='admin'>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </BrowserRouter>
          </div>
        </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
