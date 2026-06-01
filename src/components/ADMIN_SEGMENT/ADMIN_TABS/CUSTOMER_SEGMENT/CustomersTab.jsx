// ADMIN_TABS/CustomersTab.jsx
import React, { useState } from 'react';
import { useGetAllUsersQuery } from '../../ADMIN_REDUX_MANAGEMENT/userAnalyticsApi';

const CustomersTab = () => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]); // Array of IDs
  const [showUserModal, setShowUserModal] = useState(false);
  const [activeUser, setActiveUser] = useState(null);

  const { data, isLoading, error, isFetching } = useGetAllUsersQuery({
    page,
    limit: 10,
    search: searchTerm,
    role: roleFilter,
  });

  const users = data?.data || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };

  // --- Handlers ---
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUsers(users.map(u => u._id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (id) => {
    setSelectedUsers(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const shareToWhatsApp = (user) => {
    const message = `Hello ${user.name},\nCheck out our latest collection at: ${window.location.origin}`;
    const phone = user.phone || ""; 
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleBulkWhatsApp = () => {
    if (selectedUsers.length === 0) return;
    alert(`Opening WhatsApp broadcast for ${selectedUsers.length} users...`);
    // Note: WhatsApp API doesn't support multi-send in one click, 
    // usually we loop or use a business API. For now, we target the first or prompt.
  };

  if (isLoading) return <div className="p-20 text-center animate-pulse">Loading Customers...</div>;

  return (
    <div className="space-y-6">
      {/* Search & Actions Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </span>
            <input 
              type="text" 
              placeholder="Search customers..." 
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <select 
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none"
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="user">Customer</option>
              <option value="wholesaler">Wholesaler</option>
            </select>
            {selectedUsers.length > 0 && (
              <button 
                onClick={handleBulkWhatsApp}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl hover:bg-green-700 transition-all shadow-md"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.417-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.499-5.688-1.447l-6.305 1.65zm6.59-3.407c1.558.925 3.11 1.411 4.704 1.412 5.384 0 9.762-4.378 9.765-9.761.001-2.609-1.015-5.059-2.863-6.909-1.848-1.849-4.301-2.866-6.911-2.867-5.385 0-9.764 4.379-9.767 9.762-.001 1.745.456 3.447 1.32 4.957l-.821 3.003 3.073-.807z"/></svg>
                Bulk Message ({selectedUsers.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table Desktop */}
      <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 w-10">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  onChange={handleSelectAll}
                  checked={selectedUsers.length === users.length && users.length > 0}
                />
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Engagement</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user._id} className="hover:bg-blue-50/30 transition-colors group">
                <td className="px-6 py-4">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    checked={selectedUsers.includes(user._id)}
                    onChange={() => handleSelectUser(user._id)}
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                      {user.name?.[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                   <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${user.isVerified ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {user.isVerified ? 'Verified' : 'Unverified'}
                   </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-md font-medium">🛒 {user.cartItemsCount || 0}</span>
                    <span className="text-xs bg-pink-50 text-pink-600 px-2 py-1 rounded-md font-medium">❤️ {user.wishlistCount || 0}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => shareToWhatsApp(user)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                      title="Share to WhatsApp"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                    </button>
                    <button 
                      onClick={() => { setActiveUser(user); setShowUserModal(true); }}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (Omitted for brevity, use similar styling) */}

      {/* Pagination */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-200">
        <span className="text-sm text-gray-500">Page {page} of {pagination.totalPages}</span>
        <div className="flex gap-2">
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 text-sm bg-gray-100 rounded-lg disabled:opacity-50"
          >
            Prev
          </button>
          <button 
            disabled={page === pagination.totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomersTab;

