import './App.css'
import './index.css'; 
import HomePage from './pages/HomePage';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage';
import SharedPage from './pages/SharedPage';
import { NotificationProvider } from './components/NotificationUi/NotificationProvider';

function App() {
  
  return (
    <NotificationProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <BrowserRouter>
          <Routes>
            <Route path='/home' element={<HomePage />} />
            <Route path='/' element={<RegisterPage />} />
            <Route path='/share/:id' element={<SharedPage />} />
            <Route path="*" element={<Navigate to="/home" />} />
          </Routes>
        </BrowserRouter> 
      </div>
    </NotificationProvider>
  )
}

export default App
