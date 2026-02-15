# PHASE 3: Collaboration & Alerts (Months 5-6)

## Overview
Collaboration layer enabling team communication, automated alerts, approval workflows, and activity tracking. Transforms RegImpact from individual tool to team platform.

**Timeline:** Months 5-6  
**Effort:** 230 hours  
**Files:** 7 files  
**Feature Branch:** `feature/phase3-collaboration`

---

## Features to Implement

1. **Smart Alert Center** - Categorized notifications with real-time updates
2. **Daily Executive Briefing** - Automated email digest
3. **Comments & Annotations** - Threaded discussions on regulations
4. **Approval Workflows** - Multi-step approval process for cost estimates
5. **Activity Feed** - Real-time team activity timeline

---

## Implementation Prompt

```
Implement Phase 3 collaboration layer. Real-time alerts, comments, approvals, activity feed.

FEATURES:
1. Smart Alert Center (bell icon, categorized alerts)
2. Daily Executive Briefing (email digest)
3. Comments & Annotations (threaded discussions)
4. Approval Workflows (multi-step)
5. Activity Feed (real-time updates)

FILES TO CREATE:

FILE 1: prisma/schema.prisma (ADD TO EXISTING)
Add these models to existing schema:

```prisma
model Alert {
  id String @id @default(cuid())
  customerId String
  type String  // CRITICAL, IMPORTANT, INFO
  category String  // DEADLINE, COST, DETECTION, SYSTEM
  title String
  message String @db.Text
  regulationId String?
  actionUrl String?  // Deep link to relevant page
  read Boolean @default(false)
  dismissed Boolean @default(false)
  createdAt DateTime @default(now())
  customer Customer @relation(fields: [customerId], references: [id])
  regulation Regulation? @relation(fields: [regulationId], references: [id])
  
  @@index([customerId, read])
  @@index([customerId, type])
}

model Comment {
  id String @id @default(cuid())
  regulationId String
  userId String
  content String @db.Text
  parentId String?  // For threading
  mentions Json?  // Array of user IDs mentioned with @
  editedAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user User @relation(fields: [userId], references: [id])
  regulation Regulation @relation(fields: [regulationId], references: [id])
  parent Comment? @relation("CommentThread", fields: [parentId], references: [id])
  replies Comment[] @relation("CommentThread")
  
  @@index([regulationId])
}

model Approval {
  id String @id @default(cuid())
  costEstimateId String
  requesterId String
  approverId String?
  status String  // PENDING, APPROVED, REJECTED, CANCELLED
  requestNote String? @db.Text
  approverNote String? @db.Text
  createdAt DateTime @default(now())
  approvedAt DateTime?
  costEstimate CostEstimate @relation(fields: [costEstimateId], references: [id])
  requester User @relation("ApprovalRequester", fields: [requesterId], references: [id])
  approver User? @relation("ApprovalApprover", fields: [approverId], references: [id])
  
  @@index([costEstimateId])
  @@index([approverId, status])
}

model Activity {
  id String @id @default(cuid())
  customerId String
  userId String
  type String  // COMMENT_ADDED, APPROVAL_UPDATED, REGULATION_DETECTED, DEADLINE_UPDATED
  entityType String  // REGULATION, COMMENT, APPROVAL
  entityId String
  description String
  metadata Json?  // Additional context
  createdAt DateTime @default(now())
  customer Customer @relation(fields: [customerId], references: [id])
  user User @relation(fields: [userId], references: [id])
  
  @@index([customerId, createdAt])
}

// Add to User model
model User {
  // ... existing fields
  notificationPreferences Json?  // Email, in-app, frequency settings
  timezone String @default("America/New_York")
}
```

FILE 2: src/components/alerts/AlertCenter.tsx
```tsx
'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface Alert {
  id: string;
  type: 'CRITICAL' | 'IMPORTANT' | 'INFO';
  category: string;
  title: string;
  message: string;
  actionUrl?: string;
  read: boolean;
  dismissed: boolean;
  createdAt: Date;
}

