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
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Spinner,
  Flex,
  Spacer,
  Grid,
  GridItem,
  IconButton,
  Wrap,
  WrapItem,
  useDisclosure,
  SimpleGrid,
  Center,
  Divider,
  FormControl,
  FormLabel,
  FormErrorMessage,
  useToast
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
  FiInfo as InfoIcon,
  FiAlertTriangle as WarningIcon
} from 'react-icons/fi';
import { FiDatabase, FiHardDrive } from 'react-icons/fi';
import { 
  categoryDB as supabaseCategoryDB, 
  tagDB as supabaseTagDB 
} from '../utils/supabase-db';
import { colorClasses, getColorClasses, getColorName, availableColors } from '../utils/colors';
import { useAuth } from '../contexts/AuthContext';

function CategoryModal({ isOpen, onClose, onSave, category = null }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('blue');
  const [error, setError] = useState('');
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedTextColor = useColorModeValue('gray.600', 'gray.400');

  useEffect(() => {
    if (isOpen) {
      if (category) {
        setName(category.name);
        setColor(getColorName(category.color) || 'blue');
      } else {
        setName('');
        setColor('blue');
      }
      setError('');
    }
  }, [isOpen, category]);

  const handleSave = () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    
    onSave({ 
      name: name.trim(), 
      color: getColorClasses(color)
    });
    setError('');
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(details) => !details.open && onClose()}>
      <DialogContent bg={cardBg} color={textColor} maxW="md">
        <DialogHeader>
          <DialogTitle>
            {category ? 'Edit Category' : 'Add New Category'}
          </DialogTitle>
        </DialogHeader>
        <DialogCloseTrigger />
        
        <DialogBody>
          <VStack spacing={4}>
            {error && (
              <Alert status="error">
                <AlertIcon />
                <AlertTitle>{error}</AlertTitle>
              </Alert>
            )}
            
            <FormControl isRequired isInvalid={!name.trim() && !!error}>
              <FormLabel>Name</FormLabel>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Category name"
                autoFocus
              />
              {!name.trim() && !!error && <FormErrorMessage>Name is required.</FormErrorMessage>}
            </FormControl>
            
            <FormControl>
              <FormLabel>Preview</FormLabel>
              <Box>
                <Badge colorScheme={color} px={3} py={1} borderRadius="full">
                  {name || 'Category Preview'}
                </Badge>
              </Box>
            </FormControl>
            
            <FormControl>
              <FormLabel>Color</FormLabel>
              <SimpleGrid columns={6} spacing={2}>
                {availableColors.map(colorName => (
                  <Button
                    key={colorName}
                    w={10}
                    h={10}
                    borderRadius="full"
                    colorScheme={colorName}
                    variant={color === colorName ? 'solid' : 'outline'}
                    onClick={() => setColor(colorName)}
                    border={color === colorName ? '3px solid' : '2px solid'}
                    borderColor={color === colorName ? 'blue.500' : 'transparent'}
                  />
                ))}
              </SimpleGrid>
            </FormControl>
          </VStack>
        </DialogBody>
        
        <DialogFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSave}>
            {category ? 'Save Changes' : 'Add Category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}

function TagModal({ isOpen, onClose, onSave, tag = null }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('blue');
  const [error, setError] = useState('');
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');

  useEffect(() => {
    if (isOpen) {
      if (tag) {
        setName(tag.name);
        setColor(tag.color || 'blue');
      } else {
        setName('');
        setColor('blue');
      }
      setError('');
    }
  }, [isOpen, tag]);

  const handleSave = () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    
    onSave({ 
      name: name.trim(), 
      color: color
    });
    setError('');
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(details) => !details.open && onClose()}>
      <DialogContent bg={cardBg} color={textColor} maxW="md">
        <DialogHeader>
          <DialogTitle>
            {tag ? 'Edit Tag' : 'Add New Tag'}
          </DialogTitle>
        </DialogHeader>
        <DialogCloseTrigger />
        
        <DialogBody>
          <VStack spacing={4}>
            {error && (
              <Alert status="error">
                <AlertIcon />
                <AlertTitle>{error}</AlertTitle>
              </Alert>
            )}
            
            <FormControl isRequired isInvalid={!name.trim() && !!error}>
              <FormLabel>Name</FormLabel>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Tag name"
                autoFocus
              />
              {!name.trim() && !!error && <FormErrorMessage>Name is required.</FormErrorMessage>}
            </FormControl>
            
            <FormControl>
              <FormLabel>Preview</FormLabel>
              <Box>
                <Badge colorScheme={color} px={3} py={1} borderRadius="full">
                  {name || 'Tag Preview'}
                </Badge>
              </Box>
            </FormControl>
            
            <FormControl>
              <FormLabel>Color</FormLabel>
              <SimpleGrid columns={6} spacing={2}>
                {availableColors.map(colorName => (
                  <Button
                    key={colorName}
                    w={10}
                    h={10}
                    borderRadius="full"
                    colorScheme={colorName}
                    variant={color === colorName ? 'solid' : 'outline'}
                    onClick={() => setColor(colorName)}
                    border={color === colorName ? '3px solid' : '2px solid'}
                    borderColor={color === colorName ? 'blue.500' : 'transparent'}
                  />
                ))}
              </SimpleGrid>
            </FormControl>
          </VStack>
        </DialogBody>
        
        <DialogFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSave}>
            {tag ? 'Save Changes' : 'Add Tag'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}

