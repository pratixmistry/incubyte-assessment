import { Center, Loader } from '@mantine/core';
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './components/Layout';
import { EmployeesPage } from './pages/EmployeesPage';

// Charts (recharts) are only needed on the insights page; load them on demand.
const InsightsPage = lazy(() => import('./pages/InsightsPage').then((m) => ({ default: m.InsightsPage })));

const pageLoader = (
  <Center py="xl">
    <Loader />
  </Center>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/employees" replace /> },
      { path: 'employees', element: <EmployeesPage /> },
      {
        path: 'insights',
        element: (
          <Suspense fallback={pageLoader}>
            <InsightsPage />
          </Suspense>
        ),
      },
      { path: '*', element: <Navigate to="/employees" replace /> },
    ],
  },
]);
