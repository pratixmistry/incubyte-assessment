import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './components/Layout';
import { EmployeesPage } from './pages/EmployeesPage';
import { InsightsPage } from './pages/InsightsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/employees" replace /> },
      { path: 'employees', element: <EmployeesPage /> },
      { path: 'insights', element: <InsightsPage /> },
      { path: '*', element: <Navigate to="/employees" replace /> },
    ],
  },
]);
