import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Textarea,
  VStack,
  HStack,
  Text,
  Input,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Checkbox,
  Flex,
  Progress,
  Divider,
  Icon,
} from '@chakra-ui/react';
import { uploadTranscriptFile } from '../services/api';

interface TranscriptInputProps {
  onAnalyze: (transcript: string, acknowledgeEmergency?: boolean) => Promise<any>;
  isLoading: boolean;
  initialTranscript?: string;
}

export default function TranscriptInput({
  onAnalyze,
  isLoading,
  initialTranscript = '',
}: TranscriptInputProps) {
  const [transcript, setTranscript] = useState(initialTranscript);
  const [isUploading, setIsUploading] = useState(false);
  const [acknowledgeEmergency, setAcknowledgeEmergency] = useState(false);
  const [isCheckingEmergency, setIsCheckingEmergency] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [emergencyKeywords, setEmergencyKeywords] = useState<string[]>([]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 5KB)
    if (file.size > 5 * 1024) {
      alert('File size must be less than 5KB');
      return;
    }

    // Check file type
    if (!file.name.endsWith('.txt')) {
      alert('Only .txt files are allowed');
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadTranscriptFile(file);
      setTranscript(result.transcript);
    } catch (error) {
      // Upload failed - error already shown to user via alert
      alert('Failed to upload file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAnalyze = async () => {
    if (!transcript.trim()) {
      alert('Please enter or upload a transcript');
      return;
    }

    // Reset acknowledgment for new analysis
    setAcknowledgeEmergency(false);
    setIsCheckingEmergency(true);

    // First, check if there are emergency keywords WITHOUT starting the full analysis
    try {
      // Make a preliminary check to the backend
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, acknowledgeEmergency: false })
      });

      const result = await response.json();
      setIsCheckingEmergency(false);

      // If emergency acknowledgment is required, show modal
      if (result.requiresAcknowledgment) {
        setEmergencyKeywords(result.emergencyKeywords || []);
        onOpen();
      } else {
        // No emergency, proceed with analysis
        await onAnalyze(transcript, false);
      }
    } catch (error) {
      setIsCheckingEmergency(false);
      // If error, just proceed with normal analysis
      await onAnalyze(transcript, false);
    }
  };

  const handleEmergencyAcknowledge = async () => {
    setAcknowledgeEmergency(true);
    onClose();

    // Call analyze with emergency acknowledged
    try {
      await onAnalyze(transcript, true);
    } catch (error) {
      // Error during analysis - handled by main error handler
    }

    setAcknowledgeEmergency(false);
  };

  // Sample transcript for testing
  const loadSampleTranscript = () => {
    const sample = `Doctor: Good morning, Mrs. Johnson. What brings you in today?

Patient: Hi doctor, I've been having this persistent cough for about two weeks now, and it's getting worse. I also have some chest discomfort when I breathe deeply.

Doctor: I see. Any fever or chills?

Patient: Yes, I've had a low-grade fever, around 99-100°F, mostly in the evenings. And I've been feeling really tired.

Doctor: Are you coughing up anything? Any blood?

Patient: No blood, but there's some yellowish phlegm sometimes.

Doctor: Let me examine you. *listens to lungs* I hear some crackles in your lower right lung. Your temperature is 99.8°F. Given your symptoms and examination, this appears to be a community-acquired pneumonia. I'm going to prescribe antibiotics - Azithromycin 500mg once daily for 5 days. Also, get plenty of rest, stay hydrated, and use acetaminophen for fever. If symptoms worsen or you develop shortness of breath, go to the ER immediately. Let's follow up in one week.`;

    setTranscript(sample);
  };

  // Auto-load sample on first mount if triggered from welcome guide
  useEffect(() => {
    if (typeof initialTranscript === 'string' && initialTranscript === '__LOAD_SAMPLE__') {
      loadSampleTranscript();
    }
  }, []);

  const charCount = transcript.length;
  const charLimit = 5000;
  const charPercentage = (charCount / charLimit) * 100;

  return (
    <VStack spacing={5} align="stretch">
      {/* Header Section */}
      <Box>
        <Flex justify="space-between" align="center" mb={3}>
          <VStack align="start" spacing={0}>
            <Text fontSize="lg" fontWeight="600" color="gray.800">
              Medical Transcript
            </Text>
            <Text fontSize="xs" color="gray.500">
              Paste, type, or upload your consultation transcript
            </Text>
          </VStack>
          <Badge
            colorScheme={charCount > charLimit ? 'red' : charCount > charLimit * 0.8 ? 'yellow' : 'green'}
            fontSize="xs"
            px={2}
            py={1}
            borderRadius="md"
          >
            {charCount} / {charLimit} characters
          </Badge>
        </Flex>
      </Box>

      {/* Action Buttons */}
      <HStack spacing={2}>
        <Button
          size="sm"
          colorScheme="blue"
          variant="ghost"
          onClick={loadSampleTranscript}
          isDisabled={isLoading}
          leftIcon={<Icon viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H4a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-2a1 1 0 100-2h2a4 4 0 014 4v7a4 4 0 01-4 4H4a4 4 0 01-4-4V7a4 4 0 014-4z" clipRule="evenodd" />
          </Icon>}
        >
          Try Sample
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          isLoading={isUploading}
          isDisabled={isLoading}
          leftIcon={<Icon viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </Icon>}
        >
          Upload .txt
        </Button>
        <Input
          ref={fileInputRef}
          type="file"
          accept=".txt"
          onChange={handleFileUpload}
          display="none"
        />
        {transcript && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setTranscript('')}
            isDisabled={isLoading}
            color="red.500"
            _hover={{ bg: 'red.50' }}
          >
            Clear
          </Button>
        )}
      </HStack>

      {/* Textarea */}
      <Box position="relative">
        <Textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Example:\n\nDoctor: What brings you in today?\nPatient: I've been experiencing headaches...\n\nOr simply paste your transcript here."
          minHeight="350px"
          maxHeight="450px"
          fontFamily="'SF Mono', Monaco, 'Courier New', monospace"
          fontSize="sm"
          isDisabled={isLoading}
          borderColor="gray.200"
          bg="white"
          _hover={{ borderColor: 'blue.300' }}
          _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px rgba(0, 132, 255, 0.2)' }}
          resize="vertical"
        />
        {charCount > 0 && (
          <Progress
            value={charPercentage}
            size="xs"
            colorScheme={charCount > charLimit ? 'red' : charCount > charLimit * 0.8 ? 'yellow' : 'green'}
            position="absolute"
            bottom="0"
            left="0"
            right="0"
            borderBottomRadius="md"
          />
        )}
      </Box>

      {/* Submit Button */}
      <Button
        size="lg"
        colorScheme="blue"
        onClick={handleAnalyze}
        isLoading={isLoading || isCheckingEmergency}
        isDisabled={!transcript.trim() || charCount > charLimit}
        loadingText={isCheckingEmergency ? "Checking for emergencies..." : "Analyzing transcript..."}
        height="50px"
        fontSize="md"
        fontWeight="600"
        leftIcon={!isLoading && !isCheckingEmergency ? <Icon viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9.5H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
        </Icon> : undefined}
        _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
        transition="all 0.2s"
        w="full"
      >
        {isCheckingEmergency ? 'Checking for Emergencies' : isLoading ? 'Analyzing Transcript' : 'Generate Clinical Documentation'}
      </Button>

      {/* Info Box */}
      <Alert status="info" variant="left-accent" borderRadius="md" fontSize="sm">
        <AlertIcon />
        <Box>
          <Text fontWeight="600" mb={1}>Privacy & Compliance</Text>
          <Text fontSize="xs">Use only de-identified or synthetic data. This tool generates documentation for review by healthcare professionals.</Text>
        </Box>
      </Alert>

      {/* Emergency Keywords Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader color="red.600" fontSize="lg" fontWeight="600">
            Emergency Keywords Detected
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="warning" mb={4} borderRadius="md">
              <AlertIcon />
              <Text fontSize="sm">
                This transcript contains emergency-related keywords. This tool is NOT a triage system.
              </Text>
            </Alert>

            <Text mb={3} fontSize="sm" fontWeight="500">
              The following keywords were detected:
            </Text>
            <Flex wrap="wrap" gap={2} mb={4}>
              {emergencyKeywords.map((keyword, index) => (
                <Badge key={index} colorScheme="red" variant="solid" px={3} py={1}>
                  {keyword}
                </Badge>
              ))}
            </Flex>

            <Box bg="gray.50" p={3} borderRadius="md" mb={4}>
              <Text fontSize="xs" color="gray.700">
                This is a documentation assistant only. For actual medical emergencies,
                please follow appropriate emergency protocols and seek immediate medical attention.
              </Text>
            </Box>

            <Checkbox
              isChecked={acknowledgeEmergency}
              onChange={(e) => setAcknowledgeEmergency(e.target.checked)}
              size="sm"
            >
              <Text fontSize="sm">
                I understand this is not a triage tool and will ensure appropriate medical care
              </Text>
            </Checkbox>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose} size="sm">
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={handleEmergencyAcknowledge}
              isDisabled={!acknowledgeEmergency}
              size="sm"
            >
              Acknowledge and Continue
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}