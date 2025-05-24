import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Textarea,
  Field,
  FieldLabel,
  FieldRequiredIndicator,
  Text,
  Heading,
  Badge,
  IconButton,
  Flex,
  Spacer,
  Grid,
  GridItem,
  Switch,
  NumberInput,
  NumberInputInput,
  NumberInputRoot,
  NumberInputControl,
  NumberInputIncrementTrigger,
  NumberInputDecrementTrigger,
  Image,
  useDisclosure,
  createToaster,
  Toaster,
  ButtonGroup,

  Tabs,
  Wrap,
  WrapItem,
  Portal,
  CloseButton
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
  FiX as CloseIcon,
  FiCalendar as CalendarIcon,
  FiClock as TimeIcon,
  FiPaperclip as AttachmentIcon,
  FiTrash2 as DeleteIcon
} from 'react-icons/fi';
import { FiCamera, FiDollarSign, FiCreditCard } from 'react-icons/fi';
import { Combobox, ComboboxLabel, ComboboxOption } from './Combobox';
import TagSelector, { TagSelectorWithLabel } from './TagSelector';
import { categoryDB as supabaseCategoryDB, tagDB as supabaseTagDB, walletDB as supabaseWalletDB } from '../utils/supabase-db';
import DateRangePicker from './DateRangePicker';
import { getColorName } from '../utils/colors';
import { useAuth } from '../contexts/AuthContext';

function CategoryModal({ isOpen, onClose, onSave }) {
  const [input, setInput] = useState('');
  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');

  const handleSave = () => {
    if (input.trim()) {
      onSave(input.trim());
      setInput('');
    }
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(details) => !details.open && onClose()}>
      <DialogContent bg={cardBg} color={textColor} maxW="md">
        <DialogHeader>
          <DialogTitle>Add New Category</DialogTitle>
        </DialogHeader>
        <DialogCloseTrigger />
        <DialogBody>
          <Field>
            <FieldLabel>Category Name</FieldLabel>
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Category name"
              autoFocus
            />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}

const expenseToaster = createToaster({
  placement: "top-right",
});

