import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const kitchens = await db.kitchen.findMany({
    where: { active: true, merchant: { status: 'APPROVED' } },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      latitude: true,
      longitude: true,
      acceptingOrders: true,
      categories: {
        where: { active: true },
        select: {
          name: true,
          items: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              available: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ kitchens });
}
