import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../../generated/prisma';

const prisma = new PrismaClient();

// POST - синхронизация районов с CRM
export async function POST(request: NextRequest) {
  try {
    console.log('request', request);
    const body = await request.json();
    const { districts, action } = body;

    // Если это запрос от n8n для запуска синхронизации
    if (action === 'sync_districts' && !districts) {
      return NextResponse.json({
        success: true,
        message: 'Синхронизация запущена'
      });
    }

    // Если это данные от n8n с результатом от CRM
    if (!districts || !Array.isArray(districts)) {
      return NextResponse.json(
        { error: 'Неверный формат данных. Ожидается массив districts' },
        { status: 400 }
      );
    }

    const results = {
      updated: 0,
      created: 0,
      errors: 0,
      details: [] as any[]
    };

    // Обрабатываем каждый район
    for (const districtData of districts) {
      try {
        const { name, description, is_active = true } = districtData;

        if (!name) {
          results.errors++;
          results.details.push({
            name: name || 'unknown',
            error: 'Название района обязательно'
          });
          continue;
        }

        // Ищем существующий район по названию
        const existingDistrict = await (prisma as any).district.findFirst({
          where: { name }
        });

        if (existingDistrict) {
          // Обновляем существующий район
          await (prisma as any).district.update({
            where: { id: existingDistrict.id },
            data: {
              description: description || existingDistrict.description,
              is_active: is_active !== undefined ? is_active : existingDistrict.is_active,
              updated_at: new Date()
            }
          });

          results.updated++;
          results.details.push({
            name,
            action: 'updated',
            id: existingDistrict.id.toString()
          });
        } else {
          // Создаем новый район
          const newDistrict = await (prisma as any).district.create({
            data: {
              name,
              description: description || '',
              is_active
            }
          });

          results.created++;
          results.details.push({
            name,
            action: 'created',
            id: newDistrict.id.toString()
          });
        }
      } catch (error) {
        console.error(`Ошибка обработки района ${districtData.name}:`, error);
        results.errors++;
        results.details.push({
          name: districtData.name || 'unknown',
          error: 'Внутренняя ошибка обработки'
        });
      }
    }

    console.log(`Синхронизация районов завершена: ${results.updated} обновлено, ${results.created} создано, ${results.errors} ошибок`);
    console.log('Детали синхронизации:', results.details);

    return NextResponse.json({
      success: true,
      message: `Синхронизация завершена: ${results.updated} обновлено, ${results.created} создано, ${results.errors} ошибок`,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ошибка синхронизации районов:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера при синхронизации' },
      { status: 500 }
    );
  }
}

// GET - получить статус синхронизации (для проверки)
export async function GET(request: NextRequest) {
  try {
    const districts = await (prisma as any).district.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        description: true,
        is_active: true,
        created_at: true,
        updated_at: true
      },
      orderBy: { name: 'asc' }
    });

    // Преобразуем BigInt в строки
    const serializedDistricts = districts.map((district: any) => ({
      ...district,
      id: district.id.toString()
    }));

    return NextResponse.json({
      success: true,
      count: serializedDistricts.length,
      districts: serializedDistricts
    });

  } catch (error) {
    console.error('Ошибка получения списка районов:', error);
    return NextResponse.json(
      { error: 'Ошибка получения списка районов' },
      { status: 500 }
    );
  }
} 