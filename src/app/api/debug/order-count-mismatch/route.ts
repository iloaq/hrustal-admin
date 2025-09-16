import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driver_id = searchParams.get('driver_id');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!driver_id) {
      return NextResponse.json(
        { error: 'driver_id обязателен' },
        { status: 400 }
      );
    }

    // Маппинг водителей к районам (из orders API)
    const driverRegionMapping: Record<string, string[]> = {
      '10': ['Центр'],           // Машина 1
      '9': ['Вокзал'],           // Машина 2
      '13': ['Центр П/З'],       // Машина 3
      '12': ['Вокзал П/З'],      // Машина 4
      '8': ['Машина 5'],         // Машина 5 (универсальная)
      '11': ['Машина 6']         // Машина 6 (иные районы)
    };

    const driverRegions = driverRegionMapping[driver_id] || [];

    // Получаем все leads за указанную дату
    const allLeads = await prisma.lead.findMany({
      where: { delivery_date: new Date(date) },
      include: {
        truck_assignments: true
      },
      orderBy: [
        { delivery_date: 'asc' },
        { delivery_time: 'asc' }
      ]
    });

    // Вспомогательная функция для получения последнего назначения
    function getLatestAssignment(truckAssignments: any[]) {
      if (!truckAssignments || truckAssignments.length === 0) return null;
      return truckAssignments
        .sort((a: any, b: any) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime())[0];
    }

    // Анализируем заказы
    const analysis = {
      total_leads: allLeads.length,
      driver_regions: driverRegions,
      leads_by_region: {} as Record<string, any[]>,
      leads_by_truck: {} as Record<string, any[]>,
      leads_by_status: {} as Record<string, any[]>,
      driver_visible_leads: [] as any[],
      driver_hidden_leads: [] as any[]
    };

    // Группируем по районам
    allLeads.forEach((lead: any) => {
      const info = typeof lead.info === 'string' ? JSON.parse(lead.info) : lead.info;
      const region = info?.region || 'Неизвестный район';
      
      if (!analysis.leads_by_region[region]) {
        analysis.leads_by_region[region] = [];
      }
      analysis.leads_by_region[region].push(lead);
    });

    // Группируем по машинам
    allLeads.forEach((lead: any) => {
      const assignment = getLatestAssignment(lead.truck_assignments);
      const truck = assignment?.truck_name || 'Не назначено';
      
      if (!analysis.leads_by_truck[truck]) {
        analysis.leads_by_truck[truck] = [];
      }
      analysis.leads_by_truck[truck].push(lead);
    });

    // Группируем по статусам
    allLeads.forEach((lead: any) => {
      const assignment = getLatestAssignment(lead.truck_assignments);
      const status = assignment?.status || 'pending';
      
      if (!analysis.leads_by_status[status]) {
        analysis.leads_by_status[status] = [];
      }
      analysis.leads_by_status[status].push(lead);
    });

    // Определяем, какие заказы видит водитель
    allLeads.forEach((lead: any) => {
      const info = typeof lead.info === 'string' ? JSON.parse(lead.info) : lead.info;
      const hasRegion = driverRegions.includes(info?.region);
      
      const assignment = getLatestAssignment(lead.truck_assignments);
      const isCompleted = assignment?.status === 'completed' || assignment?.status === 'cancelled';
      
      const leadInfo = {
        lead_id: lead.lead_id.toString(),
        region: info?.region,
        truck: assignment?.truck_name,
        status: assignment?.status,
        hasRegion,
        isCompleted,
        visible: hasRegion && !isCompleted
      };

      if (leadInfo.visible) {
        analysis.driver_visible_leads.push(leadInfo);
      } else {
        analysis.driver_hidden_leads.push(leadInfo);
      }
    });

    return NextResponse.json({
      success: true,
      driver_id,
      date,
      analysis
    });

  } catch (error) {
    console.error('Ошибка анализа расхождения:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
