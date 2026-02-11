import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      customerId: string
    } & DefaultSession['user']
  }

  interface User {
    role: string
    customerId: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string
    role?: string
    customerId?: string
  }
}
