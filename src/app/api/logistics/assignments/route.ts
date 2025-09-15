import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// Получить все назначения заказов
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const driver_id = searchParams.get('driver_id');
    const status = searchParams.get('status');
    const district_id = searchParams.get('district_id');
    
    const assignments = await prisma.driverAssignment.findMany({
      where: {
        delivery_date: new Date(date),
        ...(driver_id && { driver_id: BigInt(driver_id) }),
        ...(status && { status }),
        ...(district_id && {
          driver: {
            driver_districts: {
              some: {
                district_id: BigInt(district_id),
                is_active: true
              }
            }
          }
        })
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true
          }
        },
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
    
    const formattedAssignments = assignments.map((assignment: any) => {
      const info = assignment.lead.info as any;
      
      return {
        id: assignment.id.toString(),
        driver_id: assignment.driver_id.toString(),
        lead_id: assignment.lead_id.toString(),
        vehicle_id: assignment.vehicle_id?.toString(),
        delivery_date: assignment.delivery_date,
        delivery_time: assignment.delivery_time || assignment.lead.delivery_time,
        status: assignment.status,
        accepted_at: assignment.accepted_at,
        started_at: assignment.started_at,
        completed_at: assignment.completed_at,
        driver_notes: assignment.driver_notes,
        created_at: assignment.created_at,
        updated_at: assignment.updated_at,
        
        driver: {
          id: assignment.driver.id.toString(),
          name: assignment.driver.name,
          phone: assignment.driver.phone,
          status: assignment.driver.status
        },
        
        lead: {
          id: assignment.lead.lead_id.toString(),
          name: assignment.lead.name,
          client_name: info?.name || assignment.lead.name,
          client_phone: info?.phone || '',
          address: info?.delivery_address || info?.address || '',
          products: assignment.lead.products,
          price: assignment.lead.price,
          comment: assignment.lead.comment,
          is_paid: assignment.lead.stat_oplata === 1
        },
        
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
    
    return NextResponse.json({
      success: true,
      assignments: formattedAssignments,
      date
    });
    
  } catch (error) {
    console.error('❌ Ошибка получения назначений:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера при получении назначений' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Назначить заказ водителю
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
        { error: 'ID водителя, ID заказа и дата доставки обязательны' },
        { status: 400 }
      );
    }
    
    // Проверяем, что водитель активен
    const driver = await prisma.driver.findFirst({
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
    
    // Проверяем, что заказ существует
    const lead = await prisma.lead.findFirst({
      where: { lead_id: BigInt(lead_id) }
    });
    
    if (!lead) {
      return NextResponse.json(
        { error: 'Заказ не найден' },
        { status: 404 }
      );
    }
    
    // Проверяем, что заказ уже не назначен на эту дату
    const existingAssignment = await prisma.driverAssignment.findFirst({
      where: {
        lead_id: BigInt(lead_id),
        delivery_date: new Date(delivery_date)
      }
    });
    
    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Заказ уже назначен на эту дату' },
        { status: 400 }
      );
    }
    
    // Если указана машина, проверяем что она доступна
    let finalVehicleId = vehicle_id ? BigInt(vehicle_id) : null;
    
    if (vehicle_id) {
      const vehicle = await prisma.vehicle.findFirst({
        where: {
          id: BigInt(vehicle_id),
          is_active: true
        }
      });
      
      if (!vehicle) {
        return NextResponse.json(
          { error: 'Машина не найдена или неактивна' },
          { status: 404 }
        );
      }
    } else {
      // Автоматически назначаем основную машину водителя
      const primaryVehicle = await prisma.driverVehicle.findFirst({
        where: {
          driver_id: BigInt(driver_id),
          is_active: true,
          is_primary: true
        },
        include: {
          vehicle: true
        }
      });
      
      if (primaryVehicle && primaryVehicle.vehicle.is_active) {
        finalVehicleId = primaryVehicle.vehicle_id;
      }
    }
    
    // Создаем назначение
    const assignment = await prisma.driverAssignment.create({
      data: {
        driver_id: BigInt(driver_id),
        lead_id: BigInt(lead_id),
        vehicle_id: finalVehicleId,
        delivery_date: new Date(delivery_date),
        delivery_time,
        status: 'assigned'
      },
      include: {
        driver: {
          select: {
            name: true
          }
        },
        lead: {
          select: {
            name: true,
            info: true
          }
        },
        vehicle: {
          select: {
            name: true
          }
        }
      }
    });
    
    const clientName = (assignment.lead.info as any)?.name || assignment.lead.name;
    
    console.log(`✅ Заказ назначен: ${clientName} → ${assignment.driver.name} (${assignment.vehicle?.name || 'без машины'})`);
    
    return NextResponse.json({
      success: true,
      assignment: {
        id: assignment.id.toString(),
        status: assignment.status,
        delivery_date: assignment.delivery_date,
        delivery_time: assignment.delivery_time
      },
      message: `Заказ назначен водителю ${assignment.driver.name}`
    });
    
  } catch (error) {
    console.error('❌ Ошибка назначения заказа:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера при назначении заказа' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Обновить назначение
export async function PATCH(request: NextRequest) {
  try {
    const {
      assignment_id,
      driver_id,
      vehicle_id,
      delivery_time,
      status
    } = await request.json();
    
    if (!assignment_id) {
      return NextResponse.json(
        { error: 'ID назначения обязателен' },
        { status: 400 }
      );
    }
    
    const updateData: any = {};
    
    if (driver_id) updateData.driver_id = BigInt(driver_id);
    if (vehicle_id) updateData.vehicle_id = BigInt(vehicle_id);
    if (delivery_time !== undefined) updateData.delivery_time = delivery_time;
    if (status) updateData.status = status;
    
    const assignment = await prisma.driverAssignment.update({
      where: { id: BigInt(assignment_id) },
      data: updateData,
      include: {
        driver: {
          select: {
            name: true
          }
        },
        lead: {
          select: {
            name: true,
            info: true
          }
        }
      }
    });
    
    const clientName = (assignment.lead.info as any)?.name || assignment.lead.name;
    
    console.log(`✅ Назначение обновлено: ${clientName} → ${assignment.driver.name}`);
    
    return NextResponse.json({
      success: true,
      message: 'Назначение успешно обновлено'
    });
    
  } catch (error) {
    console.error('❌ Ошибка обновления назначения:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера при обновлении назначения' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Удалить назначение
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assignment_id = searchParams.get('assignment_id');
    
    if (!assignment_id) {
      return NextResponse.json(
        { error: 'ID назначения обязателен' },
        { status: 400 }
      );
    }
    
    await prisma.driverAssignment.delete({
      where: { id: BigInt(assignment_id) }
    });
    
    console.log(`✅ Назначение удалено: ID ${assignment_id}`);
    
    return NextResponse.json({
      success: true,
      message: 'Назначение удалено'
    });
    
  } catch (error) {
    console.error('❌ Ошибка удаления назначения:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера при удалении назначения' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
