// frontend/src/components/layout/Layout.jsx - FIX THIS
import React from 'react';
import { Outlet } from 'react-router-dom'; // IMPORTANT
import Footer from './Footer';
import Header from './Header';

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        {/* THIS IS CRITICAL - renders child routes */}
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;