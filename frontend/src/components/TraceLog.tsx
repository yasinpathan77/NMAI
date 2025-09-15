import {
  Box,
  VStack,
  Text,
  Heading,
  Code,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Badge,
  Button,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  HStack,
  Flex,
  Icon,
  Divider,
  Card,
  CardBody,
  useClipboard,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import type { TraceLogEntry } from '../../../shared/types';

interface TraceLogProps {
  traceLog: TraceLogEntry[];
  rawResponse?: string;
}

export default function TraceLog({ traceLog, rawResponse }: TraceLogProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const getTechniqueColor = (technique?: string) => {
    if (!technique) return 'gray';
    if (technique.includes('Chain-of-Thought')) return 'purple';
    if (technique.includes('Few-Shot')) return 'blue';
    if (technique.includes('Zero-Shot')) return 'green';
    if (technique.includes('Heuristic')) return 'orange';
    return 'gray';
  };

  const getStepIcon = (step: string) => {
    if (step.includes('Speaker')) return '👥';
    if (step.includes('SOAP')) return '📋';
    if (step.includes('Problem')) return '🔍';
    if (step.includes('ICD')) return '🏷️';
    if (step.includes('Billing')) return '💰';
    if (step.includes('Guardrails')) return '🛡️';
    return '⚡';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const calculateDuration = (start: string, end?: string) => {
    if (!end) return null;
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const duration = endTime - startTime;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: `${label} copied`,
      status: 'success',
      duration: 2000,
      isClosable: true,
      position: 'bottom-right',
    });
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <Flex justify="space-between" align="center">
        <Box>
          <Heading size="md" color="gray.800" fontWeight="600">
            Processing Log
          </Heading>
          <Text fontSize="sm" color="gray.600" mt={1}>
            Detailed trace of AI processing steps with prompting techniques
          </Text>
        </Box>
        {rawResponse && (
          <Button size="sm" variant="outline" onClick={onOpen}>
            View Raw Responses
          </Button>
        )}
      </Flex>

      {/* Processing Timeline */}
      <Card variant="outline">
        <CardBody>
          <Heading size="sm" mb={4}>Processing Timeline</Heading>
          <HStack spacing={8} overflowX="auto" pb={2}>
            {traceLog
              .filter(entry => entry.step.includes('Complete') || entry.step.includes('Applied'))
              .map((entry, index) => (
                <VStack key={index} spacing={1} minW="120px">
                  <Box
                    w={10}
                    h={10}
                    borderRadius="full"
                    bg={`${getTechniqueColor(entry.technique)}.100`}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize="lg"
                  >
                    {getStepIcon(entry.step)}
                  </Box>
                  <Text fontSize="xs" fontWeight="600" textAlign="center">
                    {entry.step.replace(' Complete', '').replace(' Applied', '')}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {formatTimestamp(entry.timestamp)}
                  </Text>
                </VStack>
              ))}
          </HStack>
        </CardBody>
      </Card>

      {/* Detailed Processing Steps */}
      <Accordion allowMultiple defaultIndex={[0]}>
        {traceLog.map((entry, index) => {
          const nextEntry = traceLog[index + 1];
          const duration = nextEntry ? calculateDuration(entry.timestamp, nextEntry.timestamp) : null;

          return (
            <AccordionItem key={index} border="1px solid" borderColor="gray.200" borderRadius="lg" mb={3}>
              <h2>
                <AccordionButton _hover={{ bg: 'gray.50' }} py={4}>
                  <Box flex="1" textAlign="left">
                    <HStack spacing={3}>
                      <Badge
                        colorScheme={getTechniqueColor(entry.technique)}
                        fontSize="xs"
                        px={2}
                        py={1}
                      >
                        Step {index + 1}
                      </Badge>
                      <Text fontWeight="600" fontSize="sm">
                        {entry.step}
                      </Text>
                      {entry.technique && (
                        <Badge
                          variant="outline"
                          colorScheme={getTechniqueColor(entry.technique)}
                          fontSize="xs"
                        >
                          {entry.technique}
                        </Badge>
                      )}
                      {duration && (
                        <Badge variant="subtle" colorScheme="gray" fontSize="xs">
                          {duration}
                        </Badge>
                      )}
                    </HStack>
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      {formatTimestamp(entry.timestamp)} - {entry.details}
                    </Text>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
              </h2>
              <AccordionPanel pb={4} bg="gray.50">
                <Tabs size="sm" variant="line">
                  <TabList>
                    {entry.prompt && <Tab>Prompt</Tab>}
                    {entry.response && <Tab>Response</Tab>}
                    {entry.technique && <Tab>Technique Details</Tab>}
                  </TabList>

                  <TabPanels>
                    {entry.prompt && (
                      <TabPanel>
                        <VStack align="stretch" spacing={3}>
                          <HStack justify="space-between">
                            <Text fontSize="xs" fontWeight="600" color="gray.700">
                              AI Prompt (Redacted)
                            </Text>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => copyToClipboard(entry.prompt || '', 'Prompt')}
                            >
                              Copy
                            </Button>
                          </HStack>
                          <Code
                            fontSize="xs"
                            p={3}
                            borderRadius="md"
                            display="block"
                            whiteSpace="pre-wrap"
                            bg="white"
                            maxH="200px"
                            overflowY="auto"
                          >
                            {entry.prompt}
                          </Code>
                        </VStack>
                      </TabPanel>
                    )}

                    {entry.response && (
                      <TabPanel>
                        <VStack align="stretch" spacing={3}>
                          <HStack justify="space-between">
                            <Text fontSize="xs" fontWeight="600" color="gray.700">
                              AI Response Preview
                            </Text>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => copyToClipboard(entry.response || '', 'Response')}
                            >
                              Copy
                            </Button>
                          </HStack>
                          <Code
                            fontSize="xs"
                            p={3}
                            borderRadius="md"
                            display="block"
                            whiteSpace="pre-wrap"
                            bg="white"
                            maxH="200px"
                            overflowY="auto"
                          >
                            {entry.response}
                          </Code>
                        </VStack>
                      </TabPanel>
                    )}

                    {entry.technique && (
                      <TabPanel>
                        <VStack align="stretch" spacing={3}>
                          <Text fontSize="xs" fontWeight="600" color="gray.700">
                            Prompting Technique: {entry.technique}
                          </Text>
                          <Box bg="white" p={3} borderRadius="md">
                            {entry.technique.includes('Chain-of-Thought') && (
                              <Text fontSize="xs" color="gray.600">
                                <strong>Chain-of-Thought (CoT):</strong> The model is prompted to break down its reasoning into explicit steps, improving accuracy for complex reasoning tasks. The prompt includes "Let's think step by step" to trigger systematic analysis.
                              </Text>
                            )}
                            {entry.technique.includes('Few-Shot') && (
                              <Text fontSize="xs" color="gray.600">
                                <strong>Few-Shot Prompting:</strong> Examples are provided in the prompt to demonstrate the desired output format and quality. This helps the model understand the task through pattern matching with the examples.
                              </Text>
                            )}
                            {entry.technique.includes('Zero-Shot CoT') && (
                              <Text fontSize="xs" color="gray.600">
                                <strong>Zero-Shot Chain-of-Thought:</strong> Combines zero-shot learning with step-by-step reasoning. No examples are provided, but the model is asked to think through the problem systematically.
                              </Text>
                            )}
                            {entry.technique.includes('Heuristic') && (
                              <Text fontSize="xs" color="gray.600">
                                <strong>Heuristic Prompting:</strong> Domain-specific rules and guidelines are embedded in the prompt to guide the model's decision-making process. Includes medical coding rules and best practices.
                              </Text>
                            )}
                          </Box>
                        </VStack>
                      </TabPanel>
                    )}
                  </TabPanels>
                </Tabs>
              </AccordionPanel>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Processing Summary */}
      <Card variant="filled" bg="gray.50">
        <CardBody>
          <Heading size="sm" mb={4}>Processing Summary</Heading>
          <VStack align="stretch" spacing={3}>
            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.600">Total Steps:</Text>
              <Text fontSize="sm" fontWeight="600">{traceLog.length}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.600">Model Used:</Text>
              <Text fontSize="sm" fontWeight="600">Gemini 2.0 Flash</Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.600">Techniques Used:</Text>
              <HStack spacing={2}>
                {Array.from(new Set(traceLog.filter(e => e.technique).map(e => e.technique)))
                  .map((technique, index) => (
                    <Badge
                      key={index}
                      size="sm"
                      colorScheme={getTechniqueColor(technique)}
                      fontSize="xs"
                    >
                      {technique}
                    </Badge>
                  ))}
              </HStack>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.600">Processing Time:</Text>
              <Text fontSize="sm" fontWeight="600">
                {traceLog.length > 1
                  ? calculateDuration(traceLog[0].timestamp, traceLog[traceLog.length - 1].timestamp)
                  : 'N/A'}
              </Text>
            </HStack>
          </VStack>
        </CardBody>
      </Card>

      {/* Raw Response Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent maxW="900px">
          <ModalHeader>Raw AI Responses</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text fontSize="xs" color="gray.600" mb={3}>
              Complete unprocessed responses from the AI model
            </Text>
            <Code
              fontSize="xs"
              p={4}
              borderRadius="md"
              display="block"
              whiteSpace="pre-wrap"
              maxHeight="500px"
              overflowY="auto"
              bg="gray.50"
            >
              {rawResponse || 'No raw response available'}
            </Code>
          </ModalBody>
          <ModalFooter>
            <Button
              size="sm"
              variant="ghost"
              mr={3}
              onClick={() => {
                navigator.clipboard.writeText(rawResponse || '');
                toast({
                  title: 'Raw response copied',
                  status: 'success',
                  duration: 2000,
                  isClosable: true,
                  position: 'bottom-right',
                });
              }}
            >
              Copy All
            </Button>
            <Button size="sm" onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Technical Information */}
      <Box bg="blue.50" p={4} borderRadius="md" border="1px solid" borderColor="blue.200">
        <HStack spacing={2} mb={2}>
          <Icon viewBox="0 0 20 20" fill="currentColor" color="blue.500">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </Icon>
          <Text fontSize="sm" fontWeight="600" color="blue.800">
            About Prompting Techniques
          </Text>
        </HStack>
        <Text fontSize="xs" color="blue.700" lineHeight="tall">
          This system uses advanced prompting techniques based on recent research in medical NLP.
          Each step employs a specific technique optimized for its task: Chain-of-Thought for complex reasoning,
          Few-Shot for pattern matching, Zero-Shot CoT for problem extraction, and Heuristic prompting for
          domain-specific medical coding. These techniques have been shown to significantly improve accuracy
          in clinical documentation tasks.
        </Text>
      </Box>
    </VStack>
  );
}