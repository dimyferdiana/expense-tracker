import React, { useState, useEffect } from 'react';
import { walletDB, deleteDatabase } from '../utils/db';
import { Combobox, ComboboxLabel, ComboboxOption } from './Combobox';
import Modal from './Modal';

const WALLET_TYPES = [
  { id: 'cash', name: 'Cash' },
  { id: 'bank', name: 'Bank Account' },
  { id: 'credit_card', name: 'Credit Card' },
  { id: 'e_wallet', name: 'E-Wallet' },
];

function Wallets({ dbInitialized = false }) {
  const [wallets, setWallets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({
    id: '',
    name: '',
    type: WALLET_TYPES[0].id,
    balance: 0,
  });
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadWallets();
  }, [dbInitialized]);

  const loadWallets = async () => {
    setIsLoading(true);
    try {
      const data = dbInitialized
        ? await walletDB.getAll()
        : JSON.parse(localStorage.getItem('wallets') || '[]');
      setWallets(data);
    } catch (e) {
      setWallets([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleTypeChange = (e) => {
    setForm({ ...form, type: e.target.value.id });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const wallet = {
      ...form,
      id: editingId || form.id || Date.now().toString(),
      balance: parseFloat(form.balance) || 0,
    };
    try {
      if (editingId) {
        dbInitialized ? await walletDB.update(wallet) : updateLocal(wallet);
      } else {
        dbInitialized ? await walletDB.add(wallet) : addLocal(wallet);
      }
      resetForm();
      setIsModalOpen(false);
      loadWallets();
    } catch (e) {
      alert('Error saving wallet');
    }
  };

  const resetForm = () => {
    setForm({ id: '', name: '', type: WALLET_TYPES[0].id, balance: 0 });
    setEditingId(null);
  };

  const handleEdit = (wallet) => {
    setForm(wallet);
    setEditingId(wallet.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this wallet?')) return;
    try {
      dbInitialized ? await walletDB.delete(id) : deleteLocal(id);
      loadWallets();
    } catch (e) {
      alert('Error deleting wallet');
    }
  };

  const handleAddNew = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    resetForm();
    setIsModalOpen(false);
  };

  // LocalStorage fallback helpers
  const addLocal = (wallet) => {
    const data = JSON.parse(localStorage.getItem('wallets') || '[]');
    data.push(wallet);
    localStorage.setItem('wallets', JSON.stringify(data));
  };
  const updateLocal = (wallet) => {
    let data = JSON.parse(localStorage.getItem('wallets') || '[]');
    data = data.map(w => w.id === wallet.id ? wallet : w);
    localStorage.setItem('wallets', JSON.stringify(data));
  };
  const deleteLocal = (id) => {
    let data = JSON.parse(localStorage.getItem('wallets') || '[]');
    data = data.filter(w => w.id !== id);
    localStorage.setItem('wallets', JSON.stringify(data));
  };

  // Function to handle database reset
  const handleResetDatabase = async () => {
    if (window.confirm('This will reset the database and reload the page. All data will be preserved but this helps fix database errors. Continue?')) {
      try {
        await deleteDatabase();
        // Reload the page to reinitialize DB
        window.location.reload();
      } catch (error) {
        console.error('Error resetting database:', error);
        alert('Failed to reset database. Please try manually clearing site data in your browser settings.');
      }
    }
  };

  // Wallet form in modal
  const walletForm = (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-4 text-indigo-300">{editingId ? 'Edit Wallet' : 'Add New Wallet'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="block mb-1 text-gray-300">Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>
        <div className="mb-3">
          <label className="block mb-1 text-gray-300">Type</label>
          <Combobox
            name="type"
            options={WALLET_TYPES}
            displayValue={type => type?.name}
            defaultValue={WALLET_TYPES.find(t => t.id === form.type)}
            onChange={handleTypeChange}
            aria-label="Wallet Type"
          >
            {(type) => (
              <ComboboxOption value={type}>
                <ComboboxLabel>{type.name}</ComboboxLabel>
              </ComboboxOption>
            )}
          </Combobox>
        </div>
        <div className="mb-4">
          <label className="block mb-1 text-gray-300">Balance</label>
          <input
            type="number"
            name="balance"
            value={form.balance}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            step="0.01"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={handleModalClose} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
            Cancel
          </button>
          <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
            {editingId ? 'Update Wallet' : 'Add Wallet'}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-indigo-300">Wallets</h2>
        <button 
          onClick={handleAddNew}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Wallet
        </button>
      </div>
      
      <div>
        {isLoading ? (
          <div className="text-indigo-300">Loading...</div>
        ) : wallets.length === 0 ? (
          <div className="text-gray-400 py-8 text-center">
            <div className="text-indigo-400 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <p>No wallets found. Add one to get started!</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {wallets.map(wallet => (
              <li key={wallet.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div>
                  <div className="font-medium text-white">{wallet.name}</div>
                  <div className="text-sm text-gray-400">{WALLET_TYPES.find(t => t.id === wallet.type)?.name || wallet.type}</div>
                  <div className="text-sm text-indigo-300">Balance: Rp {wallet.balance.toLocaleString('id-ID')}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(wallet)} className="px-3 py-1 bg-gray-600 text-indigo-300 rounded hover:bg-gray-500">Edit</button>
                  <button onClick={() => handleDelete(wallet.id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* Database troubleshooting section */}
      <div className="mt-8 pt-4 border-t border-gray-700">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Troubleshooting</h3>
        <div className="text-xs text-gray-500 mb-2">
          If you're experiencing database errors, try resetting the database connection.
        </div>
        <button 
          onClick={handleResetDatabase}
          className="px-4 py-2 text-sm bg-gray-700 text-red-400 rounded hover:bg-gray-600"
        >
          Reset Database
        </button>
      </div>

      {/* Modal for wallet form */}
      <Modal isOpen={isModalOpen} onClose={handleModalClose}>
        {walletForm}
      </Modal>
    </div>
  );
}

export default Wallets; 