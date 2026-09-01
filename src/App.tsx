import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppFlowState } from './types';
import { LoadingScreen } from './components/LoadingScreen';
import { LoginPage } from './components/LoginPage';
import { AdminLoginPage } from './components/AdminLoginPage';
import { AdminDashboard } from './components/AdminDashboard';
import { LetterCard } from './components/LetterCard';
import { getCurrentUser } from './lib/auth';

export default function App() {
  const [flowState, setFlowState] = useState<AppFlowState>('loading');

  // Check if current user is logged in or if URL path/hash is /admin or #admin
  useEffect(() => {
    async function checkRouteAndAuth() {
      const hash = window.location.hash;
      const path = window.location.pathname;
      const isAdminRoute =
        hash === '#admin' ||
        hash === '#/admin' ||
        path === '/admin' ||
        path.startsWith('/admin');

      if (isAdminRoute) {
        const user = await getCurrentUser();
        if (user) {
          setFlowState('admin_dashboard');
        } else {
          setFlowState('admin_login');
        }
      } else if (flowState !== 'loading' && flowState !== 'letter') {
        setFlowState('user_login');
      }
    }

    checkRouteAndAuth();

    const handleNavigation = () => {
      checkRouteAndAuth();
    };

    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('popstate', handleNavigation);

    return () => {
      window.removeEventListener('hashchange', handleNavigation);
      window.removeEventListener('popstate', handleNavigation);
    };
  }, []);

  const handleLoadingComplete = async () => {
    const hash = window.location.hash;
    const path = window.location.pathname;
    const isAdminRoute =
      hash === '#admin' ||
      hash === '#/admin' ||
      path === '/admin' ||
      path.startsWith('/admin');

    if (isAdminRoute) {
      const user = await getCurrentUser();
      if (user) {
        setFlowState('admin_dashboard');
      } else {
        setFlowState('admin_login');
      }
      return;
    }
    setFlowState('user_login');
  };

  const handleUserLoginSuccess = () => {
    setFlowState('letter');
  };

  const handleGoToAdmin = () => {
    if (window.location.pathname !== '/admin') {
      window.history.pushState(null, '', '/admin');
    }
    setFlowState('admin_login');
  };

  const handleBackToUserLogin = () => {
    if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
      window.history.pushState(null, '', '/');
    }
    setFlowState('user_login');
  };

  const handleAdminLoginSuccess = () => {
    setFlowState('admin_dashboard');
  };

  const handleAdminLogout = () => {
    if (window.location.pathname !== '/') {
      window.history.pushState(null, '', '/');
    }
    setFlowState('user_login');
  };

  const handleRelockLetter = () => {
    if (window.location.pathname !== '/') {
      window.history.pushState(null, '', '/');
    }
    setFlowState('user_login');
  };

  return (
    <div className="min-h-screen bg-[#F8F5EE] text-[#2C2723] selection:bg-[#E4D5BE] selection:text-[#211A13]">
      <AnimatePresence mode="wait">
        {flowState === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0"
          >
            <LoadingScreen onComplete={handleLoadingComplete} />
          </motion.div>
        )}

        {flowState === 'user_login' && (
          <motion.div
            key="user_login"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.4 }}
          >
            <LoginPage
              onSuccess={handleUserLoginSuccess}
              onGoToAdmin={handleGoToAdmin}
            />
          </motion.div>
        )}

        {flowState === 'admin_login' && (
          <motion.div
            key="admin_login"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.4 }}
          >
            <AdminLoginPage
              onSuccess={handleAdminLoginSuccess}
              onBackToUserLogin={handleBackToUserLogin}
            />
          </motion.div>
        )}

        {flowState === 'admin_dashboard' && (
          <motion.div
            key="admin_dashboard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.45 }}
          >
            <AdminDashboard
              onLogout={handleAdminLogout}
              onViewLetter={() => setFlowState('letter')}
            />
          </motion.div>
        )}

        {flowState === 'letter' && (
          <motion.div
            key="letter"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.5 }}
          >
            <LetterCard onRelock={handleRelockLetter} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
