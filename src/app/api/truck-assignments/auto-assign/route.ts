import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { date, time } = await request.json();
    
    // Преобразуем строку даты в объект Date и создаем диапазон для поиска за весь день
    const deliveryDate = new Date(date);
    const nextDay = new Date(deliveryDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // Получаем заявки для указанной даты и времени
    const leads = await prisma.lead.findMany({
      where: {
        delivery_date: {
          gte: deliveryDate,
          lt: nextDay
        },
        ...(time !== 'all' && { delivery_time: time })
      },
      include: {
        truck_assignments: {
          where: {
            status: 'active'
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    const trucks = ['Машина 1', 'Машина 2', 'Машина 3', 'Машина 4', 'Машина 5']; // 6-8 только вручную
    const assignments: {[key: string]: string} = {};
    
    // Группируем по регионам для лучшего распределения
    const regionGroups: {[key: string]: any[]} = {};
    leads.forEach((lead: any) => {
      // Пропускаем заявки, у которых уже назначена машина
      const hasActiveAssignment = lead.truck_assignments.length > 0 && 
        lead.truck_assignments[0].truck_name && 
        lead.truck_assignments[0].truck_name.trim() !== '';
      if (hasActiveAssignment) return;
      
      const info = lead.info as any;
      const region = info?.region || 'Неизвестный регион';
      if (!regionGroups[region]) {
        regionGroups[region] = [];
      }
      regionGroups[region].push(lead);
    });

    // Распределяем по регионам
    Object.entries(regionGroups).forEach(([, regionLeads]: [string, any[]], regionIndex) => {
      const truckIndex = regionIndex % trucks.length;
              regionLeads.forEach((lead: any) => {
        assignments[lead.lead_id.toString()] = trucks[truckIndex];
      });
    });

    // Сохраняем назначения в новую таблицу
    const assignmentPromises = Object.entries(assignments).map(async ([leadId, truck]: [string, string]) => {
      const lead = leads.find((l: any) => l.lead_id.toString() === leadId);
      if (!lead) return null;

      // Проверяем существующее назначение
      const existingAssignment = await prisma.truckAssignment.findUnique({
        where: {
          lead_id_delivery_date: {
            lead_id: BigInt(leadId),
            delivery_date: new Date(date)
          }
        }
      });

      if (existingAssignment) {
        // НЕ обновляем существующее назначение, если машина уже назначена
        if (existingAssignment.truck_name && existingAssignment.truck_name.trim() !== '') {
          return existingAssignment;
        }
        // Обновляем только если назначение пустое
        return prisma.truckAssignment.update({
          where: { id: existingAssignment.id },
          data: {
            truck_name: truck,
            assigned_at: new Date()
          }
        });
      } else {
        // Создаем новое
        return prisma.truckAssignment.create({
          data: {
            lead_id: BigInt(leadId),
            truck_name: truck,
            delivery_date: new Date(date),
            delivery_time: lead.delivery_time || 'Не указано',
            assigned_by: 'Система'
          }
        });
      }
    });

    const results = await Promise.all(assignmentPromises);
    const successfulAssignments = results.filter(Boolean);
    
    return NextResponse.json({ 
      success: true, 
      assignments,
      message: `Распределено ${successfulAssignments.length} заявок`,
      count: successfulAssignments.length
    });
  } catch (error) {
    console.error('Error auto-assigning trucks:', error);
    return NextResponse.json(
      { error: 'Failed to auto-assign trucks' },
      { status: 500 }
    );
  }
} 