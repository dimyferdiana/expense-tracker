import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Button,
  Input,
  Text,
  Heading,
  IconButton,
  Flex,
  useDisclosure,
  Center,
  Spinner,
  Badge,
  Textarea,
  Select,
  NumberInput,
  Alert,
  AlertTitle,
  Progress,
  SimpleGrid
} from '@chakra-ui/react';
import { useColorModeValue } from './ui/color-mode';
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
  DialogTitle
} from './ui/dialog';
import { 
  FiPlus as AddIcon,
  FiEdit2 as EditIcon,
  FiTrash2 as DeleteIcon,
  FiTarget,
  FiTrendingUp,
  FiTrendingDown
} from 'react-icons/fi';
import { budgetDB as supabaseBudgetDB, expenseDB as supabaseExpenseDB, categoryDB as supabaseCategoryDB } from '../utils/supabase-db';
import { useAuth } from '../contexts/AuthContext';

function BudgetModal({ isOpen, onClose, onSave, budget = null, categories = [] }) {
  if (!isOpen) return null;
  return (
    <Box p={6} bg="white" borderWidth={1} borderRadius="md" position="fixed" top="20%" left="50%" transform="translateX(-50%)" zIndex={1000} minW="320px" boxShadow="lg">
      <Text fontWeight="bold" fontSize="xl" mb={4}>{budget ? "Edit Budget" : "Add New Budget"}</Text>
      {/* You can add form fields here if you want, or just keep it simple for now */}
      <Button onClick={onClose} mt={4} colorScheme="blue">Close</Button>
    </Box>
  );
}

function BudgetCard({ budget, spent, onEdit, onDelete, categoryName }) {
  return (
    <Box p={4} borderWidth={1} borderRadius="md" mb={4}>
      <Text fontWeight="bold">{budget.name}</Text>
      <Text>{categoryName}</Text>
      <Text>{spent} spent of {budget.amount}</Text>
      <Button onClick={onEdit} size="sm" mr={2}>Edit</Button>
      <Button onClick={onDelete} size="sm" colorScheme="red">Delete</Button>
    </Box>
  );
}

const toaster = {
  create: () => {}
}; // Dummy toaster for compatibility

