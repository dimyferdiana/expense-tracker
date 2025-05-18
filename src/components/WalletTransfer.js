import React, { useState, useEffect, useRef } from 'react';
import { walletDB, transferDB, resetDatabase } from '../utils/db';
import Modal from './Modal';

const WalletTransfer = ({ dbInitialized, refreshWallets }) => {
  const [wallets, setWallets] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const isMounted = useRef(true);
  
  // Form state
  const [formData, setFormData] = useState({
    fromWallet: '',
    toWallet: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
    photoUrl: ''
  });

  // Add cleanup when component unmounts
  useEffect(() => {
    // Set isMounted to true when component mounts (explicitly)
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Load wallets and transfer history
  useEffect(() => {
    const loadData = async () => {
      if (!isMounted.current) return;
      setIsLoading(true);
      
      try {
        if (dbInitialized) {
          // Load wallets
          const allWallets = await walletDB.getAll();
          if (isMounted.current) setWallets(allWallets);
          
          // Load transfer history with error handling
          try {
            const allTransfers = await transferDB.getAll();
            if (isMounted.current) {
              setTransfers(allTransfers.sort((a, b) => new Date(b.date) - new Date(a.date)));
            }
          } catch (transferError) {
            console.error('Error loading transfers, may need DB upgrade:', transferError);
            if (isMounted.current) setTransfers([]);
            
            // Check if we need to delete and recreate the database
            if (transferError.name === 'NotFoundError') {
              console.warn('Transfers store not found. You may need to upgrade the database.');
              // Fallback to localStorage
              const savedTransfers = JSON.parse(localStorage.getItem('wallet-transfers') || '[]');
              if (isMounted.current) {
                setTransfers(savedTransfers.sort((a, b) => new Date(b.date) - new Date(a.date)));
              }
            }
          }
        } else {
          // Fallback to localStorage
          const savedWallets = JSON.parse(localStorage.getItem('wallets') || '[]');
          if (isMounted.current) {
            setWallets(savedWallets.length > 0 ? savedWallets : getDefaultWallets());
          }
          
          const savedTransfers = JSON.parse(localStorage.getItem('wallet-transfers') || '[]');
          if (isMounted.current) {
            setTransfers(savedTransfers.sort((a, b) => new Date(b.date) - new Date(a.date)));
          }
        }
      } catch (error) {
        console.error('Error loading wallet data:', error);
        if (isMounted.current) {
          setError('Failed to load wallets. Please try again.');
          // Fallback to empty arrays
          setWallets(getDefaultWallets());
          setTransfers([]);
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };
    
    loadData();
  }, [dbInitialized]);
  
  // Add a troubleshooting method to force exit loading state
  const forceExitLoading = () => {
    setIsLoading(false);
    setError('');
    // Load default data if needed
    if (wallets.length === 0) {
      setWallets(getDefaultWallets());
    }
    if (transfers.length === 0) {
      setTransfers([]);
    }
  };
  
  // Default wallets if none loaded
  const getDefaultWallets = () => {
    return [
      { id: 'cash', name: 'Cash', type: 'cash', balance: 0 },
      { id: 'bank', name: 'Bank Account', type: 'bank', balance: 0 },
      { id: 'credit', name: 'Credit Card', type: 'credit_card', balance: 0 },
      { id: 'ewallet', name: 'E-Wallet', type: 'e_wallet', balance: 0 },
    ];
  };
  
  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Reset error when user makes changes
    if (error) setError('');
  };

  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Set for submission
      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove uploaded image
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview('');
    setFormData(prev => ({
      ...prev,
      photoUrl: ''
    }));
  };
  
  // Open transfer modal for new transfer
  const handleOpenTransferModal = () => {
    setEditingTransfer(null);
    // Reset form
    setFormData({
      fromWallet: wallets.length >= 2 ? wallets[0].id : '',
      toWallet: wallets.length >= 2 ? wallets[1].id : '',
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      notes: '',
      photoUrl: ''
    });
    setSelectedImage(null);
    setImagePreview('');
    setIsModalOpen(true);
  };

  // Open transfer modal for editing
  const handleEditTransfer = (transfer) => {
    setEditingTransfer(transfer);
    
    // Set form data from the transfer
    setFormData({
      fromWallet: transfer.fromWallet,
      toWallet: transfer.toWallet,
      amount: transfer.amount.toString(),
      date: transfer.date,
      notes: transfer.notes || '',
      photoUrl: transfer.photoUrl || ''
    });
    
    // Set image preview if there's a photo
    if (transfer.photoUrl) {
      setImagePreview(transfer.photoUrl);
    } else {
      setImagePreview('');
    }
    
    setSelectedImage(null);
    setIsModalOpen(true);
  };
  
  // Handle form submission
  const handleTransfer = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    // Validate form
    if (!formData.fromWallet || !formData.toWallet || !formData.amount) {
      setError('Please fill in all required fields.');
      return;
    }
    
    if (formData.fromWallet === formData.toWallet) {
      setError('Source and destination wallets must be different.');
      return;
    }
    
    if (parseFloat(formData.amount) <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    
    // Get source and destination wallets
    const sourceWallet = wallets.find(w => w.id === formData.fromWallet);
    const destWallet = wallets.find(w => w.id === formData.toWallet);
    
    if (!sourceWallet || !destWallet) {
      setError('Invalid wallet selection.');
      return;
    }
    
    let photoUrl = formData.photoUrl;
    
    // Process image if selected
    if (selectedImage) {
      try {
        // For simplicity we'll just store the data URL directly
        // In a production app, you might want to upload to a storage service
        photoUrl = imagePreview;
      } catch (error) {
        console.error('Error processing image:', error);
        setError('Failed to process the image. Please try again.');
        return;
      }
    }
    
    try {
      if (editingTransfer) {
        // Editing existing transfer
        // First, reverse the original transfer effects
        // (this means we add the original amount back to the original source wallet
        // and remove it from the original destination wallet)
        
        // Calculate the balance adjustments
        const origSourceWallet = wallets.find(w => w.id === editingTransfer.fromWallet);
        const origDestWallet = wallets.find(w => w.id === editingTransfer.toWallet);
        
        if (origSourceWallet) {
          // Add back to original source (reverse of the original transfer)
          origSourceWallet.balance = parseFloat(origSourceWallet.balance) + parseFloat(editingTransfer.amount);
        }
        
        if (origDestWallet) {
          // Subtract from original destination (reverse of the original transfer)
          origDestWallet.balance = parseFloat(origDestWallet.balance) - parseFloat(editingTransfer.amount);
        }
        
        // Now apply the new transfer
        if (sourceWallet) {
          // Subtract from new source
          sourceWallet.balance = parseFloat(sourceWallet.balance) - parseFloat(formData.amount);
        }
        
        if (destWallet) {
          // Add to new destination
          destWallet.balance = parseFloat(destWallet.balance) + parseFloat(formData.amount);
        }
        
        // Prepare the updated transfer record
        const updatedTransfer = {
          id: editingTransfer.id,
          fromWallet: formData.fromWallet,
          fromWalletName: sourceWallet.name,
          toWallet: formData.toWallet,
          toWalletName: destWallet.name,
          amount: parseFloat(formData.amount),
          date: formData.date || new Date().toISOString().slice(0, 10),
          notes: formData.notes || '',
          photoUrl: photoUrl || '',
          timestamp: new Date().toISOString()
        };
        
        if (dbInitialized) {
          // Update wallets in DB
          if (origSourceWallet) await walletDB.update(origSourceWallet);
          if (origDestWallet) await walletDB.update(origDestWallet);
          if (sourceWallet.id !== origSourceWallet?.id) await walletDB.update(sourceWallet);
          if (destWallet.id !== origDestWallet?.id) await walletDB.update(destWallet);
          
          // Update transfer record
          await transferDB.update(updatedTransfer);
          
          // Check if component is still mounted before updating state
          if (isMounted.current) {
            // Fetch updated wallets
            const updatedWallets = await walletDB.getAll();
            setWallets(updatedWallets);
            
            // Reload transfers
            const allTransfers = await transferDB.getAll();
            setTransfers(allTransfers.sort((a, b) => new Date(b.date) - new Date(a.date)));
          }
        } else {
          // Handle localStorage
          // Update wallets
          const updatedWallets = wallets.map(wallet => {
            if (wallet.id === origSourceWallet?.id) return origSourceWallet;
            if (wallet.id === origDestWallet?.id) return origDestWallet;
            if (wallet.id === sourceWallet.id) return sourceWallet;
            if (wallet.id === destWallet.id) return destWallet;
            return wallet;
          });
          
          localStorage.setItem('wallets', JSON.stringify(updatedWallets));
          setWallets(updatedWallets);
          
          // Update transfers
          const savedTransfers = JSON.parse(localStorage.getItem('wallet-transfers') || '[]');
          const updatedTransfers = savedTransfers.map(t => 
            t.id === editingTransfer.id ? updatedTransfer : t
          );
          localStorage.setItem('wallet-transfers', JSON.stringify(updatedTransfers));
          
          if (isMounted.current) {
            // Update state
            setTransfers(updatedTransfers.sort((a, b) => new Date(b.date) - new Date(a.date)));
          }
        }
      } else {
        // Create transfer record
        const transferData = {
          id: Date.now(),
          fromWallet: formData.fromWallet,
          fromWalletName: sourceWallet.name,
          toWallet: formData.toWallet,
          toWalletName: destWallet.name,
          amount: parseFloat(formData.amount),
          date: formData.date || new Date().toISOString().slice(0, 10),
          notes: formData.notes || '',
          photoUrl: photoUrl || '',
          timestamp: new Date().toISOString()
        };
        
        // 1. Update source wallet (subtract amount)
        const updatedSourceWallet = {
          ...sourceWallet,
          balance: parseFloat(sourceWallet.balance) - parseFloat(formData.amount)
        };
        
        // 2. Update destination wallet (add amount)
        const updatedDestWallet = {
          ...destWallet,
          balance: parseFloat(destWallet.balance) + parseFloat(formData.amount)
        };
        
        if (dbInitialized) {
          // Update wallets in DB
          await walletDB.update(updatedSourceWallet);
          await walletDB.update(updatedDestWallet);
          
          // Save transfer record - with error handling
          try {
            await transferDB.add(transferData);
            
            // Check if component is still mounted before updating state
            if (isMounted.current) {
              // Fetch updated wallets
              const updatedWallets = await walletDB.getAll();
              setWallets(updatedWallets);
              
              // Reload transfers
              const allTransfers = await transferDB.getAll();
              setTransfers(allTransfers.sort((a, b) => new Date(b.date) - new Date(a.date)));
            }
          } catch (transferError) {
            console.error('Error with transfers, using localStorage instead:', transferError);
            // Fallback to localStorage for transfers if the store doesn't exist
            const savedTransfers = JSON.parse(localStorage.getItem('wallet-transfers') || '[]');
            savedTransfers.push(transferData);
            localStorage.setItem('wallet-transfers', JSON.stringify(savedTransfers));
            
            if (isMounted.current) {
              setTransfers([...savedTransfers].sort((a, b) => new Date(b.date) - new Date(a.date)));
            }
          }
        } else {
          // Update wallets in localStorage
          const updatedWallets = wallets.map(wallet => {
            if (wallet.id === sourceWallet.id) return updatedSourceWallet;
            if (wallet.id === destWallet.id) return updatedDestWallet;
            return wallet;
          });
          
          localStorage.setItem('wallets', JSON.stringify(updatedWallets));
          setWallets(updatedWallets);
          
          // Save transfer record to localStorage
          const savedTransfers = JSON.parse(localStorage.getItem('wallet-transfers') || '[]');
          savedTransfers.push(transferData);
          localStorage.setItem('wallet-transfers', JSON.stringify(savedTransfers));
          
          if (isMounted.current) {
            // Update state
            setTransfers([...savedTransfers].sort((a, b) => new Date(b.date) - new Date(a.date)));
          }
        }
      }
      
      // Reset form and close modal
      if (isMounted.current) {
        setFormData({
          fromWallet: '',
          toWallet: '',
          amount: '',
          date: new Date().toISOString().slice(0, 10),
          notes: '',
          photoUrl: ''
        });
        
        setSelectedImage(null);
        setImagePreview('');
        setEditingTransfer(null);
        setIsModalOpen(false);
      }
      
      // Trigger wallet refresh in parent component
      if (refreshWallets) {
        refreshWallets();
      }
    } catch (error) {
      console.error('Error processing transfer:', error);
      if (isMounted.current) {
        setError('Failed to process the transfer. Please try again.');
      }
    }
  };
  
  // Handle delete transfer
  const handleDeleteTransfer = async (transferId) => {
    if (!window.confirm('Are you sure you want to delete this transfer?')) {
      return;
    }
    
    try {
      // Find the transfer to be deleted
      const transferToDelete = transfers.find(t => t.id === transferId);
      
      if (!transferToDelete) {
        if (isMounted.current) {
          setError('Transfer not found.');
        }
        return;
      }
      
      if (dbInitialized) {
        // First adjust the wallet balances
        const sourceWallet = wallets.find(w => w.id === transferToDelete.fromWallet);
        const destWallet = wallets.find(w => w.id === transferToDelete.toWallet);
        
        if (sourceWallet && destWallet) {
          // Restore the source wallet balance (add the amount back)
          const updatedSourceWallet = {
            ...sourceWallet,
            balance: parseFloat(sourceWallet.balance) + parseFloat(transferToDelete.amount)
          };
          
          // Reduce the destination wallet balance (subtract the amount)
          const updatedDestWallet = {
            ...destWallet,
            balance: parseFloat(destWallet.balance) - parseFloat(transferToDelete.amount)
          };
          
          // Update the wallets
          await walletDB.update(updatedSourceWallet);
          await walletDB.update(updatedDestWallet);
        }
        
        // Now delete the transfer
        await transferDB.delete(transferId);
        
        // Check if component is still mounted before updating state
        if (isMounted.current) {
          // Fetch updated wallets
          const updatedWallets = await walletDB.getAll();
          setWallets(updatedWallets);
          
          // Reload transfers
          const allTransfers = await transferDB.getAll();
          setTransfers(allTransfers.sort((a, b) => new Date(b.date) - new Date(a.date)));
        }
      } else {
        // Handle localStorage
        const savedTransfers = JSON.parse(localStorage.getItem('wallet-transfers') || '[]');
        const updatedTransfers = savedTransfers.filter(t => t.id !== transferId);
        localStorage.setItem('wallet-transfers', JSON.stringify(updatedTransfers));
        
        // Also update wallet balances in localStorage
        const savedWallets = JSON.parse(localStorage.getItem('wallets') || '[]');
        const sourceIndex = savedWallets.findIndex(w => w.id === transferToDelete.fromWallet);
        const destIndex = savedWallets.findIndex(w => w.id === transferToDelete.toWallet);
        
        if (sourceIndex !== -1 && destIndex !== -1) {
          // Add amount back to source wallet
          savedWallets[sourceIndex].balance = parseFloat(savedWallets[sourceIndex].balance) + parseFloat(transferToDelete.amount);
          
          // Subtract amount from destination wallet
          savedWallets[destIndex].balance = parseFloat(savedWallets[destIndex].balance) - parseFloat(transferToDelete.amount);
          
          localStorage.setItem('wallets', JSON.stringify(savedWallets));
          setWallets(savedWallets);
        }
        
        if (isMounted.current) {
          // Update UI
          setTransfers(updatedTransfers.sort((a, b) => new Date(b.date) - new Date(a.date)));
        }
      }
      
      // Refresh wallets in parent component
      if (refreshWallets) {
        refreshWallets();
      }
      
      // Close the modal and reset form when deleting from modal
      if (isMounted.current && editingTransfer && editingTransfer.id === transferId) {
        setEditingTransfer(null);
        setIsModalOpen(false);
        setFormData({
          fromWallet: '',
          toWallet: '',
          amount: '',
          date: new Date().toISOString().slice(0, 10),
          notes: '',
          photoUrl: ''
        });
        setSelectedImage(null);
        setImagePreview('');
      }
    } catch (error) {
      console.error('Error deleting transfer:', error);
      if (isMounted.current) {
        setError('Failed to delete transfer. Please try again.');
      }
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // Get wallet name by ID
  const getWalletName = (walletId) => {
    const wallet = wallets.find(w => w.id === walletId);
    return wallet ? wallet.name : walletId;
  };

  // Update the handleDatabaseReset function
  const handleDatabaseReset = async () => {
    if (window.confirm('This will reset your database to fix schema issues. Your data will be preserved if possible. Continue?')) {
      try {
        if (isMounted.current) {
          setError('Resetting database... Please wait.');
          setIsLoading(true);
        }
        
        const result = await resetDatabase();
        
        if (result) {
          // Force page reload to reinitialize everything
          window.location.reload();
        } else if (isMounted.current) {
          setError('Database reset failed. Please try again or reload the app.');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error resetting database:', error);
        if (isMounted.current) {
          setError('Failed to reset database. Please try reloading the app.');
          setIsLoading(false);
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="py-4">
        <div className="flex justify-center items-center py-12">
          <div className="text-indigo-400">
            <svg className="animate-spin h-10 w-10 mr-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-indigo-300 text-lg font-medium">Loading wallet data...</p>
        </div>
        
        {/* Add a timeout to force exit loading state after 5 seconds */}
        <div className="text-center mt-4">
          <p className="text-gray-500 text-sm">Taking too long?</p>
          <button
            onClick={forceExitLoading}
            className="mt-2 text-sm bg-gray-700 text-red-400 px-3 py-1.5 rounded hover:bg-gray-600"
          >
            Skip Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-indigo-300">Wallet Transfers</h2>
        <button
          onClick={handleOpenTransferModal}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          New Transfer
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-800 rounded-md">
          <div className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-red-400 text-sm">{error}</p>
              {error.includes('NotFoundError') || error.includes('database') ? (
                <button 
                  onClick={handleDatabaseReset}
                  className="mt-2 text-xs bg-red-800 text-red-200 px-3 py-1 rounded hover:bg-red-700 transition-colors"
                >
                  Reset Database Schema
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
      
      {transfers.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
          <div className="mx-auto w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Transfer History</h3>
          <p className="text-gray-400 mb-6">
            Transfer money between your wallets to keep track of all your funds.
          </p>
          <button
            onClick={handleOpenTransferModal}
            className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Make Your First Transfer
          </button>
        </div>
      ) : (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <div className="space-y-4">
            {transfers.map(transfer => (
              <div 
                key={transfer.id}
                className="p-4 rounded-lg cursor-pointer transition-transform hover:scale-[1.01] hover:shadow-md bg-gray-700/80 border-l-4 border-indigo-500"
                onClick={() => handleEditTransfer(transfer)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-white">
                      {transfer.fromWalletName || getWalletName(transfer.fromWallet)} → {transfer.toWalletName || getWalletName(transfer.toWallet)}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Wallet Transfer
                    </div>
                  </div>
                  <div className="font-medium mr-3 text-indigo-400">
                    {formatCurrency(transfer.amount)}
                  </div>
                </div>
                
                {transfer.notes && (
                  <div className="text-sm text-gray-400 mt-2 bg-gray-800/50 p-2 rounded">
                    <span className="font-medium text-xs text-gray-500 block mb-1">Notes:</span>
                    {transfer.notes}
                  </div>
                )}
                
                {transfer.photoUrl && (
                  <div className="mt-3">
                    <img 
                      src={transfer.photoUrl} 
                      alt="Transfer receipt" 
                      className="max-h-32 rounded-md object-cover" 
                    />
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-3">
                  <div className="flex flex-wrap gap-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-900 text-indigo-300">
                      Transfer
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="text-xs text-gray-500">
                      {formatDate(transfer.date)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Transfer Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="bg-gray-800 rounded-lg shadow-lg w-full max-w-md flex flex-col h-[80vh]">
          {/* Sticky Header */}
          <div className="sticky top-0 left-0 right-0 px-6 py-4 bg-gray-800 border-b border-gray-700 z-10">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-indigo-300">
                {editingTransfer ? 'Edit Transfer' : 'New Transfer'}
              </h2>
              <button 
                type="button" 
                className="text-gray-400 hover:text-white p-2 rounded-full bg-gray-700 bg-opacity-50"
                onClick={() => setIsModalOpen(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 pt-2 flex-1 overflow-auto">
            {error && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-800 rounded-md">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            
            <form onSubmit={handleTransfer}>
              <div className="mb-4">
                <label className="block mb-2 font-medium text-gray-300">
                  From Wallet
                </label>
                <select
                  name="fromWallet"
                  value={formData.fromWallet}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="" disabled>Select source wallet</option>
                  {wallets.map(wallet => (
                    <option key={`from-${wallet.id}`} value={wallet.id}>
                      {wallet.name} ({formatCurrency(wallet.balance)})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block mb-2 font-medium text-gray-300">
                  To Wallet
                </label>
                <select
                  name="toWallet"
                  value={formData.toWallet}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="" disabled>Select destination wallet</option>
                  {wallets.map(wallet => (
                    <option key={`to-${wallet.id}`} value={wallet.id}>
                      {wallet.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block mb-2 font-medium text-gray-300">
                  Amount
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block mb-2 font-medium text-gray-300">
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block mb-2 font-medium text-gray-300">
                  Notes (Optional)
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                  placeholder="Add any details about this transfer"
                ></textarea>
              </div>
              
              <div className="mb-4">
                <label className="block mb-2 font-medium text-gray-300">
                  Photo (Optional)
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-700 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    {imagePreview ? (
                      <div>
                        <img 
                          src={imagePreview} 
                          alt="Receipt preview" 
                          className="mx-auto h-32 w-auto rounded" 
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="mt-2 inline-flex items-center px-2.5 py-1.5 border border-gray-600 text-xs font-medium rounded text-red-300 bg-gray-800 hover:bg-gray-700"
                        >
                          Remove Image
                        </button>
                      </div>
                    ) : (
                      <div>
                        <svg className="mx-auto h-12 w-12 text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="flex text-sm text-gray-400">
                          <label className="relative cursor-pointer bg-gray-800 rounded-md font-medium text-indigo-300 hover:text-indigo-400">
                            <span>Upload receipt</span>
                            <input 
                              type="file" 
                              className="sr-only" 
                              accept="image/*"
                              onChange={handleImageChange}
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, GIF up to 10MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="pb-2"></div>
            </form>
          </div>
          
          {/* Sticky Footer */}
          <div className="sticky bottom-0 left-0 right-0 px-6 py-4 bg-gray-800 border-t border-gray-700 shadow-lg">
            <div className="flex justify-between items-center">
              {editingTransfer && (
                <button
                  type="button"
                  onClick={() => handleDeleteTransfer(editingTransfer.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-300"
                >
                  Delete
                </button>
              )}
              {!editingTransfer && <div></div>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors duration-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTransfer}
                  className="px-4 py-2 text-white rounded-md transition-colors duration-300 bg-indigo-600 hover:bg-indigo-700"
                >
                  {editingTransfer ? 'Save Changes' : 'Complete Transfer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WalletTransfer; 