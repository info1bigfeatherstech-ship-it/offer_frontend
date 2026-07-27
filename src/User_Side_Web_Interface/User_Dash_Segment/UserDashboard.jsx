import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
    User, Package, Heart, MapPin, LogOut,
    ChevronRight, LifeBuoy, ShoppingCart, ChevronDown
} from 'lucide-react';

// Sub-page imports
import UserProfile from './UserSubPages/UserProfile';
import UserOrders from './UserSubPages/UserOrders';
import UserWishlist from './UserSubPages/UserWishlist';
import UserAddress from './UserSubPages/UserAddress';
import UserTicket from './UserSubPages/UserTicket';
import UserCart from './UserSubPages/UserCart';

import { logoutUser } from '../../components/REDUX_FEATURES/REDUX_SLICES/authSlice';

const UserDashboard = () => {
    const { activeTab: urlTab } = useParams();
    //  console.log('🟢 UserDashboard - URL param:', urlTab);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    //  console.log('🟢 UserDashboard - user:', user);
    
    // Initialize state from URL, but allow it to be null
    const [openTab, setOpenTab] = useState(urlTab || null);
    //   console.log('🟢 UserDashboard - openTab state:', openTab);
    const activeTabRef = useRef(null);
//     useEffect(() => {
//   setOpenTab(urlTab || null);
// }, [urlTab]);

    const menuItems = [
        { id: 'userprofile',  label: 'Personal Info',     icon: <User size={20} />,      component: <UserProfile /> },
        { id: 'userorders',   label: 'My Orders',          icon: <Package size={20} />,   component: <UserOrders /> },
        { id: 'userwishlist', label: 'My Wishlist',        icon: <Heart size={20} />,     component: <UserWishlist /> },
        { id: 'usercart',     label: 'My Cart',            icon: <ShoppingCart size={20} />, component: <UserCart /> },
        { id: 'useraddress',  label: 'Manage Address',     icon: <MapPin size={20} />,    component: <UserAddress /> },
        { id: 'usertickets',  label: 'Help & Support',     icon: <LifeBuoy size={20} />,  component: <UserTicket /> },
    ];

    // Deep Analyze Click Handler:
    // 1. If clicked tab is already open -> Close it (set to null).
    // 2. If clicked tab is different -> Open it.
    const handleTabClick = (tabId) => {
        if (openTab === tabId) {
            setOpenTab(null); 
            window.history.replaceState(null, '', `/account`);
        } else {
            setOpenTab(tabId);
            window.history.replaceState(null, '', `/account/${tabId}`);
        }
    };

    // Auto-scroll logic for mobile only
    useEffect(() => {
        if (openTab && window.innerWidth < 1024 && activeTabRef.current) {
            const timeout = setTimeout(() => {
                activeTabRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
            return () => clearTimeout(timeout);
        }
    }, [openTab]);

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    };

    useEffect(() => {
        window.scrollTo({
          top: 0,
          behavior: 'instant'
        });
      }, []);
    const handleLogout = () => {
        dispatch(logoutUser());
        navigate('/');
    };
    return (
        <div className="min-h-screen bg-[#f8f9fa] py-6 md:py-10 px-4 md:px-8">
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start">

                {/* ── SIDEBAR / MOBILE ACCORDION ── */}
                <aside className="w-full lg:w-80 sticky top-10">
                    <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100">
                        
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 bg-[#F7A221] rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-orange-100">
                                {getInitials(user?.name)}
                            </div>
                            <div className="overflow-hidden">
                                <h2 className="font-black text-gray-900 truncate">
                                    {user?.name || 'Guest User'}
                                </h2>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">
                                    {user?.role === 'admin' ? 'Administrator' : ''}
                                </p>
                            </div>
                        </div>

                        <nav className="space-y-2">
                            {menuItems.map((item) => {
                                const isActive = openTab === item.id;
                                return (
                                    <div key={item.id} ref={isActive ? activeTabRef : null} className="w-full">
                                        <button
                                            type="button"
                                            onClick={() => handleTabClick(item.id)}
                                            className={`w-full flex items-center cursor-pointer justify-between p-4 rounded-2xl transition-all duration-300 group ${
                                                isActive
                                                    ? 'bg-black text-white shadow-xl'
                                                    : 'hover:bg-orange-50 text-gray-600 hover:text-black'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={`${isActive ? 'text-[#F7A221]' : 'text-gray-400 group-hover:text-black'}`}>
                                                    {item.icon}
                                                </span>
                                                <span className="font-bold text-sm tracking-tight uppercase">{item.label}</span>
                                            </div>
                                            <div className="flex items-center"> 
                                                {/* Mobile Icon */}
                                                <ChevronDown size={16} className={`lg:hidden transition-transform duration-300 ${isActive ? 'rotate-180 text-[#F7A221]' : 'opacity-40'}`} />
                                                {/* Desktop Icon */}
                                                <ChevronRight size={16} className={`hidden lg:block transition-all ${isActive ? 'translate-x-1 text-[#F7A221]' : 'opacity-0 group-hover:opacity-100'}`} />
                                            </div>
                                        </button>

                                        {/* MOBILE ACCORDION CONTENT (Hidden on LG) */}
                                        <div 
                                            className={`lg:hidden overflow-hidden transition-all duration-500 ease-in-out ${
                                                isActive ? 'max-h-[5000px] opacity-100 mt-4 mb-4' : 'max-h-0 opacity-0'
                                            }`}
                                        >
                                            <div className="bg-white p-4 overflow-x-hidden">
                                                {isActive && item.component}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </nav>

                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 p-4 rounded-2xl text-red-500 hover:bg-red-50 transition-colors font-black text-xs uppercase tracking-widest cursor-pointer"
                            >
                                <LogOut size={20} /> Logout
                            </button>
                        </div>
                    </div>
                </aside>

                {/* ── DESKTOP PANEL (Hidden on MD/SM) ── */}
                <main className="hidden lg:block flex-1 rounded-[40px] shadow-sm border border-gray-100 p-10 min-h-[700px]">
                    {openTab ? (
                        <div key={openTab} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {menuItems.find(i => i.id === openTab)?.component}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                                <User size={40} />
                            </div>
                            <p className="font-bold uppercase tracking-widest text-xs">Select a tab to view details</p>
                        </div>
                    )}
                </main>

            </div>
        </div>
    );
};

export default UserDashboard;
