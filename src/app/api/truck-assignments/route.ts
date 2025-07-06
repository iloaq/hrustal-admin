import { NextResponse } from 'next/server';
import { PrismaClient } from '../../../generated/prisma';

const prisma = new PrismaClient();

// Получить все назначения
export async function GET() {
  try {
    const assignments = await prisma.truckAssignment.findMany({
      include: {
        lead: true
      },
      orderBy: {
        delivery_date: 'desc'
      }
    });
    
    return NextResponse.json(assignments.map(assignment => ({
      ...assignment,
      id: Number(assignment.id),
      lead_id: Number(assignment.lead_id)
    })));
  } catch (error) {
    console.error('Error fetching truck assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch truck assignments' },
      { status: 500 }
    );
  }
}

// Создать новое назначение
export async function POST(request: Request) {
  try {
    const { leadId, truckName, deliveryDate, deliveryTime, assignedBy } = await request.json();
    
    // Проверяем, нет ли уже назначения для этой заявки на эту дату
    const existingAssignment = await prisma.truckAssignment.findUnique({
      where: {
        lead_id_delivery_date: {
          lead_id: BigInt(leadId),
          delivery_date: new Date(deliveryDate)
        }
      }
    });

    if (existingAssignment) {
      // Обновляем существующее назначение
      const updatedAssignment = await prisma.truckAssignment.update({
        where: { id: existingAssignment.id },
        data: {
          truck_name: truckName,
          delivery_time: deliveryTime,
          assigned_by: assignedBy,
          assigned_at: new Date()
        },
        include: {
          lead: true
        }
      });

      return NextResponse.json({
        success: true,
        assignment: {
          ...updatedAssignment,
          id: Number(updatedAssignment.id),
          lead_id: Number(updatedAssignment.lead_id)
        }
      });
    } else {
      // Создаем новое назначение
      const newAssignment = await prisma.truckAssignment.create({
        data: {
          lead_id: BigInt(leadId),
          truck_name: truckName,
          delivery_date: new Date(deliveryDate),
          delivery_time: deliveryTime,
          assigned_by: assignedBy
        },
        include: {
          lead: true
        }
      });

      return NextResponse.json({
        success: true,
        assignment: {
          ...newAssignment,
          id: Number(newAssignment.id),
          lead_id: Number(newAssignment.lead_id)
        }
      });
    }
  } catch (error) {
    console.error('Error creating truck assignment:', error);
    return NextResponse.json(
      { error: 'Failed to create truck assignment' },
      { status: 500 }
    );
  }
} 