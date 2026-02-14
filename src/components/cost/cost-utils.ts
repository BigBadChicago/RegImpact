import { RiskLevel } from '@/types/cost-estimate';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const getRiskColor = (risk: RiskLevel): string => {
  switch (risk) {
    case RiskLevel.MINIMAL:
      return 'text-green-700 bg-green-50 border-green-200';
    case RiskLevel.LOW:
      return 'text-blue-700 bg-blue-50 border-blue-200';
    case RiskLevel.MEDIUM:
      return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    case RiskLevel.HIGH:
      return 'text-red-700 bg-red-50 border-red-200';
  }
};
