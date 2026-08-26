import React, { useState } from 'react';
import { 
  UserPlus, 
  Search, 
  Edit3, 
  Trash2, 
  Mail, 
  Phone, 
  CreditCard, 
  MapPin, 
  X, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Borrower } from '../types';
import { api } from '../services/api';

interface BorrowerManagementProps {
  borrowers: Borrower[];
  onRefresh: () => void;
}

export const BorrowerManagement: React.FC<BorrowerManagementProps> = ({ borrowers, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBorrower, setEditingBorrower] = useState<Borrower | null>(null);

  const [formData, setFormData] = useState<Partial<Borrower>>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    national_id: '',
    address: '',
    credit_score: 700,
    status: 'Active',
  });

  const filteredBorrowers = borrowers.filter((b) =>
    `${b.first_name} ${b.last_name} ${b.national_id} ${b.email} ${b.phone}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const handleOpenCreateModal = () => {
    setEditingBorrower(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      national_id: '',
      address: '',
      credit_score: 720,
      status: 'Active',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (borrower: Borrower) => {
    setEditingBorrower(borrower);
    setFormData({ ...borrower });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBorrower) {
        await api.updateBorrower(formData as Borrower);
      } else {
        await api.createBorrower(formData as Borrower);
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      alert('Failed to save borrower details: ' + err);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this borrower profile?')) {
      try {
        await api.deleteBorrower(id);
        onRefresh();
      } catch (err) {
        alert('Failed to delete borrower: ' + err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xs border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Borrowers Directory</h2>
          <p className="text-slate-500 text-xs mt-0.5">Manage borrower profiles, credit ratings, and contact info</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, ID, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xs w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xs shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Add Borrower
          </button>
        </div>
      </div>

      {/* Borrowers Table */}
      <div className="bg-white rounded-xs border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Borrower Name</th>
                <th className="px-6 py-4">National ID</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Credit Score</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredBorrowers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-normal">
                    No borrower profiles found matching your query.
                  </td>
                </tr>
              ) : (
                filteredBorrowers.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{b.first_name} {b.last_name}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {b.address}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-700 text-xs font-mono font-bold px-2.5 py-1 rounded-xs">
                        {b.national_id}
                      </span>
                    </td>
                    <td className="px-6 py-4 space-y-0.5 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Mail className="w-3.5 h-3.5 text-slate-400" /> {b.email}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400" /> {b.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${b.credit_score >= 700 ? 'text-emerald-600' : b.credit_score >= 600 ? 'text-amber-600' : 'text-red-600'}`}>
                          {b.credit_score}
                        </span>
                        <span className="text-xs text-slate-400 font-normal">/ 850</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xs ${
                        b.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {b.status === 'Active' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(b)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xs transition-colors"
                          title="Edit Borrower"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(b.id!)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xs transition-colors"
                          title="Delete Borrower"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xs max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingBorrower ? 'Edit Borrower Profile' : 'Register New Borrower'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xs hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">National ID / Passport</label>
                  <input
                    type="text"
                    required
                    value={formData.national_id}
                    onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Credit Score (300-850)</label>
                  <input
                    type="number"
                    min={300}
                    max={850}
                    required
                    value={formData.credit_score}
                    onChange={(e) => setFormData({ ...formData, credit_score: parseInt(e.target.value) || 700 })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Borrower['status'] })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Blacklisted">Blacklisted</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xs shadow-md shadow-blue-600/20 transition-all"
                >
                  {editingBorrower ? 'Save Changes' : 'Create Borrower'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
