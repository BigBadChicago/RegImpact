# PHASE 5: Mobile & Executive Experience (Months 9-10)

## Overview
Progressive Web App (PWA) with mobile-first design, offline capabilities, voice commands, and push notifications. Transforms RegImpact into an always-available mobile companion.

**Timeline:** Months 9-10  
**Effort:** 175 hours  
**Files:** 8 files  
**Feature Branch:** `feature/phase5-mobile-pwa`

---

## Features to Implement

1. **Progressive Web App** - Installable app with manifest and service worker
2. **Mobile-Optimized Dashboard** - Touch-friendly navigation and layouts
3. **Voice Assistant Integration** - Voice command support
4. **Push Notifications** - Critical alert delivery
5. **Offline Mode** - Data caching and background sync

---

## Implementation Prompt

```
Implement Phase 5 mobile PWA + voice integration.

FEATURES:
1. Progressive Web App (installable)
2. Mobile-optimized dashboard
3. Voice Assistant Integration
4. Push Notifications
5. Offline Mode

FILES TO CREATE:

FILE 1: public/manifest.json
```json
{
  "name": "RegImpact - Regulatory Compliance Intelligence",
  "short_name": "RegImpact",
  "description": "Executive dashboard for regulatory compliance tracking and cost management",
  "start_url": "/dashboard/executive",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "categories": ["business", "productivity", "finance"],
  "screenshots": [
    {
      "src": "/screenshots/dashboard.png",
      "sizes": "540x720",
      "type": "image/png"
    },
    {
      "src": "/screenshots/regulations.png",
      "sizes": "540x720",
      "type": "image/png"
    }
  ],
  "shortcuts": [
    {
      "name": "Dashboard",
      "url": "/dashboard/executive",
      "icons": [{ "src": "/icons/dashboard-shortcut.png", "sizes": "96x96" }]
    },
    {
      "name": "Deadlines",
      "url": "/deadlines",
      "icons": [{ "src": "/icons/deadline-shortcut.png", "sizes": "96x96" }]
    },
    {
      "name": "Alerts",
      "url": "/alerts",
      "icons": [{ "src": "/icons/alert-shortcut.png", "sizes": "96x96" }]
    }
  ]
}
```

FILE 2: public/sw.js (Service Worker)
```javascript
const CACHE_NAME = 'regimpact-v1';
const RUNTIME_CACHE = 'regimpact-runtime';

const STATIC_ASSETS = [
  '/',
  '/dashboard/executive',
  '/offline',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // API calls: Network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request);
        })
    );
    return;
  }
  
  // Static assets: Cache first
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(request).then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback page
      if (request.mode === 'navigate') {
        return caches.match('/offline');
      }
    })
  );
});

// Background sync - queue actions when offline
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-actions') {
    event.waitUntil(syncActions());
  }
});

async function syncActions() {
  // Retrieve queued actions from IndexedDB
  const db = await openDB();
  const tx = db.transaction('actions', 'readonly');
  const actions = await tx.objectStore('actions').getAll();
  
  for (const action of actions) {
    try {
      await fetch(action.url, {
        method: action.method,
        headers: action.headers,
        body: action.body
      });
      
      // Remove from queue on success
      const deleteTx = db.transaction('actions', 'readwrite');
      await deleteTx.objectStore('actions').delete(action.id);
    } catch (error) {
      console.error('Sync failed for action:', action, error);
    }
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  
  const options = {
    body: data.message,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: data.tag || 'regimpact-notification',
    requireInteraction: data.priority === 'CRITICAL',
    actions: data.actions || [
      { action: 'view', title: 'View Details' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    data: {
      url: data.url || '/dashboard/executive'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'RegImpact Alert', options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const url = event.notification.data.url || '/dashboard/executive';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      return clients.openWindow(url);
    })
  );
});

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('regimpact-db', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('actions')) {
        db.createObjectStore('actions', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}
```

FILE 3: src/app/layout.tsx (UPDATE - add PWA support)
Add to existing layout.tsx:

```tsx
import { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'RegImpact - Regulatory Compliance Intelligence',
  description: 'Executive dashboard for regulatory compliance tracking',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RegImpact'
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* PWA Meta Tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="RegImpact" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(console.error);
                });
              }
            `
          }}
        />
      </head>
      <body>
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
```

FILE 4: src/components/mobile/MobileNav.tsx
```tsx
'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Bell, FileText, User } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard/executive', label: 'Dashboard', icon: Home },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/regulations', label: 'Regulations', icon: FileText },
  { href: '/profile', label: 'Profile', icon: User }
];

export function MobileNav() {
  const pathname = usePathname();
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom md:hidden z-50">
      <div className="flex justify-around items-center h-16">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full ${
                isActive ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'stroke-2' : ''}`} />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

