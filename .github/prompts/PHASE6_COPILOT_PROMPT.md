# PHASE 6: Enterprise Integration (Months 11-12)

## Overview
Enterprise-grade integrations enabling RegImpact to connect with corporate identity providers, collaboration tools, ERP systems, and exposing a public API for custom integrations.

**Timeline:** Months 11-12  
**Effort:** 245 hours  
**Files:** 7 files  
**Feature Branch:** `feature/phase6-enterprise`

---

## Features to Implement

1. **Single Sign-On (SSO)** - SAML and OAuth providers (Azure AD, Okta, Google Workspace)
2. **Slack Integration** - Slash commands, alerts, interactive messages
3. **Microsoft Teams Integration** - Bot commands, cards, tab embedding
4. **ERP Integration** - QuickBooks and NetSuite sync
5. **Public API Platform** - REST API with documentation

---

## Implementation Prompt

```
Implement Phase 6 enterprise features. SSO, API, integrations.

FEATURES:
1. Single Sign-On (SAML, OAuth)
2. Slack Integration
3. Microsoft Teams Integration
4. ERP Integration (QuickBooks, NetSuite)
5. Public API Platform

FILES TO CREATE:

FILE 1: src/app/api/auth/[...nextauth]/route.ts (UPDATE)
Update existing NextAuth configuration to add SSO providers:

```typescript
import NextAuth, { NextAuthOptions } from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import SAMLProvider from 'next-auth/providers/saml';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Azure AD (Microsoft Entra ID)
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: {
        params: {
          scope: 'openid profile email User.Read'
        }
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: profile.roles?.includes('RegImpact.Admin') ? 'ADMIN' : 'USER'
        };
      }
    }),
    
    // Google Workspace
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          hd: process.env.GOOGLE_WORKSPACE_DOMAIN, // Restrict to domain
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code'
        }
      }
    }),
    
    // Generic SAML (Okta, OneLogin, etc.)
    SAMLProvider({
      id: 'saml',
      name: 'SSO',
      type: 'saml',
      options: {
        issuer: process.env.SAML_ISSUER!,
        idpUrl: process.env.SAML_IDP_URL!,
        cert: process.env.SAML_CERT!,
        callbackUrl: `${process.env.NEXTAUTH_URL}/api/auth/callback/saml`
      },
      profile(profile: any) {
        return {
          id: profile.nameID || profile.email,
          name: profile.displayName || profile.name,
          email: profile.email,
          role: profile.role || 'USER'
        };
      }
    })
  ],
  
  callbacks: {
    async signIn({ user, account, profile }) {
      // Just-in-time (JIT) user provisioning
      if (account?.provider === 'azure-ad' || account?.provider === 'google' || account?.provider === 'saml') {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! }
        });
        
        if (!existingUser) {
          // Auto-provision user
          await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name!,
              role: (profile as any).role || 'USER',
              customerId: process.env.DEFAULT_CUSTOMER_ID! // Map to customer
            }
          });
        }
      }
      return true;
    },
    
    async jwt({ token, user, account }) {
      if (user) {
        token.role = (user as any).role;
        token.customerId = (user as any).customerId;
      }
      return token;
    },
    
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).customerId = token.customerId;
      }
      return session;
    }
  },
  
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

FILE 2: src/app/api/integrations/slack/route.ts
```typescript
import { App, ExpressReceiver } from '@slack/bolt';
import { prisma } from '@/lib/prisma';

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET!
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  receiver
});

// Slash command: /regimpact score
app.command('/regimpact-score', async ({ command, ack, respond }) => {
  await ack();
  
  try {
    // Get user's customer ID from Slack user ID mapping
    const integration = await prisma.slackIntegration.findUnique({
      where: { slackUserId: command.user_id }
    });
    
    if (!integration) {
      await respond({
        text: 'Please link your RegImpact account first: /regimpact-connect'
      });
      return;
    }
    
    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/dashboard/metrics?customerId=${integration.customerId}`);
    const { metrics } = await res.json();
    
    await respond({
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Compliance Health Score*\n${metrics.healthScore}/100 ${metrics.healthScore >= 80 ? ':white_check_mark:' : ':warning:'}`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Regulations Tracked*\n${metrics.regulationCount}`
            },
            {
              type: 'mrkdwn',
              text: `*Cost Exposure*\n$${(metrics.totalCostExposure / 1000000).toFixed(1)}M`
            }
          ]
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Dashboard'
              },
              url: `${process.env.NEXTAUTH_URL}/dashboard/executive`
            }
          ]
        }
      ]
    });
  } catch (error) {
    console.error('Slack command error:', error);
    await respond({ text: 'Error fetching data. Please try again.' });
  }
});

