import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Text,
  IconButton,
  Progress,
  Box,
  Input,
  Textarea,
  Button,
} from '@chakra-ui/react';
import { FaRedo, FaPlus } from 'react-icons/fa';

interface VersioningPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onOverride: () => void;
  onCreateNew: (fileName: string, summary: string) => void;
}

const VersioningPopup: React.FC<VersioningPopupProps> = ({ isOpen, onClose, onOverride, onCreateNew }) => {
  const [progress, setProgress] = useState(100);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [fileName, setFileName] = useState('');
  const [summary, setSummary] = useState('');
  const [timerDuration, setTimerDuration] = useState(30); // Initial timer duration

  useEffect(() => {
    if (isOpen) {
      setProgress(100); // Reset progress on open
      setTimerDuration(showCreateNew ? 20 : 30); // Set timer duration based on state

      const timer = setInterval(() => {
        setProgress((prevProgress) => (prevProgress > 0 ? prevProgress - 1 : 0));
      }, timerDuration * 10); // Adjusted interval for smoother progress

      if (progress === 0) {
        clearInterval(timer);
        if (showCreateNew) {
          // Default version naming strategy
          onCreateNew(fileName || 'default_version_name', summary);
        } else {
          // Default override
          onOverride();
        }
        onClose();
      }

      return () => clearInterval(timer);
    }
  }, [isOpen, progress, showCreateNew, onOverride, onCreateNew, onClose, fileName, summary, timerDuration]);

  const handleCreateNewClick = () => {
    setShowCreateNew(true);
    setTimerDuration(20); // Change timer duration to 20 seconds
    setProgress(100); // Reset progress
  };

  const handleSubmit = () => {
    onCreateNew(fileName, summary);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Submission Already Exists</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text>A submission for this problem already exists. What do you want to do?</Text>
          <Box display="flex" justifyContent="space-around" mt={4}>
            <IconButton icon={<FaRedo />} aria-label="Override" onClick={onOverride} />
            <IconButton icon={<FaPlus />} aria-label="Create New" onClick={handleCreateNewClick} />
          </Box>
          <Progress value={progress} mt={4} />

          {showCreateNew && (
            <Box mt={4}>
              <Input placeholder="File Name" value={fileName} onChange={(e) => setFileName(e.target.value)} />
              <Textarea placeholder="Summary" value={summary} onChange={(e) => setSummary(e.target.value)} mt={2} />
              <Button colorScheme="blue" mt={2} onClick={handleSubmit}>
                Submit
              </Button>
            </Box>
          )}
        </ModalBody>

        <ModalFooter>
          {/* Add Submit button and other actions here */}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default VersioningPopup;