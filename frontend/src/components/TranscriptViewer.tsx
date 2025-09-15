import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Badge,
  Card,
  CardBody,
  Flex,
  Icon,
  Divider,
} from '@chakra-ui/react';

interface TranscriptViewerProps {
  annotatedTranscript: string;
  speakerInfo?: {
    speakers: {
      doctor: string;
      patient: string;
      others: string[];
    };
    confidence: string;
  };
}

export default function TranscriptViewer({ annotatedTranscript, speakerInfo }: TranscriptViewerProps) {
  // Parse the annotated transcript to highlight speakers
  const parseTranscript = (transcript: string) => {
    const lines = transcript.split('\n');
    return lines.map((line, index) => {
      const doctorMatch = line.match(/\[DOCTOR\](.+)/);
      const patientMatch = line.match(/\[PATIENT\](.+)/);
      const nurseMatch = line.match(/\[NURSE\](.+)/);

      if (doctorMatch) {
        return {
          type: 'doctor',
          content: doctorMatch[1].trim(),
          index,
        };
      } else if (patientMatch) {
        return {
          type: 'patient',
          content: patientMatch[1].trim(),
          index,
        };
      } else if (nurseMatch) {
        return {
          type: 'nurse',
          content: nurseMatch[1].trim(),
          index,
        };
      } else if (line.trim()) {
        return {
          type: 'narrative',
          content: line.trim(),
          index,
        };
      }
      return null;
    }).filter(Boolean);
  };

  const parsedLines = parseTranscript(annotatedTranscript);

  const getSpeakerColor = (type: string) => {
    switch (type) {
      case 'doctor':
        return 'blue';
      case 'patient':
        return 'green';
      case 'nurse':
        return 'purple';
      default:
        return 'gray';
    }
  };

  const getSpeakerIcon = (type: string) => {
    switch (type) {
      case 'doctor':
        return (
          <Icon viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </Icon>
        );
      case 'patient':
        return (
          <Icon viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </Icon>
        );
      default:
        return null;
    }
  };

  return (
    <VStack spacing={4} align="stretch">
      {/* Header */}
      <Flex justify="space-between" align="center">
        <Box>
          <Heading size="sm" color="gray.800" fontWeight="600">
            Annotated Transcript
          </Heading>
          <Text fontSize="xs" color="gray.600" mt={1}>
            Speaker-identified conversation with highlighted roles
          </Text>
        </Box>
        {speakerInfo && (
          <Badge
            colorScheme={
              speakerInfo.confidence === 'high' ? 'green' :
              speakerInfo.confidence === 'medium' ? 'yellow' : 'red'
            }
            fontSize="xs"
            px={2}
            py={1}
          >
            {speakerInfo.confidence} confidence
          </Badge>
        )}
      </Flex>

      {/* Speaker Legend */}
      {speakerInfo && speakerInfo.speakers && (
        <HStack spacing={4} pb={2}>
          <HStack>
            <Box w={3} h={3} bg="blue.400" borderRadius="full" />
            <Text fontSize="xs" fontWeight="500">
              Doctor: {speakerInfo.speakers.doctor}
            </Text>
          </HStack>
          <HStack>
            <Box w={3} h={3} bg="green.400" borderRadius="full" />
            <Text fontSize="xs" fontWeight="500">
              Patient: {speakerInfo.speakers.patient}
            </Text>
          </HStack>
          {speakerInfo.speakers.others && speakerInfo.speakers.others.length > 0 && (
            <HStack>
              <Box w={3} h={3} bg="purple.400" borderRadius="full" />
              <Text fontSize="xs" fontWeight="500">
                Others: {speakerInfo.speakers.others.join(', ')}
              </Text>
            </HStack>
          )}
        </HStack>
      )}

      <Divider />

      {/* Transcript Lines */}
      <VStack spacing={3} align="stretch" maxH="400px" overflowY="auto" pr={2}>
        {parsedLines.map((line: any) => (
          <Box
            key={line.index}
            p={3}
            borderRadius="md"
            bg={
              line.type === 'doctor' ? 'blue.50' :
              line.type === 'patient' ? 'green.50' :
              line.type === 'nurse' ? 'purple.50' :
              'gray.50'
            }
            borderLeft="3px solid"
            borderColor={
              line.type === 'doctor' ? 'blue.400' :
              line.type === 'patient' ? 'green.400' :
              line.type === 'nurse' ? 'purple.400' :
              'gray.400'
            }
          >
            <HStack spacing={2} mb={1}>
              {getSpeakerIcon(line.type)}
              <Badge
                colorScheme={getSpeakerColor(line.type)}
                fontSize="xs"
                textTransform="uppercase"
              >
                {line.type}
              </Badge>
            </HStack>
            <Text fontSize="sm" color="gray.700" lineHeight="tall">
              {line.content}
            </Text>
          </Box>
        ))}
      </VStack>

      {/* Info Note */}
      <Box bg="blue.50" p={3} borderRadius="md" border="1px solid" borderColor="blue.200">
        <HStack spacing={2}>
          <Icon viewBox="0 0 20 20" fill="currentColor" color="blue.500">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </Icon>
          <Text fontSize="xs" color="blue.700">
            Speaker identification uses AI to detect roles based on context when explicit labels are not present.
          </Text>
        </HStack>
      </Box>
    </VStack>
  );
}