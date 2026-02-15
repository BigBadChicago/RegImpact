'use client'
import { useState } from 'react'
import { CheckCircle, XCircle, Clock } from 'lucide-react'

interface Approval {
  id: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  requester: { name: string }
  approver?: { name: string }
  requestNote?: string
  approverNote?: string
  createdAt: Date
  approvedAt?: Date
}

export function ApprovalFlow({ costEstimateId, approval }: { costEstimateId: string; approval?: Approval }) {
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (status: 'APPROVED' | 'REJECTED') => {
    setLoading(true)
    try {
      await fetch(`/api/approvals/${approval?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, approverNote: notes })
      })
      setNotes('')
    } finally {
      setLoading(false)
    }
  }

  if (!approval) {
    return (
      <div className="p-4 border rounded">
        <h4 className="font-medium mb-2">Request Approval</h4>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add a note..."
          className="w-full p-2 border rounded text-sm mb-2"
          rows={3}
        />
        <button className="px-4 py-2 bg-blue-500 text-white rounded text-sm">Submit for Approval</button>
      </div>
    )
  }

  const config = {
    PENDING: { icon: Clock, color: 'yellow' },
    APPROVED: { icon: CheckCircle, color: 'green' },
    REJECTED: { icon: XCircle, color: 'red' }
  }

  const { icon: Icon, color } = config[approval.status]

  return (
    <div className="p-4 border rounded">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`w-5 h-5 text-${color}-500`} />
        <span className={`font-medium text-${color}-600`}>{approval.status}</span>
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
            <span className="font-medium">Decision:</span> {approval.approverNote}
          </div>
        )}
      </div>

      {approval.status === 'PENDING' && (
        <div className="mt-4">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add decision notes..."
            className="w-full p-2 border rounded text-sm mb-2"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleSubmit('APPROVED')}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded text-sm disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => handleSubmit('REJECTED')}
              disabled={loading}
              className="px-4 py-2 bg-red-500 text-white rounded text-sm disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
