import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../generated/prisma';

const prisma = new PrismaClient();

// GET - получить все районы
export async function GET(request: NextRequest) {
  try {
    const districts = await (prisma as any).district.findMany({
      include: {
        vehicles: {
          where: { is_active: true },
          include: {
            vehicle: true
          }
        },
        couriers: {
          where: { is_active: true },
          include: {
            courier: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Преобразуем BigInt в строки для JSON сериализации
    const serializedDistricts = districts.map((district: any) => ({
      ...district,
      id: district.id.toString(),
      vehicles: district.vehicles.map((vd: any) => ({
        ...vd,
        id: vd.id.toString(),
        vehicle_id: vd.vehicle_id.toString(),
        district_id: vd.district_id.toString(),
        vehicle: {
          ...vd.vehicle,
          id: vd.vehicle.id.toString()
        }
      })),
      couriers: district.couriers.map((cd: any) => ({
        ...cd,
        id: cd.id.toString(),
        courier_id: cd.courier_id.toString(),
        district_id: cd.district_id.toString(),
        courier: {
          ...cd.courier,
          id: cd.courier.id.toString()
        }
      }))
    }));

    return NextResponse.json(serializedDistricts);
  } catch (error) {
    console.error('Ошибка получения районов:', error);
    return NextResponse.json(
      { error: 'Ошибка получения районов' },
      { status: 500 }
    );
  }
}

// POST - создать новый район
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, vehicleIds = [], courierIds = [] } = body;

    // Валидация обязательных полей
    if (!name) {
      return NextResponse.json(
        { error: 'Название района обязательно' },
        { status: 400 }
      );
    }

    // Проверка уникальности названия
    const existingDistrict = await (prisma as any).district.findUnique({
      where: { name }
    });

    if (existingDistrict) {
      return NextResponse.json(
        { error: 'Район с таким названием уже существует' },
        { status: 400 }
      );
    }

    // Создание района в транзакции
    const district = await prisma.$transaction(async (tx) => {
      // Создаем район
      const newDistrict = await (tx as any).district.create({
        data: {
          name,
          description
        }
      });

      // Привязываем к машинам
      if (vehicleIds.length > 0) {
        await (tx as any).vehicleDistrict.createMany({
          data: vehicleIds.map((vehicleId: number) => ({
            vehicle_id: vehicleId,
            district_id: newDistrict.id
          }))
        });
      }

      // Привязываем к курьерам
      if (courierIds.length > 0) {
        await (tx as any).courierDistrict.createMany({
          data: courierIds.map((courierId: number) => ({
            courier_id: courierId,
            district_id: newDistrict.id
          }))
        });
      }

      // Возвращаем район с полной информацией
      return await (tx as any).district.findUnique({
        where: { id: newDistrict.id },
        include: {
          vehicles: {
            include: { vehicle: true }
          },
          couriers: {
            include: { courier: true }
          }
        }
      });
    });

    // Преобразуем BigInt в строки для JSON сериализации
    const serializedDistrict = {
      ...district,
      id: district.id.toString(),
      vehicles: district.vehicles.map((vd: any) => ({
        ...vd,
        id: vd.id.toString(),
        vehicle_id: vd.vehicle_id.toString(),
        district_id: vd.district_id.toString(),
        vehicle: {
          ...vd.vehicle,
          id: vd.vehicle.id.toString()
        }
      })),
      couriers: district.couriers.map((cd: any) => ({
        ...cd,
        id: cd.id.toString(),
        courier_id: cd.courier_id.toString(),
        district_id: cd.district_id.toString(),
        courier: {
          ...cd.courier,
          id: cd.courier.id.toString()
        }
      }))
    };

    return NextResponse.json(serializedDistrict, { status: 201 });
  } catch (error) {
    console.error('Ошибка создания района:', error);
    return NextResponse.json(
      { error: 'Ошибка создания района' },
      { status: 500 }
    );
  }
}

// PUT - обновить район
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, vehicleIds = [], courierIds = [], is_active } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID района обязателен' },
        { status: 400 }
      );
    }

    // Проверка существования района
    const existingDistrict = await (prisma as any).district.findUnique({
      where: { id: BigInt(id) }
    });

    if (!existingDistrict) {
      return NextResponse.json(
        { error: 'Район не найден' },
        { status: 404 }
      );
    }

    // Проверка уникальности названия (если изменилось)
    if (name && name !== existingDistrict.name) {
      const nameExists = await (prisma as any).district.findUnique({
        where: { name }
      });

      if (nameExists) {
        return NextResponse.json(
          { error: 'Район с таким названием уже существует' },
          { status: 400 }
        );
      }
    }

    // Подготовка данных для обновления
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;

    // Обновление в транзакции
    const district = await prisma.$transaction(async (tx) => {
      // Обновляем основную информацию
      const updatedDistrict = await (tx as any).district.update({
        where: { id: BigInt(id) },
        data: updateData
      });

      // Обновляем привязки к машинам
      await (tx as any).vehicleDistrict.updateMany({
        where: { district_id: BigInt(id) },
        data: { is_active: false }
      });

      if (vehicleIds.length > 0) {
        for (const vehicleId of vehicleIds) {
          await (tx as any).vehicleDistrict.upsert({
            where: {
              vehicle_id_district_id: {
                vehicle_id: BigInt(vehicleId),
                district_id: BigInt(id)
              }
            },
            create: {
              vehicle_id: BigInt(vehicleId),
              district_id: BigInt(id),
              is_active: true
            },
            update: {
              is_active: true
            }
          });
        }
      }

      // Обновляем привязки к курьерам
      await (tx as any).courierDistrict.updateMany({
        where: { district_id: BigInt(id) },
        data: { is_active: false }
      });

      if (courierIds.length > 0) {
        for (const courierId of courierIds) {
          await (tx as any).courierDistrict.upsert({
            where: {
              courier_id_district_id: {
                courier_id: BigInt(courierId),
                district_id: BigInt(id)
              }
            },
            create: {
              courier_id: BigInt(courierId),
              district_id: BigInt(id),
              is_active: true
            },
            update: {
              is_active: true
            }
          });
        }
      }

      // Возвращаем обновленный район
      return await tx.district.findUnique({
        where: { id: BigInt(id) },
        include: {
          vehicles: {
            where: { is_active: true },
            include: { vehicle: true }
          },
          couriers: {
            where: { is_active: true },
            include: { courier: true }
          }
        }
      });
    });

    // Преобразуем BigInt в строки для JSON сериализации
    if (!district) {
      return NextResponse.json({ error: 'Район не найден' }, { status: 404 });
    }
    
    const serializedDistrict = {
      ...district,
      id: district.id.toString(),
      vehicles: district.vehicles.map((vd: any) => ({
        ...vd,
        id: vd.id.toString(),
        vehicle_id: vd.vehicle_id.toString(),
        district_id: vd.district_id.toString(),
        vehicle: {
          ...vd.vehicle,
          id: vd.vehicle.id.toString()
        }
      })),
      couriers: district.couriers.map((cd: any) => ({
        ...cd,
        id: cd.id.toString(),
        courier_id: cd.courier_id.toString(),
        district_id: cd.district_id.toString(),
        courier: {
          ...cd.courier,
          id: cd.courier.id.toString()
        }
      }))
    };

    return NextResponse.json(serializedDistrict);
  } catch (error) {
    console.error('Ошибка обновления района:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления района' },
      { status: 500 }
    );
  }
}

// DELETE - удалить район
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID района обязателен' },
        { status: 400 }
      );
    }

    // Проверка существования района
    const existingDistrict = await (prisma as any).district.findUnique({
      where: { id: BigInt(id) }
    });

    if (!existingDistrict) {
      return NextResponse.json(
        { error: 'Район не найден' },
        { status: 404 }
      );
    }

    // Мягкое удаление - деактивация
    await (prisma as any).district.update({
      where: { id: BigInt(id) },
      data: { is_active: false }
    });

    return NextResponse.json({ message: 'Район деактивирован' });
  } catch (error) {
    console.error('Ошибка удаления района:', error);
    return NextResponse.json(
      { error: 'Ошибка удаления района' },
      { status: 500 }
    );
  }
}