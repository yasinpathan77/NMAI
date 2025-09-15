import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Button,
  useClipboard,
  useToast,
} from '@chakra-ui/react';
import type { ICD10Code, CPTCode } from '../../../shared/types';

interface MedicalCodesProps {
  icd10Codes: ICD10Code[];
  cptCodes: CPTCode[];
}

export default function MedicalCodes({ icd10Codes, cptCodes }: MedicalCodesProps) {
  const toast = useToast();

  const getConfidenceBadgeColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'green';
      case 'medium':
        return 'yellow';
      case 'low':
        return 'red';
      default:
        return 'gray';
    }
  };

  const copyCode = (code: string, description: string) => {
    navigator.clipboard.writeText(`${code} - ${description}`);
    toast({
      title: 'Code copied',
      description: `${code} copied to clipboard`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const exportCodes = () => {
    const data = {
      icd10Codes,
      cptCodes,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medical-codes-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Codes exported',
      description: 'Medical codes exported as JSON',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <VStack spacing={6} align="stretch">
      <HStack justify="space-between">
        <Heading size="md">Medical Codes</Heading>
        <Button size="sm" onClick={exportCodes}>
          Export JSON
        </Button>
      </HStack>

      {/* ICD-10-AM Codes */}
      <Box>
        <Heading size="sm" mb={3}>
          ICD-10-AM Diagnosis Codes
        </Heading>
        {icd10Codes.length > 0 ? (
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Code</Th>
                  <Th>Description</Th>
                  <Th>Confidence</Th>
                  <Th>Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {icd10Codes.map((code, index) => (
                  <Tr key={index}>
                    <Td>
                      <Text fontFamily="mono" fontWeight="bold">
                        {code.code}
                      </Text>
                    </Td>
                    <Td>{code.description}</Td>
                    <Td>
                      <Badge colorScheme={getConfidenceBadgeColor(code.confidence)}>
                        {code.confidence}
                      </Badge>
                    </Td>
                    <Td>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => copyCode(code.code, code.description)}
                      >
                        Copy
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        ) : (
          <Text fontSize="sm" color="gray.500">
            No ICD-10-AM codes suggested
          </Text>
        )}
      </Box>

      {/* MBS Items */}
      <Box>
        <Heading size="sm" mb={3}>
          MBS Item Numbers
        </Heading>
        {cptCodes.length > 0 ? (
          <TableContainer>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>MBS Item</Th>
                  <Th>Description</Th>
                  <Th>Justification</Th>
                  <Th>Confidence</Th>
                  <Th>Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {cptCodes.map((code, index) => (
                  <Tr key={index}>
                    <Td>
                      <Text fontFamily="mono" fontWeight="bold">
                        {(code as any).mbsItem || code.code}
                      </Text>
                    </Td>
                    <Td>{code.description}</Td>
                    <Td>
                      <Text fontSize="xs">{code.justification}</Text>
                    </Td>
                    <Td>
                      <Badge colorScheme={getConfidenceBadgeColor(code.confidence)}>
                        {code.confidence}
                      </Badge>
                    </Td>
                    <Td>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => copyCode(code.code, code.description)}
                      >
                        Copy
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        ) : (
          <Text fontSize="sm" color="gray.500">
            No MBS items suggested
          </Text>
        )}
      </Box>

      {/* Summary Statistics */}
      <Box bg="gray.50" p={4} borderRadius="md">
        <HStack spacing={6}>
          <VStack align="start">
            <Text fontSize="xs" color="gray.600">
              Total ICD-10-AM Codes
            </Text>
            <Text fontWeight="bold">{icd10Codes.length}</Text>
          </VStack>
          <VStack align="start">
            <Text fontSize="xs" color="gray.600">
              Total MBS Items
            </Text>
            <Text fontWeight="bold">{cptCodes.length}</Text>
          </VStack>
          <VStack align="start">
            <Text fontSize="xs" color="gray.600">
              High Confidence
            </Text>
            <Text fontWeight="bold">
              {[...icd10Codes, ...cptCodes].filter(c => c.confidence === 'high').length}
            </Text>
          </VStack>
        </HStack>
      </Box>
    </VStack>
  );
}