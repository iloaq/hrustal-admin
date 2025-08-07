import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../generated/prisma';
// Убираем bcrypt, так как пин-коды не хешируем

const prisma = new PrismaClient();

// GET - получить всех курьеров
export async function GET(request: NextRequest) {
  try {
    const couriers = await prisma.courier.findMany({
      include: {
        vehicles: {
          where: { is_active: true },
          include: {
            vehicle: true
          }
        },
        districts: {
          where: { is_active: true },
          include: {
            district: true
          }
        },
        _count: {
          select: {
            tasks: {
              where: {
                status: { in: ['pending', 'in_progress'] }
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Сериализуем BigInt для JSON
    const serializedCouriers = couriers.map((courier: any) => ({
      ...courier,
      id: courier.id.toString(),
      vehicles: courier.vehicles.map((cv: any) => ({
        ...cv,
        id: cv.id.toString(),
        courier_id: cv.courier_id.toString(),
        vehicle_id: cv.vehicle_id.toString(),
        vehicle: {
          ...cv.vehicle,
          id: cv.vehicle.id.toString()
        }
      })),
      districts: courier.districts.map((cd: any) => ({
        ...cd,
        id: cd.id.toString(),
        courier_id: cd.courier_id.toString(),
        district_id: cd.district_id.toString(),
        district: {
          ...cd.district,
          id: cd.district.id.toString()
        }
      }))
    }));

    return NextResponse.json(serializedCouriers);
  } catch (error) {
    console.error('Ошибка получения курьеров:', error);
    return NextResponse.json(
      { error: 'Ошибка получения курьеров' },
      { status: 500 }
    );
  }
}

// POST - создать нового курьера
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, login, pin_code, vehicleIds = [], districtIds = [] } = body;

    // Валидация обязательных полей
    if (!name || !login || !pin_code) {
      return NextResponse.json(
        { error: 'Имя, логин и пин-код обязательны' },
        { status: 400 }
      );
    }

    // Валидация пин-кода (только цифры, 4-6 символов)
    if (!/^\d{4,6}$/.test(pin_code)) {
      return NextResponse.json(
        { error: 'Пин-код должен содержать 4-6 цифр' },
        { status: 400 }
      );
    }

    // Проверка уникальности логина
    const existingCourier = await prisma.courier.findUnique({
      where: { login }
    });

    if (existingCourier) {
      return NextResponse.json(
        { error: 'Курьер с таким логином уже существует' },
        { status: 400 }
      );
    }

    // Пин-код сохраняем как есть (не хешируем)

    // Создание курьера в транзакции
    const courier = await prisma.$transaction(async (tx) => {
      // Создаем курьера
      const newCourier = await tx.courier.create({
        data: {
          name,
          phone,
          login,
          pin_code
        }
      });

      // Привязываем к машинам
      if (vehicleIds.length > 0) {
        await tx.courierVehicle.createMany({
          data: vehicleIds.map((vehicleId: number) => ({
            courier_id: newCourier.id,
            vehicle_id: vehicleId
          }))
        });
      }

      // Привязываем к районам
      if (districtIds.length > 0) {
        await tx.courierDistrict.createMany({
          data: districtIds.map((districtId: number) => ({
            courier_id: newCourier.id,
            district_id: districtId
          }))
        });
      }

      // Возвращаем курьера с полной информацией
      return await tx.courier.findUnique({
        where: { id: newCourier.id },
        include: {
          vehicles: {
            include: { vehicle: true }
          },
          districts: {
            include: { district: true }
          }
        }
      });
    });

    // Сериализуем BigInt для JSON
    const serializedCourier = {
      ...courier,
      id: courier?.id.toString(),
      vehicles: courier?.vehicles.map((cv: any) => ({
        ...cv,
        id: cv.id.toString(),
        courier_id: cv.courier_id.toString(),
        vehicle_id: cv.vehicle_id.toString(),
        vehicle: {
          ...cv.vehicle,
          id: cv.vehicle.id.toString()
        }
      })),
      districts: courier?.districts.map((cd: any) => ({
        ...cd,
        id: cd.id.toString(),
        courier_id: cd.courier_id.toString(),
        district_id: cd.district_id.toString(),
        district: {
          ...cd.district,
          id: cd.district.id.toString()
        }
      }))
    };

    return NextResponse.json(serializedCourier, { status: 201 });
  } catch (error) {
    console.error('Ошибка создания курьера:', error);
    return NextResponse.json(
      { error: 'Ошибка создания курьера' },
      { status: 500 }
    );
  }
}

// PUT - обновить курьера
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, phone, login, pin_code, vehicleIds = [], districtIds = [], is_active } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID курьера обязателен' },
        { status: 400 }
      );
    }

    // Проверка существования курьера
    const existingCourier = await prisma.courier.findUnique({
      where: { id: BigInt(id) }
    });

    if (!existingCourier) {
      return NextResponse.json(
        { error: 'Курьер не найден' },
        { status: 404 }
      );
    }

    // Проверка уникальности логина (если изменился)
    if (login && login !== existingCourier.login) {
      const loginExists = await prisma.courier.findUnique({
        where: { login }
      });

      if (loginExists) {
        return NextResponse.json(
          { error: 'Курьер с таким логином уже существует' },
          { status: 400 }
        );
      }
    }

    // Подготовка данных для обновления
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (login !== undefined) updateData.login = login;
    if (is_active !== undefined) updateData.is_active = is_active;
    
    // Обновление пин-кода, если он изменился
    if (pin_code) {
      // Валидация пин-кода
      if (!/^\d{4,6}$/.test(pin_code)) {
        return NextResponse.json(
          { error: 'Пин-код должен содержать 4-6 цифр' },
          { status: 400 }
        );
      }
      updateData.pin_code = pin_code;
    }
  
    
    // Обновление в транзакции
    const courier = await prisma.$transaction(async (tx) => {
      // Обновляем основную информацию
      const updatedCourier = await tx.courier.update({
        where: { id: BigInt(id) },
        data: updateData
      });

      // Обновляем привязки к машинам
      await tx.courierVehicle.updateMany({
        where: { courier_id: BigInt(id) },
        data: { is_active: false }
      });

      if (vehicleIds.length > 0) {
        for (const vehicleId of vehicleIds) {
          await tx.courierVehicle.upsert({
            where: {
              courier_id_vehicle_id: {
                courier_id: BigInt(id),
                vehicle_id: BigInt(vehicleId)
              }
            },
            create: {
              courier_id: BigInt(id),
              vehicle_id: BigInt(vehicleId),
              is_active: true
            },
            update: {
              is_active: true
            }
          });
        }
      }

      // Обновляем привязки к районам
      await tx.courierDistrict.updateMany({
        where: { courier_id: BigInt(id) },
        data: { is_active: false }
      });

      if (districtIds.length > 0) {
        for (const districtId of districtIds) {
          await tx.courierDistrict.upsert({
            where: {
              courier_id_district_id: {
                courier_id: BigInt(id),
                district_id: BigInt(districtId)
              }
            },
            create: {
              courier_id: BigInt(id),
              district_id: BigInt(districtId),
              is_active: true
            },
            update: {
              is_active: true
            }
          });
        }
      }

      // Возвращаем обновленного курьера
      return await tx.courier.findUnique({
        where: { id: BigInt(id) },
        include: {
          vehicles: {
            where: { is_active: true },
            include: { vehicle: true }
          },
          districts: {
            where: { is_active: true },
            include: { district: true }
          }
        }
      });
    });

    // Сериализуем BigInt для JSON
    const serializedCourier = {
      ...courier,
      id: courier?.id.toString(),
      vehicles: courier?.vehicles.map((cv: any) => ({
        ...cv,
        id: cv.id.toString(),
        courier_id: cv.courier_id.toString(),
        vehicle_id: cv.vehicle_id.toString(),
        vehicle: {
          ...cv.vehicle,
          id: cv.vehicle.id.toString()
        }
      })),
      districts: courier?.districts.map((cd: any) => ({
        ...cd,
        id: cd.id.toString(),
        courier_id: cd.courier_id.toString(),
        district_id: cd.district_id.toString(),
        district: {
          ...cd.district,
          id: cd.district.id.toString()
        }
      }))
    };

    return NextResponse.json(serializedCourier);
  } catch (error) {
    console.error('Ошибка обновления курьера:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления курьера' },
      { status: 500 }
    );
  }
}

// DELETE - удалить курьера
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID курьера обязателен' },
        { status: 400 }
      );
    }

    // Проверка существования курьера
    const existingCourier = await prisma.courier.findUnique({
      where: { id: BigInt(id) }
    });

    if (!existingCourier) {
      return NextResponse.json(
        { error: 'Курьер не найден' },
        { status: 404 }
      );
    }

    // Мягкое удаление - деактивация
    await prisma.courier.update({
      where: { id: BigInt(id) },
      data: { is_active: false }
    });

    return NextResponse.json({ message: 'Курьер деактивирован' });
  } catch (error) {
    console.error('Ошибка удаления курьера:', error);
    return NextResponse.json(
      { error: 'Ошибка удаления курьера' },
      { status: 500 }
    );
  }
}