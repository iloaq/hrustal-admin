import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../generated/prisma';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const DRIVER_JWT_SECRET = process.env.DRIVER_JWT_SECRET || 'driver-secret-key-2025';
const COURIER_JWT_SECRET = process.env.JWT_SECRET || 'courier-secret-key-2025';

// Универсальная функция для проверки токенов водителей и курьеров
async function verifyUserToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  console.log('verifyUserToken - Authorization header:', authHeader);
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('verifyUserToken - Неверный формат заголовка авторизации');
    return null;
  }

  const token = authHeader.substring(7);
  console.log('verifyUserToken - Извлеченный токен:', token.substring(0, 20) + '...');
  
  // Сначала пробуем декодировать как токен водителя
  try {
    const decoded = jwt.verify(token, DRIVER_JWT_SECRET) as any;
    if (decoded.driverId) {
      console.log('verifyUserToken - Токен водителя успешно декодирован, driverId:', decoded.driverId);
      return { type: 'driver', id: decoded.driverId };
    }
  } catch (error) {
    console.log('verifyUserToken - Не токен водителя, пробуем токен курьера');
  }
  
  // Потом пробуем декодировать как токен курьера
  try {
    const decoded = jwt.verify(token, COURIER_JWT_SECRET) as any;
    if (decoded.courierId) {
      console.log('verifyUserToken - Токен курьера успешно декодирован, courierId:', decoded.courierId);
      return { type: 'courier', id: decoded.courierId };
    }
  } catch (error) {
    console.log('verifyUserToken - Ошибка верификации токена курьера:', error);
  }
  
  return null;
}

// Оставляем старую функцию для совместимости
async function verifyDriverToken(request: NextRequest) {
  const result = await verifyUserToken(request);
  return result?.type === 'driver' ? result.id : null;
}