function BudgetManager({ dbInitialized = false, refresh = 0 }) {
  const { user } = useAuth();
  
  // Color mode values
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedTextColor = useColorModeValue('gray.600', 'gray.400');

  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingBudget, setEditingBudget] = useState(null);
  
  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();

  useEffect(() => {
    loadData();
  }, [dbInitialized, user, refresh]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (dbInitialized && user) {
        const [budgetData, categoryData, expenseData] = await Promise.all([
          supabaseBudgetDB.getAll(user.id),
          supabaseCategoryDB.getAll(user.id),
          supabaseExpenseDB.getAll(user.id)
        ]);
        setBudgets(budgetData || []);
        setCategories(categoryData || []);
        setExpenses(expenseData || []);
      } else {
        const savedBudgets = localStorage.getItem('budgets');
        const savedCategories = localStorage.getItem('expense-categories');
        const savedExpenses = localStorage.getItem('expenses');
        
        if (savedBudgets) setBudgets(JSON.parse(savedBudgets));
        if (savedCategories) setCategories(JSON.parse(savedCategories));
        if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load budgets. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBudget = async (budgetData) => {
    try {
      if (editingBudget) {
        const updatedBudget = { ...editingBudget, ...budgetData };
        if (dbInitialized && user) {
          await supabaseBudgetDB.update(updatedBudget, user.id);
        } else {
          const updatedBudgets = budgets.map(b => 
            b.id === editingBudget.id ? updatedBudget : b
          );
          setBudgets(updatedBudgets);
          localStorage.setItem('budgets', JSON.stringify(updatedBudgets));
        }
        toaster.create({
          title: 'Budget Updated',
          description: `${updatedBudget.name} has been updated successfully`,
          status: 'success',
          duration: 3000,
        });
      } else {
        const newBudget = {
          id: Date.now().toString(),
          ...budgetData,
          created_at: new Date().toISOString()
        };
        if (dbInitialized && user) {
          await supabaseBudgetDB.add(newBudget, user.id);
        } else {
          const updatedBudgets = [...budgets, newBudget];
          setBudgets(updatedBudgets);
          localStorage.setItem('budgets', JSON.stringify(updatedBudgets));
        }
        toaster.create({
          title: 'Budget Added',
          description: `${newBudget.name} has been added successfully`,
          status: 'success',
          duration: 3000,
        });
      }
      
      onModalClose();
      setEditingBudget(null);
      loadData();
    } catch (error) {
      console.error('Error saving budget:', error);
      throw new Error('Failed to save budget. Please try again.');
    }
  };

  const handleDeleteBudget = async (id) => {
    const budget = budgets.find(b => b.id === id);
    if (!budget) return;

    const confirmed = window.confirm(`Delete "${budget.name}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      if (dbInitialized && user) {
        await supabaseBudgetDB.delete(id, user.id);
      } else {
        const updatedBudgets = budgets.filter(b => b.id !== id);
        setBudgets(updatedBudgets);
        localStorage.setItem('budgets', JSON.stringify(updatedBudgets));
      }
      
      toaster.create({
        title: 'Budget Deleted',
        description: `${budget.name} has been deleted`,
        status: 'info',
        duration: 3000,
      });
      
      loadData();
    } catch (error) {
      console.error('Error deleting budget:', error);
      toaster.create({
        title: 'Error',
        description: 'Failed to delete budget. Please try again.',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const getSpentAmount = (budgetCategory) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return expenses
      .filter(expense => {
        if (expense.is_income) return false;
        if (expense.category !== budgetCategory) return false;
        
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === currentMonth && 
               expenseDate.getFullYear() === currentYear;
      })
      .reduce((total, expense) => total + expense.amount, 0);
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : categoryId;
  };

  const totalBudget = budgets.reduce((total, budget) => total + budget.amount, 0);
  const totalSpent = budgets.reduce((total, budget) => total + getSpentAmount(budget.category), 0);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Container maxW="6xl" py={6}>
        <Center py={12}>
          <VStack spacing={4}>
            <Spinner size="xl" color="blue.500" />
            <Text color={mutedTextColor} fontSize="lg" fontWeight="medium">
              Loading budgets...
            </Text>
          </VStack>
        </Center>
      </Container>
    );
  }

  return (
    <Container maxW="6xl" py={6} pb={24}>
      <VStack spacing={6} align="stretch">
        <Flex justify="space-between" align="center">
          <Heading size="lg" color="blue.400">
            Budget Manager
          </Heading>
          <Button
            leftIcon={<AddIcon />}
            colorScheme="blue"
            onClick={() => {
              setEditingBudget(null);
              onModalOpen();
            }}
            isDisabled={categories.length === 0}
          >
            Add Budget
          </Button>
        </Flex>

        {error && (
          <Alert status="error">
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}

        {categories.length === 0 && (
          <Alert status="warning">
            <AlertTitle>No categories found</AlertTitle>
            <Text>Please add some categories in Settings before creating budgets.</Text>
          </Alert>
        )}

        {/* Total Budget Overview */}
        {budgets.length > 0 && (
          <Box>
            <Text fontSize="2xl" fontWeight="bold" color="blue.500" mb={4}>
              Total Budget Overview
            </Text>
            <Flex justify="space-between" align="center">
              <Text fontSize="lg" fontWeight="medium">
                Total Budget: {formatCurrency(totalBudget)}
              </Text>
              <Text fontSize="lg" fontWeight="medium">
                Total Spent: {formatCurrency(totalSpent)}
              </Text>
            </Flex>
            <Flex justify="space-between" align="center">
              <Text fontSize="lg" fontWeight="medium">
                Remaining: {formatCurrency(totalBudget - totalSpent)}
              </Text>
              <Text fontSize="lg" fontWeight="medium">
                {totalBudget > 0 ? `${((totalSpent / totalBudget) * 100).toFixed(1)}% of budget` : ''}
              </Text>
            </Flex>
          </Box>
        )}

        {/* Budgets Grid */}
        {budgets.length > 0 ? (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {budgets.map(budget => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                spent={getSpentAmount(budget.category)}
                categoryName={getCategoryName(budget.category)}
                onEdit={() => {
                  setEditingBudget(budget);
                  onModalOpen();
                }}
                onDelete={() => handleDeleteBudget(budget.id)}
              />
            ))}
          </SimpleGrid>
        ) : (
          <Box>
            <Text fontSize="lg" fontWeight="semibold" color={textColor} mb={4}>
              No budgets yet
            </Text>
            <Text color={mutedTextColor} textAlign="center">
              Create your first budget to track your spending goals
            </Text>
            {categories.length > 0 && (
              <Button
                leftIcon={<AddIcon />}
                colorScheme="blue"
                onClick={() => {
                  setEditingBudget(null);
                  onModalOpen();
                }}
              >
                Create Your First Budget
              </Button>
            )}
          </Box>
        )}
      </VStack>

      <BudgetModal
        isOpen={isModalOpen}
        onClose={() => {
          onModalClose();
          setEditingBudget(null);
        }}
        onSave={handleSaveBudget}
        budget={editingBudget}
        categories={categories}
      />
    </Container>
  );
}

export default BudgetManager; 