import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);

    const drivers = await prisma.driver.findMany({
      where: { is_active: true },
      include: {
        driver_vehicles: {
          include: { vehicle: true }
        },
        driver_districts: {
          where: { is_active: true },
          include: { district: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Получаем статистику из leads и truck_assignments
    const leadsWithAssignments = await prisma.lead.findMany({
      where: { delivery_date: queryDate },
      include: {
        truck_assignments: {
          where: { status: 'active' }
        }
      }
    });

    // Маппинг водителей к машинам (по truck_assignments)
    const driverTruckMapping: Record<string, string[]> = {
      '10': ['Машина 1'],        // Водитель 10 -> Машина 1
      '9': ['Машина 2'],         // Водитель 9 -> Машина 2
      '13': ['Машина 3'],        // Водитель 13 -> Машина 3
      '12': ['Машина 4'],        // Водитель 12 -> Машина 4
      '8': ['Машина 5'],         // Водитель 8 -> Машина 5
      '11': ['Машина 6']         // Водитель 11 -> Машина 6
    };

    // Подсчет статистики
    let totalAssignments = 0;
    let totalDelivered = 0;
    let onlineCount = 0;
    let offlineCount = 0;
    let brokenVehicleCount = 0;

    const formattedDrivers = drivers.map((driver: any) => {
      const driverId = driver.id.toString();
      const driverTrucks = driverTruckMapping[driverId] || [];
      
      // Фильтруем leads по машинам водителя (через truck_assignments)
      const driverLeads = leadsWithAssignments.filter((lead: any) => {
        return lead.truck_assignments.some((assignment: any) => 
          driverTrucks.includes(assignment.truck_name)
        );
      });

      // Подсчитываем статистику по статусам truck_assignments
      const stats = {
        total: driverLeads.length,
        assigned: driverLeads.filter((lead: any) => 
          lead.truck_assignments.length > 0 && 
          !lead.truck_assignments[0].accepted_at && 
          !lead.truck_assignments[0].started_at && 
          !lead.truck_assignments[0].completed_at
        ).length,
        started: driverLeads.filter((lead: any) => 
          lead.truck_assignments.length > 0 && 
          lead.truck_assignments[0].accepted_at && 
          lead.truck_assignments[0].started_at && 
          !lead.truck_assignments[0].completed_at
        ).length,
        delivered: driverLeads.filter((lead: any) => 
          lead.truck_assignments.length > 0 && 
          lead.truck_assignments[0].completed_at
        ).length,
        broken: driverLeads.filter((lead: any) => 
          lead.truck_assignments.length > 0 && 
          lead.truck_assignments[0].cancelled_at
        ).length
      };

      totalAssignments += stats.total;
      totalDelivered += stats.delivered;

      if (driver.status === 'online') onlineCount++;
      else if (driver.status === 'offline') offlineCount++;
      else if (driver.status === 'broken_vehicle') brokenVehicleCount++;

      return {
        id: driver.id.toString(),
        name: driver.name,
        phone: driver.phone,
        login: driver.login,
        license_number: driver.license_number,
        status: driver.status,
        created_at: driver.created_at.toISOString(),
        updated_at: driver.updated_at.toISOString(),
        districts: driver.driver_districts.map((dd: any) => ({
          id: dd.district.id.toString(),
          name: dd.district.name,
          description: dd.district.description,
          assigned_at: dd.assigned_at.toISOString()
        })),
        vehicles: driver.driver_vehicles.map((dv: any) => ({
          id: dv.vehicle.id.toString(),
          name: dv.vehicle.name,
          brand: dv.vehicle.brand,
          license_plate: dv.vehicle.license_plate,
          capacity: dv.vehicle.capacity ? Number(dv.vehicle.capacity) : null,
          is_primary: dv.is_primary,
          is_active: dv.is_active,
          assigned_at: dv.assigned_at.toISOString()
        })),
        assignments: driverLeads.map((lead: any) => {
          const info = typeof lead.info === 'string' ? JSON.parse(lead.info) : lead.info;
          const assignment = lead.truck_assignments[0];
          
          let status = 'assigned';
          if (assignment?.completed_at) status = 'delivered';
          else if (assignment?.started_at) status = 'started';
          else if (assignment?.accepted_at) status = 'accepted';
          else if (assignment?.cancelled_at) status = 'broken';

          return {
            id: lead.lead_id.toString(),
            lead_id: lead.lead_id.toString(),
            client_name: info?.name || '',
            price: lead.price,
            is_paid: lead.stat_oplata === 2,
            status,
            delivery_time: lead.delivery_time,
            vehicle_name: assignment?.truck_name || 'Не назначена',
            accepted_at: assignment?.accepted_at?.toISOString(),
            started_at: assignment?.started_at?.toISOString(),
            completed_at: assignment?.completed_at?.toISOString(),
            driver_notes: assignment?.notes
          };
        }),
        stats
      };
    });

    return NextResponse.json({
      success: true,
      drivers: formattedDrivers,
      stats: {
        total_drivers: drivers.length,
        online: onlineCount,
        offline: offlineCount,
        broken_vehicle: brokenVehicleCount,
        total_assignments: totalAssignments,
        total_delivered: totalDelivered
      }
    });

  } catch (error) {
    console.error('Ошибка получения водителей:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}