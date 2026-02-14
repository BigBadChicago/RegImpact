import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth.config'
import prisma from '@/lib/prisma'
import DeadlinesClient from './DeadlinesClient'

export default async function DeadlinesPage() {
  const session = await auth()
  if (!session?.user?.email) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { customer: true },
  })

  if (!user?.customerId) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen app-shell text-[var(--ui-ink)]">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-white/70" />
        <div className="relative max-w-6xl mx-auto px-6 py-8">
          <nav
            aria-label="Breadcrumb"
            data-testid="breadcrumb"
            className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted"
          >
            <Link href="/dashboard" className="hover:text-[var(--ui-accent-3)]">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-[var(--ui-ink)]">Deadlines</span>
          </nav>
          <div className="mt-6 flex flex-col gap-3">
            <h1 className="text-4xl font-display">Compliance Deadlines</h1>
            <p className="text-muted max-w-2xl">
              Track every regulatory obligation, spot critical risk windows, and
              export your calendar in one move.
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <DeadlinesClient customerId={user.customerId} />
      </main>
    </div>
  )
}
