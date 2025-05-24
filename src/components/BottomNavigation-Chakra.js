import React from 'react';
import {
  Box,
  Grid,
  Button,
  VStack,
  Text,
  Icon
} from '@chakra-ui/react';
import { useColorModeValue } from './ui/color-mode';
import { 
  FiHome, 
  FiList, 
  FiCreditCard, 
  FiPieChart, 
  FiSettings 
} from 'react-icons/fi';

const navItems = [
  { id: 'home', label: 'Home', icon: FiHome },
  { id: 'transactions', label: 'Transactions', icon: FiList },
  { id: 'wallets', label: 'Wallets', icon: FiCreditCard },
  { id: 'budgets', label: 'Budgets', icon: FiPieChart },
  { id: 'settings', label: 'Settings', icon: FiSettings }
];

function BottomNavigation({ activeTab, onChange }) {
  const bgColor = useColorModeValue('white', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.800');
  const activeColor = useColorModeValue('blue.500', 'blue.400');
  const inactiveColor = useColorModeValue('gray.500', 'gray.500');
  const hoverColor = useColorModeValue('gray.700', 'gray.300');

  return (
    <Box
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      bg={bgColor}
      borderTopWidth={1}
      borderColor={borderColor}
      zIndex={30}
      shadow="lg"
      pb="env(safe-area-inset-bottom)" // For iPhone home indicator
    >
      <Grid 
        templateColumns={`repeat(${navItems.length}, 1fr)`}
        maxW="lg"
        mx="auto"
        px={2}
      >
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            onClick={() => onChange(item.id)}
            py={3}
            px={2}
            h="auto"
            minH="60px"
            borderRadius="none"
            _hover={{
              bg: 'transparent',
              color: activeTab === item.id ? activeColor : hoverColor
            }}
            _active={{
              bg: 'transparent'
            }}
            _focus={{
              boxShadow: 'none'
            }}
          >
            <VStack spacing={1}>
              <Icon
                as={item.icon}
                boxSize={6}
                color={activeTab === item.id ? activeColor : inactiveColor}
                transition="color 0.2s"
              />
              <Text
                fontSize="xs"
                fontWeight={activeTab === item.id ? 'semibold' : 'normal'}
                color={activeTab === item.id ? activeColor : inactiveColor}
                transition="color 0.2s"
                lineHeight="shorter"
              >
                {item.label}
              </Text>
              {activeTab === item.id && (
                <Box
                  w={1}
                  h={1}
                  bg={activeColor}
                  borderRadius="full"
                  transition="all 0.2s"
                />
              )}
            </VStack>
          </Button>
        ))}
      </Grid>
    </Box>
  );
}

export default BottomNavigation; 