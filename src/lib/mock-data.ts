import type { DashboardData, RiskLevel, Significance } from '@/types/dashboard';

/**
 * Generates mock dashboard data for development and testing.
 * 
 * TODO: Replace this with actual database queries once Prisma models are finalized.
 * This function returns realistic placeholder data to support frontend development.
 * 
 * @returns {DashboardData} Mock dashboard data with realistic values
 */
export function getMockDashboardData(): DashboardData {
  // Generate realistic random values within specified ranges
  const totalExposure = Math.floor(Math.random() * (500000 - 150000) + 150000);
  const regulationCount = Math.floor(Math.random() * (50 - 15) + 15);
  const criticalDeadlines = Math.floor(Math.random() * (8 - 3) + 3);
  const highRiskChanges = Math.floor(Math.random() * (5 - 2) + 2);

  // Mock regulation names for realistic data
  const regulations = [
    'GDPR',
    'CCPA',
    'HIPAA',
    'SOC 2',
    'ISO 27001',
    'PCI-DSS',
    'NIST Cybersecurity Framework',
    'GLBA',
    'FERPA',
    'ITAR',
    'EAR',
    'GDPR Article 32',
    'CCPA Section 1798.100',
    'HITRUST CSF',
    'FDA 21 CFR Part 11',
  ];

  const jurisdictions = [
    'United States',
    'European Union',
    'United Kingdom',
    'Canada',
    'Australia',
    'Japan',
    'Singapore',
    'Brazil',
  ];

  // Generate 5 mock upcoming deadlines
  const upcomingDeadlines = Array.from({ length: 5 }, (_, i) => {
    const daysRemaining = Math.floor(Math.random() * 90) + 1;
    const riskLevelMap: RiskLevel[] = ['CRITICAL', 'CRITICAL', 'IMPORTANT', 'IMPORTANT', 'ROUTINE'];
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + daysRemaining);

    return {
      id: `deadline-${i + 1}`,
      regulation: regulations[Math.floor(Math.random() * regulations.length)],
      date: deadlineDate.toISOString().split('T')[0],
      daysRemaining,
      riskLevel: riskLevelMap[i],
    };
  });

  // Generate 5 mock recent changes
  const significanceOrder: Significance[] = ['HIGH', 'HIGH', 'MEDIUM', 'MEDIUM', 'LOW'];
  const recentChanges = Array.from({ length: 5 }, (_, i) => {
    const changeDate = new Date();
    changeDate.setDate(changeDate.getDate() - Math.floor(Math.random() * 30));

    return {
      id: `change-${i + 1}`,
      regulation: regulations[Math.floor(Math.random() * regulations.length)],
      jurisdiction: jurisdictions[Math.floor(Math.random() * jurisdictions.length)],
      significanceScore: significanceOrder[i],
      date: changeDate.toISOString().split('T')[0],
    };
  });

  return {
    totalExposure,
    regulationCount,
    criticalDeadlines,
    highRiskChanges,
    upcomingDeadlines,
    recentChanges,
  };
}
