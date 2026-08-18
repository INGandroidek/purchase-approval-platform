import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
} from 'react-router-dom';

import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CreateRequest from './pages/CreateRequest.jsx';
import Approval from './pages/Approval.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/approve"
          element={<Approval />}
        />

        <Route
          path="*"
          element={
            <Layout>
              <Routes>
                <Route
                  path="/"
                  element={<Dashboard />}
                />

                <Route
                  path="/create"
                  element={<CreateRequest />}
                />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
