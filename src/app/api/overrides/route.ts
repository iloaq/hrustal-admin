import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// GET /api/overrides - получение списка overrides
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const region = searchParams.get('region');

    const where: any = {
      is_active: true
    };

    if (date) {
      const queryDate = new Date(date);
      queryDate.setHours(0, 0, 0, 0);
      where.date = queryDate;
    }

    if (region) {
      where.region = region;
    }

    const overrides = await prisma.regionOverride.findMany({
      where,
      include: {
        vehicle: true
      },
      orderBy: [
        { date: 'asc' },
        { region: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      overrides: overrides.map((override: any) => ({
        id: override.id.toString(),
        date: override.date.toISOString().split('T')[0],
        region: override.region,
        vehicle: {
          id: override.vehicle.id.toString(),
          name: override.vehicle.name,
          license_plate: override.vehicle.license_plate
        },
        created_at: override.created_at.toISOString(),
        created_by: override.created_by,
        notes: override.notes
      }))
    });

  } catch (error) {
    console.error('Ошибка получения overrides:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST /api/overrides - создание override
export async function POST(request: NextRequest) {
  try {
    const { date, region, vehicle_id, notes, created_by } = await request.json();

    if (!date || !region || !vehicle_id) {
      return NextResponse.json(
        { error: 'Необходимы date, region и vehicle_id' },
        { status: 400 }
      );
    }

    // Преобразуем vehicle_id в BigInt
    const vehicleIdBigInt = BigInt(vehicle_id);

    const overrideDate = new Date(date);
    overrideDate.setHours(0, 0, 0, 0);

    // Проверяем, нет ли уже override для этого региона на эту дату
    const existingOverride = await prisma.regionOverride.findFirst({
      where: {
        date: overrideDate,
        region: region,
        is_active: true
      }
    });

    if (existingOverride) {
      // Обновляем существующий override
      const updatedOverride = await prisma.regionOverride.update({
        where: { id: existingOverride.id },
        data: {
          vehicle_id: vehicleIdBigInt,
          notes: notes || null,
          created_by: created_by || 'admin'
        },
        include: {
          vehicle: true
        }
      });

      return NextResponse.json({
        success: true,
        override: {
          id: updatedOverride.id.toString(),
          date: updatedOverride.date.toISOString().split('T')[0],
          region: updatedOverride.region,
          vehicle: {
            id: updatedOverride.vehicle.id.toString(),
            name: updatedOverride.vehicle.name
          }
        },
        message: 'Override обновлен'
      });
    }

    // Создаем новый override
    const newOverride = await prisma.regionOverride.create({
      data: {
        date: overrideDate,
        region: region,
        vehicle_id: vehicleIdBigInt,
        notes: notes || null,
        created_by: created_by || 'admin'
      },
      include: {
        vehicle: true
      }
    });

    return NextResponse.json({
      success: true,
      override: {
        id: newOverride.id.toString(),
        date: newOverride.date.toISOString().split('T')[0],
        region: newOverride.region,
        vehicle: {
          id: newOverride.vehicle.id.toString(),
          name: newOverride.vehicle.name
        }
      }
    });

  } catch (error) {
    console.error('Ошибка создания override:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE /api/overrides - удаление override
export async function DELETE(request: NextRequest) {
  try {
    const { override_id } = await request.json();

    if (!override_id) {
      return NextResponse.json(
        { error: 'Необходим override_id' },
        { status: 400 }
      );
    }

    await prisma.regionOverride.update({
      where: { id: BigInt(override_id) },
      data: { is_active: false }
    });

    return NextResponse.json({
      success: true,
      message: 'Override удален'
    });

  } catch (error) {
    console.error('Ошибка удаления override:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
