import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../generated/prisma';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.DRIVER_JWT_SECRET || 'driver-secret-key-2025';

// Middleware для проверки токена водителя
async function verifyDriverToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.driverId;
  } catch (error) {
    return null;
  }
}

// GET - получить доступные заявки для водителя
export async function GET(request: NextRequest) {
  try {
    const driverId = await verifyDriverToken(request);
    if (!driverId) {
      return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    const targetDate = new Date(date);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Получаем водителя с его машинами и районами
    const driver = await (prisma as any).driver.findUnique({
      where: { id: BigInt(driverId) },
      include: {
        vehicles: {
          where: { is_active: true },
          include: { vehicle: true }
        },
        districts: {
          where: { is_active: true },
          include: { district: true }
        }
      }
    });

    if (!driver) {
      return NextResponse.json({ error: 'Водитель не найден' }, { status: 404 });
    }

    // Получаем машины водителя
    const driverVehicleNames = driver.vehicles.map((dv: any) => dv.vehicle.name);
    
    // Получаем районы водителя
    const driverDistrictNames = driver.districts.map((dd: any) => dd.district.name);

    // Получаем заявки на дату для машин и районов водителя
    const leads = await (prisma as any).lead.findMany({
      where: {
        delivery_date: {
          gte: targetDate,
          lt: nextDay
        },
        OR: [
          // Заявки назначенные на машины водителя
          {
            truck_assignments: {
              some: {
                truck_name: { in: driverVehicleNames },
                status: 'active'
              }
            }
          },
          // Заявки из районов водителя (если не назначены на другие машины)
          {
            AND: [
              { info: { region: { in: driverDistrictNames } } },
              {
                OR: [
                  { truck_assignments: { none: {} } },
                  { truck_assignments: { none: { status: 'active' } } }
                ]
              }
            ]
          }
        ]
      },
      include: {
        truck_assignments: {
          where: { status: 'active' }
        },
        info: true
      },
      orderBy: [
        { delivery_time: 'asc' },
        { created_at: 'asc' }
      ]
    });

    // Проверяем существующие назначения водителя
    const existingAssignments = await (prisma as any).driverAssignment.findMany({
      where: {
        driver_id: BigInt(driverId),
        delivery_date: {
          gte: targetDate,
          lt: nextDay
        }
      }
    });

    const assignedLeadIds = existingAssignments.map((a: any) => a.lead_id.toString());

    // Сериализуем заявки
    const serializedLeads = leads.map((lead: any) => ({
      ...lead,
      lead_id: lead.lead_id.toString(),
      truck_assignments: lead.truck_assignments.map((ta: any) => ({
        ...ta,
        id: ta.id.toString(),
        lead_id: ta.lead_id.toString()
      })),
      info: lead.info ? {
        ...lead.info,
        id: lead.info.id.toString()
      } : null,
      // Статус для водителя
      driver_status: assignedLeadIds.includes(lead.lead_id.toString()) ? 'assigned' : 'available',
      can_accept: !assignedLeadIds.includes(lead.lead_id.toString())
    }));

    // Получаем принятые водителем заявки
    const acceptedLeads = await (prisma as any).driverAssignment.findMany({
      where: {
        driver_id: BigInt(driverId),
        delivery_date: {
          gte: targetDate,
          lt: nextDay
        }
      },
      include: {
        lead: {
          include: {
            info: true,
            truck_assignments: {
              where: { status: 'active' }
            }
          }
        }
      },
      orderBy: { assigned_at: 'asc' }
    });

    const serializedAcceptedLeads = acceptedLeads.map((assignment: any) => ({
      assignment: {
        ...assignment,
        id: assignment.id.toString(),
        driver_id: assignment.driver_id.toString(),
        lead_id: assignment.lead_id.toString()
      },
      lead: {
        ...assignment.lead,
        lead_id: assignment.lead.lead_id.toString(),
        truck_assignments: assignment.lead.truck_assignments.map((ta: any) => ({
          ...ta,
          id: ta.id.toString(),
          lead_id: ta.lead_id.toString()
        })),
        info: assignment.lead.info ? {
          ...assignment.lead.info,
          id: assignment.lead.info.id.toString()
        } : null
      }
    }));

    return NextResponse.json({
      available_leads: serializedLeads,
      accepted_leads: serializedAcceptedLeads,
      driver_info: {
        id: driver.id.toString(),
        name: driver.name,
        vehicles: driver.vehicles.map((dv: any) => ({
          ...dv.vehicle,
          id: dv.vehicle.id.toString(),
          is_primary: dv.is_primary
        })),
        districts: driver.districts.map((dd: any) => ({
          ...dd.district,
          id: dd.district.id.toString()
        }))
      },
      date: targetDate.toISOString().split('T')[0]
    });

  } catch (error) {
    console.error('Ошибка получения заявок водителя:', error);
    return NextResponse.json(
      { error: 'Ошибка получения заявок' },
      { status: 500 }
    );
  }
}

// POST - принять заявку водителем
export async function POST(request: NextRequest) {
  try {
    const driverId = await verifyDriverToken(request);
    if (!driverId) {
      return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    const body = await request.json();
    const { lead_id, vehicle_id, notes } = body;

    if (!lead_id) {
      return NextResponse.json(
        { error: 'lead_id обязателен' },
        { status: 400 }
      );
    }

    // Проверяем, что заявка не принята другим водителем
    const existingAssignment = await (prisma as any).driverAssignment.findFirst({
      where: {
        lead_id: BigInt(lead_id),
        status: { in: ['accepted', 'in_progress'] }
      }
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Заявка уже принята другим водителем' },
        { status: 409 }
      );
    }

    // Получаем заявку
    const lead = await (prisma as any).lead.findUnique({
      where: { lead_id: BigInt(lead_id) },
      include: { info: true }
    });

    if (!lead) {
      return NextResponse.json(
        { error: 'Заявка не найдена' },
        { status: 404 }
      );
    }

    // Создаем назначение
    const assignment = await (prisma as any).driverAssignment.create({
      data: {
        driver_id: BigInt(driverId),
        lead_id: BigInt(lead_id),
        vehicle_id: vehicle_id ? BigInt(vehicle_id) : null,
        delivery_date: lead.delivery_date,
        delivery_time: lead.delivery_time,
        status: 'accepted',
        notes: notes || null
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Заявка успешно принята',
      assignment: {
        ...assignment,
        id: assignment.id.toString(),
        driver_id: assignment.driver_id.toString(),
        lead_id: assignment.lead_id.toString(),
        vehicle_id: assignment.vehicle_id?.toString()
      }
    });

  } catch (error) {
    console.error('Ошибка принятия заявки:', error);
    return NextResponse.json(
      { error: 'Ошибка принятия заявки' },
      { status: 500 }
    );
  }
}

// PUT - обновить статус заявки (в пути, доставлено)
export async function PUT(request: NextRequest) {
  try {
    const driverId = await verifyDriverToken(request);
    if (!driverId) {
      return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    const body = await request.json();
    const { assignment_id, status, notes, delivered_at } = body;

    if (!assignment_id || !status) {
      return NextResponse.json(
        { error: 'assignment_id и status обязательны' },
        { status: 400 }
      );
    }

    const validStatuses = ['accepted', 'in_progress', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Недопустимый статус' },
        { status: 400 }
      );
    }

    // Проверяем, что назначение принадлежит водителю
    const assignment = await (prisma as any).driverAssignment.findFirst({
      where: {
        id: BigInt(assignment_id),
        driver_id: BigInt(driverId)
      }
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Назначение не найдено' },
        { status: 404 }
      );
    }

    // Обновляем назначение
    const updateData: any = {
      status,
      notes: notes || assignment.notes
    };

    if (status === 'delivered' && delivered_at) {
      updateData.delivered_at = new Date(delivered_at);
    }

    const updatedAssignment = await (prisma as any).driverAssignment.update({
      where: { id: BigInt(assignment_id) },
      data: updateData
    });

    // Если заявка доставлена, обновляем статус в основной таблице заявок
    if (status === 'delivered') {
      await (prisma as any).lead.update({
        where: { lead_id: assignment.lead_id },
        data: { dotavleno: true }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Статус заявки обновлен на "${status}"`,
      assignment: {
        ...updatedAssignment,
        id: updatedAssignment.id.toString(),
        driver_id: updatedAssignment.driver_id.toString(),
        lead_id: updatedAssignment.lead_id.toString(),
        vehicle_id: updatedAssignment.vehicle_id?.toString()
      }
    });

  } catch (error) {
    console.error('Ошибка обновления статуса заявки:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления статуса' },
      { status: 500 }
    );
  }
}