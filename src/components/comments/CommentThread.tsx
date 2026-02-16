'use client'
import { useState, useCallback, useEffect } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)
import ReactMarkdown from 'react-markdown'
import { MessageCircle, Reply, Trash } from 'lucide-react'

interface Comment {
  id: string
  content: string
  parentId?: string
  mentionedUserIds: string[]
  userId: string
  user: { id: string; name: string }
  createdAt: Date
  replies?: Comment[]
}

export function CommentThread({ regulationId }: { regulationId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchComments = useCallback(async () => {
    const res = await fetch(`/api/comments?regulationId=${regulationId}&limit=20`)
    const data = await res.json()
    setComments(data.comments || [])
  }, [regulationId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const handleAddComment = async (content: string, parentId?: string) => {
    if (!content.trim()) return
    setLoading(true)
    try {
      await fetch('/api/actions/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actions: [
            {
              type: 'comment',
              payload: {
                regulationId,
                content,
                parentId,
                mentionedUserIds: content.match(/@(\w+)/g)?.map((m) => m.slice(1)) || []
              }
            },
            {
              type: 'activity',
              payload: {
                type: 'COMMENT_ADDED',
                entityType: 'COMMENT',
                entityId: regulationId,
                description: `Added comment on regulation`
              }
            }
          ]
        })
      })
      setNewComment('')
      setReplyTo(null)
      await fetchComments()
    } finally {
      setLoading(false)
    }
  }

  const renderComment = useCallback(
    (comment: Comment, depth: number = 0) => (
      <div key={comment.id} className={`${depth > 0 ? 'ml-8 mt-3' : 'mt-4'}`}>
        <div className="flex items-start gap-2 p-3 bg-gray-50 rounded text-sm">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0">
            {comment.user.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-medium">{comment.user.name}</span>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
            </div>
            <ReactMarkdown components={{
              p: ({ node, ...props }) => <p className="mb-1" {...props} />,
              a: ({ node, ...props }) => <a className="text-blue-600" {...props} />
            }}>
              {comment.content}
            </ReactMarkdown>
            <button onClick={() => setReplyTo(comment.id)} className="mt-1 text-xs text-blue-600 hover:underline flex items-center gap-1">
              <Reply className="w-3 h-3" />
              Reply
            </button>
          </div>
        </div>

        {comment.replies?.map((reply) => renderComment(reply, depth + 1))}

        {replyTo === comment.id && (
          <div className="ml-8 mt-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a reply..."
              className="w-full p-2 border rounded text-sm"
              rows={2}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleAddComment(newComment, comment.id)}
                disabled={loading}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm disabled:opacity-50"
              >
                Reply
              </button>
              <button onClick={() => setReplyTo(null)} className="px-3 py-1 border rounded text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    ),
    [newComment, replyTo, loading]
  )

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <MessageCircle />
        Discussion ({comments.length})
      </h3>

      <div className="mb-6">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Comment... (Markdown, @mentions)"
          className="w-full p-3 border rounded text-sm"
          rows={3}
        />
        <button
          onClick={() => handleAddComment(newComment)}
          disabled={!newComment.trim() || loading}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded text-sm disabled:opacity-50"
        >
          {loading ? 'Posting...' : 'Comment'}
        </button>
      </div>

      {comments.filter((c) => !c.parentId).map((c) => renderComment(c))}
    </div>
  )
}
