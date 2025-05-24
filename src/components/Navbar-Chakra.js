import React from 'react';
import {
  Box,
  Flex,
  Button,
  Link,
  Text,
  Separator,
  Spacer,
  HStack
} from '@chakra-ui/react';
import { useColorModeValue } from './ui/color-mode';

export function Navbar({ children, ...props }) {
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.800');

  return (
    <Box
      as="nav"
      bg={bgColor}
      borderBottomWidth={1}
      borderColor={borderColor}
      px={4}
      py={2}
      position="fixed"
      top={0}
      left={0}
      right={0}
      zIndex={30}
      shadow="sm"
      {...props}
    >
      <Flex align="center" justify="space-between">
        {children}
      </Flex>
    </Box>
  );
}

export function NavbarDivider(props) {
  const borderColor = useColorModeValue('gray.300', 'gray.700');
  
  return (
    <Separator
      orientation="vertical"
      h={6}
      borderColor={borderColor}
      mx={3}
      {...props}
    />
  );
}

export function NavbarSection({ children, ...props }) {
  return (
    <HStack spacing={2} {...props}>
      {children}
    </HStack>
  );
}

export function NavbarSpacer(props) {
  return <Spacer {...props} />;
}

export function NavbarItem({ 
  children, 
  href,
  current = false,
  onClick,
  leftIcon,
  rightIcon,
  ...props
}) {
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const hoverBg = useColorModeValue('gray.100', 'gray.800');
  const hoverColor = useColorModeValue('gray.800', 'white');
  const activeBg = useColorModeValue('blue.500', 'blue.600');
  const activeColor = 'white';
  
  const buttonProps = {
    size: 'sm',
    variant: current ? 'solid' : 'ghost',
    colorScheme: current ? 'blue' : undefined,
    bg: current ? activeBg : undefined,
    color: current ? activeColor : textColor,
    _hover: current ? { bg: 'blue.600' } : { bg: hoverBg, color: hoverColor },
    fontWeight: 'medium',
    borderRadius: 'md',
    leftIcon,
    rightIcon,
    transition: 'all 0.2s',
    ...props
  };

  if (href) {
    return (
      <Link
        href={href}
        _hover={{ textDecoration: 'none' }}
      >
        <Button {...buttonProps}>
          {children}
        </Button>
      </Link>
    );
  }

  return (
    <Button onClick={onClick} {...buttonProps}>
      {children}
    </Button>
  );
}

export function NavbarLabel({ children, ...props }) {
  return (
    <Text ml={2} fontSize="sm" fontWeight="medium" {...props}>
      {children}
    </Text>
  );
}

export function NavbarBrand({ children, href, ...props }) {
  const brandColor = useColorModeValue('blue.600', 'blue.400');
  const brandHoverColor = useColorModeValue('blue.700', 'blue.300');
  
  const content = (
    <Text
      fontSize="xl"
      fontWeight="bold"
      color={brandColor}
      _hover={{ color: brandHoverColor }}
      transition="color 0.2s"
      {...props}
    >
      {children}
    </Text>
  );

  if (href) {
    return (
      <Link href={href} _hover={{ textDecoration: 'none' }}>
        {content}
      </Link>
    );
  }

  return content;
}

export function NavbarDropdown({ 
  children, 
  trigger, 
  isOpen, 
  onToggle,
  ...props 
}) {
  const buttonHoverBg = useColorModeValue('gray.100', 'gray.800');
  const dropdownBg = useColorModeValue('white', 'gray.800');
  const dropdownBorderColor = useColorModeValue('gray.200', 'gray.700');
  
  return (
    <Box position="relative" {...props}>
      <Button
        onClick={onToggle}
        variant="ghost"
        size="sm"
        rightIcon={
          <Box
            transform={isOpen ? 'rotate(180deg)' : 'rotate(0deg)'}
            transition="transform 0.2s"
          >
            ▼
          </Box>
        }
        _hover={{ bg: buttonHoverBg }}
      >
        {trigger}
      </Button>
      
      {isOpen && (
        <Box
          position="absolute"
          top="100%"
          left={0}
          mt={1}
          bg={dropdownBg}
          border="1px"
          borderColor={dropdownBorderColor}
          borderRadius="md"
          shadow="lg"
          py={2}
          minW="200px"
          zIndex={50}
        >
          {children}
        </Box>
      )}
    </Box>
  );
}

export function NavbarDropdownItem({ children, onClick, href, ...props }) {
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  
  const buttonProps = {
    w: 'full',
    justifyContent: 'flex-start',
    variant: 'ghost',
    size: 'sm',
    px: 4,
    py: 2,
    _hover: { bg: hoverBg },
    onClick,
    ...props
  };

  if (href) {
    return (
      <Link href={href} _hover={{ textDecoration: 'none' }}>
        <Button {...buttonProps}>
          {children}
        </Button>
      </Link>
    );
  }

  return (
    <Button {...buttonProps}>
      {children}
    </Button>
  );
}

export default Navbar; 