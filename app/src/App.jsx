import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientPage from './pages/ClientPage';
import SitePage from './pages/SitePage';
import LabourPage from './pages/LabourPage';
import MaterialPage from './pages/MaterialPage';
import MaterialPurchasePage from './pages/MaterialPurchasePage';
import PaymentPage from './pages/PaymentPage';
import ReportPage from './pages/ReportPage';
import AdminPage from './pages/AdminPage';
import SiteStatusPage from './pages/SiteStatusPage';
import SitePaymentSummaryPage from './pages/SitePaymentSummaryPage';
import WeeklyPaySheetPage from './pages/WeeklyPaySheetPage';
import PayeePage from './pages/PayeePage';
import AttendancePaySheetPage from './pages/AttendancePaySheetPage';
import ShiftMasterPage from './pages/ShiftMasterPage';
import PersonTypeMasterPage from './pages/PersonTypeMasterPage';
import PersonalExpensePage from './pages/PersonalExpensePage';

// Layout
import MainLayout from './layouts/MainLayout';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return null;
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route path="/" element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }>
              <Route index element={<DashboardPage />} />
              <Route path="clients" element={<ClientPage />} />
              <Route path="sites" element={<SitePage />} />
              <Route path="sites/status" element={<SiteStatusPage />} />
              <Route path="labour" element={<LabourPage />} />
              <Route path="materials" element={<MaterialPage />} />
              <Route path="materials/purchase" element={<MaterialPurchasePage />} />
              <Route path="payments" element={<PaymentPage />} />
              <Route path="payments/add" element={<PaymentPage />} />
              <Route path="payments/site" element={<SitePaymentSummaryPage />} />
              <Route path="reports" element={<ReportPage />} />
              <Route path="payees" element={<PayeePage />} />
              <Route path="weekly-pay-sheet" element={<WeeklyPaySheetPage />} />
              <Route path="attendance-pay-sheet" element={<AttendancePaySheetPage />} />
              <Route path="shift-master" element={<ShiftMasterPage />} />
              <Route path="person-type-master" element={<PersonTypeMasterPage />} />
              <Route path="personal-expenses" element={<PersonalExpensePage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
