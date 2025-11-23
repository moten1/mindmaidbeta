import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", path: "/" },
    { name: "Wardrobe", path: "/wardrobe" },
    { name: "Food", path: "/food" },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-gray-800 text-white flex flex-col p-4 transform transition-transform duration-300 z-30
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        <h1 className="text-2xl font-bold mb-8">🧠 MindMaid</h1>
        <p className="text-sm text-gray-400 mb-6">Decision Paralysis Helper</p>
        <nav className="flex flex-col gap-4" aria-label="Main Navigation">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`hover:text-yellow-400 transition-colors ${
                location.pathname === item.path ? "text-yellow-400 font-semibold" : ""
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black opacity-25 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col md:ml-64 min-h-0">
        {/* Header */}
        <header className="bg-white shadow p-4 flex items-center justify-between">
          <button
            className="md:hidden p-2 rounded-md hover:bg-gray-200"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            <svg
              className="h-6 w-6 text-gray-800"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h2 className="text-xl font-semibold">MindMaid AI</h2>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 bg-gray-100 overflow-auto">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="bg-white shadow p-4 text-center text-gray-500">
          © 2025 MindMaid. Beat decision paralysis with AI.
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;