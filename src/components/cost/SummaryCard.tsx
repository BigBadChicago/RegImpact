interface SummaryCardProps {
  label: string;
  value: string;
  description: string;
  accentClassName?: string;
  valueClassName?: string;
}

export default function SummaryCard({
  label,
  value,
  description,
  accentClassName = '',
  valueClassName = 'text-gray-900',
}: SummaryCardProps) {
  return (
    <div className={`bg-white shadow-md rounded-lg p-6 ${accentClassName}`}>
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${valueClassName}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-2">{description}</div>
    </div>
  );
}