export function AlertCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'CRITICAL' | 'IMPORTANT' | 'INFO'>('CRITICAL');
  const queryClient = useQueryClient();
  
  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const res = await fetch('/api/alerts');
      return res.json();
    },
    refetchInterval: 30000 // Poll every 30 seconds
  });
  
  const markAsRead = useMutation({
    mutationFn: async (alertId: string) => {
      await fetch(`/api/alerts/${alertId}/read`, { method: 'POST' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] })
  });
  
  const dismissAlert = useMutation({
    mutationFn: async (alertId: string) => {
      await fetch(`/api/alerts/${alertId}/dismiss`, { method: 'POST' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] })
  });
  
  const unreadCount = alerts.filter((a: Alert) => !a.read && !a.dismissed).length;
  const filteredAlerts = alerts.filter((a: Alert) => a.type === activeTab && !a.dismissed);
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'CRITICAL': return <AlertTriangle className="text-red-500" />;
      case 'IMPORTANT': return <AlertTriangle className="text-yellow-500" />;
      case 'INFO': return <Info className="text-blue-500" />;
    }
  };
  
  return (
    <div className="relative">
      {/* Bell Icon with Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-full"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
      
      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border z-50">
          {/* Header with Tabs */}
          <div className="border-b">
            <div className="flex p-2">
              {['CRITICAL', 'IMPORTANT', 'INFO'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`flex-1 py-2 text-sm font-medium ${
                    activeTab === tab ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'
                  }`}
                >
                  {tab}
                  <span className="ml-1 text-xs">
                    ({alerts.filter((a: Alert) => a.type === tab && !a.dismissed).length})
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Alert List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredAlerts.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No {activeTab.toLowerCase()} alerts</div>
            ) : (
              filteredAlerts.map((alert: Alert) => (
                <div
                  key={alert.id}
                  className={`p-4 border-b hover:bg-gray-50 ${!alert.read ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {getIcon(alert.type)}
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{alert.title}</h4>
                      <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
                      <div className="flex gap-2 mt-2">
                        {alert.actionUrl && (
                          <a href={alert.actionUrl} className="text-xs text-blue-600 hover:underline">
                            View Details
                          </a>
                        )}
                        {!alert.read && (
                          <button
                            onClick={() => markAsRead.mutate(alert.id)}
                            className="text-xs text-gray-600 hover:text-gray-800"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => dismissAlert.mutate(alert.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

FILE 3: src/lib/alerts/generator.ts
```typescript
import { prisma } from '@/lib/prisma';
import { addDays, isBefore, differenceInDays } from 'date-fns';

export async function generateAlerts(customerId: string): Promise<void> {
  const now = new Date();
  
  // Alert 1: High-cost regulations detected
  const highCostRegs = await prisma.regulation.findMany({
    where: {
      customerId,
      costEstimate: {
        estimatedCost: { gt: 100000 }
      },
      createdAt: { gte: addDays(now, -7) } // Last 7 days
    },
    include: { costEstimate: true }
  });
  
  for (const reg of highCostRegs) {
    await prisma.alert.create({
      data: {
        customerId,
        type: 'CRITICAL',
        category: 'COST',
        title: 'High-Cost Regulation Detected',
        message: `${reg.title} has estimated cost of $${reg.costEstimate?.estimatedCost.toLocaleString()}`,
        regulationId: reg.id,
        actionUrl: `/regulations/${reg.id}`
      }
    });
  }
  
  // Alert 2: Approaching deadlines
  const upcomingDeadlines = await prisma.deadline.findMany({
    where: {
      regulation: { customerId },
      dueDate: {
        gte: now,
        lte: addDays(now, 30)
      },
      status: { not: 'COMPLETED' }
    },
    include: { regulation: true }
  });
  
  for (const deadline of upcomingDeadlines) {
    const daysUntil = differenceInDays(deadline.dueDate, now);
    const type = daysUntil <= 7 ? 'CRITICAL' : daysUntil <= 15 ? 'IMPORTANT' : 'INFO';
    
    await prisma.alert.create({
      data: {
        customerId,
        type,
        category: 'DEADLINE',
        title: `Deadline Approaching: ${deadline.type}`,
        message: `${deadline.regulation.title} - Due in ${daysUntil} days`,
        regulationId: deadline.regulation.id,
        actionUrl: `/deadlines/${deadline.id}`
      }
    });
  }
  
  // Alert 3: Budget variance
  const estimates = await prisma.costEstimate.findMany({
    where: {
      regulation: { customerId },
      actualCost: { not: null }
    }
  });
  
  for (const estimate of estimates) {
    const variance = Math.abs(estimate.actualCost! - estimate.estimatedCost) / estimate.estimatedCost;
    if (variance > 0.1) { // >10% variance
      await prisma.alert.create({
        data: {
          customerId,
          type: 'IMPORTANT',
          category: 'COST',
          title: 'Budget Variance Detected',
          message: `${variance > 0 ? 'Over' : 'Under'} budget by ${Math.round(variance * 100)}%`,
          actionUrl: `/cost-estimates/${estimate.id}`
        }
      });
    }
  }
  
  // Alert 4: Unusual activity detection
  const recentRegs = await prisma.regulation.findMany({
    where: {
      customerId,
      detectedDate: { gte: addDays(now, -7) }
    }
  });
  
  const avgPerWeek = await prisma.regulation.count({
    where: { customerId }
  }) / 52; // Approximate weekly average
  
  if (recentRegs.length > avgPerWeek * 3) { // 3x normal
    await prisma.alert.create({
      data: {
        customerId,
        type: 'IMPORTANT',
        category: 'DETECTION',
        title: 'Unusual Regulatory Activity',
        message: `${recentRegs.length} new regulations detected this week (${Math.round(avgPerWeek * 3)}x normal)`,
        actionUrl: '/regulations?filter=recent'
      }
    });
  }
}

// Schedule: Run via cron job daily at 7 AM
// In production: Use Vercel Cron or similar
```

FILE 4: src/components/comments/CommentThread.tsx
```tsx
'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { MessageCircle, Reply, Edit, Trash } from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  userId: string;
  user: { name: string; email: string };
  createdAt: Date;
  editedAt?: Date;
  replies: Comment[];
}

export function CommentThread({ regulationId }: { regulationId: string }) {
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const queryClient = useQueryClient();
  
  const { data: comments = [] } = useQuery({
    queryKey: ['comments', regulationId],
    queryFn: async () => {
      const res = await fetch(`/api/comments?regulationId=${regulationId}`);
      return res.json();
    },
    refetchInterval: 30000
  });
  
  const addComment = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      // Parse @mentions
      const mentions = content.match(/@(\w+)/g)?.map(m => m.slice(1)) || [];
      
      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regulationId, content, parentId, mentions })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', regulationId] });
      setNewComment('');
      setReplyTo(null);
    }
  });
  
  const renderComment = (comment: Comment, depth: number = 0) => (
    <div key={comment.id} className={`${depth > 0 ? 'ml-8 mt-4' : 'mt-4'}`}>
      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
          {comment.user.name[0]}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{comment.user.name}</span>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
            {comment.editedAt && (
              <span className="text-xs text-gray-400">(edited)</span>
            )}
          </div>
          <ReactMarkdown className="text-sm prose prose-sm max-w-none">
            {comment.content}
          </ReactMarkdown>
          <button
            onClick={() => setReplyTo(comment.id)}
            className="text-xs text-blue-600 hover:underline mt-2 flex items-center gap-1"
          >
            <Reply className="w-3 h-3" />
            Reply
          </button>
        </div>
      </div>
      
      {/* Render replies */}
      {comment.replies?.map(reply => renderComment(reply, depth + 1))}
      
      {/* Reply form */}
      {replyTo === comment.id && (
        <div className="ml-8 mt-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a reply... (Use @username to mention)"
            className="w-full p-2 border rounded text-sm"
            rows={3}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => addComment.mutate({ content: newComment, parentId: comment.id })}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
              disabled={!newComment.trim()}
            >
              Reply
            </button>
            <button
              onClick={() => {
                setReplyTo(null);
                setNewComment('');
              }}
              className="px-3 py-1 border rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
  
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <MessageCircle />
        Discussion
      </h3>
      
      {/* New comment form */}
      <div className="mb-6">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment... (Supports Markdown, @mentions)"
          className="w-full p-3 border rounded"
          rows={4}
        />
        <button
          onClick={() => addComment.mutate({ content: newComment })}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
          disabled={!newComment.trim()}
        >
          Comment
        </button>
      </div>
      
      {/* Comments list */}
      {comments.filter((c: Comment) => !c.parentId).map((comment: Comment) => renderComment(comment))}
    </div>
  );
}
```

FILE 5: src/components/approvals/ApprovalFlow.tsx
```tsx
'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { useState } from 'react';

