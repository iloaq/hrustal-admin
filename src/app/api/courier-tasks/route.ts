import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../generated/prisma';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'courier-secret-key-2025';

// Middleware для проверки JWT токена
function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded;
  } catch (error) {
    return null;
  }
}

// GET - получить задачи курьера
export async function GET(request: NextRequest) {
  try {
    const decoded = verifyToken(request);
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Неавторизованный доступ' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Получаем задачи курьера на указанную дату
    const tasks = await prisma.courierTask.findMany({
      where: {
        courier_id: BigInt(decoded.courierId),
        task_date: new Date(date)
      },
      orderBy: [
        { priority: 'desc' },
        { created_at: 'asc' }
      ]
    });

    // Преобразуем BigInt в string для JSON
    const tasksFormatted = tasks.map(task => ({
      ...task,
      id: task.id.toString(),
      courier_id: task.courier_id.toString(),
      task_date: task.task_date.toISOString().split('T')[0],
      created_at: task.created_at.toISOString(),
      updated_at: task.updated_at.toISOString(),
      completed_at: task.completed_at?.toISOString() || null
    }));

    return NextResponse.json(tasksFormatted);

  } catch (error) {
    console.error('Ошибка получения задач курьера:', error);
    return NextResponse.json(
      { error: 'Ошибка получения задач' },
      { status: 500 }
    );
  }
}

// PUT - обновить статус задачи
export async function PUT(request: NextRequest) {
  try {
    const decoded = verifyToken(request);
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Неавторизованный доступ' },
        { status: 401 }
      );
    }

    const { taskId, status, notes } = await request.json();

    if (!taskId || !status) {
      return NextResponse.json(
        { error: 'ID задачи и статус обязательны' },
        { status: 400 }
      );
    }

    // Проверяем, что задача принадлежит данному курьеру
    const existingTask = await prisma.courierTask.findFirst({
      where: {
        id: BigInt(taskId),
        courier_id: BigInt(decoded.courierId)
      }
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Задача не найдена' },
        { status: 404 }
      );
    }

    // Обновляем задачу
    const updateData: any = {
      status,
      notes: notes || existingTask.notes
    };

    // Если статус "completed", устанавливаем время завершения
    if (status === 'completed') {
      updateData.completed_at = new Date();
    }

    const updatedTask = await prisma.courierTask.update({
      where: { id: BigInt(taskId) },
      data: updateData
    });

    // Форматируем ответ
    const taskFormatted = {
      ...updatedTask,
      id: updatedTask.id.toString(),
      courier_id: updatedTask.courier_id.toString(),
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

// POST - создать новую задачу (для тестирования)
export async function POST(request: NextRequest) {
  try {
    const decoded = verifyToken(request);
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Неавторизованный доступ' },
        { status: 401 }
      );
    }

    const { title, description, address, client_name, client_phone, task_date, priority } = await request.json();

    if (!title || !task_date) {
      return NextResponse.json(
        { error: 'Название и дата задачи обязательны' },
        { status: 400 }
      );
    }

    const newTask = await prisma.courierTask.create({
      data: {
        courier_id: BigInt(decoded.courierId),
        title,
        description,
        address,
        client_name,
        client_phone,
        task_date: new Date(task_date),
        priority: priority || 'normal'
      }
    });

    // Форматируем ответ
    const taskFormatted = {
      ...newTask,
      id: newTask.id.toString(),
      courier_id: newTask.courier_id.toString(),
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