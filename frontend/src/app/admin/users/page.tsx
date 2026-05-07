'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useLang } from '@/context/LanguageContext';
import { User } from '@/types';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import {
  HiOutlineSearch,
  HiOutlineUsers,
  HiOutlineBan,
  HiOutlineCheckCircle,
  HiOutlineShieldCheck,
  HiOutlineTrash,
} from 'react-icons/hi';

export default function AdminUsersPage() {
  const { t, lang } = useLang();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { loadUsers(); }, [page, filter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (filter) params.role = filter;
      const { data } = await api.get('/admin/users', { params });
      setUsers(data.users);
      setTotal(data.total);
    } catch {} finally { setLoading(false); }
  };

  const handleToggleActive = async (userId: string) => {
    try {
      await api.patch(`/admin/users/${userId}/toggle-active`);
      await loadUsers();
    } catch (err: any) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      await loadUsers();
    } catch (err: any) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(lang === 'es' ? `¿Estás seguro de eliminar a ${userName}? Esta acción es irreversible.` : `Are you sure you want to delete ${userName}? This action cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      await loadUsers();
    } catch (err: any) { alert(err.response?.data?.message || 'Error al eliminar usuario'); }
  };

  const dateFnsLocale = lang === 'es' ? es : enUS;

  const roleFilters = [
    { key: '', label: lang === 'es' ? 'Todos' : 'All' },
    { key: 'client', label: lang === 'es' ? 'Clientes' : 'Clients' },
    { key: 'admin', label: t('adminAdmins') },
  ];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return { label: 'Admin', classes: 'bg-red-100 text-red-700' };
      default: return { label: lang === 'es' ? 'Cliente' : 'Client', classes: 'bg-blue-100 text-blue-700' };
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return u.firstName.toLowerCase().includes(term) || u.lastName.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="font-bold text-2xl text-gray-900">{t('adminUserManagement')}</h1>
        <p className="text-sm text-gray-500 mt-1">{lang === 'es' ? 'Administra los usuarios de la plataforma' : 'Manage platform users'}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {roleFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setPage(1); }}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                filter === f.key ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={lang === 'es' ? 'Buscar usuarios...' : 'Search users...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 skeleton rounded-lg" />)}</div>
      ) : filteredUsers.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">{lang === 'es' ? 'Usuario' : 'User'}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{t('adminRole')}</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{lang === 'es' ? 'Estado' : 'Status'}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{lang === 'es' ? 'Registro' : 'Registered'}</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">{t('adminActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((u) => {
                  const roleBadge = getRoleBadge(u.role);
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                            {u.firstName[0]}{u.lastName[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-gray-500">@{u.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-[180px]">{u.email}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleBadge.classes}`}>{roleBadge.label}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.isActive ? t('adminActive') : t('adminInactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {format(new Date(u.createdAt), "dd MMM yyyy", { locale: dateFnsLocale })}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Role selector */}
                          <select
                            value={u.role}
                            onChange={(e) => handleChangeRole(u.id, e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
                          >
                            <option value="client">{lang === 'es' ? 'Cliente' : 'Client'}</option>
                            <option value="admin">Admin</option>
                          </select>
                          {/* Toggle active */}
                          <button
                            onClick={() => handleToggleActive(u.id)}
                            className={`p-1.5 rounded-lg transition-colors ${u.isActive ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                            title={u.isActive ? t('adminBlock') : t('adminUnblock')}
                          >
                            {u.isActive ? <HiOutlineBan className="w-4 h-4" /> : <HiOutlineCheckCircle className="w-4 h-4" />}
                          </button>
                          {/* Delete user */}
                          <button
                            onClick={() => handleDeleteUser(u.id, u.firstName)}
                            className="p-1.5 rounded-lg transition-colors text-red-500 hover:bg-red-50"
                            title={lang === 'es' ? 'Eliminar usuario' : 'Delete user'}
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-500">{total} {lang === 'es' ? 'usuarios' : 'users'}</p>
              <div className="flex gap-1">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="px-3 py-1 text-xs border rounded hover:bg-white disabled:opacity-50">{lang === 'es' ? 'Anterior' : 'Previous'}</button>
                <button onClick={() => setPage(page + 1)} disabled={users.length < 20} className="px-3 py-1 text-xs border rounded hover:bg-white disabled:opacity-50">{lang === 'es' ? 'Siguiente' : 'Next'}</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <HiOutlineUsers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">{t('adminNoUsers')}</p>
        </div>
      )}
    </div>
  );
}