interface Approval {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requester: { name: string };
  approver?: { name: string };
  requestNote?: string;
  approverNote?: string;
  createdAt: Date;
  approvedAt?: Date;
}

export function ApprovalFlow({ costEstimateId, approval }: { costEstimateId: string; approval?: Approval }) {
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();
  
  const requestApproval = useMutation({
    mutationFn: async (requestNote: string) => {
      await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ costEstimateId, requestNote })
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['approvals'] })
  });
  
  const updateApproval = useMutation({
    mutationFn: async ({ status, approverNote }: { status: 'APPROVED' | 'REJECTED'; approverNote: string }) => {
      await fetch(`/api/approvals/${approval?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, approverNote })
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['approvals'] })
  });
  
  if (!approval) {
    return (
      <div className="p-4 border rounded">
        <h4 className="font-medium mb-2">Request Approval</h4>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add a note for the approver..."
          className="w-full p-2 border rounded text-sm mb-2"
          rows={3}
        />
        <button
          onClick={() => requestApproval.mutate(notes)}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Submit for Approval
        </button>
      </div>
    );
  }
  
  const statusConfig = {
    PENDING: { icon: Clock, color: 'yellow', text: 'Pending' },
    APPROVED: { icon: CheckCircle, color: 'green', text: 'Approved' },
    REJECTED: { icon: XCircle, color: 'red', text: 'Rejected' }
  };
  
  const { icon: StatusIcon, color, text } = statusConfig[approval.status];
  
  return (
    <div className="p-4 border rounded">
      <div className="flex items-center gap-2 mb-4">
        <StatusIcon className={`w-5 h-5 text-${color}-500`} />
        <span className={`font-medium text-${color}-600`}>{text}</span>
      </div>
      
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium">Requested by:</span> {approval.requester.name}
        </div>
        {approval.requestNote && (
          <div>
            <span className="font-medium">Note:</span> {approval.requestNote}
          </div>
        )}
        {approval.approver && (
          <div>
            <span className="font-medium">Reviewer:</span> {approval.approver.name}
          </div>
        )}
        {approval.approverNote && (
          <div>
            <span className="font-medium">Decision Note:</span> {approval.approverNote}
          </div>
        )}
      </div>
      
      {approval.status === 'PENDING' && (
        <div className="mt-4">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes for your decision..."
            className="w-full p-2 border rounded text-sm mb-2"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={() => updateApproval.mutate({ status: 'APPROVED', approverNote: notes })}
              className="px-4 py-2 bg-green-500 text-white rounded"
            >
              Approve
            </button>
            <button
              onClick={() => updateApproval.mutate({ status: 'REJECTED', approverNote: notes })}
              className="px-4 py-2 bg-red-500 text-white rounded"
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

FILE 6: src/components/feed/ActivityFeed.tsx
```tsx
'use client';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, CheckCircle, AlertCircle, FileText } from 'lucide-react';

interface Activity {
  id: string;
  type: string;
  description: string;
  user: { name: string };
  createdAt: Date;
}

export function ActivityFeed({ customerId }: { customerId: string }) {
  const { data: activities = [], fetchNextPage, hasNextPage } = useQuery({
    queryKey: ['activity-feed', customerId],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await fetch(`/api/activity?customerId=${customerId}&page=${pageParam}`);
      return res.json();
    },
    refetchInterval: 30000
  });
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'COMMENT_ADDED': return <MessageCircle className="text-blue-500" />;
      case 'APPROVAL_UPDATED': return <CheckCircle className="text-green-500" />;
      case 'REGULATION_DETECTED': return <AlertCircle className="text-orange-500" />;
      case 'DEADLINE_UPDATED': return <FileText className="text-purple-500" />;
      default: return <FileText className="text-gray-500" />;
    }
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Recent Activity</h3>
      
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
        
        {activities.map((activity: Activity) => (
          <div key={activity.id} className="relative flex gap-4 pb-6">
            <div className="relative z-10 bg-white p-1">
              {getIcon(activity.type)}
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-sm">{activity.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-medium text-gray-600">{activity.user.name}</span>
                <span className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          className="w-full py-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
        >
          Load More
        </button>
      )}
    </div>
  );
}
```

FILE 7: src/lib/email/digest.ts
```typescript
import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { format, startOfDay, addDays } from 'date-fns';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function generateDailyDigest(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { customer: true }
  });
  
  if (!user) throw new Error('User not found');
  
  const customerId = user.customer.id;
  const today = startOfDay(new Date());
  
  // Get critical deadlines (next 7 days)
  const criticalDeadlines = await prisma.deadline.findMany({
    where: {
      regulation: { customerId },
      dueDate: { gte: today, lte: addDays(today, 7) },
      status: { not: 'COMPLETED' }
    },
    include: { regulation: true },
    take: 3,
    orderBy: { dueDate: 'asc' }
  });
  
  // Get new regulations (last 24 hours)
  const newRegulations = await prisma.regulation.findMany({
    where: {
      customerId,
      detectedDate: { gte: addDays(today, -1) }
    },
    take: 3,
    orderBy: { detectedDate: 'desc' }
  });
  
  // Get health score change
  const previousScore = await prisma.healthScoreHistory.findFirst({
    where: { customerId },
    orderBy: { recordedAt: 'desc' }
  });
  
  const currentHealth = await calculateHealthScore(customerId);
  const healthScore = computeHealthScore(currentHealth);
  const scoreChange = previousScore ? healthScore - previousScore.score : 0;
  
  // Generate HTML
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
        .section { padding: 20px; border-bottom: 1px solid #eee; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background: #f3f4f6; border-radius: 8px; }
        .deadline { padding: 10px; margin: 5px 0; background: #fef3c7; border-left: 4px solid #f59e0b; }
        .cta { display: inline-block; margin: 20px 0; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>RegImpact Daily Briefing</h1>
        <p>${format(today, 'EEEE, MMMM d, yyyy')}</p>
      </div>
      
      <div class="section">
        <h2>Compliance Health</h2>
        <div class="metric">
          <div style="font-size: 32px; font-weight: bold; color: ${healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#f59e0b' : '#ef4444'}">
            ${healthScore}
          </div>
          <div style="font-size: 14px; color: #6b7280;">
            ${scoreChange > 0 ? '↑' : '↓'} ${Math.abs(scoreChange)} vs yesterday
          </div>
        </div>
      </div>
      
      <div class="section">
        <h2>⚠️ Critical Deadlines (Next 7 Days)</h2>
        ${criticalDeadlines.map(d => `
          <div class="deadline">
            <strong>${d.regulation.title}</strong><br>
            ${d.type} - Due ${format(d.dueDate, 'MMM d')}
          </div>
        `).join('')}
        ${criticalDeadlines.length === 0 ? '<p>No critical deadlines this week!</p>' : ''}
      </div>
      
      <div class="section">
        <h2>🆕 New Regulations (Last 24 Hours)</h2>
        ${newRegulations.map(r => `
          <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
            <strong>${r.title}</strong><br>
            <span style="font-size: 12px; color: #6b7280;">${r.jurisdiction}</span>
          </div>
        `).join('')}
        ${newRegulations.length === 0 ? '<p>No new regulations detected.</p>' : ''}
      </div>
      
      <div class="section" style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_URL}/dashboard/executive" class="cta">
          View Full Dashboard
        </a>
      </div>
    </body>
    </html>
  `;
  
  return html;
}

export async function sendDailyDigest(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  
  const html = await generateDailyDigest(userId);
  
  await resend.emails.send({
    from: 'RegImpact <digest@regimpact.com>',
    to: user.email,
    subject: `Your Daily RegImpact Briefing - ${format(new Date(), 'MMM d, yyyy')}`,
    html
  });
}

// Schedule: Run via cron job daily at 7 AM per user timezone
// Example cron: 0 7 * * * (every day at 7 AM)
```

DEPENDENCIES:
npm install react-markdown @tanstack/react-query resend lucide-react

API ROUTES TO CREATE:
- /api/alerts (GET, POST)
- /api/alerts/[id]/read (POST)
- /api/alerts/[id]/dismiss (POST)
- /api/comments (GET, POST)
- /api/comments/[id] (PATCH, DELETE)
- /api/approvals (GET, POST)
- /api/approvals/[id] (PATCH)
- /api/activity (GET with pagination)

CRON JOBS NEEDED:
1. Alert generation: Daily at 7 AM
2. Email digest: Daily at 7 AM per user timezone

TESTING:
□ Alerts generated for correct conditions
□ Alert center updates in real-time (30s polling)
□ Comments thread properly (parent-child relationship)
□ @mentions parse and notify users
□ Approval workflow completes end-to-end
□ Activity feed shows recent actions
□ Email digest sends correctly
□ Email renders properly in Gmail/Outlook

EFFORT: 230 hours
```

---

## Acceptance Criteria

- [ ] Alert center displays categorized notifications
- [ ] Real-time polling works (30-second interval)
- [ ] Comment threading works correctly
- [ ] @mentions send notifications
- [ ] Markdown renders in comments
- [ ] Approval workflow completes successfully
- [ ] Email notifications send on approval status change
- [ ] Daily digest emails send at correct time
- [ ] Activity feed updates in real-time
- [ ] All features work on mobile

---

## Dependencies

```json
{
  "react-markdown": "^9.0.1",
  "@tanstack/react-query": "^5.17.0",
  "resend": "^3.0.0",
  "lucide-react": "^0.300.0",
  "date-fns": "^3.0.0"
}
```

---

## Environment Variables

Add to `.env.local`:
```env
RESEND_API_KEY=your_resend_api_key
NEXT_PUBLIC_URL=http://localhost:3000
```

---

## Related Files

- Architecture reference: `COPILOT_CONTEXT.md`
- Main plan: `plan-executiveDashboardEnhancements.prompt.md`
- Database schema: `prisma/schema.prisma`
