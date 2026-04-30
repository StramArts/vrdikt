import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Roast from './pages/Roast'
import Challenge from './pages/Challenge'
import Profile from './pages/Profile'
import Pricing from './pages/Pricing'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/"            element={<Landing />} />
        <Route path="/pricing"     element={<Pricing />} />
        <Route path="/auth"        element={<Auth />} />
        {/* /onboarding: needs auth but must not trigger the onboarding redirect itself */}
        <Route path="/onboarding"  element={<ProtectedRoute requireOnboarding={false}><Onboarding /></ProtectedRoute>} />
        <Route path="/dashboard"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/upload"      element={<ProtectedRoute><Upload /></ProtectedRoute>} />
        <Route path="/roast"       element={<ProtectedRoute><Roast /></ProtectedRoute>} />
        <Route path="/challenge"   element={<ProtectedRoute><Challenge /></ProtectedRoute>} />
        <Route path="/profile"     element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  )
}
