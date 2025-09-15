import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware для проверки токена водителя
async function verifyDriverToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    throw new Error('Токен не предоставлен');
  }
  
  const decoded = jwt.verify(token, JWT_SECRET) as any;
  return BigInt(decoded.driverId);
}

// Получить заказы водителя
export async function GET(request: NextRequest) {
  try {
    const driverId = await verifyDriverToken(request);
    
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const status = searchParams.get('status'); // assigned, started, delivered, broken
    
    // Получаем заказы водителя
    const assignments = await prisma.driverAssignment.findMany({
      where: {
        driver_id: driverId,
        delivery_date: new Date(date),
        ...(status && { status })
      },
      include: {
        lead: {
          select: {
            lead_id: true,
            name: true,
            info: true,
            delivery_time: true,
            products: true,
            price: true,
            comment: true,
            stat_oplata: true
          }
        },
        vehicle: {
          select: {
            id: true,
            name: true,
            brand: true,
            license_plate: true,
            capacity: true,
            is_active: true
          }
        }
      },
      orderBy: [
        { delivery_time: 'asc' },
        { created_at: 'asc' }
      ]
    });
    
    // Преобразуем данные для фронтенда
    const formattedAssignments = assignments.map((assignment: any) => {
      const lead = assignment.lead;
      const info = lead.info as any;
      
      return {
        id: assignment.id.toString(),
        status: assignment.status,
        delivery_date: assignment.delivery_date,
        delivery_time: assignment.delivery_time || lead.delivery_time,
        accepted_at: assignment.accepted_at,
        started_at: assignment.started_at,
        completed_at: assignment.completed_at,
        driver_notes: assignment.driver_notes,
        
        // Данные заказа
        lead: {
          id: lead.lead_id.toString(),
          name: lead.name,
          client_name: info?.name || lead.name,
          client_phone: info?.phone || '',
          address: info?.delivery_address || info?.address || '',
          products: lead.products,
          price: lead.price,
          comment: lead.comment,
          is_paid: lead.stat_oplata === 1
        },
        
        // Данные машины
        vehicle: assignment.vehicle ? {
          id: assignment.vehicle.id.toString(),
          name: assignment.vehicle.name,
          brand: assignment.vehicle.brand,
          license_plate: assignment.vehicle.license_plate,
          capacity: assignment.vehicle.capacity,
          is_active: assignment.vehicle.is_active
        } : null
      };
    });
    
    // Статистика
    const stats = {
      total: assignments.length,
      assigned: assignments.filter((a: any) => a.status === 'assigned').length,
      started: assignments.filter((a: any) => a.status === 'started').length,
      delivered: assignments.filter((a: any) => a.status === 'delivered').length,
      broken: assignments.filter((a: any) => a.status === 'broken').length
    };
    
    return NextResponse.json({
      success: true,
      assignments: formattedAssignments,
      stats,
      date
    });
    
  } catch (error) {
    console.error('❌ Ошибка получения заказов водителя:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ошибка сервера' },
      { status: error instanceof Error && error.message === 'Токен не предоставлен' ? 401 : 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Обновить статус заказа
export async function PATCH(request: NextRequest) {
  try {
    const driverId = await verifyDriverToken(request);
    const { assignmentId, status, driver_notes, vehicle_broken } = await request.json();
    
    if (!assignmentId || !status) {
      return NextResponse.json(
        { error: 'ID заказа и статус обязательны' },
        { status: 400 }
      );
    }
    
    const validStatuses = ['assigned', 'started', 'delivered', 'broken'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Недопустимый статус' },
        { status: 400 }
      );
    }
    
    // Проверяем, что заказ принадлежит этому водителю
    const assignment = await prisma.driverAssignment.findFirst({
      where: {
        id: BigInt(assignmentId),
        driver_id: driverId
      },
      include: {
        vehicle: true,
        driver: true
      }
    });
    
    if (!assignment) {
      return NextResponse.json(
        { error: 'Заказ не найден или не принадлежит водителю' },
        { status: 404 }
      );
    }
    
    // Подготавливаем данные для обновления
    const updateData: any = {
      status,
      driver_notes,
      updated_at: new Date()
    };
    
    // Устанавливаем временные метки в зависимости от статуса
    switch (status) {
      case 'started':
        if (!assignment.started_at) {
          updateData.started_at = new Date();
        }
        break;
      case 'delivered':
        if (!assignment.completed_at) {
          updateData.completed_at = new Date();
        }
        break;
      case 'broken':
        if (!assignment.completed_at) {
          updateData.completed_at = new Date();
        }
        break;
    }
    
    // Обновляем заказ
    const updatedAssignment = await prisma.driverAssignment.update({
      where: { id: BigInt(assignmentId) },
      data: updateData
    });
    
    // Если машина сломалась
    if (vehicle_broken && assignment.vehicle_id) {
      console.log(`🔧 Машина ${assignment.vehicle?.name} сломалась, водитель: ${assignment.driver.name}`);
      
      // Отмечаем машину как неактивную
      await prisma.vehicle.update({
        where: { id: assignment.vehicle_id },
        data: { is_active: false }
      });
      
      // Отмечаем связь водитель-машина как неактивную
      await prisma.driverVehicle.updateMany({
        where: {
          driver_id: driverId,
          vehicle_id: assignment.vehicle_id
        },
        data: { is_active: false }
      });
      
      // Ищем свободную машину для водителя
      const availableVehicle = await prisma.vehicle.findFirst({
        where: {
          is_active: true,
          driver_vehicles: {
            none: {
              is_active: true
            }
          }
        }
      });
      
      if (availableVehicle) {
        // Назначаем новую машину водителю
        await prisma.driverVehicle.create({
          data: {
            driver_id: driverId,
            vehicle_id: availableVehicle.id,
            is_active: true,
            is_primary: false
          }
        });
        
        // Переназначаем все активные заказы водителя на новую машину
        await prisma.driverAssignment.updateMany({
          where: {
            driver_id: driverId,
            status: { in: ['assigned', 'started'] }
          },
          data: {
            vehicle_id: availableVehicle.id
          }
        });
        
        console.log(`🚗 Водителю ${assignment.driver.name} назначена новая машина: ${availableVehicle.name}`);
      } else {
        // Нет свободных машин - обновляем статус водителя
        await prisma.driver.update({
          where: { id: driverId },
          data: { status: 'broken_vehicle' }
        });
        
        console.log(`⚠️ Нет свободных машин для водителя ${assignment.driver.name}, смена завершена`);
      }
    }
    
    console.log(`📋 Заказ ${assignmentId} обновлен: ${status} (водитель: ${assignment.driver.name})`);
    
    return NextResponse.json({
      success: true,
      assignment: {
        id: updatedAssignment.id.toString(),
        status: updatedAssignment.status,
        driver_notes: updatedAssignment.driver_notes,
        completed_at: updatedAssignment.completed_at
      },
      message: `Статус заказа обновлен: ${status}`
    });
    
  } catch (error) {
    console.error('❌ Ошибка обновления заказа:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ошибка сервера' },
      { status: error instanceof Error && error.message === 'Токен не предоставлен' ? 401 : 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
