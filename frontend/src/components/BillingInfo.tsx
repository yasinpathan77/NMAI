import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Badge,
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
} from '@chakra-ui/react';
import type { EMLevel } from '../../../shared/types';

interface BillingInfoProps {
  emLevel: EMLevel | null;
  billingHint: string;
}

export default function BillingInfo({ emLevel, billingHint }: BillingInfoProps) {
  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'green';
      case 'medium':
        return 'yellow';
      case 'low':
        return 'orange';
      default:
        return 'gray';
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      <Heading size="md">Billing Information</Heading>

      {/* E/M Level */}
      {emLevel && (
        <Card variant="outline">
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <HStack justify="space-between" align="start">
                <Box>
                  <Text fontSize="sm" color="gray.600" mb={1}>
                    Medicare Consultation Level
                  </Text>
                  <HStack align="center" spacing={3}>
                    <Text fontSize="2xl" fontWeight="bold" color="brand.600">
                      {emLevel.mbsItem || emLevel.level}
                    </Text>
                    <Badge colorScheme={getConfidenceColor(emLevel.confidence)} size="lg">
                      {emLevel.confidence} confidence
                    </Badge>
                  </HStack>
                </Box>
              </HStack>

              <Box>
                <Text fontWeight="semibold" fontSize="sm" mb={1}>
                  Description
                </Text>
                <Text fontSize="sm" color="gray.700">
                  {emLevel.description}
                </Text>
              </Box>

              <Box>
                <Text fontWeight="semibold" fontSize="sm" mb={1}>
                  Justification
                </Text>
                <Text fontSize="sm" color="gray.700">
                  {emLevel.justification}
                </Text>
              </Box>
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Billing Hint */}
      <Card bg="blue.50" variant="filled">
        <CardBody>
          <VStack align="stretch" spacing={3}>
            <Text fontWeight="semibold" fontSize="sm">
              Medicare Billing Recommendation
            </Text>
            <Text fontSize="sm">{billingHint}</Text>
          </VStack>
        </CardBody>
      </Card>

      {/* Billing Guidelines Reference */}
      <Card variant="outline">
        <CardBody>
          <Text fontWeight="semibold" fontSize="sm" mb={3}>
            Quick Reference: Australian MBS Guidelines
          </Text>
          <SimpleGrid columns={2} spacing={4}>
            <Stat size="sm">
              <StatLabel>Standard Consult</StatLabel>
              <StatNumber fontSize="sm">Item 23</StatNumber>
              <StatHelpText>6-20 minutes</StatHelpText>
            </Stat>
            <Stat size="sm">
              <StatLabel>Long Consult</StatLabel>
              <StatNumber fontSize="sm">Item 36</StatNumber>
              <StatHelpText>20-40 minutes</StatHelpText>
            </Stat>
          </SimpleGrid>

          <Box mt={4}>
            <Text fontSize="xs" color="gray.600">
              <strong>MBS Consultation Levels:</strong>
            </Text>
            <VStack align="stretch" spacing={1} mt={2}>
              <HStack>
                <Badge size="sm">Level A (Item 3)</Badge>
                <Text fontSize="xs">Brief consultation, &lt;6 minutes</Text>
              </HStack>
              <HStack>
                <Badge size="sm">Level B (Item 23)</Badge>
                <Text fontSize="xs">Standard consultation, 6-20 minutes</Text>
              </HStack>
              <HStack>
                <Badge size="sm">Level C (Item 36)</Badge>
                <Text fontSize="xs">Long consultation, 20-40 minutes</Text>
              </HStack>
              <HStack>
                <Badge size="sm">Level D (Item 44)</Badge>
                <Text fontSize="xs">Prolonged consultation, 40+ minutes</Text>
              </HStack>
            </VStack>
          </Box>
        </CardBody>
      </Card>

      {/* Important Notice */}
      <Card bg="yellow.50" variant="filled">
        <CardBody>
          <Text fontSize="xs" color="gray.700">
              <strong>Important:</strong> These billing suggestions are AI-generated and must be
              reviewed by qualified billing personnel. Always verify item numbers against current MBS
              guidelines. Consider Medicare requirements and bulk billing eligibility.
            </Text>
        </CardBody>
      </Card>
    </VStack>
  );
}