function Settings({ dbInitialized = false }) {
  const { user } = useAuth();
  const toast = useToast();
  
  // Color mode values
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedTextColor = useColorModeValue('gray.600', 'gray.400');
  const listItemBg = useColorModeValue('gray.50', 'gray.700');

  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingTag, setEditingTag] = useState(null);
  
  const { isOpen: isCategoryModalOpen, onOpen: onCategoryModalOpen, onClose: onCategoryModalClose } = useDisclosure();
  const { isOpen: isTagModalOpen, onOpen: onTagModalOpen, onClose: onTagModalClose } = useDisclosure();

  useEffect(() => {
    loadData();
  }, [dbInitialized, user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (dbInitialized && user) {
        const categoryData = await supabaseCategoryDB.getAll(user.id);
        const tagData = await supabaseTagDB.getAll(user.id);
        setCategories(categoryData || []);
        setTags(tagData || []);
      } else {
        loadFromLocalStorage();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data. Please try again.');
      loadFromLocalStorage();
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromLocalStorage = () => {
    const savedCategories = localStorage.getItem('expense-categories');
    const savedTags = localStorage.getItem('expense-tags');
    
    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    }
    
    if (savedTags) {
      setTags(JSON.parse(savedTags));
    }
  };

  const handleCategorySave = async (categoryData) => {
    try {
      if (editingCategory) {
        const updatedCategory = { ...editingCategory, ...categoryData };
        if (dbInitialized && user) {
          await supabaseCategoryDB.update(updatedCategory, user.id);
        } else {
          const updatedCategories = categories.map(c => 
            c.id === editingCategory.id ? updatedCategory : c
          );
          setCategories(updatedCategories);
          localStorage.setItem('expense-categories', JSON.stringify(updatedCategories));
        }
        toast({
          title: 'Category Updated',
          description: `${updatedCategory.name} has been updated successfully.`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        const newCategory = {
          id: categoryData.name.toLowerCase().replace(/\s+/g, '-'),
          ...categoryData
        };
        if (dbInitialized && user) {
          await supabaseCategoryDB.add(newCategory, user.id);
        } else {
          const updatedCategories = [...categories, newCategory];
          setCategories(updatedCategories);
          localStorage.setItem('expense-categories', JSON.stringify(updatedCategories));
        }
        toast({
          title: 'Category Added',
          description: `${newCategory.name} has been added successfully.`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
      
      onCategoryModalClose();
      setEditingCategory(null);
      loadData();
    } catch (error) {
      console.error('Error saving category:', error);
      toast({
        title: 'Error Saving Category',
        description: error.message || 'Failed to save category. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleTagSave = async (tagData) => {
    try {
      if (editingTag) {
        const updatedTag = { ...editingTag, ...tagData };
        if (dbInitialized && user) {
          await supabaseTagDB.update(updatedTag, user.id);
        } else {
          const updatedTags = tags.map(t => 
            t.id === editingTag.id ? updatedTag : t
          );
          setTags(updatedTags);
          localStorage.setItem('expense-tags', JSON.stringify(updatedTags));
        }
        toast({
          title: 'Tag Updated',
          description: `${updatedTag.name} has been updated successfully.`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        const newTag = {
          id: tagData.name.toLowerCase().replace(/\s+/g, '-'),
          ...tagData
        };
        if (dbInitialized && user) {
          await supabaseTagDB.add(newTag, user.id);
        } else {
          const updatedTags = [...tags, newTag];
          setTags(updatedTags);
          localStorage.setItem('expense-tags', JSON.stringify(updatedTags));
        }
        toast({
          title: 'Tag Added',
          description: `${newTag.name} has been added successfully.`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
      onTagModalClose();
      setEditingTag(null);
      loadData();
    } catch (error) {
      console.error('Error saving tag:', error);
      toast({
        title: 'Error Saving Tag',
        description: error.message || 'Failed to save tag. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDeleteCategory = async (id) => {
    const category = categories.find(c => c.id === id);
    if (!category) return;

    const confirmed = window.confirm(`Delete "${category.name}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      if (dbInitialized && user) {
        await supabaseCategoryDB.delete(id, user.id);
      } else {
        const updatedCategories = categories.filter(c => c.id !== id);
        setCategories(updatedCategories);
        localStorage.setItem('expense-categories', JSON.stringify(updatedCategories));
      }
      
      toast({
        title: 'Category Deleted',
        description: `${category.name} has been deleted.`,
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      
      loadData();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: 'Error Deleting Category',
        description: error.message || 'Failed to delete category. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDeleteTag = async (id) => {
    const tag = tags.find(t => t.id === id);
    if (!tag) return;

    const confirmed = window.confirm(`Delete "${tag.name}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      if (dbInitialized && user) {
        await supabaseTagDB.delete(id, user.id);
      } else {
        const updatedTags = tags.filter(t => t.id !== id);
        setTags(updatedTags);
        localStorage.setItem('expense-tags', JSON.stringify(updatedTags));
      }
      
      toast({
        title: 'Tag Deleted',
        description: `${tag.name} has been deleted.`,
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      
      loadData();
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast({
        title: 'Error Deleting Tag',
        description: error.message || 'Failed to delete tag. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={6} bg={bgColor} minH="100vh">
        <Center h="50vh">
          <VStack spacing={4}>
            <Spinner size="xl" color="blue.500" />
            <Text fontSize="lg" fontWeight="medium" color={mutedTextColor}>
              Loading settings...
            </Text>
          </VStack>
        </Center>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={6} bg={bgColor} color={textColor}>
      <VStack spacing={8} align="stretch">
        <Heading size="xl" color="blue.400" textAlign="center">
          Settings
        </Heading>

        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <AlertTitle mr={2}>Error Loading Data</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs variant="soft-rounded" colorScheme="blue">
          <TabList justifyContent="center" mb={6}>
            <Tab>Categories</Tab>
            <Tab>Tags</Tab>
            <Tab>Data Management</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <Box bg={cardBg} shadow="md" borderRadius="lg" p={6}>
                <Flex justify="space-between" align="center" mb={4}>
                  <Heading size="md" color={textColor}>Manage Categories</Heading>
                  <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={() => { setEditingCategory(null); onCategoryModalOpen(); }}>
                    Add Category
                  </Button>
                </Flex>
                <Divider my={4}/>
                {categories.length === 0 ? (
                  <Text color={mutedTextColor}>No categories found. Add one to get started!</Text>
                ) : (
                  <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                    {categories.map(category => (
                      <Box key={category.id} p={4} borderWidth={1} borderRadius="md" borderColor={borderColor} bg={listItemBg}>
                        <HStack justify="space-between" align="center">
                          <Badge colorScheme={getColorName(category.color) || 'gray'} px={3} py={1} borderRadius="full" fontSize="sm">
                            {category.name}
                          </Badge>
                          <HStack spacing={2}>
                            <IconButton icon={<EditIcon />} size="sm" variant="ghost" colorScheme="blue" aria-label="Edit category" onClick={() => { setEditingCategory(category); onCategoryModalOpen();}} />
                            <IconButton icon={<DeleteIcon />} size="sm" variant="ghost" colorScheme="red" aria-label="Delete category" onClick={() => handleDeleteCategory(category.id)} />
                          </HStack>
                        </HStack>
                      </Box>
                    ))}
                  </SimpleGrid>
                )}
              </Box>
            </TabPanel>

            <TabPanel>
              <Box bg={cardBg} shadow="md" borderRadius="lg" p={6}>
                <Flex justify="space-between" align="center" mb={4}>
                  <Heading size="md" color={textColor}>Manage Tags</Heading>
                  <Button leftIcon={<AddIcon />} colorScheme="teal" onClick={() => { setEditingTag(null); onTagModalOpen(); }}>
                    Add Tag
                  </Button>
                </Flex>
                <Divider my={4}/>
                {tags.length === 0 ? (
                  <Text color={mutedTextColor}>No tags found. Add some to organize your expenses!</Text>
                ) : (
                  <Wrap spacing={3}>
                    {tags.map(tag => (
                      <WrapItem key={tag.id}>
                        <Badge colorScheme={tag.color || 'gray'} px={3} py={1.5} borderRadius="md" fontSize="sm">
                          <HStack spacing={1}>
                            <Text>{tag.name}</Text>
                            <IconButton icon={<EditIcon />} size="xs" variant="ghost" colorScheme="blue" aria-label="Edit tag" onClick={() => { setEditingTag(tag); onTagModalOpen();}} />
                            <IconButton icon={<DeleteIcon />} size="xs" variant="ghost" colorScheme="red" aria-label="Delete tag" onClick={() => handleDeleteTag(tag.id)} />
                          </HStack>
                        </Badge>
                      </WrapItem>
                    ))}
                  </Wrap>
                )}
              </Box>
            </TabPanel>

            <TabPanel>
              <Box bg={cardBg} shadow="md" borderRadius="lg" p={6}>
                <Heading size="md" color={textColor} mb={4}>Data Management</Heading>
                <Divider my={4}/>
                <VStack spacing={4} align="stretch">
                  <Button
                    leftIcon={<FiDatabase />}
                    colorScheme="green"
                    onClick={handleBackupToSupabase}
                    isDisabled={!dbInitialized || !user}
                  >
                    Backup Data to Cloud
                  </Button>
                  <Button
                    leftIcon={<FiHardDrive />}
                    colorScheme="purple"
                    onClick={handleRestoreFromSupabase}
                    isDisabled={!dbInitialized || !user}
                  >
                    Restore Data from Cloud
                  </Button>
                  <Divider my={4}/>
                  <Button
                    leftIcon={<DeleteIcon />}
                    colorScheme="red"
                    variant="outline"
                    onClick={handleClearLocalStorage}
                  >
                    Clear Local Data (Logout & Reset)
                  </Button>
                  {!dbInitialized && (
                    <Alert status="warning" borderRadius="md">
                      <AlertIcon />
                      <Box flex="1">
                        <AlertTitle>Database Not Initialized</AlertTitle>
                        <AlertDescription display="block">
                          Supabase DB is not connected. Data operations will use local storage.
                          Configure Supabase credentials in environment variables to enable cloud sync.
                        </AlertDescription>
                      </Box>
                    </Alert>
                  )}
                </VStack>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      <CategoryModal 
        isOpen={isCategoryModalOpen} 
        onClose={onCategoryModalClose} 
        onSave={handleCategorySave}
        category={editingCategory} 
      />
      
      <TagModal 
        isOpen={isTagModalOpen} 
        onClose={onTagModalClose} 
        onSave={handleTagSave}
        tag={editingTag} 
      />
    </Container>
  );
}

export default Settings; 