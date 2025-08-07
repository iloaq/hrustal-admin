import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../generated/prisma';

const prisma = new PrismaClient();

// GET - получить все машины
export async function GET(request: NextRequest) {
  try {
    const vehicles = await (prisma as any).vehicle.findMany({
      include: {
        couriers: {
          where: { is_active: true },
          include: {
            courier: true
          }
        },
        districts: {
          where: { is_active: true },
          include: {
            district: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Преобразуем BigInt в строки для JSON сериализации
    const serializedVehicles = vehicles.map((vehicle: any) => ({
      ...vehicle,
      id: vehicle.id.toString(),
      couriers: vehicle.couriers.map((cv: any) => ({
        ...cv,
        id: cv.id.toString(),
        courier_id: cv.courier_id.toString(),
        vehicle_id: cv.vehicle_id.toString(),
        courier: {
          ...cv.courier,
          id: cv.courier.id.toString()
        }
      })),
      districts: vehicle.districts.map((vd: any) => ({
        ...vd,
        id: vd.id.toString(),
        vehicle_id: vd.vehicle_id.toString(),
        district_id: vd.district_id.toString(),
        district: {
          ...vd.district,
          id: vd.district.id.toString()
        }
      }))
    }));

    return NextResponse.json(serializedVehicles);
  } catch (error) {
    console.error('Ошибка получения машин:', error);
    return NextResponse.json(
      { error: 'Ошибка получения машин' },
      { status: 500 }
    );
  }
}

// POST - создать новую машину
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, brand, license_plate, capacity, courierIds = [], districtIds = [] } = body;

    // Валидация обязательных полей
    if (!name) {
      return NextResponse.json(
        { error: 'Название машины обязательно' },
        { status: 400 }
      );
    }

    // Проверка уникальности названия
    const existingVehicle = await (prisma as any).vehicle.findUnique({
      where: { name }
    });

    if (existingVehicle) {
      return NextResponse.json(
        { error: 'Машина с таким названием уже существует' },
        { status: 400 }
      );
    }

    // Создание машины в транзакции
    const vehicle = await prisma.$transaction(async (tx) => {
      // Создаем машину
      const newVehicle = await (tx as any).vehicle.create({
        data: {
          name,
          brand,
          license_plate,
          capacity: capacity ? parseInt(capacity) : null
        }
      });

      // Привязываем к курьерам
      if (courierIds.length > 0) {
        await (tx as any).courierVehicle.createMany({
          data: courierIds.map((courierId: number) => ({
            courier_id: courierId,
            vehicle_id: newVehicle.id
          }))
        });
      }

      // Привязываем к районам
      if (districtIds.length > 0) {
        await (tx as any).vehicleDistrict.createMany({
          data: districtIds.map((districtId: number) => ({
            vehicle_id: newVehicle.id,
            district_id: districtId
          }))
        });
      }

      // Возвращаем машину с полной информацией
      return await (tx as any).vehicle.findUnique({
        where: { id: newVehicle.id },
        include: {
          couriers: {
            include: { courier: true }
          },
          districts: {
            include: { district: true }
          }
        }
      });
    });

    // Преобразуем BigInt в строки для JSON сериализации
    const serializedVehicle = {
      ...vehicle,
      id: vehicle.id.toString(),
      couriers: vehicle.couriers.map((cv: any) => ({
        ...cv,
        id: cv.id.toString(),
        courier_id: cv.courier_id.toString(),
        vehicle_id: cv.vehicle_id.toString(),
        courier: {
          ...cv.courier,
          id: cv.courier.id.toString()
        }
      })),
      districts: vehicle.districts.map((vd: any) => ({
        ...vd,
        id: vd.id.toString(),
        vehicle_id: vd.vehicle_id.toString(),
        district_id: vd.district_id.toString(),
        district: {
          ...vd.district,
          id: vd.district.id.toString()
        }
      }))
    };

    return NextResponse.json(serializedVehicle, { status: 201 });
  } catch (error) {
    console.error('Ошибка создания машины:', error);
    return NextResponse.json(
      { error: 'Ошибка создания машины' },
      { status: 500 }
    );
  }
}

// PUT - обновить машину
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, brand, license_plate, capacity, courierIds = [], districtIds = [], is_active } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID машины обязателен' },
        { status: 400 }
      );
    }

    // Проверка существования машины
    const existingVehicle = await (prisma as any).vehicle.findUnique({
      where: { id: BigInt(id) }
    });

    if (!existingVehicle) {
      return NextResponse.json(
        { error: 'Машина не найдена' },
        { status: 404 }
      );
    }

    // Проверка уникальности названия (если изменилось)
    if (name && name !== existingVehicle.name) {
      const nameExists = await prisma.vehicle.findUnique({
        where: { name }
      });

      if (nameExists) {
        return NextResponse.json(
          { error: 'Машина с таким названием уже существует' },
          { status: 400 }
        );
      }
    }

    // Подготовка данных для обновления
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (brand !== undefined) updateData.brand = brand;
    if (license_plate !== undefined) updateData.license_plate = license_plate;
    if (capacity !== undefined) updateData.capacity = capacity ? parseInt(capacity) : null;
    if (is_active !== undefined) updateData.is_active = is_active;

    // Обновление в транзакции
    const vehicle = await prisma.$transaction(async (tx) => {
      // Обновляем основную информацию
      const updatedVehicle = await (tx as any).vehicle.update({
        where: { id: BigInt(id) },
        data: updateData
      });

      // Обновляем привязки к курьерам
      await (tx as any).courierVehicle.updateMany({
        where: { vehicle_id: BigInt(id) },
        data: { is_active: false }
      });

      if (courierIds.length > 0) {
        for (const courierId of courierIds) {
          await (tx as any).courierVehicle.upsert({
            where: {
              courier_id_vehicle_id: {
                courier_id: BigInt(courierId),
                vehicle_id: BigInt(id)
              }
            },
            create: {
              courier_id: BigInt(courierId),
              vehicle_id: BigInt(id),
              is_active: true
            },
            update: {
              is_active: true
            }
          });
        }
      }

      // Обновляем привязки к районам
      await (tx as any).vehicleDistrict.updateMany({
        where: { vehicle_id: BigInt(id) },
        data: { is_active: false }
      });

      if (districtIds.length > 0) {
        for (const districtId of districtIds) {
          await (tx as any).vehicleDistrict.upsert({
            where: {
              vehicle_id_district_id: {
                vehicle_id: BigInt(id),
                district_id: BigInt(districtId)
              }
            },
            create: {
              vehicle_id: BigInt(id),
              district_id: BigInt(districtId),
              is_active: true
            },
            update: {
              is_active: true
            }
          });
        }
      }

      // Возвращаем обновленную машину
      return await (tx as any).vehicle.findUnique({
        where: { id: BigInt(id) },
        include: {
          couriers: {
            where: { is_active: true },
            include: { courier: true }
          },
          districts: {
            where: { is_active: true },
            include: { district: true }
          }
        }
      });
    });

    // Преобразуем BigInt в строки для JSON сериализации
    const serializedVehicle = {
      ...vehicle,
      id: vehicle.id.toString(),
      couriers: vehicle.couriers.map((cv: any) => ({
        ...cv,
        id: cv.id.toString(),
        courier_id: cv.courier_id.toString(),
        vehicle_id: cv.vehicle_id.toString(),
        courier: {
          ...cv.courier,
          id: cv.courier.id.toString()
        }
      })),
      districts: vehicle.districts.map((vd: any) => ({
        ...vd,
        id: vd.id.toString(),
        vehicle_id: vd.vehicle_id.toString(),
        district_id: vd.district_id.toString(),
        district: {
          ...vd.district,
          id: vd.district.id.toString()
        }
      }))
    };

    return NextResponse.json(serializedVehicle);
  } catch (error) {
    console.error('Ошибка обновления машины:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления машины' },
      { status: 500 }
    );
  }
}

// DELETE - удалить машину
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID машины обязателен' },
        { status: 400 }
      );
    }

    // Проверка существования машины
    const existingVehicle = await (prisma as any).vehicle.findUnique({
      where: { id: BigInt(id) }
    });

    if (!existingVehicle) {
      return NextResponse.json(
        { error: 'Машина не найдена' },
        { status: 404 }
      );
    }

    // Мягкое удаление - деактивация
    await (prisma as any).vehicle.update({
      where: { id: BigInt(id) },
      data: { is_active: false }
    });

    return NextResponse.json({ message: 'Машина деактивирована' });
  } catch (error) {
    console.error('Ошибка удаления машины:', error);
    return NextResponse.json(
      { error: 'Ошибка удаления машины' },
      { status: 500 }
    );
  }
}