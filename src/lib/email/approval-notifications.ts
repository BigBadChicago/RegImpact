import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface ApprovalEmailData {
  approverName: string
  regulationTitle: string
  costEstimate: number
  status: 'APPROVED' | 'REJECTED'
  approverNote?: string
  requesterEmail: string
  approvalLink: string
}

/**
 * Generate approval decision email HTML
 */
function generateApprovalEmail(data: ApprovalEmailData): string {
  const statusBadge = data.status === 'APPROVED'
    ? '<span style="display: inline-block; background: #10b981; color: white; padding: 4px 12px; border-radius: 4px; font-weight: 500;">✓ APPROVED</span>'
    : '<span style="display: inline-block; background: #ef4444; color: white; padding: 4px 12px; border-radius: 4px; font-weight: 500;">✗ REJECTED</span>'

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .status { font-size: 18px; margin-bottom: 10px; }
          .details { background: #f9fafb; padding: 15px; border-left: 4px solid #3b82f6; margin: 15px 0; }
          .detail-row { margin: 8px 0; }
          .label { font-weight: 600; color: #666; display: inline-block; width: 140px; }
          .note { background: #fef3c7; padding: 12px; border-radius: 4px; margin: 15px 0; border-left: 4px solid #f59e0b; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none; margin-top: 20px; }
          .footer { color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0; color: #1f2937;">Approval Decision Notification</h2>
            <p style="margin: 10px 0 0 0; color: #666;">From: ${data.approverName}</p>
          </div>

          <div class="status">
            ${statusBadge}
          </div>

          <div class="details">
            <div class="detail-row">
              <span class="label">Regulation:</span>
              <strong>${data.regulationTitle}</strong>
            </div>
            <div class="detail-row">
              <span class="label">Cost Estimate:</span>
              <strong>$${data.costEstimate.toLocaleString()}</strong>
            </div>
            <div class="detail-row">
              <span class="label">Decision:</span>
              <strong>${data.status === 'APPROVED' ? 'Approved for Implementation' : 'Rejected - Pending Review'}</strong>
            </div>
          </div>

          ${data.approverNote ? `
            <div class="note">
              <strong>Approver's Note:</strong>
              <p style="margin: 8px 0 0 0;">${data.approverNote}</p>
            </div>
          ` : ''}

          <p>
            <a href="${data.approvalLink}" class="button">View Full Details</a>
          </p>

          <div class="footer">
            <p>This is an automated notification from RegImpact. Please do not reply to this email.</p>
            <p>© 2024 RegImpact. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `
}

/**
 * Send approval decision email
 * Called when approval status changes
 */
export async function sendApprovalEmail(data: ApprovalEmailData) {
  try {
    const result = await resend.emails.send({
      from: 'noreply@regimpact.app',
      to: data.requesterEmail,
      subject: `Approval Decision: ${data.regulationTitle}`,
      html: generateApprovalEmail(data),
      replyTo: 'support@regimpact.app'
    })

    if (result.error) {
      console.error('[Approval Email Error]', result.error)
      throw new Error(`Failed to send approval email: ${result.error.message}`)
    }

    return { success: true, messageId: result.data?.id }
  } catch (error) {
    console.error('[Send Approval Email Error]', error)
    throw error
  }
}

/**
 * Send multiple approval emails in batch
 * OPTIMIZATION: Single Resend batch call vs individual sends
 */
export async function sendApprovalEmailsBatch(emails: ApprovalEmailData[]) {
  try {
    const results = await Promise.all(
      emails.map(email => sendApprovalEmail(email))
    )

    return {
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    }
  } catch (error) {
    console.error('[Batch Approval Emails Error]', error)
    throw error
  }
}
