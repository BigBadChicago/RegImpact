import type { DepartmentCostBreakdown } from '@/types/cost-estimate';
import { formatCurrency } from './cost-utils';

interface DepartmentRowProps {
  dept: DepartmentCostBreakdown;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function DepartmentRow({
  dept,
  isExpanded,
  onToggle,
}: DepartmentRowProps) {
  return (
    <div className="border border-gray-200 rounded-md overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex justify-between items-center"
      >
        <div className="flex items-center gap-4">
          <span className="font-semibold text-gray-900">{dept.department}</span>
          <span className="text-sm text-gray-600">{dept.fteImpact} FTE</span>
          <span className="text-xs text-gray-500">{dept.budgetCode}</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-sm text-gray-600">One-Time</div>
            <div className="font-semibold text-gray-900">
              {formatCurrency(dept.oneTimeCost)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Annual</div>
            <div className="font-semibold text-gray-900">
              {formatCurrency(dept.recurringCostAnnual)}
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-600 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 py-3 bg-white space-y-2">
          {dept.lineItems.map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-start p-2 hover:bg-gray-50 rounded"
            >
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  {item.description}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {item.category} • {item.isOneTime ? 'One-time' : 'Recurring'} •
                  Confidence: {Math.round(item.confidence * 100)}%
                </div>
              </div>
              <div className="text-sm font-semibold text-gray-900 ml-4">
                {formatCurrency(item.estimatedCost)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
