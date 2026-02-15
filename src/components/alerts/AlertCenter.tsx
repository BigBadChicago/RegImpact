'use client'
import { useEffect, useState } from 'react'
import { Bell, X, AlertTriangle, Info } from 'lucide-react'

interface Alert {
  id: string
  type: 'CRITICAL' | 'IMPORTANT' | 'INFO'
  category: string
  title: string
  message: string
  actionUrl?: string
  read: boolean
  createdAt: Date
}

export function AlertCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [activeTab, setActiveTab] = useState<'CRITICAL' | 'IMPORTANT' | 'INFO'>('CRITICAL')

  useEffect(() => {
    if (!isOpen) return
    const eventSource = new EventSource('/api/alerts/stream')
    eventSource.onmessage = (e) => {
      if (e.data === ':ping') return
      setAlerts((p) => [JSON.parse(e.data), ...p])
    }
    eventSource.onerror = () => eventSource.close()
    return () => eventSource.close()
  }, [isOpen])

  const filtered = alerts.filter((a) => a.type === activeTab && !a.read)
  const unread = alerts.filter((a) => !a.read).length

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 hover:bg-gray-100 rounded-full">
        <Bell className="w-6 h-6" />
        {unread > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border z-50">
          <div className="border-b flex">
            {['CRITICAL', 'IMPORTANT', 'INFO'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-2 text-xs font-medium ${
                  activeTab === tab ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'
                }`}
              >
                {tab.slice(0, 3)} ({alerts.filter((a) => a.type === tab).length})
              </button>
            ))}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No {activeTab} alerts</div>
            ) : (
              filtered.map((a) => (
                <div key={a.id} className="p-3 border-b hover:bg-gray-50 bg-blue-50">
                  <div className="flex items-start gap-2">
                    {a.type === 'CRITICAL' ? (
                      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-xs">{a.title}</h4>
                      <p className="text-xs text-gray-600 mt-0.5">{a.message}</p>
                      {a.actionUrl && (
                        <a href={a.actionUrl} className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                          View
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        fetch(`/api/alerts/${a.id}/read`, { method: 'POST' })
                        setAlerts((p) => p.filter((x) => x.id !== a.id))
                      }}
                      className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
