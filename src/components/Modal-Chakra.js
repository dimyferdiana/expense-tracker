import React from 'react';
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogCloseTrigger,
  DialogTitle
} from './ui/dialog';
import { useColorModeValue } from './ui/color-mode';

function ChakraModal({ isOpen, onClose, title, children, size = "md" }) {
  const bg = useColorModeValue('white', 'gray.800');
  const color = useColorModeValue('gray.800', 'white');

  return (
    <DialogRoot open={isOpen} onOpenChange={(details) => !details.open && onClose()}>
      <DialogContent bg={bg} color={color} maxW={size === "md" ? "md" : size}>
        {title && (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        )}
        <DialogCloseTrigger />
        <DialogBody pb={6}>
          {children}
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
}

export default ChakraModal; 