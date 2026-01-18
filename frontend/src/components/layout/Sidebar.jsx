import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

const Sidebar = () => {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <div className="flex flex-grow">
                <aside className="w-64 bg-white border-r">
                    <nav className="p-4">
                        <ul className="space-y-4">
                            <li>
                                <a href="/dashboard" className="text-gray-700 hover:text-red-600 font-medium">
                                    Dashboard
                                </a>
                            </li>
                            <li>
                                <a href="/events" className="text-gray-700 hover:text-red-600 font-medium">
                                    Events
                                </a>
                            </li>
                            <li>
                                <a href="/tickets" className="text-gray-700 hover:text-red-600 font-medium">
                                    My Tickets
                                </a>
                            </li>
                            <li>
                                <a href="/profile" className="text-gray-700 hover:text-red-600 font-medium">
                                    Profile
                                </a>
                            </li>
                        </ul>
                    </nav>
                </aside>
                <main className="flex-grow p-8">
                    <Outlet />
                </main>
            </div>
            <Footer />
        </div>
    );
};  
export default Sidebar;