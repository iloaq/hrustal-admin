import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../generated/prisma';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.DRIVER_JWT_SECRET || 'driver-secret-key-2025';

// Middleware для проверки JWT токена водителя
function verifyDriverToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded;
  } catch (error) {
    return null;
  }
}

// GET - получить назначения водителя
export async function GET(request: NextRequest) {
  try {
    const decoded = verifyDriverToken(request);
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Неавторизованный доступ' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const status = searchParams.get('status');

    const whereCondition: any = {
      driver_id: BigInt(decoded.driverId),
      delivery_date: new Date(date)
    };

    if (status) {
      whereCondition.status = status;
    }

    // Получаем назначения водителя на указанную дату
    const assignments = await (prisma as any).driverAssignment.findMany({
      where: whereCondition,
      include: {
        lead: {
          select: {
            lead_id: true,
            name: true,
            delivery_date: true,
            delivery_time: true,
            info: true,
            products: true,
            total_liters: true,
            comment: true,
            price: true
          }
        },
        vehicle: {
          select: {
            id: true,
            name: true,
            brand: true,
            license_plate: true
          }
        }
      },
      orderBy: [
        { delivery_time: 'asc' },
        { created_at: 'asc' }
      ]
    });

    // Преобразуем BigInt в string для JSON
    const assignmentsFormatted = assignments.map(assignment => ({
      ...assignment,
      id: assignment.id.toString(),
      driver_id: assignment.driver_id.toString(),
      lead_id: assignment.lead_id.toString(),
      vehicle_id: assignment.vehicle_id?.toString() || null,
      lead: {
        ...assignment.lead,
        lead_id: assignment.lead.lead_id.toString()
      },
      vehicle: assignment.vehicle ? {
        ...assignment.vehicle,
        id: assignment.vehicle.id.toString()
      } : null,
      delivery_date: assignment.delivery_date.toISOString().split('T')[0],
      created_at: assignment.created_at.toISOString(),
      updated_at: assignment.updated_at.toISOString(),
      accepted_at: assignment.accepted_at?.toISOString() || null,
      started_at: assignment.started_at?.toISOString() || null,
      completed_at: assignment.completed_at?.toISOString() || null
    }));

    return NextResponse.json(assignmentsFormatted);

  } catch (error) {
    console.error('Ошибка получения назначений водителя:', error);
    return NextResponse.json(
      { error: 'Ошибка получения назначений' },
      { status: 500 }
    );
  }
}

// PUT - обновить статус назначения
export async function PUT(request: NextRequest) {
  try {
    const decoded = verifyDriverToken(request);
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Неавторизованный доступ' },
        { status: 401 }
      );
    }

    const { assignmentId, status, driver_notes, vehicle_id } = await request.json();

    if (!assignmentId || !status) {
      return NextResponse.json(
        { error: 'ID назначения и статус обязательны' },
        { status: 400 }
      );
    }

    // Проверяем, что назначение принадлежит данному водителю
    const existingAssignment = await (prisma as any).driverAssignment.findFirst({
      where: {
        id: BigInt(assignmentId),
        driver_id: BigInt(decoded.driverId)
      }
    });

    if (!existingAssignment) {
      return NextResponse.json(
        { error: 'Назначение не найдено' },
        { status: 404 }
      );
    }

    // Обновляем назначение
    const updateData: any = {
      status,
      driver_notes: driver_notes || existingAssignment.driver_notes
    };

    // Устанавливаем временные метки в зависимости от статуса
    const now = new Date();
    switch (status) {
      case 'accepted':
        if (!existingAssignment.accepted_at) {
          updateData.accepted_at = now;
        }
        break;
      case 'in_progress':
        if (!existingAssignment.started_at) {
          updateData.started_at = now;
        }
        break;
      case 'completed':
        if (!existingAssignment.completed_at) {
          updateData.completed_at = now;
        }
        break;
    }

    // Обновляем машину, если указана
    if (vehicle_id) {
      updateData.vehicle_id = BigInt(vehicle_id);
    }

    const updatedAssignment = await (prisma as any).driverAssignment.update({
      where: { id: BigInt(assignmentId) },
      data: updateData,
      include: {
        lead: {
          select: {
            lead_id: true,
            name: true,
            delivery_date: true,
            delivery_time: true,
            info: true,
            products: true,
            total_liters: true,
            comment: true,
            price: true
          }
        },
        vehicle: {
          select: {
            id: true,
            name: true,
            brand: true,
            license_plate: true
          }
        }
      }
    });

    // Форматируем ответ
    const assignmentFormatted = {
      ...updatedAssignment,
      id: updatedAssignment.id.toString(),
      driver_id: updatedAssignment.driver_id.toString(),
      lead_id: updatedAssignment.lead_id.toString(),
      vehicle_id: updatedAssignment.vehicle_id?.toString() || null,
      lead: {
        ...updatedAssignment.lead,
        lead_id: updatedAssignment.lead.lead_id.toString()
      },
      vehicle: updatedAssignment.vehicle ? {
        ...updatedAssignment.vehicle,
        id: updatedAssignment.vehicle.id.toString()
      } : null,
      delivery_date: updatedAssignment.delivery_date.toISOString().split('T')[0],
      created_at: updatedAssignment.created_at.toISOString(),
      updated_at: updatedAssignment.updated_at.toISOString(),
      accepted_at: updatedAssignment.accepted_at?.toISOString() || null,
      started_at: updatedAssignment.started_at?.toISOString() || null,
      completed_at: updatedAssignment.completed_at?.toISOString() || null
    };

    return NextResponse.json(assignmentFormatted);

  } catch (error) {
    console.error('Ошибка обновления назначения:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления назначения' },
      { status: 500 }
    );
  }
}

