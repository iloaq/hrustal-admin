import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// GET /api/production/sessions?date=2025-07-07&timeSlot=Утро
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const timeSlot = searchParams.get('timeSlot');

    if (!date || !timeSlot) {
      return NextResponse.json({ error: 'Date and timeSlot are required' }, { status: 400 });
    }

    const session = await prisma.productionSession.findUnique({
      where: {
        date_time_slot: {
          date: new Date(date),
          time_slot: timeSlot
        }
      }
    });

    if (!session) {
      // Создаем сессию с дефолтными значениями если не существует
      const newSession = await prisma.productionSession.create({
        data: {
          date: new Date(date),
          time_slot: timeSlot,
          hrustalnaya_produced: 0,
          malysh_produced: 0,
          selen_produced: 0,
          bottles_19l_free: 100
        }
      });
      
      // Преобразуем BigInt в число
      const serializedSession = {
        ...newSession,
        id: Number(newSession.id)
      };
      
      return NextResponse.json(serializedSession);
    }

    // Преобразуем BigInt в число
    const serializedSession = {
      ...session,
      id: Number(session.id)
    };

    return NextResponse.json(serializedSession);
  } catch (error) {
    console.error('Error fetching production session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/production/sessions
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, timeSlot, hrustalnaya_produced, malysh_produced, selen_produced, bottles_19l_free } = body;

    if (!date || !timeSlot) {
      return NextResponse.json({ error: 'Date and timeSlot are required' }, { status: 400 });
    }

    const session = await prisma.productionSession.upsert({
      where: {
        date_time_slot: {
          date: new Date(date),
          time_slot: timeSlot
        }
      },
      update: {
        hrustalnaya_produced: hrustalnaya_produced ?? 0,
        malysh_produced: malysh_produced ?? 0,
        selen_produced: selen_produced ?? 0,
        bottles_19l_free: bottles_19l_free ?? 100
      },
      create: {
        date: new Date(date),
        time_slot: timeSlot,
        hrustalnaya_produced: hrustalnaya_produced ?? 0,
        malysh_produced: malysh_produced ?? 0,
        selen_produced: selen_produced ?? 0,
        bottles_19l_free: bottles_19l_free ?? 100
      }
    });

    // Преобразуем BigInt в число
    const serializedSession = {
      ...session,
      id: Number(session.id)
    };

    return NextResponse.json(serializedSession);
  } catch (error) {
    console.error('Error updating production session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 