// Slash command: /regimpact deadlines
app.command('/regimpact-deadlines', async ({ command, ack, respond }) => {
  await ack();
  
  const integration = await prisma.slackIntegration.findUnique({
    where: { slackUserId: command.user_id }
  });
  
  if (!integration) {
    await respond({ text: 'Please link your account: /regimpact-connect' });
    return;
  }
  
  const deadlines = await prisma.deadline.findMany({
    where: {
      regulation: { customerId: integration.customerId },
      status: { not: 'COMPLETED' },
      dueDate: { gte: new Date() }
    },
    include: { regulation: true },
    take: 5,
    orderBy: { dueDate: 'asc' }
  });
  
  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Upcoming Deadlines*'
      }
    },
    ...deadlines.map(d => ({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${d.regulation.title}*\n${d.type} - Due <t:${Math.floor(d.dueDate.getTime() / 1000)}:R>`
      }
    }))
  ];
  
  await respond({ blocks });
});

// Interactive button handler (approve cost estimate)
app.action('approve_cost_estimate', async ({ body, ack, respond }) => {
  await ack();
  
  const estimateId = (body as any).actions[0].value;
  
  await prisma.approval.update({
    where: { id: estimateId },
    data: { status: 'APPROVED', approvedAt: new Date() }
  });
  
  await respond({
    replace_original: true,
    text: ':white_check_mark: Cost estimate approved!'
  });
});

// Link unfurling (auto-expand RegImpact links)
app.event('link_shared', async ({ event, client }) => {
  const links = event.links.filter((link: any) => 
    link.url.includes('regimpact.com')
  );
  
  for (const link of links) {
    // Extract regulation ID from URL
    const match = link.url.match(/\/regulations\/([a-zA-Z0-9]+)/);
    if (match) {
      const regulationId = match[1];
      const regulation = await prisma.regulation.findUnique({
        where: { id: regulationId },
        include: { costEstimate: true }
      });
      
      if (regulation) {
        await client.chat.unfurl({
          channel: event.channel,
          ts: event.message_ts,
          unfurls: {
            [link.url]: {
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*${regulation.title}*\n${regulation.jurisdiction} • ${regulation.priority} priority`
                  }
                },
                {
                  type: 'section',
                  fields: [
                    {
                      type: 'mrkdwn',
                      text: `*Status*\n${regulation.status}`
                    },
                    {
                      type: 'mrkdwn',
                      text: `*Estimated Cost*\n$${regulation.costEstimate?.estimatedCost.toLocaleString()}`
                    }
                  ]
                }
              ]
            }
          }
        });
      }
    }
  }
});

export async function POST(request: Request) {
  return receiver.requestHandler(request as any);
}
```

FILE 3: src/lib/integrations/slack-bot.ts
```typescript
import { WebClient } from '@slack/web-api';
import { prisma } from '@/lib/prisma';

const client = new WebClient(process.env.SLACK_BOT_TOKEN);

