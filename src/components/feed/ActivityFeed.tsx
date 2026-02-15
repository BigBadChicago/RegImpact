'use client'
import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { MessageCircle, CheckCircle, AlertCircle, FileText } from 'lucide-react'

interface Activity {
  id: string
  type: string
  description: string
  user: { name: string }
  createdAt: Date
}

export function ActivityFeed({ customerId }: { customerId: string }) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    const fetchActivities = async () => {
      const res = await fetch(`/api/activity?customerId=${customerId}&page=${page}&limit=20`)
      const data = await res.json()
      setActivities((p) => (page === 0 ? data.activities : [...p, ...data.activities]))
      setHasMore(data.pagination?.hasMore ?? false)
    }
    fetchActivities()
  }, [customerId, page])

  const getIcon = (type: string) => {
    switch (type) {
      case 'COMMENT_ADDED':
        return <MessageCircle className="text-blue-500 w-4 h-4" />
      case 'APPROVAL_UPDATED':
        return <CheckCircle className="text-green-500 w-4 h-4" />
      case 'REGULATION_DETECTED':
        return <AlertCircle className="text-orange-500 w-4 h-4" />
      case 'DEADLINE_UPDATED':
        return <FileText className="text-purple-500 w-4 h-4" />
      default:
        return <FileText className="text-gray-500 w-4 h-4" />
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Recent Activity</h3>

      <div className="relative">
        <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-200" />

        {activities.map((activity) => (
          <div key={activity.id} className="relative flex gap-3 pb-4 ml-4">
            <div className="relative z-10 bg-white p-1 -ml-3.5">{getIcon(activity.type)}</div>
            <div className="flex-1 pt-0.5 min-w-0">
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

      {hasMore && (
        <button onClick={() => setPage((p) => p + 1)} className="w-full py-2 text-sm text-blue-600 hover:bg-blue-50 rounded">
          Load More
        </button>
      )}
    </div>
  )
}
