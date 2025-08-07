import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../../generated/prisma';

const prisma = new PrismaClient();

// GET - получить задачи всех курьеров или конкретного курьера
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courierId = searchParams.get('courierId');
    const date = searchParams.get('date');
    const status = searchParams.get('status');

    const whereCondition: any = {};

    if (courierId) {
      whereCondition.courier_id = BigInt(courierId);
    }

    if (date) {
      whereCondition.task_date = new Date(date);
    }

    if (status) {
      whereCondition.status = status;
    }

    const tasks = await prisma.courierTask.findMany({
      where: whereCondition,
      include: {
        courier: {
          select: {
            id: true,
            name: true,
            login: true,
            phone: true
          }
        }
      },
      orderBy: [
        { task_date: 'desc' },
        { priority: 'desc' },
        { created_at: 'asc' }
      ]
    });

    // Преобразуем BigInt в string для JSON
    const tasksFormatted = tasks.map(task => ({
      ...task,
      id: task.id.toString(),
      courier_id: task.courier_id.toString(),
      courier: {
        ...task.courier,
        id: task.courier.id.toString()
      },
      task_date: task.task_date.toISOString().split('T')[0],
      created_at: task.created_at.toISOString(),
      updated_at: task.updated_at.toISOString(),
      completed_at: task.completed_at?.toISOString() || null
    }));

    return NextResponse.json(tasksFormatted);

  } catch (error) {
    console.error('Ошибка получения задач:', error);
    return NextResponse.json(
      { error: 'Ошибка получения задач' },
      { status: 500 }
    );
  }
}

// POST - создать новую задачу для курьера
export async function POST(request: NextRequest) {
  try {
    const {
      courier_id,
      title,
      description,
      address,
      client_name,
      client_phone,
      task_date,
      priority = 'normal'
    } = await request.json();

    // Валидация обязательных полей
    if (!courier_id || !title || !task_date) {
      return NextResponse.json(
        { error: 'ID курьера, название и дата задачи обязательны' },
        { status: 400 }
      );
    }

    // Проверка существования курьера
    const courier = await prisma.courier.findUnique({
      where: { 
        id: BigInt(courier_id),
        is_active: true 
      }
    });

    if (!courier) {
      return NextResponse.json(
        { error: 'Курьер не найден или неактивен' },
        { status: 404 }
      );
    }

    const newTask = await prisma.courierTask.create({
      data: {
        courier_id: BigInt(courier_id),
        title,
        description,
        address,
        client_name,
        client_phone,
        task_date: new Date(task_date),
        priority
      },
      include: {
        courier: {
          select: {
            id: true,
            name: true,
            login: true,
            phone: true
          }
        }
      }
    });

    // Форматируем ответ
    const taskFormatted = {
      ...newTask,
      id: newTask.id.toString(),
      courier_id: newTask.courier_id.toString(),
      courier: {
        ...newTask.courier,
        id: newTask.courier.id.toString()
      },
      task_date: newTask.task_date.toISOString().split('T')[0],
      created_at: newTask.created_at.toISOString(),
      updated_at: newTask.updated_at.toISOString(),
      completed_at: newTask.completed_at?.toISOString() || null
    };

    return NextResponse.json(taskFormatted, { status: 201 });

  } catch (error) {
    console.error('Ошибка создания задачи:', error);
    return NextResponse.json(
      { error: 'Ошибка создания задачи' },
      { status: 500 }
    );
  }
}

// PUT - обновить задачу
export async function PUT(request: NextRequest) {
  try {
    const {
      id,
      courier_id,
      title,
      description,
      address,
      client_name,
      client_phone,
      task_date,
      status,
      priority,
      notes
    } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID задачи обязателен' },
        { status: 400 }
      );
    }

    // Проверка существования задачи
    const existingTask = await prisma.courierTask.findUnique({
      where: { id: BigInt(id) }
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Задача не найдена' },
        { status: 404 }
      );
    }

    // Подготовка данных для обновления
    const updateData: any = {};
    if (courier_id !== undefined) updateData.courier_id = BigInt(courier_id);
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (address !== undefined) updateData.address = address;
    if (client_name !== undefined) updateData.client_name = client_name;
    if (client_phone !== undefined) updateData.client_phone = client_phone;
    if (task_date !== undefined) updateData.task_date = new Date(task_date);
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (notes !== undefined) updateData.notes = notes;

    // Если статус "completed", устанавливаем время завершения
    if (status === 'completed' && existingTask.status !== 'completed') {
      updateData.completed_at = new Date();
    } else if (status !== 'completed') {
      updateData.completed_at = null;
    }

    const updatedTask = await prisma.courierTask.update({
      where: { id: BigInt(id) },
      data: updateData,
      include: {
        courier: {
          select: {
            id: true,
            name: true,
            login: true,
            phone: true
          }
        }
      }
    });

    // Форматируем ответ
    const taskFormatted = {
      ...updatedTask,
      id: updatedTask.id.toString(),
      courier_id: updatedTask.courier_id.toString(),
      courier: {
        ...updatedTask.courier,
        id: updatedTask.courier.id.toString()
      },
      task_date: updatedTask.task_date.toISOString().split('T')[0],
      created_at: updatedTask.created_at.toISOString(),
      updated_at: updatedTask.updated_at.toISOString(),
      completed_at: updatedTask.completed_at?.toISOString() || null
    };

    return NextResponse.json(taskFormatted);

  } catch (error) {
    console.error('Ошибка обновления задачи:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления задачи' },
      { status: 500 }
    );
  }
}

// DELETE - удалить задачу
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID задачи обязателен' },
        { status: 400 }
      );
    }

    // Проверка существования задачи
    const existingTask = await prisma.courierTask.findUnique({
      where: { id: BigInt(id) }
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Задача не найдена' },
        { status: 404 }
      );
    }

    await prisma.courierTask.delete({
      where: { id: BigInt(id) }
    });

    return NextResponse.json({ message: 'Задача удалена' });

  } catch (error) {
    console.error('Ошибка удаления задачи:', error);
    return NextResponse.json(
      { error: 'Ошибка удаления задачи' },
      { status: 500 }
    );
  }
}