export async function postAlertToSlack(
  customerId: string,
  alert: {
    type: string;
    title: string;
    message: string;
    actionUrl?: string;
  }
): Promise<void> {
  // Get Slack channels for this customer
  const integration = await prisma.slackIntegration.findFirst({
    where: { customerId }
  });
  
  if (!integration?.channelId) return;
  
  const color = alert.type === 'CRITICAL' ? '#ef4444' : alert.type === 'IMPORTANT' ? '#f59e0b' : '#3b82f6';
  
  await client.chat.postMessage({
    channel: integration.channelId,
    attachments: [
      {
        color,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${alert.title}*\n${alert.message}`
            }
          },
          ...(alert.actionUrl ? [
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: 'View Details'
                  },
                  url: alert.actionUrl
                }
              ]
            }
          ] : [])
        ]
      }
    ]
  });
}
```

FILE 4: src/app/api/integrations/teams/route.ts
```typescript
import { TeamsActivityHandler, CardFactory, TurnContext } from 'botbuilder';
import { BotFrameworkAdapter } from 'botbuilder';
import { prisma } from '@/lib/prisma';

const adapter = new BotFrameworkAdapter({
  appId: process.env.TEAMS_APP_ID!,
  appPassword: process.env.TEAMS_APP_PASSWORD!
});

class RegImpactBot extends TeamsActivityHandler {
  constructor() {
    super();
    
    // Message handler
    this.onMessage(async (context, next) => {
      const text = context.activity.text.toLowerCase();
      
      if (text.includes('score')) {
        await this.handleScoreCommand(context);
      } else if (text.includes('deadlines')) {
        await this.handleDeadlinesCommand(context);
      } else {
        await context.sendActivity('Try asking: "What\'s my score?" or "Show deadlines"');
      }
      
      await next();
    });
  }
  
  async handleScoreCommand(context: TurnContext) {
    // Get user's customer ID from Teams user mapping
    const userId = context.activity.from.aadObjectId;
    const integration = await prisma.teamsIntegration.findUnique({
      where: { teamsUserId: userId }
    });
    
    if (!integration) {
      await context.sendActivity('Please link your RegImpact account first.');
      return;
    }
    
    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/dashboard/metrics?customerId=${integration.customerId}`);
    const { metrics } = await res.json();
    
    const card = CardFactory.adaptiveCard({
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'TextBlock',
          text: 'Compliance Health Score',
          size: 'Large',
          weight: 'Bolder'
        },
        {
          type: 'ColumnSet',
          columns: [
            {
              type: 'Column',
              width: 'stretch',
              items: [
                {
                  type: 'TextBlock',
                  text: `${metrics.healthScore}/100`,
                  size: 'ExtraLarge',
                  weight: 'Bolder',
                  color: metrics.healthScore >= 80 ? 'Good' : 'Warning'
                }
              ]
            },
            {
              type: 'Column',
              width: 'stretch',
              items: [
                {
                  type: 'TextBlock',
                  text: `${metrics.regulationCount} regulations tracked`,
                  wrap: true
                },
                {
                  type: 'TextBlock',
                  text: `$${(metrics.totalCostExposure / 1000000).toFixed(1)}M exposure`,
                  wrap: true
                }
              ]
            }
          ]
        }
      ],
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'View Dashboard',
          url: `${process.env.NEXTAUTH_URL}/dashboard/executive`
        }
      ]
    });
    
    await context.sendActivity({ attachments: [card] });
  }
  
  async handleDeadlinesCommand(context: TurnContext) {
    const userId = context.activity.from.aadObjectId;
    const integration = await prisma.teamsIntegration.findUnique({
      where: { teamsUserId: userId }
    });
    
    if (!integration) {
      await context.sendActivity('Please link your account first.');
      return;
    }
    
    const deadlines = await prisma.deadline.findMany({
      where: {
        regulation: { customerId: integration.customerId },
        status: { not: 'COMPLETED' },
        dueDate: { gte: new Date() }
      },
      include: { regulation: true },
      take: 5,
      orderBy: { dueDate: 'asc' }
    });
    
    const card = CardFactory.adaptiveCard({
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'TextBlock',
          text: 'Upcoming Deadlines',
          size: 'Large',
          weight: 'Bolder'
        },
        ...deadlines.map(d => ({
          type: 'Container',
          items: [
            {
              type: 'TextBlock',
              text: d.regulation.title,
              weight: 'Bolder',
              wrap: true
            },
            {
              type: 'TextBlock',
              text: `${d.type} - Due ${d.dueDate.toLocaleDateString()}`,
              spacing: 'None',
              wrap: true
            }
          ],
          separator: true
        }))
      ]
    });
    
    await context.sendActivity({ attachments: [card] });
  }
}

const bot = new RegImpactBot();

export async function POST(request: Request) {
  const body = await request.json();
  
  await adapter.process(request as any, {} as any, async (context) => {
    await bot.run(context);
  });
  
  return new Response(null, { status: 200 });
}
```

FILE 5: src/app/api/integrations/erp/[provider]/route.ts
```typescript
import { NextRequest } from 'next/server';
import OAuthClient from 'intuit-oauth';
import axios from 'axios';
import { prisma } from '@/lib/prisma';