FILE 5: src/lib/voice/commands.ts
```typescript
export interface VoiceCommand {
  pattern: RegExp;
  handler: (matches: string[]) => Promise<VoiceResponse>;
  description: string;
}

export interface VoiceResponse {
  text: string;
  action?: {
    type: 'navigate' | 'filter' | 'display';
    payload: any;
  };
}

export const VOICE_COMMANDS: VoiceCommand[] = [
  {
    pattern: /what(?:'s| is) my compliance (?:health )?score/i,
    description: 'Get current compliance health score',
    handler: async () => {
      const res = await fetch('/api/dashboard/metrics');
      const { metrics } = await res.json();
      return {
        text: `Your current compliance health score is ${metrics.healthScore} out of 100.`,
        action: {
          type: 'display',
          payload: { component: 'HealthScoreGauge', data: metrics }
        }
      };
    }
  },
  {
    pattern: /show (?:me )?(?:critical |urgent )?deadlines/i,
    description: 'Show critical deadlines',
    handler: async () => {
      return {
        text: 'Showing critical deadlines',
        action: {
          type: 'navigate',
          payload: { url: '/deadlines', filter: 'critical' }
        }
      };
    }
  },
  {
    pattern: /(?:show|what are) (?:the )?latest (?:regulations|regs)/i,
    description: 'Show latest regulations',
    handler: async () => {
      return {
        text: 'Navigating to recent regulations',
        action: {
          type: 'navigate',
          payload: { url: '/regulations?sort=recent' }
        }
      };
    }
  },
  {
    pattern: /how many regulations (?:do we have|are there)/i,
    description: 'Get regulation count',
    handler: async () => {
      const res = await fetch('/api/dashboard/metrics');
      const { metrics } = await res.json();
      return {
        text: `You are currently tracking ${metrics.regulationCount} regulations.`
      };
    }
  },
  {
    pattern: /what(?:'s| is) (?:the |our )(?:total )?cost (?:exposure)?/i,
    description: 'Get total cost exposure',
    handler: async () => {
      const res = await fetch('/api/dashboard/metrics');
      const { metrics } = await res.json();
      const formatted = `$${(metrics.totalCostExposure / 1000000).toFixed(1)} million`;
      return {
        text: `Your total cost exposure is ${formatted}.`
      };
    }
  }
];

export class VoiceAssistant {
  private recognition: any;
  private synthesis: SpeechSynthesis;
  private isListening: boolean = false;
  
  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
      }
      this.synthesis = window.speechSynthesis;
    }
  }
  
  async listen(): Promise<string> {
    if (!this.recognition) {
      throw new Error('Speech recognition not supported');
    }
    
    return new Promise((resolve, reject) => {
      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };
      
      this.recognition.onerror = (event: any) => {
        reject(new Error(event.error));
      };
      
      this.recognition.start();
      this.isListening = true;
    });
  }
  
  speak(text: string): Promise<void> {
    if (!this.synthesis) {
      return Promise.resolve();
    }
    
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => resolve();
      this.synthesis.speak(utterance);
    });
  }
  
  async processCommand(transcript: string): Promise<VoiceResponse | null> {
    for (const command of VOICE_COMMANDS) {
      const matches = transcript.match(command.pattern);
      if (matches) {
        return await command.handler(matches);
      }
    }
    return null;
  }
  
  stop() {
    if (this.recognition) {
      this.recognition.stop();
      this.isListening = false;
    }
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }
}
```

FILE 6: src/lib/notifications/push.ts
```typescript
import webpush from 'web-push';

// Configure VAPID keys (generate once and store in env)
webpush.setVapidDetails(
  'mailto:support@regimpact.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function subscribeUser(userId: string, subscription: PushSubscription): Promise<void> {
  // Store subscription in database
  await prisma.pushSubscription.create({
    data: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth
    }
  });
}

export async function sendPushNotification(
  userId: string,
  notification: {
    title: string;
    message: string;
    url?: string;
    priority?: 'CRITICAL' | 'IMPORTANT' | 'INFO';
  }
): Promise<void> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId }
  });
  
  const payload = JSON.stringify({
    title: notification.title,
    message: notification.message,
    url: notification.url,
    priority: notification.priority || 'INFO',
    timestamp: new Date().toISOString()
  });
  
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          payload
        );
      } catch (error) {
        console.error('Push notification failed:', error);
        // Remove invalid subscription
        if ((error as any).statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    })
  );
}

// Client-side helper
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported');
  }
  return await Notification.requestPermission();
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.ready;
  
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  });
  
  return subscription.toJSON() as PushSubscription;
}
```