// POST - создать назначение (для админов)
export async function POST(request: NextRequest) {
  try {
    const { 
      driver_id, 
      lead_id, 
      vehicle_id, 
      delivery_date, 
      delivery_time 
    } = await request.json();

    if (!driver_id || !lead_id || !delivery_date) {
      return NextResponse.json(
        { error: 'ID водителя, ID заявки и дата доставки обязательны' },
        { status: 400 }
      );
    }

    // Проверка существования водителя
    const driver = await (prisma as any).driver.findUnique({
      where: { 
        id: BigInt(driver_id),
        is_active: true 
      }
    });

    if (!driver) {
      return NextResponse.json(
        { error: 'Водитель не найден или неактивен' },
        { status: 404 }
      );
    }

    // Проверка существования заявки
    const lead = await prisma.lead.findUnique({
      where: { lead_id: BigInt(lead_id) }
    });

    if (!lead) {
      return NextResponse.json(
        { error: 'Заявка не найдена' },
        { status: 404 }
      );
    }

    const newAssignment = await (prisma as any).driverAssignment.create({
      data: {
        driver_id: BigInt(driver_id),
        lead_id: BigInt(lead_id),
        vehicle_id: vehicle_id ? BigInt(vehicle_id) : null,
        delivery_date: new Date(delivery_date),
        delivery_time
      },
      include: {
        lead: {
          select: {
            lead_id: true,
            name: true,
            delivery_date: true,
            delivery_time: true,
            info: true,
            products: true,
            total_liters: true,
            comment: true,
            price: true
          }
        },
        vehicle: {
          select: {
            id: true,
            name: true,
            brand: true,
            license_plate: true
          }
        }
      }
    });

    // Форматируем ответ
    const assignmentFormatted = {
      ...newAssignment,
      id: newAssignment.id.toString(),
      driver_id: newAssignment.driver_id.toString(),
      lead_id: newAssignment.lead_id.toString(),
      vehicle_id: newAssignment.vehicle_id?.toString() || null,
      lead: {
        ...newAssignment.lead,
        lead_id: newAssignment.lead.lead_id.toString()
      },
      vehicle: newAssignment.vehicle ? {
        ...newAssignment.vehicle,
        id: newAssignment.vehicle.id.toString()
      } : null,
      delivery_date: newAssignment.delivery_date.toISOString().split('T')[0],
      created_at: newAssignment.created_at.toISOString(),
      updated_at: newAssignment.updated_at.toISOString(),
      accepted_at: newAssignment.accepted_at?.toISOString() || null,
      started_at: newAssignment.started_at?.toISOString() || null,
      completed_at: newAssignment.completed_at?.toISOString() || null
    };

    return NextResponse.json(assignmentFormatted, { status: 201 });

  } catch (error) {
    console.error('Ошибка создания назначения:', error);
    return NextResponse.json(
      { error: 'Ошибка создания назначения' },
      { status: 500 }
    );
  }
}