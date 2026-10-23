import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ErrorBoundary from "./components/ErrorBoundary";
import PrivateRoute from "./components/PrivateRoute";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProductsPage from "./pages/ProductsPage";
import ScanPage from "./pages/ScanPage";
import TransactionsPage from "./pages/TransactionsPage";
import PrintLabelsPage from "./pages/PrintLabelsPage";
import UsersPage from "./pages/UsersPage";

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Layout>
                      <DashboardPage />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/products"
                element={
                  <PrivateRoute>
                    <Layout>
                      <ProductsPage />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/scan"
                element={
                  <PrivateRoute>
                    <Layout>
                      <ScanPage />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/transactions"
                element={
                  <PrivateRoute>
                    <Layout>
                      <TransactionsPage />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/print-labels"
                element={
                  <PrivateRoute>
                    <Layout>
                      <PrintLabelsPage />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <PrivateRoute>
                    <Layout>
                      <UsersPage />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
