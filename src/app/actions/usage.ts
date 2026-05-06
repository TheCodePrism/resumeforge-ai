'use server'

import { prisma } from '@/lib/prisma'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { headers } from 'next/headers'

const GUEST_LIMIT = 5
const USER_LIMIT = 20

export async function getAIUsageStatus() {
  const session = await getServerSession(authOptions)

  // Logged-in user
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { openaiKey: true, aiUsage: true }
    })

    if (!user) return null

    // Personal key: unlimited
    if (user.openaiKey) return { mode: 'personal' as const, unlimited: true }

    return {
      mode: 'platform' as const,
      unlimited: false,
      current: user.aiUsage,
      limit: USER_LIMIT,
    }
  }

  // Guest
  const headerList = await headers()
  const ip = headerList.get('x-forwarded-for') || '127.0.0.1'

  const guestUsage = await prisma.guestUsage.findUnique({ where: { ip } })

  return {
    mode: 'guest' as const,
    unlimited: false,
    current: guestUsage?.count || 0,
    limit: GUEST_LIMIT,
  }
}
