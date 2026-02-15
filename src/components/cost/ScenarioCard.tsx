import type { CostScenario } from '@/types/cost-estimate';
import { formatCurrency, getRiskColor } from './cost-utils';

interface ScenarioCardProps {
  scenario: CostScenario;
  isRecommended: boolean;
  wrapperClassName?: string;
}

export default function ScenarioCard({
  scenario,
  isRecommended,
  wrapperClassName = 'border-gray-200',
}: ScenarioCardProps) {
  return (
    <div
      className={`border-2 rounded-lg p-4 ${
        isRecommended ? 'border-blue-500 bg-blue-50' : wrapperClassName
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-gray-900">{scenario.name}</h4>
        {isRecommended && (
          <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
            Recommended
          </span>
        )}
      </div>
      <p className="text-xs text-gray-600 mb-3">{scenario.description}</p>
      <div className="space-y-2">
        <div>
          <div className="text-xs text-gray-600">3-Year Total</div>
          <div className="text-lg font-bold text-gray-900">
            {formatCurrency(scenario.threeYearTotal)}
          </div>
        </div>
        <div
          className={`text-xs px-2 py-1 rounded border ${getRiskColor(
            scenario.riskLevel
          )}`}
        >
          {scenario.riskLevel} Risk
        </div>
      </div>
    </div>
  );
}
