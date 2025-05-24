import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Button,
  Text,
  Heading,
  Flex,
  useDisclosure,
  Center,
  Spinner
} from '@chakra-ui/react';
import { FiEdit2 as EditIcon, FiTrash2 as DeleteIcon, FiPlus as AddIcon, FiDollarSign, FiHome, FiCreditCard, FiSmartphone } from 'react-icons/fi';
import { walletDB as supabaseWalletDB } from '../utils/supabase-db';
import { useAuth } from '../contexts/AuthContext';

const walletTypeConfig = {
  cash: {
    icon: FiDollarSign,
    color: 'green',
    label: 'Cash'
  },
  bank: {
    icon: FiHome,
    color: 'blue',
    label: 'Bank Account'
  },
  credit_card: {
    icon: FiCreditCard,
    color: 'purple',
    label: 'Credit Card'
  },
  e_wallet: {
    icon: FiSmartphone,
    color: 'orange',
    label: 'E-Wallet'
  }
};

// Simplified - removed modal and card components for testing

function Wallets({ dbInitialized = false }) {
  const { user } = useAuth();
  const [wallets, setWallets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { onOpen: onModalOpen } = useDisclosure();

  const loadWallets = useCallback(async () => {
    setIsLoading(true);
    try {
      if (dbInitialized && user) {
        const walletData = await supabaseWalletDB.getAll(user.id);
        setWallets(walletData || []);
      } else {
        const savedWallets = localStorage.getItem('wallets');
        if (savedWallets) {
          setWallets(JSON.parse(savedWallets));
        } else {
          setWallets([]);
        }
      }
    } catch (error) {
      console.error('Error loading wallets:', error);
      setError('Failed to load wallets. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [dbInitialized, user]);

  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const totalBalance = wallets.reduce((total, wallet) => total + (wallet.balance || 0), 0);

  if (isLoading) {
    return (
      <Container maxW="6xl" py={6}>
        <Center py={12}>
          <VStack spacing={4}>
            <Spinner size="xl" color="blue.500" />
            <Text fontSize="lg" fontWeight="medium">
              Loading wallets...
            </Text>
          </VStack>
        </Center>
      </Container>
    );
  }

  return (
    <Container maxW="6xl" py={8} pb={24}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Heading size="lg" color="blue.700" fontWeight="bold" letterSpacing="tight">
            Wallets
          </Heading>
          <Button colorScheme="blue" leftIcon={<AddIcon />} size="md" fontWeight="bold" onClick={onModalOpen}>
            Add Wallet
          </Button>
        </Flex>

        {/* Total Balance */}
        <Box
          p={6}
          borderWidth={1}
          borderRadius="lg"
          boxShadow="sm"
          bg="gray.50"
          textAlign="center"
        >
          <Text fontSize="md" color="gray.500" fontWeight="medium">
            Total Balance
          </Text>
          <Text fontSize="3xl" fontWeight="extrabold" color="green.600" letterSpacing="tight">
            {formatCurrency(totalBalance)}
          </Text>
          <Text fontSize="sm" color="gray.400">
            Across {wallets.length} wallet{wallets.length !== 1 ? 's' : ''}
          </Text>
        </Box>

        {/* Error */}
        {error && (
          <Box p={3} bg="red.100" border="1px" borderColor="red.300" borderRadius="md">
            <Text color="red.700">{error}</Text>
          </Box>
        )}

        {/* Wallets List */}
        <VStack spacing={4} align="stretch">
          {wallets.length > 0 ? (
            wallets.map(wallet => {
              const config = walletTypeConfig[wallet.type] || walletTypeConfig.cash;
              const Icon = config.icon;
              return (
                <Flex
                  key={wallet.id}
                  p={5}
                  borderWidth={1}
                  borderRadius="lg"
                  bg="white"
                  align="center"
                  boxShadow="xs"
                  borderLeft="6px solid"
                  borderColor={`${config.color}.400`}
                  _hover={{ boxShadow: "md", bg: "gray.50" }}
                  transition="box-shadow 0.2s, background 0.2s"
                >
                  {/* Icon */}
                  <Box
                    mr={4}
                    p={2}
                    borderRadius="md"
                    bg={`${config.color}.50`}
                    color={`${config.color}.600`}
                    fontSize="2xl"
                    minW="40px"
                    textAlign="center"
                  >
                    {Icon ? <Icon /> : "💰"}
                  </Box>
                  {/* Info */}
                  <Box flex="1">
                    <Text fontWeight="bold" fontSize="lg" color="gray.800">
                      {wallet.name}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      {config.label}
                    </Text>
                    <Text fontSize="xl" fontWeight="bold" color={wallet.balance >= 0 ? "green.600" : "red.600"}>
                      {formatCurrency(wallet.balance || 0)}
                    </Text>
                  </Box>
                  {/* Actions */}
                  <HStack spacing={2}>
                    <Button size="sm" variant="outline" colorScheme="blue" leftIcon={<EditIcon />}>
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" colorScheme="red" leftIcon={<DeleteIcon />}>
                      Delete
                    </Button>
                  </HStack>
                </Flex>
              );
            })
          ) : (
            <Box p={8} borderWidth={1} borderRadius="md" boxShadow="md" bg="white" textAlign="center">
              <Center>
                <VStack spacing={4}>
                  <Box
                    p={4}
                    borderRadius="full"
                    bg="gray.100"
                    fontSize="3xl"
                  >
                    💳
                  </Box>
                  <VStack spacing={2}>
                    <Text fontSize="lg" fontWeight="semibold">
                      No wallets yet
                    </Text>
                    <Text color="gray.500" textAlign="center">
                      Create your first wallet to start tracking your expenses
                    </Text>
                  </VStack>
                  <Button
                    colorScheme="blue"
                    size="md"
                    fontWeight="bold"
                    leftIcon={<AddIcon />}
                    onClick={onModalOpen}
                  >
                    Add Your First Wallet
                  </Button>
                </VStack>
              </Center>
            </Box>
          )}
        </VStack>
      </VStack>
    </Container>
  );
}

export default Wallets; 