FILE 7: src/lib/offline/sync.ts
```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface RegImpactDB extends DBSchema {
  'dashboard-cache': {
    key: string;
    value: {
      id: string;
      data: any;
      timestamp: number;
    };
  };
  'action-queue': {
    key: number;
    value: {
      id?: number;
      url: string;
      method: string;
      headers: Record<string, string>;
      body: string;
      timestamp: number;
    };
  };
}

let dbInstance: IDBPDatabase<RegImpactDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<RegImpactDB>> {
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB<RegImpactDB>('regimpact-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('dashboard-cache')) {
        db.createObjectStore('dashboard-cache', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('action-queue')) {
        db.createObjectStore('action-queue', { keyPath: 'id', autoIncrement: true });
      }
    }
  });
  
  return dbInstance;
}

export async function cacheDashboardData(id: string, data: any): Promise<void> {
  const db = await getDB();
  await db.put('dashboard-cache', {
    id,
    data,
    timestamp: Date.now()
  });
}

export async function getCachedDashboardData(id: string, maxAge: number = 3600000): Promise<any | null> {
  const db = await getDB();
  const cached = await db.get('dashboard-cache', id);
  
  if (!cached) return null;
  
  // Check if cache is stale
  if (Date.now() - cached.timestamp > maxAge) {
    return null;
  }
  
  return cached.data;
}

export async function queueAction(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: any
): Promise<void> {
  const db = await getDB();
  await db.add('action-queue', {
    url,
    method,
    headers,
    body: JSON.stringify(body),
    timestamp: Date.now()
  });
  
  // Request background sync if available
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('sync-actions');
  }
}

export async function getQueuedActions() {
  const db = await getDB();
  return await db.getAll('action-queue');
}

export async function clearQueuedAction(id: number): Promise<void> {
  const db = await getDB();
  await db.delete('action-queue', id);
}

export async function syncQueuedActions(): Promise<void> {
  const actions = await getQueuedActions();
  
  for (const action of actions) {
    try {
      await fetch(action.url, {
        method: action.method,
        headers: action.headers,
        body: action.body
      });
      
      // Remove from queue on success
      await clearQueuedAction(action.id!);
    } catch (error) {
      console.error('Sync failed for action:', error);
    }
  }
}
```

FILE 8: src/components/mobile/InstallPrompt.tsx
```tsx
'use client';
import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  
  useEffect(() => {
    // Check if already dismissed
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }
    
    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);
    
    // Android/Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };
    
    window.addEventListener('beforeinstallprompt', handler);
    
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  
  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    
    setDeferredPrompt(null);
  };
  
  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
    setIsDismissed(true);
  };
  
  if (isDismissed || !showPrompt) return null;
  
  if (isIOS) {
    return (
      <div className="fixed bottom-20 left-4 right-4 bg-white rounded-lg shadow-xl p-4 border border-gray-200 md:hidden z-40">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-start gap-3">
          <Download className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-sm">Install RegImpact</h3>
            <p className="text-xs text-gray-600 mt-1">
              Tap the share button <span className="inline-block">􀈂</span> and select "Add to Home Screen"
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed bottom-20 left-4 right-4 bg-white rounded-lg shadow-xl p-4 border border-gray-200 md:bottom-4 md:right-4 md:left-auto md:w-96 z-40">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
      >
        <X className="w-5 h-5" />
      </button>
      <div className="flex items-start gap-3">
        <Download className="w-6 h-6 text-blue-600 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold">Install RegImpact</h3>
          <p className="text-sm text-gray-600 mt-1">
            Install the app for quick access and offline support
          </p>
          <button
            onClick={handleInstall}
            className="mt-3 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Install App
          </button>
        </div>
      </div>
    </div>
  );
}
```

DEPENDENCIES:
npm install workbox-webpack-plugin web-push idb lucide-react

PRISMA SCHEMA ADDITIONS:
```prisma
model PushSubscription {
  id String @id @default(cuid())
  userId String
  endpoint String @unique
  p256dh String
  auth String
  createdAt DateTime @default(now())
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
}
```

ENVIRONMENT VARIABLES:
```env
# Generate VAPID keys with: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
```

TESTING:
□ PWA installs on iOS Safari
□ PWA installs on Android Chrome
□ Service worker caches assets correctly
□ Offline mode loads cached dashboard
□ Voice commands parse correctly
□ Voice response speaks back
□ Push notifications deliver to device
□ Push notification deep links work
□ Background sync queues actions when offline
□ Queued actions sync when online
□ Install prompt displays correctly
□ Mobile navigation works on touch devices
□ Bottom navigation is accessible above safe area
□ Lighthouse PWA score >90

EFFORT: 175 hours
```

---

## Acceptance Criteria

- [ ] App installs on iOS and Android
- [ ] Service worker caches static assets
- [ ] Dashboard works offline with cached data
- [ ] Voice commands recognize and respond
- [ ] Push notifications deliver successfully
- [ ] Background sync works when back online
- [ ] Install prompt appears on first visit
- [ ] Mobile navigation is touch-friendly
- [ ] Lighthouse PWA score >90
- [ ] App icons display correctly

---

## Dependencies

```json
{
  "workbox-webpack-plugin": "^7.0.0",
  "web-push": "^3.6.6",
  "idb": "^8.0.0",
  "lucide-react": "^0.300.0"
}
```

---

## Icon Generation

Generate PWA icons from your logo:
```bash
npx pwa-asset-generator public/logo.svg public/icons --background "#3b82f6" --padding "20%"
```

---

## Related Files

- Architecture reference: `COPILOT_CONTEXT.md`
- Main plan: `plan-executiveDashboardEnhancements.prompt.md`