// GET - получить доступные заявки для водителя или курьера
export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/driver-leads - Начало обработки запроса');
    
    const userAuth = await verifyUserToken(request);
    if (!userAuth) {
      console.log('GET /api/driver-leads - Неавторизован');
      return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }
    
    console.log('GET /api/driver-leads - Пользователь авторизован:', userAuth);

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const vehicleId = searchParams.get('vehicle_id'); // Для курьеров
    
    console.log('GET /api/driver-leads - Запрошенная дата:', date);
    console.log('GET /api/driver-leads - ID машины:', vehicleId);
    
    const targetDate = new Date(date);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    console.log('GET /api/driver-leads - Диапазон дат:', targetDate.toISOString(), 'до', nextDay.toISOString());

    let leads = [];
    let vehicleNames = [];
    let userData = null;

    if (userAuth.type === 'driver') {
      // Логика для водителя
      console.log('GET /api/driver-leads - Ищем водителя с ID:', userAuth.id);
      
      const driver = await (prisma as any).driver.findUnique({
        where: { id: BigInt(userAuth.id) },
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
        console.log('GET /api/driver-leads - Водитель не найден');
        return NextResponse.json({ error: 'Водитель не найден' }, { status: 404 });
      }
      
      userData = driver;
      vehicleNames = driver.vehicles.map((dv: any) => dv.vehicle.name);
      console.log('GET /api/driver-leads - Машины водителя:', vehicleNames);

    } else if (userAuth.type === 'courier') {
      // Логика для курьера
      if (!vehicleId) {
        return NextResponse.json({ error: 'Курьеру необходимо указать vehicle_id' }, { status: 400 });
      }

      console.log('GET /api/driver-leads - Ищем курьера с ID:', userAuth.id);
      
      const courier = await (prisma as any).courier.findUnique({
        where: { id: BigInt(userAuth.id) },
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

      if (!courier) {
        console.log('GET /api/driver-leads - Курьер не найден');
        return NextResponse.json({ error: 'Курьер не найден' }, { status: 404 });
      }

      // Проверяем, что курьер имеет доступ к указанной машине
      const hasAccess = courier.vehicles.some((cv: any) => cv.vehicle.id.toString() === vehicleId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Нет доступа к указанной машине' }, { status: 403 });
      }

      userData = courier;
      const selectedVehicle = courier.vehicles.find((cv: any) => cv.vehicle.id.toString() === vehicleId);
      vehicleNames = [selectedVehicle.vehicle.name];
      console.log('GET /api/driver-leads - Выбранная машина курьера:', vehicleNames);
    }

    console.log('GET /api/driver-leads - Ищем заявки для машин');
    
    // Получаем заявки на дату для выбранных машин
    leads = await (prisma as any).lead.findMany({
      where: {
        delivery_date: {
          gte: targetDate,
          lt: nextDay
        },
        truck_assignments: {
          some: {
            truck_name: { in: vehicleNames },
            status: 'active'
          }
        }
      },
      include: {
        truck_assignments: {
          where: { status: 'active' }
        }
      },
      orderBy: [
        { delivery_time: 'asc' },
        { created_at: 'asc' }
      ]
    });

    console.log('GET /api/driver-leads - Найдено заявок:', leads.length);

    // Получаем назначения для текущих машин
    let existingAssignments = [];
    if (userAuth.type === 'driver') {
      // Для водителя получаем его назначения
      existingAssignments = await (prisma as any).driverAssignment.findMany({
        where: {
          driver_id: BigInt(userAuth.id),
          delivery_date: {
            gte: targetDate,
            lt: nextDay
          }
        }
      });
    } else if (userAuth.type === 'courier') {
      // Для курьера получаем все назначения на выбранную машину
      const vehicleAssignments = await (prisma as any).driverAssignment.findMany({
        where: {
          vehicle_id: vehicleId ? BigInt(vehicleId) : null,
          delivery_date: {
            gte: targetDate,
            lt: nextDay
          }
        },
        include: {
          driver: true
        }
      });
      existingAssignments = vehicleAssignments;
    }

    const assignedLeadIds = existingAssignments.map((a: any) => a.lead_id.toString());

    // Сериализуем заявки
    const serializedLeads = leads.map((lead: any) => ({
      ...lead,
      lead_id: lead.lead_id.toString(),
      status_id: lead.status_id ? lead.status_id.toString() : null,
      responsible_user_id: lead.responsible_user_id ? lead.responsible_user_id.toString() : null,
      truck_assignments: lead.truck_assignments.map((ta: any) => ({
        ...ta,
        id: ta.id.toString(),
        lead_id: ta.lead_id.toString()
      })),
      products: lead.products || null, // Добавляем поле products
      info: lead.info ? {
        ...lead.info,
        id: lead.info.id ? lead.info.id.toString() : lead.info.id
      } : null,
      // Статус для водителя
      driver_status: assignedLeadIds.includes(lead.lead_id.toString()) ? 'assigned' : 'available',
      can_accept: !assignedLeadIds.includes(lead.lead_id.toString())
    }));

    // Получаем принятые заявки (для водителя или курьера)
    let acceptedLeads = [];
    if (userAuth.type === 'driver') {
      // Для водителя получаем его принятые заявки
      acceptedLeads = await (prisma as any).driverAssignment.findMany({
        where: {
          driver_id: BigInt(userAuth.id),
          delivery_date: {
            gte: targetDate,
            lt: nextDay
          }
        },
        include: {
          lead: {
            include: {
              truck_assignments: {
                where: { status: 'active' }
              }
            }
          }
        },
        orderBy: { created_at: 'asc' }
      });
    } else if (userAuth.type === 'courier') {
      // Для курьера получаем все принятые заявки на выбранную машину
      acceptedLeads = await (prisma as any).driverAssignment.findMany({
        where: {
          vehicle_id: vehicleId ? BigInt(vehicleId) : null,
          delivery_date: {
            gte: targetDate,
            lt: nextDay
          }
        },
        include: {
          driver: true,
          lead: {
            include: {
              truck_assignments: {
                where: { status: 'active' }
              }
            }
          }
        },
        orderBy: { created_at: 'asc' }
      });
    }

    const serializedAcceptedLeads = acceptedLeads.map((assignment: any) => ({
      assignment: {
        ...assignment,
        id: assignment.id.toString(),
        driver_id: assignment.driver_id.toString(),
        lead_id: assignment.lead_id.toString(),
        vehicle_id: assignment.vehicle_id ? assignment.vehicle_id.toString() : null
      },
      lead: {
        ...assignment.lead,
        lead_id: assignment.lead.lead_id.toString(),
        truck_assignments: assignment.lead.truck_assignments.map((ta: any) => ({
          ...ta,
          id: ta.id.toString(),
          lead_id: ta.lead_id.toString()
        })),
        products: assignment.lead.products || null, // Добавляем поле products
        info: assignment.lead.info ? {
          ...assignment.lead.info,
          id: assignment.lead.info.id ? assignment.lead.info.id.toString() : assignment.lead.info.id
        } : null
      }
    }));

    console.log('GET /api/driver-leads - Найдено доступных заявок:', serializedLeads.length);
    console.log('GET /api/driver-leads - Найдено принятых заявок:', serializedAcceptedLeads.length);
    
    return NextResponse.json({
      available_leads: serializedLeads,
      accepted_leads: serializedAcceptedLeads,
      user_info: {
        id: userData.id.toString(),
        name: userData.name,
        type: userAuth.type,
        vehicles: userData.vehicles.map((uv: any) => ({
          ...(userAuth.type === 'driver' ? uv.vehicle : uv.vehicle),
          id: (userAuth.type === 'driver' ? uv.vehicle.id : uv.vehicle.id).toString(),
          is_primary: userAuth.type === 'driver' ? uv.is_primary : false
        })),
        districts: userData.districts.map((ud: any) => ({
          ...(userAuth.type === 'driver' ? ud.district : ud.district),
          id: (userAuth.type === 'driver' ? ud.district.id : ud.district.id).toString()
        }))
      },
      date: targetDate.toISOString().split('T')[0]
    });

  } catch (error) {
    console.error('GET /api/driver-leads - Ошибка получения заявок водителя:', error);
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

// PUT - обновить статус заявки (в пути, доставлено) - для водителей и курьеров
export async function PUT(request: NextRequest) {
  try {
    const userAuth = await verifyUserToken(request);
    if (!userAuth) {
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

    const validStatuses = ['accepted', 'in_progress', 'route_completed', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Недопустимый статус' },
        { status: 400 }
      );
    }

    // Проверяем права на изменение статуса
    if (userAuth.type === 'driver') {
      // Водитель может: accepted -> in_progress -> route_completed
      const driverAllowedStatuses = ['in_progress', 'route_completed', 'cancelled'];
      if (!driverAllowedStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Водитель не может установить этот статус' },
          { status: 403 }
        );
      }
    } else if (userAuth.type === 'courier') {
      // Курьер может: in_progress -> delivered
      const courierAllowedStatuses = ['delivered'];
      if (!courierAllowedStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Курьер может только отмечать доставки' },
          { status: 403 }
        );
      }
    }

    // Проверяем доступ к назначению
    let assignment = null;
    
    if (userAuth.type === 'driver') {
      // Для водителя проверяем, что назначение принадлежит ему
      assignment = await (prisma as any).driverAssignment.findFirst({
        where: {
          id: BigInt(assignment_id),
          driver_id: BigInt(userAuth.id)
        }
      });
    } else if (userAuth.type === 'courier') {
      // Для курьера проверяем, что назначение относится к машине, к которой у него есть доступ
      assignment = await (prisma as any).driverAssignment.findFirst({
        where: {
          id: BigInt(assignment_id)
        },
        include: {
          vehicle: true
        }
      });
      
      if (assignment) {
        // Проверяем, что курьер имеет доступ к машине этого назначения
        const courier = await (prisma as any).courier.findUnique({
          where: { id: BigInt(userAuth.id) },
          include: {
            vehicles: {
              where: { 
                is_active: true,
                vehicle_id: assignment.vehicle_id
              }
            }
          }
        });
        
        if (!courier || courier.vehicles.length === 0) {
          assignment = null; // Нет доступа к машине
        }
      }
    }

    if (!assignment) {
      return NextResponse.json(
        { error: 'Назначение не найдено или нет доступа' },
        { status: 404 }
      );
    }

    // Обновляем назначение
    const updateData: any = {
      status,
      driver_notes: notes || assignment.driver_notes
    };

    if (status === 'delivered' && delivered_at) {
      updateData.completed_at = new Date(delivered_at);
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

// PATCH - массовые операции (принять все новые заявки водителем или завершить все доставки курьером)
export async function PATCH(request: NextRequest) {
  try {
    const userAuth = await verifyUserToken(request);
    if (!userAuth) {
      return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    const body = await request.json();
    const { action, vehicle_id, date } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'action обязателен' },
        { status: 400 }
      );
    }

    const targetDate = date ? new Date(date) : new Date();
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    if (userAuth.type === 'driver' && action === 'accept_all_new') {
      // Водитель принимает все новые заявки
      if (!vehicle_id) {
        return NextResponse.json(
          { error: 'vehicle_id обязателен для водителя' },
          { status: 400 }
        );
      }

      // Получаем все доступные заявки для водителя
      const driver = await (prisma as any).driver.findUnique({
        where: { id: BigInt(userAuth.id) },
        include: {
          vehicles: {
            where: { is_active: true },
            include: { vehicle: true }
          }
        }
      });

      if (!driver) {
        return NextResponse.json({ error: 'Водитель не найден' }, { status: 404 });
      }

      const vehicleNames = driver.vehicles.map((dv: any) => dv.vehicle.name);
      
      // Получаем доступные заявки
      const availableLeads = await (prisma as any).lead.findMany({
        where: {
          delivery_date: {
            gte: targetDate,
            lt: nextDay
          },
          truck_assignments: {
            some: {
              truck_name: { in: vehicleNames },
              status: 'active'
            }
          }
        }
      });

      // Получаем уже принятые заявки
      const existingAssignments = await (prisma as any).driverAssignment.findMany({
        where: {
          lead_id: { in: availableLeads.map((l: any) => l.lead_id) },
          status: { in: ['accepted', 'in_progress'] }
        }
      });

      const assignedLeadIds = existingAssignments.map((a: any) => a.lead_id.toString());
      const newLeads = availableLeads.filter((lead: any) => !assignedLeadIds.includes(lead.lead_id.toString()));

      if (newLeads.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'Нет новых заявок для принятия',
          accepted_count: 0
        });
      }

      // Принимаем все новые заявки
      const assignments = [];
      for (const lead of newLeads) {
        const assignment = await (prisma as any).driverAssignment.create({
          data: {
            driver_id: BigInt(userAuth.id),
            lead_id: lead.lead_id,
            vehicle_id: BigInt(vehicle_id),
            delivery_date: lead.delivery_date,
            delivery_time: lead.delivery_time,
            status: 'accepted',
            notes: `Массово принято водителем ${driver.name}`
          }
        });
        assignments.push(assignment);
      }

      return NextResponse.json({
        success: true,
        message: `Принято ${assignments.length} новых заявок`,
        accepted_count: assignments.length,
        assignments: assignments.map(a => ({
          ...a,
          id: a.id.toString(),
          driver_id: a.driver_id.toString(),
          lead_id: a.lead_id.toString(),
          vehicle_id: a.vehicle_id?.toString()
        }))
      });

    } else if (userAuth.type === 'courier' && action === 'complete_all_deliveries') {
      // Курьер завершает все доставки
      if (!vehicle_id) {
        return NextResponse.json(
          { error: 'vehicle_id обязателен для курьера' },
          { status: 400 }
        );
      }

      // Получаем все назначения на машину с статусом in_progress
      const assignments = await (prisma as any).driverAssignment.findMany({
        where: {
          vehicle_id: BigInt(vehicle_id),
          delivery_date: {
            gte: targetDate,
            lt: nextDay
          },
          status: 'in_progress'
        },
        include: {
          lead: true
        }
      });

      if (assignments.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'Нет доставок для завершения',
          completed_count: 0
        });
      }

      // Завершаем все доставки
      const completedAssignments = [];
      for (const assignment of assignments) {
        const updatedAssignment = await (prisma as any).driverAssignment.update({
          where: { id: assignment.id },
          data: {
            status: 'delivered',
            completed_at: new Date(),
            driver_notes: assignment.driver_notes ? 
              `${assignment.driver_notes} | Массово завершено курьером` :
              'Массово завершено курьером'
          }
        });

        // Обновляем статус в основной таблице заявок
        await (prisma as any).lead.update({
          where: { lead_id: assignment.lead_id },
          data: { dotavleno: true }
        });

        completedAssignments.push(updatedAssignment);
      }

      return NextResponse.json({
        success: true,
        message: `Завершено ${completedAssignments.length} доставок`,
        completed_count: completedAssignments.length,
        assignments: completedAssignments.map(a => ({
          ...a,
          id: a.id.toString(),
          driver_id: a.driver_id.toString(),
          lead_id: a.lead_id.toString(),
          vehicle_id: a.vehicle_id?.toString()
        }))
      });

    } else {
      return NextResponse.json(
        { error: 'Недопустимое действие для данного типа пользователя' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Ошибка массовой операции:', error);
    return NextResponse.json(
      { error: 'Ошибка выполнения массовой операции' },
      { status: 500 }
    );
  }
}