// QuickBooks OAuth client
const qboClient = new OAuthClient({
  clientId: process.env.QUICKBOOKS_CLIENT_ID!,
  clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET!,
  environment: 'production',
  redirectUri: `${process.env.NEXTAUTH_URL}/api/integrations/erp/quickbooks/callback`
});

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  if (params.provider === 'quickbooks') {
    if (action === 'connect') {
      // Initiate OAuth flow
      const authUri = qboClient.authorizeUri({
        scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.Payment],
        state: searchParams.get('customerId')
      });
      return Response.redirect(authUri);
    }
    
    if (action === 'callback') {
      // Handle OAuth callback
      const code = searchParams.get('code');
      const state = searchParams.get('state'); // customerId
      
      const authResponse = await qboClient.createToken(request.url);
      const tokens = authResponse.getJson();
      
      // Store tokens
      await prisma.erpIntegration.create({
        data: {
          customerId: state!,
          provider: 'QUICKBOOKS',
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          realmId: tokens.realmId
        }
      });
      
      return Response.redirect(`${process.env.NEXTAUTH_URL}/settings/integrations?success=true`);
    }
  }
  
  if (params.provider === 'netsuite') {
    // NetSuite uses token-based auth (TBA)
    if (action === 'sync') {
      const customerId = searchParams.get('customerId');
      const integration = await prisma.erpIntegration.findFirst({
        where: { customerId: customerId!, provider: 'NETSUITE' }
      });
      
      if (!integration) {
        return Response.json({ error: 'Integration not configured' }, { status: 400 });
      }
      
      await syncToNetSuite(customerId!, integration);
      return Response.json({ success: true });
    }
  }
  
  return Response.json({ error: 'Invalid action' }, { status: 400 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  const body = await request.json();
  
  if (params.provider === 'quickbooks') {
    // Sync cost estimate to QuickBooks as Purchase Order
    const { costEstimateId } = body;
    
    const estimate = await prisma.costEstimate.findUnique({
      where: { id: costEstimateId },
      include: { regulation: true }
    });
    
    if (!estimate) {
      return Response.json({ error: 'Estimate not found' }, { status: 404 });
    }
    
    const integration = await prisma.erpIntegration.findFirst({
      where: { customerId: estimate.regulation.customerId, provider: 'QUICKBOOKS' }
    });
    
    if (!integration) {
      return Response.json({ error: 'QuickBooks not connected' }, { status: 400 });
    }
    
    qboClient.setToken(integration.accessToken);
    
    // Create Purchase Order in QuickBooks
    const poData = {
      VendorRef: { value: '1' }, // Map to default vendor
      Line: [
        {
          DetailType: 'ItemBasedExpenseLineDetail',
          Amount: estimate.estimatedCost,
          ItemBasedExpenseLineDetail: {
            ItemRef: { value: '1' } // Map to compliance expense item
          },
          Description: `Regulatory Compliance: ${estimate.regulation.title}`
        }
      ]
    };
    
    const response = await qboClient.makeApiCall({
      url: `${qboClient.environment}/v3/company/${integration.realmId}/purchaseorder`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(poData)
    });
    
    // Save reference
    await prisma.costEstimate.update({
      where: { id: costEstimateId },
      data: { erpReferenceId: response.json.PurchaseOrder.Id }
    });
    
    return Response.json({ success: true, poId: response.json.PurchaseOrder.Id });
  }
  
  return Response.json({ error: 'Provider not supported' }, { status: 400 });
}

async function syncToNetSuite(customerId: string, integration: any) {
  // NetSuite REST API integration
  const estimates = await prisma.costEstimate.findMany({
    where: {
      regulation: { customerId },
      erpReferenceId: null
    },
    include: { regulation: true }
  });
  
  for (const estimate of estimates) {
    // Create Purchase Order in NetSuite
    const response = await axios.post(
      `${process.env.NETSUITE_API_URL}/record/v1/purchaseOrder`,
      {
        entity: { id: process.env.NETSUITE_VENDOR_ID },
        item: [
          {
            item: { id: process.env.NETSUITE_COMPLIANCE_ITEM_ID },
            quantity: 1,
            rate: estimate.estimatedCost,
            description: estimate.regulation.title
          }
        ]
      },
      {
        headers: {
          'Authorization': `OAuth ${integration.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    await prisma.costEstimate.update({
      where: { id: estimate.id },
      data: { erpReferenceId: response.data.id }
    });
  }
}
```

FILE 6: src/app/api/v1/[...endpoint]/route.ts
```typescript
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/api/rate-limit';

// Rate limiting: 1000 requests per hour per API key
const limiter = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 500
});

async function authenticateApiKey(request: NextRequest): Promise<string | null> {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) return null;
  
  const key = await prisma.apiKey.findUnique({
    where: { key: apiKey, active: true }
  });
  
  return key?.customerId || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { endpoint: string[] } }
) {
  try {
    await limiter.check(request, 1000);
  } catch {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  
  const customerId = await authenticateApiKey(request);
  if (!customerId) {
    return Response.json({ error: 'Invalid API key' }, { status: 401 });
  }
  
  const endpoint = params.endpoint.join('/');
  
  try {
    switch (endpoint) {
      case 'regulations': {
        const regulations = await prisma.regulation.findMany({
          where: { customerId },
          include: { costEstimate: true, deadlines: true }
        });
        return Response.json({ data: regulations });
      }
      
      case 'deadlines': {
        const deadlines = await prisma.deadline.findMany({
          where: { regulation: { customerId } },
          include: { regulation: true }
        });
        return Response.json({ data: deadlines });
      }
      
      case 'cost-estimates': {
        const estimates = await prisma.costEstimate.findMany({
          where: { regulation: { customerId } },
          include: { regulation: true }
        });
        return Response.json({ data: estimates });
      }
      
      case 'dashboard': {
        const metricsRes = await fetch(
          `${process.env.NEXTAUTH_URL}/api/dashboard/metrics?customerId=${customerId}`
        );
        const metrics = await metricsRes.json();
        return Response.json({ data: metrics });
      }
      
      default:
        return Response.json({ error: 'Endpoint not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

FILE 7: src/lib/integrations/api-client.ts
```typescript
/**
 * RegImpact TypeScript SDK
 * Official client library for the RegImpact API
 * 
 * @packageDocumentation
 */

export interface RegImpactConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface Regulation {
  id: string;
  title: string;
  jurisdiction: string;
  status: string;
  priority: string;
  detectedDate: Date;
  costEstimate?: CostEstimate;
  deadlines: Deadline[];
}

export interface Deadline {
  id: string;
  type: string;
  dueDate: Date;
  status: string;
  regulationId: string;
}

export interface CostEstimate {
  id: string;
  estimatedCost: number;
  actualCost?: number;
  regulationId: string;
}

export interface DashboardMetrics {
  healthScore: number;
  healthTrend: number;
  totalCostExposure: number;
  costTrend: number;
  regulationCount: number;
  upcomingDeadlines: number;
}

export class RegImpactClient {
  private apiKey: string;
  private baseUrl: string;
  
  constructor(config: RegImpactConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.regimpact.com/v1';
  }
  
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${endpoint}`, {
      ...options,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }
    
    const { data } = await response.json();
    return data;
  }
  
  // Regulations
  async getRegulations(): Promise<Regulation[]> {
    return this.request<Regulation[]>('regulations');
  }
  
  async getRegulation(id: string): Promise<Regulation> {
    return this.request<Regulation>(`regulations/${id}`);
  }
  
  // Deadlines
  async getDeadlines(): Promise<Deadline[]> {
    return this.request<Deadline[]>('deadlines');
  }
  
  async getDeadline(id: string): Promise<Deadline> {
    return this.request<Deadline>(`deadlines/${id}`);
  }
  
  // Cost Estimates
  async getCostEstimates(): Promise<CostEstimate[]> {
    return this.request<CostEstimate[]>('cost-estimates');
  }
  
  // Dashboard
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return this.request<DashboardMetrics>('dashboard');
  }
}

// Example usage:
// const client = new RegImpactClient({ apiKey: 'your-api-key' });
// const regulations = await client.getRegulations();
```

DEPENDENCIES:
npm install @slack/bolt @slack/web-api @microsoft/microsoft-graph-client botbuilder intuit-oauth axios express-rate-limit swagger-ui-express

PRISMA SCHEMA ADDITIONS:
```prisma
model SlackIntegration {
  id String @id @default(cuid())
  customerId String
  slackUserId String @unique
  slackTeamId String
  channelId String?
  accessToken String
  createdAt DateTime @default(now())
  customer Customer @relation(fields: [customerId], references: [id])
  
  @@index([customerId])
}

model TeamsIntegration {
  id String @id @default(cuid())
  customerId String
  teamsUserId String @unique
  tenantId String
  accessToken String
  createdAt DateTime @default(now())
  customer Customer @relation(fields: [customerId], references: [id])
  
  @@index([customerId])
}

model ErpIntegration {
  id String @id @default(cuid())
  customerId String
  provider String  // QUICKBOOKS, NETSUITE
  accessToken String
  refreshToken String?
  realmId String?  // QuickBooks realm ID
  expiresAt DateTime?
  createdAt DateTime @default(now())
  customer Customer @relation(fields: [customerId], references: [id])
  
  @@unique([customerId, provider])
}

model ApiKey {
  id String @id @default(cuid())
  customerId String
  key String @unique
  name String
  active Boolean @default(true)
  lastUsedAt DateTime?
  createdAt DateTime @default(now())
  customer Customer @relation(fields: [customerId], references: [id])
  
  @@index([customerId])
}

// Add to CostEstimate model
model CostEstimate {
  // ... existing fields
  erpReferenceId String?  // Reference to ERP system PO/invoice
}
```

ENVIRONMENT VARIABLES:
```env
# Azure AD
AZURE_AD_CLIENT_ID=your_client_id
AZURE_AD_CLIENT_SECRET=your_client_secret
AZURE_AD_TENANT_ID=your_tenant_id

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_WORKSPACE_DOMAIN=yourdomain.com

# SAML (Okta, OneLogin, etc.)
SAML_ISSUER=your_issuer
SAML_IDP_URL=your_idp_url
SAML_CERT=your_certificate

# Slack
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_SIGNING_SECRET=your_signing_secret

# Microsoft Teams
TEAMS_APP_ID=your_app_id
TEAMS_APP_PASSWORD=your_app_password

# QuickBooks
QUICKBOOKS_CLIENT_ID=your_client_id
QUICKBOOKS_CLIENT_SECRET=your_client_secret

# NetSuite
NETSUITE_API_URL=https://your-account.suitetalk.api.netsuite.com
NETSUITE_VENDOR_ID=your_vendor_id
NETSUITE_COMPLIANCE_ITEM_ID=your_item_id
```

TESTING:
□ SSO login works with Azure AD
□ SSO login works with Google Workspace
□ SAML login works with Okta
□ JIT user provisioning creates users correctly
□ Slack bot responds to /regimpact commands
□ Slack alerts post to correct channels
□ Slack link unfurling displays regulation details
□ Teams bot responds to messages
□ Teams adaptive cards render correctly
□ QuickBooks OAuth flow completes
□ QuickBooks PO creation works
□ NetSuite sync creates POs
□ Public API authenticates with API keys
□ Public API returns correct data
□ Rate limiting prevents abuse (1000 req/hour)
□ API documentation is complete and accurate
□ TypeScript SDK works as expected

EFFORT: 245 hours
```

---

## Acceptance Criteria

- [ ] SSO works with at least 2 providers
- [ ] Slack integration responds to commands
- [ ] Teams bot sends adaptive cards
- [ ] QuickBooks integration syncs POs
- [ ] Public API authenticates correctly
- [ ] Rate limiting enforces 1000 req/hour limit
- [ ] API documentation is comprehensive
- [ ] TypeScript SDK is published to npm
- [ ] All integrations handle errors gracefully
- [ ] Webhooks validate signatures

---

## Dependencies

```json
{
  "@slack/bolt": "^3.17.0",
  "@slack/web-api": "^7.0.1",
  "botbuilder": "^4.21.0",
  "intuit-oauth": "^4.2.0",
  "next-auth": "^5.0.0",
  "axios": "^1.6.0",
  "express-rate-limit": "^7.1.0",
  "swagger-ui-express": "^5.0.0"
}
```

---

## Documentation

Create API documentation with Swagger/OpenAPI at `/api/docs`.

---

## SDK Publishing

Publish TypeScript SDK to npm:
```bash
cd lib/integrations
npm init -y
npm publish --access public
```

---

## Related Files

- Architecture reference: `COPILOT_CONTEXT.md`
- Main plan: `plan-executiveDashboardEnhancements.prompt.md`
