import { useState, useEffect } from 'react';
import {
  ChakraProvider,
  Box,
  Container,
  Heading,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  VStack,
  HStack,
  Text,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  extendTheme,
  Divider,
  Flex,
  Icon,
  Grid,
  GridItem,
  Progress,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Button,
} from '@chakra-ui/react';
import TranscriptInput from './components/TranscriptInput';
import TranscriptViewer from './components/TranscriptViewer';
import SOAPNote from './components/SOAPNote';
import MedicalCodes from './components/MedicalCodes';
import BillingInfo from './components/BillingInfo';
import TraceLog from './components/TraceLog';
import ComplianceBanner from './components/ComplianceBanner';
import { analyzeTranscript, getLastSession } from './services/api';
import type { AnalysisResult } from '../../shared/types';
import { FiActivity } from 'react-icons/fi';

// Professional medical theme with improved colors
const theme = extendTheme({
  colors: {
    brand: {
      50: '#E6F3FF',
      100: '#B8DEFF',
      200: '#8AC9FF',
      300: '#5CB4FF',
      400: '#2E9FFF',
      500: '#0084FF',
      600: '#0066CC',
      700: '#004899',
      800: '#002A66',
      900: '#001533',
    },
    gray: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
  },
  fonts: {
    heading: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, sans-serif',
    body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, sans-serif',
  },
  styles: {
    global: {
      'html, body': {
        bg: '#FAFBFC',
        color: 'gray.800',
        lineHeight: 'tall',
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: '500',
        borderRadius: 'md',
      },
      defaultProps: {
        colorScheme: 'brand',
      },
    },
    Card: {
      baseStyle: {
        container: {
          borderRadius: 'lg',
          boxShadow: 'sm',
          border: '1px solid',
          borderColor: 'gray.200',
          bg: 'white',
        },
      },
    },
    Tabs: {
      variants: {
        'soft-rounded': {
          tab: {
            borderRadius: 'md',
            fontWeight: '500',
            _selected: {
              bg: 'brand.500',
              color: 'white',
            },
          },
        },
      },
    },
  },
});

