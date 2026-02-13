import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Starting seed...');

  // Hash passwords
  const adminPasswordHash = await bcrypt.hash('password123', 10);
  const userPasswordHash = await bcrypt.hash('password987', 10);

  // 1. Create 7 sample customers
  console.log('📊 Creating customers...');
  const customersData = [
    {
      id: 'customer-1',
      companyName: 'TechStart Inc',
      employeeCount: 50,
      industry: 'Technology',
      subscriptionTier: 'STARTER' as const,
    },
    {
      id: 'customer-2',
      companyName: 'Green Energy Solutions',
      employeeCount: 75,
      industry: 'Energy',
      subscriptionTier: 'STARTER' as const,
    },
    {
      id: 'customer-3',
      companyName: 'MediCare Plus',
      employeeCount: 100,
      industry: 'Healthcare',
      subscriptionTier: 'GROWTH' as const,
    },
    {
      id: 'customer-4',
      companyName: 'FinServe Corp',
      employeeCount: 200,
      industry: 'Financial Services',
      subscriptionTier: 'GROWTH' as const,
    },
    {
      id: 'customer-5',
      companyName: 'Manufacturing Dynamics',
      employeeCount: 350,
      industry: 'Manufacturing',
      subscriptionTier: 'SCALE' as const,
    },
    {
      id: 'customer-6',
      companyName: 'Retail Giants LLC',
      employeeCount: 500,
      industry: 'Retail',
      subscriptionTier: 'SCALE' as const,
    },
    {
      id: 'customer-7',
      companyName: 'Global Logistics Group',
      employeeCount: 750,
      industry: 'Transportation & Logistics',
      subscriptionTier: 'SCALE' as const,
    },
  ];

  const customers = [];
  for (const customerData of customersData) {
    const customer = await prisma.customer.upsert({
      where: { id: customerData.id },
      update: customerData,
      create: customerData,
    });
    customers.push(customer);
    console.log(`  ✓ Created/Updated: ${customer.companyName} (${customer.employeeCount} employees)`);
  }

  // 2. Create users for each customer (1 admin + 1 regular user)
  console.log('\n👥 Creating users...');
  for (const customer of customers) {
    // Admin user
    const adminUser = await prisma.user.upsert({
      where: { email: `admin@${customer.companyName.toLowerCase().replace(/\s+/g, '')}.com` },
      update: {
        name: `${customer.companyName} Admin`,
        passwordHash: adminPasswordHash,
        role: 'ADMIN',
        customerId: customer.id,
      },
      create: {
        email: `admin@${customer.companyName.toLowerCase().replace(/\s+/g, '')}.com`,
        name: `${customer.companyName} Admin`,
        passwordHash: adminPasswordHash,
        role: 'ADMIN',
        customerId: customer.id,
      },
    });
    console.log(`  ✓ Admin: ${adminUser.email}`);

    // Regular user
    const regularUser = await prisma.user.upsert({
      where: { email: `user@${customer.companyName.toLowerCase().replace(/\s+/g, '')}.com` },
      update: {
        name: `${customer.companyName} User`,
        passwordHash: userPasswordHash,
        role: 'USER',
        customerId: customer.id,
      },
      create: {
        email: `user@${customer.companyName.toLowerCase().replace(/\s+/g, '')}.com`,
        name: `${customer.companyName} User`,
        passwordHash: userPasswordHash,
        role: 'USER',
        customerId: customer.id,
      },
    });
    console.log(`  ✓ User: ${regularUser.email}`);
  }

  // 3. Create 15 US state jurisdictions (14 unique)
  console.log('\n🗺️  Creating jurisdictions...');
  const jurisdictionsData = [
    { code: 'CA', name: 'California' },
    { code: 'NY', name: 'New York' },
    { code: 'TX', name: 'Texas' },
    { code: 'FL', name: 'Florida' },
    { code: 'IL', name: 'Illinois' },
    { code: 'NJ', name: 'New Jersey' },
    { code: 'MI', name: 'Michigan' },
    { code: 'LA', name: 'Louisiana' },
    { code: 'OR', name: 'Oregon' },
    { code: 'WA', name: 'Washington' },
    { code: 'WI', name: 'Wisconsin' },
    { code: 'OH', name: 'Ohio' },
    { code: 'MA', name: 'Massachusetts' },
    { code: 'CO', name: 'Colorado' },
  ];

  const jurisdictions = [];
  for (const jurisdictionData of jurisdictionsData) {
    const jurisdiction = await prisma.jurisdiction.upsert({
      where: { code: jurisdictionData.code },
      update: {
        name: jurisdictionData.name,
        type: 'STATE',
      },
      create: {
        code: jurisdictionData.code,
        name: jurisdictionData.name,
        type: 'STATE',
      },
    });
    jurisdictions.push(jurisdiction);
    console.log(`  ✓ ${jurisdiction.code}: ${jurisdiction.name}`);
  }

  // 4. Create 5 sample regulations per jurisdiction
  console.log('\n⚖️  Creating regulations...');
  const regulationTypes = [
    'Environmental Protection',
    'Labor & Employment',
    'Data Privacy & Security',
    'Health & Safety',
    'Financial Compliance',
  ];

  let totalRegulations = 0;
  for (const jurisdiction of jurisdictions) {
    console.log(`\n  Creating regulations for ${jurisdiction.name}...`);
    
    for (let i = 0; i < regulationTypes.length; i++) {
      const type = regulationTypes[i];
      const regulationId = `reg-${jurisdiction.code.toLowerCase()}-${i + 1}`;
      
      const regulation = await prisma.regulation.upsert({
        where: { id: regulationId },
        update: {
          jurisdictionId: jurisdiction.id,
          regulationType: type,
          title: `${jurisdiction.name} ${type} Act`,
          sourceUrl: `https://www.${jurisdiction.code.toLowerCase()}.gov/regulations/${type.toLowerCase().replace(/\s+/g, '-')}`,
          effectiveDate: new Date(2025, Math.floor(Math.random() * 12), 1),
          status: 'ACTIVE',
        },
        create: {
          id: regulationId,
          jurisdictionId: jurisdiction.id,
          regulationType: type,
          title: `${jurisdiction.name} ${type} Act`,
          sourceUrl: `https://www.${jurisdiction.code.toLowerCase()}.gov/regulations/${type.toLowerCase().replace(/\s+/g, '-')}`,
          effectiveDate: new Date(2025, Math.floor(Math.random() * 12), 1),
          status: 'ACTIVE',
        },
      });

      // Create a version for each regulation
      const versionId = `ver-${regulationId}-1`;
      await prisma.regulationVersion.upsert({
        where: { id: versionId },
        update: {
          regulationId: regulation.id,
          versionNumber: 1,
          contentText: `This is the full text of the ${regulation.title}. It establishes comprehensive requirements for ${type.toLowerCase()} in ${jurisdiction.name}. Businesses must comply with all provisions outlined herein.`,
          contentJson: {
            sections: [
              { number: '1', title: 'Definitions', content: 'Key terms and definitions' },
              { number: '2', title: 'Requirements', content: 'Compliance requirements' },
              { number: '3', title: 'Enforcement', content: 'Enforcement provisions' },
            ],
          },
          publishedDate: new Date(2025, Math.floor(Math.random() * 12), 1),
        },
        create: {
          id: versionId,
          regulationId: regulation.id,
          versionNumber: 1,
          contentText: `This is the full text of the ${regulation.title}. It establishes comprehensive requirements for ${type.toLowerCase()} in ${jurisdiction.name}. Businesses must comply with all provisions outlined herein.`,
          contentJson: {
            sections: [
              { number: '1', title: 'Definitions', content: 'Key terms and definitions' },
              { number: '2', title: 'Requirements', content: 'Compliance requirements' },
              { number: '3', title: 'Enforcement', content: 'Enforcement provisions' },
            ],
          },
          publishedDate: new Date(2025, Math.floor(Math.random() * 12), 1),
        },
      });

      totalRegulations++;
      console.log(`    ✓ ${regulation.title}`);
    }
  }

  console.log(`\n✅ Seed completed successfully!`);
  console.log(`   - ${customers.length} customers created`);
  console.log(`   - ${customers.length * 2} users created (${customers.length} admins, ${customers.length} regular users)`);
  console.log(`   - ${jurisdictions.length} jurisdictions created`);
  console.log(`   - ${totalRegulations} regulations created with versions`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
