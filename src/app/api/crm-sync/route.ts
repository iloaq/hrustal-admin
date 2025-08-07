import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../generated/prisma';

const prisma = new PrismaClient();

// POST - синхронизация статусов доставок с CRM
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, assignment_ids, date } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'action обязателен' },
        { status: 400 }
      );
    }

    const targetDate = date ? new Date(date) : new Date();
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    if (action === 'sync_delivered_status') {
      // Синхронизируем статусы доставленных заявок с CRM
      
      // Получаем все доставленные заявки за указанную дату
      const deliveredAssignments = await (prisma as any).driverAssignment.findMany({
        where: {
          status: 'delivered',
          delivery_date: {
            gte: targetDate,
            lt: nextDay
          }
        },
        include: {
          lead: true
        }
      });

      if (deliveredAssignments.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'Нет доставленных заявок для синхронизации',
          synced_count: 0
        });
      }

      // Обновляем статус в основной таблице заявок
      let syncedCount = 0;
      for (const assignment of deliveredAssignments) {
        // Проверяем, не обновлен ли уже статус
        const lead = await (prisma as any).lead.findUnique({
          where: { lead_id: assignment.lead_id }
        });

        if (lead && !lead.dotavleno) {
          await (prisma as any).lead.update({
            where: { lead_id: assignment.lead_id },
            data: { 
              dotavleno: true,
              // Добавляем информацию о времени доставки
              updated_at: new Date()
            }
          });
          syncedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Синхронизировано ${syncedCount} заявок с CRM`,
        synced_count: syncedCount,
        total_delivered: deliveredAssignments.length
      });

    } else if (action === 'sync_specific_assignments') {
      // Синхронизируем конкретные назначения
      if (!assignment_ids || !Array.isArray(assignment_ids)) {
        return NextResponse.json(
          { error: 'assignment_ids должен быть массивом' },
          { status: 400 }
        );
      }

      let syncedCount = 0;
      for (const assignmentId of assignment_ids) {
        const assignment = await (prisma as any).driverAssignment.findUnique({
          where: { id: BigInt(assignmentId) },
          include: { lead: true }
        });

        if (assignment && assignment.status === 'delivered') {
          const lead = await (prisma as any).lead.findUnique({
            where: { lead_id: assignment.lead_id }
          });

          if (lead && !lead.dotavleno) {
            await (prisma as any).lead.update({
              where: { lead_id: assignment.lead_id },
              data: { 
                dotavleno: true,
                updated_at: new Date()
              }
            });
            syncedCount++;
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Синхронизировано ${syncedCount} заявок с CRM`,
        synced_count: syncedCount,
        requested_count: assignment_ids.length
      });

    } else if (action === 'get_delivery_stats') {
      // Получаем статистику доставок для отчета
      const stats = await (prisma as any).driverAssignment.groupBy({
        by: ['status'],
        where: {
          delivery_date: {
            gte: targetDate,
            lt: nextDay
          }
        },
        _count: {
          id: true
        }
      });

      const totalDelivered = await (prisma as any).driverAssignment.count({
        where: {
          status: 'delivered',
          delivery_date: {
            gte: targetDate,
            lt: nextDay
          }
        }
      });

      const totalSynced = await (prisma as any).lead.count({
        where: {
          dotavleno: true,
          delivery_date: {
            gte: targetDate,
            lt: nextDay
          }
        }
      });

      return NextResponse.json({
        success: true,
        stats: stats,
        total_delivered: totalDelivered,
        total_synced: totalSynced,
        date: targetDate.toISOString().split('T')[0]
      });

    } else {
      return NextResponse.json(
        { error: 'Недопустимое действие' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Ошибка синхронизации с CRM:', error);
    return NextResponse.json(
      { error: 'Ошибка синхронизации с CRM' },
      { status: 500 }
    );
  }
}

// GET - получение статуса синхронизации
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const targetDate = new Date(date);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Получаем статистику
    const deliveredAssignments = await (prisma as any).driverAssignment.count({
      where: {
        status: 'delivered',
        delivery_date: {
          gte: targetDate,
          lt: nextDay
        }
      }
    });

    const syncedLeads = await (prisma as any).lead.count({
      where: {
        dotavleno: true,
        delivery_date: {
          gte: targetDate,
          lt: nextDay
        }
      }
    });

    const pendingSync = deliveredAssignments - syncedLeads;

    return NextResponse.json({
      success: true,
      date: targetDate.toISOString().split('T')[0],
      delivered_assignments: deliveredAssignments,
      synced_leads: syncedLeads,
      pending_sync: pendingSync > 0 ? pendingSync : 0,
      sync_status: pendingSync > 0 ? 'pending' : 'synced'
    });

  } catch (error) {
    console.error('Ошибка получения статуса синхронизации:', error);
    return NextResponse.json(
      { error: 'Ошибка получения статуса синхронизации' },
      { status: 500 }
    );
  }
}