function App() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const toast = useToast();

  // Processing steps for visualization
  const processingSteps = [
    { name: 'Speaker Identification', technique: 'Chain-of-Thought' },
    { name: 'SOAP Note Generation', technique: 'Few-Shot Prompting' },
    { name: 'Problem Extraction', technique: 'Zero-Shot CoT' },
    { name: 'ICD-10-AM Coding', technique: 'Heuristic Prompting' },
    { name: 'MBS Item Analysis', technique: 'Chain-of-Thought' },
  ];

  // Load last session on mount
  useEffect(() => {
    loadLastSession();
  }, []);

  const loadLastSession = async () => {
    try {
      const lastSession = await getLastSession();
      if (lastSession && lastSession.result) {
        // The backend returns { id, timestamp, transcript, result, hasEmergency }
        // We need to set the result field, not the entire session object
        setAnalysisResult(lastSession.result);

        // Also set the active tab to show the results
        setActiveTab(0);

        toast({
          title: 'Session Restored',
          description: 'Your previous analysis has been loaded.',
          status: 'info',
          duration: 3000,
          isClosable: true,
          position: 'top-right',
        });
      }
    } catch (err) {
      // No previous session found - this is normal
    }
  };

  const handleAnalyze = async (transcript: string, acknowledgeEmergency?: boolean) => {
    setIsLoading(true);
    setError(null);
    setCurrentStep(0);

    // Simulate step progression
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= processingSteps.length - 1) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 2000);

    try {
      const result = await analyzeTranscript(transcript, acknowledgeEmergency);
      setAnalysisResult(result);
      setActiveTab(0);

      toast({
        title: 'Analysis Complete',
        description: 'Medical documentation has been generated successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
    } catch (err: any) {
      // Log error for debugging but don't expose details to user
      const errorMessage = err.response?.data?.message || err.message || 'An unexpected error occurred';

      // Check if emergency acknowledgment is required
      if (err.response?.data?.requiresAcknowledgment) {
        clearInterval(stepInterval);
        setIsLoading(false);  // Stop loading since we're showing the modal
        setCurrentStep(0);
        // Don't set error state for emergency detection
        // Return the full error data for the modal
        return {
          requiresAcknowledgment: true,
          emergencyKeywords: err.response.data.emergencyKeywords || [],
          severity: err.response.data.severity,
          message: err.response.data.message
        };
      }

      // Only set error and show toast for non-emergency errors
      setError(errorMessage);
      toast({
        title: 'Analysis Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    } finally {
      clearInterval(stepInterval);
      setIsLoading(false);
      setCurrentStep(0);
    }

    return null;
  };


  return (
    <ChakraProvider theme={theme}>
      <Box minH="100vh" bg="#FAFBFC">
        {/* Simplified Header */}
        <Box bg="white" borderBottom="1px solid" borderColor="gray.200" boxShadow="sm">
          <Container maxW="100%" px={8}>
            <Flex h="60px" align="center" justify="space-between">
              <HStack spacing={3}>
                <Icon as={FiActivity} color="brand.500" boxSize={6} />
                <Heading size="md" fontWeight="600" color="gray.800">
                  Clinical Documentation Assistant
                </Heading>
                <Badge colorScheme="green" fontSize="xs">AI-Powered</Badge>
              </HStack>

              <HStack spacing={4}>
                <HStack spacing={1}>
                  <Box w={2} h={2} bg="green.400" borderRadius="full" />
                  <Text fontSize="sm" color="gray.600">System Active</Text>
                </HStack>
                <Text fontSize="sm" color="gray.500">|</Text>
                <Text fontSize="sm" color="gray.600">Gemini 2.0 Flash</Text>
              </HStack>
            </Flex>
          </Container>
        </Box>

        {/* Main Content */}
        <Container maxW="100%" px={8} py={6}>
          {/* Compliance Banner */}
          {analysisResult?.complianceBanner && (
            <Box mb={6}>
              <ComplianceBanner
                banner={analysisResult.complianceBanner}
                hasEmergency={analysisResult.hasEmergencyKeywords}
                emergencyFlags={analysisResult.emergencyFlags}
                severity={analysisResult.emergencySeverity}
                recommendation={analysisResult.emergencyRecommendation}
              />
            </Box>
          )}

          {/* Error Alert */}
          {error && (
            <Alert status="error" mb={6} borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle>Processing Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Box>
            </Alert>
          )}

          {/* Main Layout Grid */}
          <Grid templateColumns="repeat(12, 1fr)" gap={6}>
            {/* Left Column - Input */}
            <GridItem colSpan={{ base: 12, lg: 4 }}>
              <Card h="full">
                <CardBody>
                  <TranscriptInput
                    onAnalyze={handleAnalyze}
                    isLoading={isLoading}
                    initialTranscript={analysisResult?.transcript}
                  />
                </CardBody>
              </Card>

              {/* Processing Steps Visualization */}
              {isLoading && (
                <Card mt={6}>
                  <CardHeader>
                    <Heading size="sm">Processing Steps</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack align="stretch" spacing={3}>
                      {processingSteps.map((step, index) => (
                        <Box key={index}>
                          <HStack justify="space-between" mb={1}>
                            <HStack>
                              <Box
                                w={2}
                                h={2}
                                borderRadius="full"
                                bg={index <= currentStep ? 'green.400' : 'gray.300'}
                              />
                              <Text fontSize="sm" fontWeight={index === currentStep ? '600' : '400'}>
                                {step.name}
                              </Text>
                            </HStack>
                            <Badge fontSize="xs" colorScheme={index === currentStep ? 'blue' : 'gray'}>
                              {step.technique}
                            </Badge>
                          </HStack>
                          {index === currentStep && (
                            <Progress size="xs" isIndeterminate colorScheme="blue" borderRadius="full" />
                          )}
                        </Box>
                      ))}
                    </VStack>
                  </CardBody>
                </Card>
              )}
            </GridItem>

            {/* Right Column - Results */}
            <GridItem colSpan={{ base: 12, lg: 8 }}>
              {isLoading ? (
                <Card h="600px">
                  <CardBody>
                    <Flex h="full" align="center" justify="center">
                      <VStack spacing={6}>
                        <Spinner size="xl" color="brand.500" thickness="3px" />
                        <VStack spacing={2}>
                          <Text fontSize="lg" fontWeight="500" color="gray.700">
                            Analyzing Medical Transcript
                          </Text>
                          <Text fontSize="sm" color="gray.500">
                            {processingSteps[currentStep]?.name || 'Initializing...'}
                          </Text>
                          <Badge colorScheme="blue" mt={2}>
                            {processingSteps[currentStep]?.technique}
                          </Badge>
                        </VStack>
                      </VStack>
                    </Flex>
                  </CardBody>
                </Card>
              ) : analysisResult ? (
                <Box>
                  {/* Annotated Transcript Viewer */}
                  {analysisResult.annotatedTranscript && (
                    <Card mb={6}>
                      <CardBody>
                        <TranscriptViewer
                          annotatedTranscript={analysisResult.annotatedTranscript}
                          speakerInfo={analysisResult.speakerInfo}
                        />
                      </CardBody>
                    </Card>
                  )}

                  {/* Results Tabs */}
                  <Card>
                    <CardBody p={0}>
                      <Tabs index={activeTab} onChange={setActiveTab} variant="soft-rounded" size="sm">
                        <Box px={6} pt={6} pb={3} borderBottom="1px solid" borderColor="gray.200">
                          <TabList gap={2}>
                            <Tab>Clinical Note</Tab>
                            <Tab>Medical Codes</Tab>
                            <Tab>MBS Billing</Tab>
                            <Tab>Processing Log</Tab>
                          </TabList>
                        </Box>

                        <TabPanels>
                          <TabPanel p={6}>
                            <SOAPNote
                              soapNote={analysisResult.soapNote}
                              problems={analysisResult.problems}
                            />
                          </TabPanel>

                          <TabPanel p={6}>
                            <MedicalCodes
                              icd10Codes={analysisResult.icd10Codes}
                              cptCodes={analysisResult.cptCodes}
                            />
                          </TabPanel>

                          <TabPanel p={6}>
                            <BillingInfo
                              emLevel={analysisResult.emLevel}
                              billingHint={analysisResult.billingHint}
                            />
                          </TabPanel>

                          <TabPanel p={6}>
                            <TraceLog
                              traceLog={analysisResult.traceLog}
                              rawResponse={analysisResult.rawLLMResponse}
                            />
                          </TabPanel>
                        </TabPanels>
                      </Tabs>
                    </CardBody>
                  </Card>
                </Box>
              ) : (
                <Card h="600px">
                  <CardBody>
                    <Flex h="full" align="center" justify="center">
                      <VStack spacing={6}>
                        <Box
                          p={6}
                          bg="gray.50"
                          borderRadius="full"
                        >
                          <Icon as={FiActivity} boxSize={12} color="gray.400" />
                        </Box>
                        <VStack spacing={2}>
                          <Text fontSize="xl" fontWeight="600" color="gray.700">
                            Ready to Analyze
                          </Text>
                          <Text fontSize="sm" color="gray.500" textAlign="center" maxW="400px">
                            Enter or paste a medical transcript to generate clinical documentation
                          </Text>
                        </VStack>
                      </VStack>
                    </Flex>
                  </CardBody>
                </Card>
              )}
            </GridItem>
          </Grid>
        </Container>
      </Box>
    </ChakraProvider>
  );
}

export default App;