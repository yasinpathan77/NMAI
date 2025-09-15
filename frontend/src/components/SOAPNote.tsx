import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Divider,
  Button,
  useClipboard,
  useToast,
  Badge,
  Card,
  CardBody,
  Flex,
  Icon,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import type { SOAPNote as SOAPNoteType, Problem } from '../../../shared/types';

interface SOAPNoteProps {
  soapNote: SOAPNoteType;
  problems: Problem[];
}

export default function SOAPNote({ soapNote, problems }: SOAPNoteProps) {
  const toast = useToast();
  const { onCopy: copyAll } = useClipboard(
    `SOAP NOTE\n\nSubjective:\n${soapNote.subjective}\n\nObjective:\n${soapNote.objective}\n\nAssessment:\n${soapNote.assessment}\n\nPlan:\n${soapNote.plan}`
  );

  const handleCopyAll = () => {
    copyAll();
    toast({
      title: 'SOAP Note Copied',
      description: 'The complete SOAP note has been copied to clipboard.',
      status: 'success',
      duration: 2000,
      isClosable: true,
      position: 'bottom-right',
    });
  };

  const soapSections = [
    {
      title: 'Subjective',
      content: soapNote.subjective,
      color: 'blue.600',
      bgColor: 'blue.50',
      borderColor: 'blue.200',
    },
    {
      title: 'Objective',
      content: soapNote.objective,
      color: 'green.600',
      bgColor: 'green.50',
      borderColor: 'green.200',
    },
    {
      title: 'Assessment',
      content: soapNote.assessment,
      color: 'purple.600',
      bgColor: 'purple.50',
      borderColor: 'purple.200',
    },
    {
      title: 'Plan',
      content: soapNote.plan,
      color: 'orange.600',
      bgColor: 'orange.50',
      borderColor: 'orange.200',
    },
  ];

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <Flex justify="space-between" align="center">
        <Box>
          <Heading size="md" color="gray.800" fontWeight="600">
            Clinical Documentation
          </Heading>
          <Text fontSize="sm" color="gray.600" mt={1}>
            Structured SOAP note format for medical records
          </Text>
        </Box>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopyAll}
          leftIcon={
            <Icon viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
            </Icon>
          }
        >
          Copy Complete Note
        </Button>
      </Flex>

      {/* SOAP Sections */}
      <Grid templateColumns="repeat(2, 1fr)" gap={4}>
        {soapSections.map((section, index) => (
          <GridItem key={index} colSpan={{ base: 2, md: 1 }}>
            <Box
              bg="white"
              borderRadius="lg"
              border="1px solid"
              borderColor={section.borderColor}
              overflow="hidden"
              height="100%"
            >
              <Box bg={section.bgColor} px={4} py={3} borderBottom="1px solid" borderColor={section.borderColor}>
                <Text fontWeight="600" fontSize="sm" color={section.color} letterSpacing="wide">
                  {section.title.toUpperCase()}
                </Text>
              </Box>
              <Box p={4}>
                <Text fontSize="sm" color="gray.700" whiteSpace="pre-wrap" lineHeight="tall">
                  {section.content}
                </Text>
              </Box>
            </Box>
          </GridItem>
        ))}
      </Grid>

      <Divider />

      {/* Problem List */}
      <Box>
        <Flex justify="space-between" align="center" mb={4}>
          <Box>
            <Heading size="sm" color="gray.800" fontWeight="600">
              Identified Problems
            </Heading>
            <Text fontSize="xs" color="gray.600" mt={1}>
              Medical conditions and diagnoses with clinical rationale
            </Text>
          </Box>
          <Badge colorScheme="gray" fontSize="xs" px={2} py={1}>
            {problems.length} {problems.length === 1 ? 'Problem' : 'Problems'}
          </Badge>
        </Flex>

        <VStack spacing={3} align="stretch">
          {problems.map((problem, index) => (
            <Box
              key={index}
              bg="gray.50"
              borderRadius="lg"
              border="1px solid"
              borderColor="gray.200"
              p={4}
              transition="all 0.2s"
              _hover={{ borderColor: 'brand.300', boxShadow: 'sm' }}
            >
              <Flex justify="space-between" align="start">
                <HStack align="start" spacing={3} flex="1">
                  <Box
                    bg="brand.100"
                    color="brand.700"
                    px={2}
                    py={1}
                    borderRadius="md"
                    fontSize="xs"
                    fontWeight="600"
                    minW="fit-content"
                  >
                    #{index + 1}
                  </Box>
                  <VStack align="start" spacing={1} flex="1">
                    <Text fontWeight="600" fontSize="sm" color="gray.800">
                      {problem.description}
                    </Text>
                    <Text fontSize="xs" color="gray.600" lineHeight="tall">
                      <Text as="span" fontWeight="500" color="gray.700">Rationale:</Text> {problem.rationale}
                    </Text>
                  </VStack>
                </HStack>
              </Flex>
            </Box>
          ))}
        </VStack>
      </Box>

      {/* Footer Info */}
      <Box bg="blue.50" p={3} borderRadius="md" border="1px solid" borderColor="blue.200">
        <HStack spacing={2}>
          <Icon viewBox="0 0 20 20" fill="currentColor" color="blue.500">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </Icon>
          <Text fontSize="xs" color="blue.700">
            This documentation is AI-generated and must be reviewed by a qualified healthcare provider before use in patient care.
          </Text>
        </HStack>
      </Box>
    </VStack>
  );
}