function ExpenseForm({ addExpense, dbInitialized = false, onClose, onSubmit }) {
  const { user } = useAuth();
  
  // Color mode values
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedTextColor = useColorModeValue('gray.600', 'gray.400');

  // Get current date and time for default values
  const now = new Date();
  const currentDate = now.toISOString().slice(0, 10);
  const currentTime = now.toTimeString().slice(0, 5);

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: 'food',
    tags: [],
    walletId: null,
    wallet_id: null,
    is_income: false,
    notes: '',
    photoUrl: '',
    date: currentDate,
    time: currentTime
  });
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  const { isOpen: isDatePickerOpen, onOpen: onDatePickerOpen, onClose: onDatePickerClose } = useDisclosure();
  const { isOpen: isTimePickerOpen, onOpen: onTimePickerOpen, onClose: onTimePickerClose } = useDisclosure();
  const { isOpen: isCategoryModalOpen, onOpen: onCategoryModalOpen, onClose: onCategoryModalClose } = useDisclosure();
  
  const [categories, setCategories] = useState([
    { id: 'food', name: 'Food' },
    { id: 'transportation', name: 'Transportation' },
    { id: 'entertainment', name: 'Entertainment' },
    { id: 'utilities', name: 'Utilities' },
    { id: 'housing', name: 'Housing' },
    { id: 'healthcare', name: 'Healthcare' },
    { id: 'other', name: 'Other' }
  ]);

  const [tags, setTags] = useState([
    { id: 'essential', name: 'Essential' },
    { id: 'recurring', name: 'Recurring' },
    { id: 'emergency', name: 'Emergency' },
    { id: 'personal', name: 'Personal' },
    { id: 'work', name: 'Work' }
  ]);

  const [wallets, setWallets] = useState([
    { id: 'cash', name: 'Cash', type: 'cash', balance: 0 },
    { id: 'bank', name: 'Bank Account', type: 'bank', balance: 0 },
    { id: 'credit', name: 'Credit Card', type: 'credit_card', balance: 0 },
    { id: 'ewallet', name: 'E-Wallet', type: 'e_wallet', balance: 0 },
  ]);

  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Load data effect
  useEffect(() => {
    const loadData = async () => {
      try {
        if (dbInitialized && user) {
          const categoryData = await supabaseCategoryDB.getAll(user.id);
          if (categoryData.length > 0) {
            setCategories(categoryData);
            const defaultCategory = categoryData.find(cat => cat.id === 'food') || categoryData[0];
            if (defaultCategory) {
              setFormData(prev => ({ ...prev, category: defaultCategory.id }));
            }
          }

          const tagData = await supabaseTagDB.getAll(user.id);
          if (tagData.length > 0) {
            setTags(tagData);
          }

          const walletData = await supabaseWalletDB.getAll(user.id);
          if (walletData.length > 0) {
            setWallets(walletData);
            const defaultWallet = walletData[0];
            if (defaultWallet) {
              setFormData(prev => ({ 
                ...prev, 
                walletId: defaultWallet.id,
                wallet_id: defaultWallet.id
              }));
            }
          } else {
            expenseToaster.create({
              title: 'No Wallets Found',
              description: 'Please add a wallet before adding transactions',
              status: 'warning',
              duration: 5000,
            });
          }
        } else {
          loadFromLocalStorage();
        }
      } catch (error) {
        console.error('Error loading form data:', error);
        loadFromLocalStorage();
      }
    };

    loadData();
  }, [dbInitialized, user]);

  const loadFromLocalStorage = () => {
    const savedCategories = localStorage.getItem('expense-categories');
    if (savedCategories) {
      const parsedCategories = JSON.parse(savedCategories);
      setCategories(parsedCategories);
      const defaultCategory = parsedCategories.find(cat => cat.id === 'food') || parsedCategories[0];
      if (defaultCategory) {
        setFormData(prev => ({ ...prev, category: defaultCategory.id }));
      }
    }

    const savedTags = localStorage.getItem('expense-tags');
    if (savedTags) {
      setTags(JSON.parse(savedTags));
    }

    const savedWallets = localStorage.getItem('wallets');
    if (savedWallets) {
      const parsedWallets = JSON.parse(savedWallets);
      setWallets(parsedWallets);
      if (parsedWallets.length > 0) {
        setFormData(prev => ({ 
          ...prev, 
          walletId: parsedWallets[0].id,
          wallet_id: parsedWallets[0].id
        }));
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleToggleType = () => {
    setFormData({ ...formData, is_income: !formData.is_income });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      expenseToaster.create({
        title: 'Invalid File',
        description: 'Please select an image file',
        status: 'error',
        duration: 3000,
      });
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      expenseToaster.create({
        title: 'File Too Large',
        description: 'File size should be less than 5MB',
        status: 'error',
        duration: 3000,
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData({ ...formData, photoUrl: event.target.result });
      setPreviewUrl(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setFormData({ ...formData, photoUrl: '' });
    setPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const takePicture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setFormData({ ...formData, category: category.id });
    setCategorySearchQuery('');
  };

  const handleTagsChange = (selectedTags) => {
    setFormData(prev => ({
      ...prev,
      tags: selectedTags
    }));
  };

  const handleWalletChange = (event) => {
    const wallet = event?.target ? event.target.value : event;
    if (!wallet || !wallet.id) {
      setError('Please select a valid wallet');
      return;
    }
    setFormData(prev => ({ 
      ...prev, 
      wallet_id: wallet.id
    }));
  };

  const handleSaveCategory = async (name) => {
    if (!name.trim()) return;
    
    const newCategory = {
      id: name.trim().toLowerCase().replace(/\s+/g, '-'),
      name: name.trim(),
    };
    
    try {
      if (dbInitialized && user) {
        await supabaseCategoryDB.add(newCategory, user.id);
      } else {
        const updatedCategories = [...categories, newCategory];
        setCategories(updatedCategories);
        localStorage.setItem('expense-categories', JSON.stringify(updatedCategories));
      }
      
      setSelectedCategory(newCategory);
      setFormData(prev => ({ ...prev, category: newCategory.id }));
      onCategoryModalClose();
      
      expenseToaster.create({
        title: 'Category Added',
        description: `${newCategory.name} has been added successfully`,
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error adding category:', error);
      expenseToaster.create({
        title: 'Error',
        description: 'Failed to add category. Please try again.',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      setError('Please enter a description');
      return;
    }

    if (!formData.wallet_id) {
      setError('Please select a wallet');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const dateTime = formData.time 
        ? `${formData.date}T${formData.time}:00` 
        : formData.date;
      
      const expenseData = {
        amount: parseFloat(formData.amount),
        description: formData.name.trim(),
        category: formData.category,
        date: dateTime,
        wallet_id: formData.wallet_id,
        notes: formData.notes?.trim() || '',
        tags: formData.tags,
        is_income: Boolean(formData.is_income),
        photo_url: formData.photoUrl || null
      };
      
      const submitFunction = onSubmit || addExpense;
      if (typeof submitFunction === 'function') {
        await submitFunction(expenseData);
      } else {
        throw new Error('No submit function provided');
      }
      
      // Reset form
      setFormData({
        name: '',
        amount: '',
        category: formData.category,
        tags: [],
        wallet_id: formData.wallet_id,
        is_income: false,
        notes: '',
        photoUrl: '',
        date: currentDate,
        time: currentTime
      });
      setPreviewUrl('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      expenseToaster.create({
        title: `${formData.is_income ? 'Income' : 'Expense'} Added`,
        description: `${formData.name} has been added successfully`,
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error("Error adding expense:", error);
      setError(error.message || "There was a problem saving your expense. Please try again.");
      expenseToaster.create({
        title: 'Error',
        description: error.message || "There was a problem saving your expense. Please try again.",
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryColor = (category) => {
    if (!category) return 'gray';
    return getColorName(category.color);
  };

  const formatDateForDisplay = (date) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  const formatTimeForDisplay = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
  );

  return (
    <Box position="fixed" inset={0} bg={bgColor} zIndex={50}>
      <VStack h="full" spacing={0}>
        {/* Fixed Header */}
        <Box
          w="full"
          bg={cardBg}
          borderBottomWidth={1}
          borderColor={borderColor}
          px={6}
          py={4}
          position="sticky"
          top={0}
          zIndex={10}
          shadow="sm"
        >
          <Flex justify="space-between" align="center">
            <Heading size="lg" color="blue.400">
              Add New {formData.is_income ? 'Income' : 'Expense'}
            </Heading>
            <CloseButton 
              size="lg"
              onClick={onClose}
              bg="gray.100"
              _hover={{ bg: "gray.200" }}
              _dark={{ bg: "gray.700", _hover: { bg: "gray.600" } }}
            />
          </Flex>
        </Box>

        {/* Scrollable Content */}
        <Box flex={1} overflowY="auto" w="full">
          <Container maxW="2xl" py={6}>
            <VStack spacing={6} align="stretch">
              {/* Income/Expense Toggle */}
              <Card>
                <CardBody>
                  <ButtonGroup isAttached w="full">
                    <Button
                      flex={1}
                      colorScheme={!formData.is_income ? "blue" : "gray"}
                      variant={!formData.is_income ? "solid" : "outline"}
                      onClick={() => !formData.is_income || handleToggleType()}
                    >
                      Expense
                    </Button>
                    <Button
                      flex={1}
                      colorScheme={formData.is_income ? "green" : "gray"}
                      variant={formData.is_income ? "solid" : "outline"}
                      onClick={() => formData.is_income || handleToggleType()}
                    >
                      Income
                    </Button>
                  </ButtonGroup>
                </CardBody>
              </Card>

              {/* Main Form */}
              <Card>
                <CardBody>
                  <form onSubmit={handleSubmit}>
                    <VStack spacing={6}>
                      {/* Name */}
                      <Field required>
                        <FieldLabel>{formData.is_income ? 'Income' : 'Expense'} Name <FieldRequiredIndicator /></FieldLabel>
                        <Input
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder={formData.is_income ? "e.g., Salary" : "e.g., Groceries"}
                          autoFocus
                        />
                      </Field>

                      {/* Amount */}
                      <Field required>
                        <FieldLabel>Amount (Rp) <FieldRequiredIndicator /></FieldLabel>
                        <NumberInputRoot min={1000} step={1000} value={formData.amount} onValueChange={(details) => handleChange({target: {name: "amount", value: details.value}})}>
                          <NumberInputInput
                            name="amount"
                            placeholder="0"
                          />
                          <NumberInputControl>
                            <NumberInputIncrementTrigger />
                            <NumberInputDecrementTrigger />
                          </NumberInputControl>
                        </NumberInputRoot>
                      </Field>

                      {/* Date and Time */}
                      <Grid templateColumns="repeat(2, 1fr)" gap={4} w="full">
                        <GridItem>
                          <Field>
                            <FieldLabel>Date</FieldLabel>
                            <Button
                              variant="outline"
                              w="full"
                              justifyContent="flex-start"
                              leftIcon={<CalendarIcon />}
                              onClick={onDatePickerOpen}
                            >
                              {formData.date ? formatDateForDisplay(formData.date) : 'Select date'}
                            </Button>
                          </Field>
                        </GridItem>
                        <GridItem>
                          <Field>
                            <FieldLabel>Time</FieldLabel>
                            <Button
                              variant="outline"
                              w="full"
                              justifyContent="flex-start"
                              leftIcon={<TimeIcon />}
                              onClick={onTimePickerOpen}
                            >
                              {formData.time ? formatTimeForDisplay(formData.time) : 'Select time'}
                            </Button>
                          </Field>
                        </GridItem>
                      </Grid>

                      {/* Wallet */}
                      <Field required>
                        <FieldLabel>Wallet <FieldRequiredIndicator /></FieldLabel>
                        {wallets.length > 0 ? (
                          <Combobox
                            options={wallets}
                            displayValue={(wallet) => wallet?.name}
                            defaultValue={wallets.find(w => w.id === formData.wallet_id)}
                            onChange={handleWalletChange}
                          >
                            {(wallet) => (
                              <ComboboxOption value={wallet}>
                                <ComboboxLabel>{wallet.name}</ComboboxLabel>
                              </ComboboxOption>
                            )}
                          </Combobox>
                        ) : (
                          <Text color={mutedTextColor}>
                            No wallets available. Please add some in Wallets.
                          </Text>
                        )}
                      </Field>

                      {/* Category */}
                      <Field>
                        <Flex justify="space-between" align="center" mb={2}>
                          <FieldLabel mb={0}>Category</FieldLabel>
                          <Button
                            size="sm"
                            leftIcon={<AddIcon />}
                            colorScheme="blue"
                            variant="ghost"
                            onClick={onCategoryModalOpen}
                          >
                            New Category
                          </Button>
                        </Flex>
                        <VStack spacing={4} align="stretch">
                          <Input
                            value={categorySearchQuery}
                            onChange={(e) => setCategorySearchQuery(e.target.value)}
                            placeholder="Search categories..."
                          />
                          {categories.length > 0 ? (
                            <Wrap>
                              {filteredCategories.map((category) => (
                                <WrapItem key={category.id}>
                                  <Badge
                                    colorScheme={getCategoryColor(category)}
                                    variant={selectedCategory?.id === category.id ? 'solid' : 'outline'}
                                    cursor="pointer"
                                    px={3}
                                    py={1}
                                    borderRadius="full"
                                    onClick={() => handleCategoryChange(category)}
                                    _hover={{ transform: 'scale(1.05)' }}
                                    transition="all 0.2s"
                                  >
                                    {category.name}
                                  </Badge>
                                </WrapItem>
                              ))}
                            </Wrap>
                          ) : (
                            <Text color={mutedTextColor}>
                              No categories available. Please add some in Settings.
                            </Text>
                          )}
                        </VStack>
                      </Field>

                      {/* Tags */}
                      <Field>
                        <TagSelectorWithLabel
                          selectedTags={formData.tags}
                          availableTags={tags}
                          onChange={handleTagsChange}
                          dbInitialized={dbInitialized}
                        />
                      </Field>

                      {/* Notes */}
                      <Field>
                        <FieldLabel>Notes (optional)</FieldLabel>
                        <Textarea
                          name="notes"
                          value={formData.notes}
                          onChange={handleChange}
                          placeholder="Add any additional details..."
                          minH="80px"
                        />
                      </Field>

                      {/* Photo */}
                      <Field>
                        <FieldLabel>Photo (optional)</FieldLabel>
                        <VStack spacing={3} align="stretch">
                          <HStack spacing={2}>
                            <Button
                              leftIcon={<FiCamera />}
                              variant="outline"
                              onClick={takePicture}
                            >
                              Take Photo
                            </Button>
                            {previewUrl && (
                              <Button
                                leftIcon={<DeleteIcon />}
                                colorScheme="red"
                                variant="outline"
                                onClick={removePhoto}
                              >
                                Remove
                              </Button>
                            )}
                          </HStack>
                          
                          <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            capture="camera"
                            style={{ display: 'none' }}
                            onChange={handlePhotoChange}
                          />
                          
                          {previewUrl && (
                            <Box>
                              <Image 
                                src={previewUrl} 
                                alt="Preview" 
                                maxH="200px"
                                borderRadius="md"
                                border="1px"
                                borderColor={borderColor}
                              />
                            </Box>
                          )}
                        </VStack>
                      </Field>
                    </VStack>
                  </form>
                </CardBody>
              </Card>
            </VStack>
          </Container>
        </Box>

        {/* Fixed Footer */}
        <Box
          w="full"
          bg={cardBg}
          borderTopWidth={1}
          borderColor={borderColor}
          px={6}
          py={4}
          shadow="lg"
        >
          <Flex justify="flex-end">
            <Button
              type="submit"
              colorScheme={formData.is_income ? "green" : "blue"}
              size="lg"
              isLoading={isSubmitting}
              loadingText="Saving..."
              onClick={handleSubmit}
            >
              {formData.is_income ? 'Add Income' : 'Add Expense'}
            </Button>
          </Flex>
        </Box>
      </VStack>

      {/* Modals */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={onCategoryModalClose}
        onSave={handleSaveCategory}
      />
      
      {/* Date Picker Modal */}
      <DialogRoot open={isDatePickerOpen} onOpenChange={(details) => !details.open && onDatePickerClose()}>
        <DialogContent maxW="md">
          <DialogHeader>
            <DialogTitle>Select Date</DialogTitle>
          </DialogHeader>
          <DialogCloseTrigger />
          <DialogBody>
            <DateRangePicker
              value={{
                start: formData.date ? new Date(formData.date) : null,
                end: null
              }}
              onChange={(range) => {
                if (range.start) {
                  const dateString = range.start.toISOString().slice(0, 10);
                  setFormData(prev => ({
                    ...prev,
                    date: dateString
                  }));
                }
                onDatePickerClose();
              }}
              onClose={onDatePickerClose}
              isSingleDatePicker={true}
              pickerLabel="Select Date"
            />
          </DialogBody>
        </DialogContent>
      </DialogRoot>

      {/* Time Picker Modal */}
      <DialogRoot open={isTimePickerOpen} onOpenChange={(details) => !details.open && onTimePickerClose()}>
        <DialogContent maxW="md">
          <DialogHeader>
            <DialogTitle>Select Time</DialogTitle>
          </DialogHeader>
          <DialogCloseTrigger />
          <DialogBody>
            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
              <Box>
                <Text fontWeight="semibold" mb={2}>Hour</Text>
                <VStack maxH="200px" overflowY="auto" spacing={1}>
                  {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(hour => (
                    <Button
                      key={hour}
                      size="sm"
                      variant={formData.time && formData.time.split(':')[0] === hour ? 'solid' : 'ghost'}
                      colorScheme="blue"
                      w="full"
                      onClick={() => {
                        const currentMinute = formData.time.split(':')[1] || '00';
                        const newTime = `${hour}:${currentMinute}`;
                        setFormData(prev => ({ ...prev, time: newTime }));
                        onTimePickerClose();
                      }}
                    >
                      {hour}
                    </Button>
                  ))}
                </VStack>
              </Box>
              <Box>
                <Text fontWeight="semibold" mb={2}>Minute</Text>
                <VStack maxH="200px" overflowY="auto" spacing={1}>
                  {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(minute => (
                    <Button
                      key={minute}
                      size="sm"
                      variant={formData.time && formData.time.split(':')[1] === minute ? 'solid' : 'ghost'}
                      colorScheme="blue"
                      w="full"
                      onClick={() => {
                        const currentHour = formData.time.split(':')[0] || '00';
                        const newTime = `${currentHour}:${minute}`;
                        setFormData(prev => ({ ...prev, time: newTime }));
                        onTimePickerClose();
                      }}
                    >
                      {minute}
                    </Button>
                  ))}
                </VStack>
              </Box>
            </Grid>
          </DialogBody>
        </DialogContent>
      </DialogRoot>
      <Toaster toaster={expenseToaster} />
    </Box>
  );
}

export default ExpenseForm; 