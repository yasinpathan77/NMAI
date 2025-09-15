import {
  Alert,
  AlertIcon,
  Box,
  Text,
  Badge,
  HStack,
  Icon,
} from '@chakra-ui/react';
import { FiAlertTriangle, FiAlertCircle } from 'react-icons/fi';

interface ComplianceBannerProps {
  banner: string;
  hasEmergency: boolean;
  emergencyFlags?: string[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
  recommendation?: string;
}

export default function ComplianceBanner({
  banner,
  hasEmergency,
  emergencyFlags = [],
  severity = 'low',
  recommendation,
}: ComplianceBannerProps) {
  // Always show a prominent warning for ALL cases

  if (hasEmergency) {
    // Emergency case - show urgent warning
    const getSeverityColor = () => {
      switch (severity) {
        case 'critical': return 'red';
        case 'high': return 'orange';
        case 'medium': return 'yellow';
        default: return 'yellow';
      }
    };

    const severityColor = getSeverityColor();

    return (
      <Alert
        status="error"
        variant="left-accent"
        borderRadius="md"
        borderLeft="4px solid"
        borderLeftColor={`${severityColor}.500`}
        bg={`${severityColor}.50`}
        p={4}
      >
        <AlertIcon as={FiAlertTriangle} color={`${severityColor}.600`} />

        <Box flex="1">
          <HStack mb={2}>
            <Text fontWeight="bold" color={`${severityColor}.800`} fontSize="sm">
              ⚠️ URGENT: Emergency Indicators Detected
            </Text>
            <Badge colorScheme={severityColor} variant="solid" fontSize="xs">
              {severity.toUpperCase()}
            </Badge>
          </HStack>

          {recommendation && (
            <Text fontSize="sm" color="gray.700" mb={2}>
              {recommendation}
            </Text>
          )}

          {emergencyFlags.length > 0 && (
            <Box mb={2}>
              <Text fontSize="xs" color="gray.600" mb={1}>Detected conditions:</Text>
              <HStack wrap="wrap" spacing={2}>
                {emergencyFlags.map((flag, index) => (
                  <Badge key={index} colorScheme={severityColor} variant="outline" fontSize="xs">
                    {flag}
                  </Badge>
                ))}
              </HStack>
            </Box>
          )}

          <Box bg={`${severityColor}.100`} p={2} borderRadius="md" mt={3}>
            <Text fontSize="sm" color="gray.700" fontWeight="500">
              {banner || "Draft only; clinician review required; not a medical device; may be inaccurate."}
            </Text>
          </Box>

          <Text fontSize="xs" color="gray.600" fontStyle="italic" mt={2}>
            This is NOT a triage tool. Follow appropriate emergency protocols immediately.
          </Text>
        </Box>
      </Alert>
    );
  }

  // Non-emergency case - still show clear warning
  return (
    <Alert
      status="warning"
      variant="left-accent"
      borderRadius="md"
      borderLeft="4px solid"
      borderLeftColor="yellow.500"
      bg="yellow.50"
      p={4}
    >
      <AlertIcon as={FiAlertCircle} color="yellow.600" />

      <Box flex="1">
        <Text fontWeight="semibold" color="gray.800" fontSize="sm" mb={2}>
          ⚠️ Important Compliance Notice
        </Text>

        <Box bg="yellow.100" p={3} borderRadius="md">
          <Text fontSize="sm" color="gray.700" fontWeight="500">
            {banner || "Draft only; clinician review required; not a medical device; may be inaccurate."}
          </Text>
        </Box>

        <Text fontSize="xs" color="gray.600" mt={2} fontStyle="italic">
          All AI-generated content must be verified by a qualified healthcare professional before use.
        </Text>
      </Box>
    </Alert>
  );
}