import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider, RequireAuth } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import AppLayout from './components/AppLayout.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Watch from './pages/Watch.jsx'
import Library from './pages/Library.jsx'
import Playlists from './pages/Playlists.jsx'
import PlaylistDetail from './pages/PlaylistDetail.jsx'
import Search from './pages/Search.jsx'
import Stats from './pages/Stats.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Private */}
            <Route
              path="/app"
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="watch" element={<Watch />} />
              <Route path="watch/:videoId" element={<Watch />} />
              <Route path="library" element={<Library />} />
              <Route path="playlists" element={<Playlists />} />
              <Route path="playlists/:playlistId" element={<PlaylistDetail />} />
              <Route path="search" element={<Search />} />
              <Route path="stats" element={<Stats />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
