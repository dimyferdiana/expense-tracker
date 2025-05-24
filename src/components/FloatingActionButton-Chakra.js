import React from 'react';
import {
  IconButton
} from '@chakra-ui/react';
import { useColorModeValue } from './ui/color-mode';
import { FiPlus as AddIcon } from 'react-icons/fi';

function FloatingActionButton({ onClick }) {
  const bgColor = useColorModeValue('blue.600', 'blue.500');
  const hoverBg = useColorModeValue('blue.700', 'blue.600');
  
  return (
    <IconButton
      position="fixed"
      right={6}
      bottom={{ base: 24, md: 8 }}
      size="lg"
      w={14}
      h={14}
      borderRadius="full"
      bg={bgColor}
      color="white"
      _hover={{ 
        bg: hoverBg,
        transform: 'scale(1.1)'
      }}
      _focus={{
        boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.5)'
      }}
      shadow="lg"
      zIndex={40}
      transition="all 0.3s"
      onClick={onClick}
      icon={<AddIcon boxSize={6} />}
      aria-label="Add new expense"
    />
  );
}

export default FloatingActionButton; 