import React, { useState, useEffect } from 'react';
import { Settings, Users, Plus, Edit2, Trash2, CheckCircle, Shield, Building, DollarSign, Percent, Palette, AlertCircle } from 'lucide-react';
import { PlatformSettings, User as UserType } from '../types';
import { api } from '../services/api';
import { parseApiError } from '../lib/errorUtils';

interface SettingsCustomizationsProps {
  currentUser: UserType;
  onSettingsUpdated?: (settings: PlatformSettings) => void;
}

export function SettingsCustomizations({ currentUser, onSettingsUpdated }: SettingsCustomizationsProps) {
  const [activeTab, setActiveTab] = useState<'platform' | 'users'>('platform');
  const [settings, setSettings] = useState<PlatformSettings>({
    org_name: 'MicroFinance Systems',
    currency_symbol: 'KSh',
    default_annual_interest_rate: 12.0,
    default_origination_fee_percent: 1.5,
    theme: 'light',
  });
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // User modal state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [userErrorMessage, setUserErrorMessage] = useState<string | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<UserType>>({
    username: '',
    password: '',
    full_name: '',
    role: 'USER',
    status: 'Active',
  });

  const isAdmin = currentUser.role === 'ADMIN';

  const loadSettingsAndUsers = async () => {
    setLoading(true);
    try {
      const [s, u] = await Promise.all([api.getSettings(), api.getUsers()]);
      if (s) setSettings(s);
      if (u) setUsers(u);
    } catch (err) {
      console.error('Failed to load settings or users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsAndUsers();
  }, []);

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      await api.updateSettings(settings);
      setSaveSuccess('Platform settings updated successfully.');
      if (onSettingsUpdated) onSettingsUpdated(settings);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err) {
      alert('Failed to update settings: ' + parseApiError(err));
    }
  };

  const handleOpenUserModal = (userToEdit?: UserType) => {
    setUserErrorMessage(null);
    if (userToEdit) {
      setEditingUser(userToEdit);
      setUserFormData({
        username: userToEdit.username,
        password: '',
        full_name: userToEdit.full_name,
        role: userToEdit.role,
        status: userToEdit.status,
      });
    } else {
      setEditingUser(null);
      setUserFormData({
        username: '',
        password: '',
        full_name: '',
        role: 'USER',
        status: 'Active',
      });
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setUserErrorMessage(null);

    const trimmedUsername = (userFormData.username || '').trim();
    const duplicate = users.find(
      (u) => u.username.trim().toLowerCase() === trimmedUsername.toLowerCase() && u.id !== editingUser?.id
    );

    if (duplicate) {
      setUserErrorMessage(`The username '${trimmedUsername}' is already taken.`);
      return;
    }

    try {
      if (editingUser && editingUser.id) {
        await api.updateUser({
          id: editingUser.id,
          username: trimmedUsername,
          password: userFormData.password || undefined,
          full_name: userFormData.full_name || '',
          role: userFormData.role as 'ADMIN' | 'USER',
          status: userFormData.status as 'Active' | 'Inactive',
        });
        setSaveSuccess('User updated successfully.');
      } else {
        await api.createUser({
          username: trimmedUsername,
          password: userFormData.password || '123456',
          full_name: userFormData.full_name || '',
          role: userFormData.role as 'ADMIN' | 'USER',
          status: userFormData.status as 'Active' | 'Inactive',
        });
        setSaveSuccess('User created successfully.');
      }
      setIsUserModalOpen(false);
      loadSettingsAndUsers();
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err) {
      setUserErrorMessage(parseApiError(err));
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!isAdmin) return;
    if (id === currentUser.id) {
      alert('You cannot delete your own logged-in account.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await api.deleteUser(id);
        setSaveSuccess('User deleted successfully.');
        loadSettingsAndUsers();
        setTimeout(() => setSaveSuccess(null), 3000);
      } catch (err) {
        alert('Failed to delete user: ' + parseApiError(err));
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Settings & Customizations</h1>
          <p className="text-slate-500 text-sm mt-1">
            Configure system parameters, organization defaults, and user access permissions.
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xs flex items-center gap-2">
          <CheckCircle size={18} />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('platform')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'platform'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Settings size={18} />
          <span>Platform Customizations</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users size={18} />
          <span>Users & Permissions</span>
        </button>
      </div>

      {activeTab === 'platform' && (
        <div className="bg-white border border-slate-200 rounded-xs p-6 max-w-3xl">
          <form onSubmit={handleSettingsSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1 flex items-center gap-1.5">
                <Building size={16} className="text-slate-400" /> Organization Name
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={settings.org_name}
                onChange={(e) => setSettings({ ...settings, org_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xs text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white disabled:opacity-60"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1 flex items-center gap-1.5">
                  <DollarSign size={16} className="text-slate-400" /> Currency Symbol
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={settings.currency_symbol}
                  onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xs text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1 flex items-center gap-1.5">
                  <Percent size={16} className="text-slate-400" /> Default Annual Interest Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  disabled={!isAdmin}
                  value={settings.default_annual_interest_rate}
                  onChange={(e) => setSettings({ ...settings, default_annual_interest_rate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xs text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white disabled:opacity-60"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1 flex items-center gap-1.5">
                  <Percent size={16} className="text-slate-400" /> Default Origination Fee (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  disabled={!isAdmin}
                  value={settings.default_origination_fee_percent}
                  onChange={(e) => setSettings({ ...settings, default_origination_fee_percent: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xs text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1 flex items-center gap-1.5">
                  <Palette size={16} className="text-slate-400" /> Theme Preference
                </label>
                <select
                  disabled={!isAdmin}
                  value={settings.theme}
                  onChange={(e) => setSettings({ ...settings, theme: e.target.value as 'light' | 'dark' | 'system' })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xs text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white disabled:opacity-60"
                >
                  <option value="light">Light Theme</option>
                  <option value="dark">Dark Theme</option>
                  <option value="system">System Default</option>
                </select>
              </div>
            </div>

            {isAdmin && (
              <div className="pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xs transition-colors shadow-sm"
                >
                  Save Platform Settings
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-800">System Users</h2>
            {isAdmin && (
              <button
                onClick={() => handleOpenUserModal()}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xs transition-colors shadow-sm"
              >
                <Plus size={16} /> Add User
              </button>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xs overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{u.full_name}</td>
                    <td className="px-4 py-3">{u.username}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-xs font-semibold ${
                          u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {u.role === 'ADMIN' && <Shield size={12} />} {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-xs text-xs font-medium ${
                          u.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenUserModal(u)}
                            className="p-1 text-slate-500 hover:text-indigo-600 transition-colors"
                            title="Edit User"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => u.id && handleDeleteUser(u.id)}
                            className="p-1 text-slate-500 hover:text-red-600 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 4} className="px-4 py-6 text-center text-slate-400">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Edit / Create Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md bg-white rounded-xs shadow-xl p-6 border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              {editingUser ? 'Edit User Account' : 'Create New User'}
            </h2>

            {userErrorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xs text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{userErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={userFormData.full_name}
                  onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xs text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={userFormData.username}
                  onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xs text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Password {editingUser && '(Leave blank to keep unchanged)'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  placeholder={editingUser ? '••••••••' : 'Enter password'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xs text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Role</label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as 'ADMIN' | 'USER' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xs text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  >
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Status</label>
                  <select
                    value={userFormData.status}
                    onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value as 'Active' | 'Inactive' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xs text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 text-sm font-medium rounded-xs hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xs transition-colors shadow-sm"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
