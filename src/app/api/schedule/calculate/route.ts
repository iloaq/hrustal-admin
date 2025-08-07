import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../../generated/prisma';

const prisma = new PrismaClient();

// POST - расчет оптимального расписания с учетом нагрузки
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date } = body;

    if (!date) {
      return NextResponse.json(
        { error: 'Дата обязательна' },
        { status: 400 }
      );
    }

    const targetDate = new Date(date);
    
    // Получаем заявки на дату
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const leads = await (prisma as any).lead.findMany({
      where: {
        delivery_date: {
          gte: targetDate,
          lt: nextDay
        }
      },
      include: {
        info: true
      }
    });

    // Получаем все активные машины
    const vehicles = await (prisma as any).vehicle.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' }
    });

    // Получаем все активные районы
    const districts = await (prisma as any).district.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' }
    });

    // Группируем заявки по районам
    const leadsByDistrict: {[key: string]: any[]} = {};
    const districtStats: {[key: string]: {count: number, totalLiters: number}} = {};

    leads.forEach((lead: any) => {
      const region = lead.info?.region || 'Неизвестный район';
      
      if (!leadsByDistrict[region]) {
        leadsByDistrict[region] = [];
        districtStats[region] = { count: 0, totalLiters: 0 };
      }
      
      leadsByDistrict[region].push(lead);
      districtStats[region].count++;
      districtStats[region].totalLiters += lead.total_liters || 19; // По умолчанию 19л
    });

    // Сортируем районы по нагрузке (больше заявок = выше приоритет)
    const sortedDistricts = Object.entries(districtStats)
      .sort(([,a], [,b]) => b.count - a.count)
      .map(([district]) => district);

    // Логика распределения:
    // 1. Приоритетные районы получают выделенные машины
    // 2. Остальные районы распределяются по оставшимся машинам
    // 3. Если машин мало, несколько районов могут быть на одной машине

    const vehicleAssignments: {[vehicleId: string]: string[]} = {};
    const districtAssignments: {[district: string]: string} = {};

    // Специальные привязки (базовая логика)
    const priorityAssignments: {[key: string]: string} = {
      'Центр': 'Машина 1',
      'Вокзал': 'Машина 2',
      'Центр П/З': 'Машина 3',
      'Центр ПЗ': 'Машина 3',
      'Вокзал П/З': 'Машина 4',
      'Вокзал ПЗ': 'Машина 4',
      'Машина 5': 'Машина 5'
    };

    // Сначала назначаем приоритетные районы
    Object.entries(priorityAssignments).forEach(([district, vehicleName]) => {
      if (leadsByDistrict[district] && districtStats[district].count > 0) {
        const vehicle = vehicles.find((v: any) => v.name === vehicleName);
        if (vehicle) {
          const vehicleId = vehicle.id.toString();
          if (!vehicleAssignments[vehicleId]) {
            vehicleAssignments[vehicleId] = [];
          }
          vehicleAssignments[vehicleId].push(district);
          districtAssignments[district] = vehicleId;
        }
      }
    });

    // Назначаем оставшиеся районы
    const unassignedDistricts = sortedDistricts.filter(district => !districtAssignments[district]);
    const availableVehicles = vehicles.filter((v: any) => 
      !Object.keys(vehicleAssignments).includes(v.id.toString()) ||
      vehicleAssignments[v.id.toString()].length === 0
    );

    // Если доступных машин мало, используем уже назначенные
    let vehicleIndex = 0;
    const allVehicles = availableVehicles.length > 0 ? availableVehicles : vehicles;

    unassignedDistricts.forEach(district => {
      const vehicle = allVehicles[vehicleIndex % allVehicles.length];
      const vehicleId = vehicle.id.toString();
      
      if (!vehicleAssignments[vehicleId]) {
        vehicleAssignments[vehicleId] = [];
      }
      
      vehicleAssignments[vehicleId].push(district);
      districtAssignments[district] = vehicleId;
      vehicleIndex++;
    });

    // Подсчитываем статистику по машинам
    const vehicleStats = vehicles.map((vehicle: any) => {
      const vehicleId = vehicle.id.toString();
      const assignedDistricts = vehicleAssignments[vehicleId] || [];
      
      let totalLeads = 0;
      let totalLiters = 0;
      
      assignedDistricts.forEach(district => {
        if (districtStats[district]) {
          totalLeads += districtStats[district].count;
          totalLiters += districtStats[district].totalLiters;
        }
      });

      return {
        vehicle: {
          id: vehicleId,
          name: vehicle.name,
          brand: vehicle.brand,
          capacity: vehicle.capacity
        },
        districts: assignedDistricts,
        stats: {
          totalLeads,
          totalLiters,
          utilizationPercent: vehicle.capacity ? Math.round((totalLiters / vehicle.capacity) * 100) : 0
        }
      };
    });

    // Проверяем, можно ли обойтись меньшим количеством машин
    const activeVehicles = vehicleStats.filter((v: any) => v.stats.totalLeads > 0);
    const totalCapacityNeeded = activeVehicles.reduce((sum: number, v: any) => sum + v.stats.totalLiters, 0);
    const averageCapacity = vehicles.length > 0 ? vehicles[0].capacity || 150 : 150;
    const minVehiclesNeeded = Math.ceil(totalCapacityNeeded / averageCapacity);

    // Рекомендации по оптимизации
    const recommendations = [];
    
    if (activeVehicles.length > minVehiclesNeeded) {
      recommendations.push(`Можно использовать ${minVehiclesNeeded} машин вместо ${activeVehicles.length}`);
    }
    
    const overloadedVehicles = vehicleStats.filter((v: any) => v.stats.utilizationPercent > 90);
    if (overloadedVehicles.length > 0) {
      recommendations.push(`Перегружены: ${overloadedVehicles.map((v: any) => v.vehicle.name).join(', ')}`);
    }

    const underloadedVehicles = vehicleStats.filter((v: any) => v.stats.utilizationPercent < 30 && v.stats.totalLeads > 0);
    if (underloadedVehicles.length > 0) {
      recommendations.push(`Недогружены: ${underloadedVehicles.map((v: any) => v.vehicle.name).join(', ')}`);
    }

    return NextResponse.json({
      success: true,
      date: targetDate.toISOString().split('T')[0],
      summary: {
        totalLeads: leads.length,
        totalDistricts: Object.keys(leadsByDistrict).length,
        activeVehicles: activeVehicles.length,
        totalVehicles: vehicles.length,
        minVehiclesNeeded
      },
      districtStats,
      vehicleStats,
      recommendations,
      calculation: {
        totalCapacityNeeded,
        averageCapacity,
        utilizationRate: Math.round((totalCapacityNeeded / (vehicles.length * averageCapacity)) * 100)
      }
    });

  } catch (error) {
    console.error('Ошибка расчета расписания:', error);
    return NextResponse.json(
      { error: 'Ошибка расчета расписания' },
      { status: 500 }
    );
  }
}