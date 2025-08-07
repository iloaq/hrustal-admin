import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../generated/prisma';
// Убираем bcrypt, так как пин-коды не хешируем

const prisma = new PrismaClient();

// GET - получить всех водителей
export async function GET(request: NextRequest) {
  try {
    const drivers = await (prisma as any).driver.findMany({
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
            assignments: {
              where: {
                status: { in: ['assigned', 'accepted', 'in_progress'] }
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Сериализуем BigInt для JSON
    const serializedDrivers = drivers.map((driver: any) => ({
      ...driver,
      id: driver.id.toString(),
      vehicles: driver.vehicles.map((dv: any) => ({
        ...dv,
        id: dv.id.toString(),
        driver_id: dv.driver_id.toString(),
        vehicle_id: dv.vehicle_id.toString(),
        vehicle: {
          ...dv.vehicle,
          id: dv.vehicle.id.toString()
        }
      })),
      districts: driver.districts.map((dd: any) => ({
        ...dd,
        id: dd.id.toString(),
        driver_id: dd.driver_id.toString(),
        district_id: dd.district_id.toString(),
        district: {
          ...dd.district,
          id: dd.district.id.toString()
        }
      }))
    }));

    return NextResponse.json(serializedDrivers);
  } catch (error) {
    console.error('Ошибка получения водителей:', error);
    return NextResponse.json(
      { error: 'Ошибка получения водителей' },
      { status: 500 }
    );
  }
}

// POST - создать нового водителя
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      phone, 
      login, 
      pin_code, 
      license_number, 
      vehicleIds = [], 
      districtIds = [],
      primaryVehicleId 
    } = body;

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
    const existingDriver = await (prisma as any).driver.findUnique({
      where: { login }
    });

    if (existingDriver) {
      return NextResponse.json(
        { error: 'Водитель с таким логином уже существует' },
        { status: 400 }
      );
    }

    // Пин-код сохраняем как есть (не хешируем)

    // Создание водителя в транзакции
    const driver = await prisma.$transaction(async (tx) => {
      // Создаем водителя
      const newDriver = await (tx as any).driver.create({
        data: {
          name,
          phone,
          login,
          pin_code,
          license_number
        }
      });

      // Привязываем к машинам
      if (vehicleIds.length > 0) {
        for (const vehicleId of vehicleIds) {
          await (tx as any).driverVehicle.create({
            data: {
              driver_id: newDriver.id,
              vehicle_id: BigInt(vehicleId),
              is_primary: primaryVehicleId ? BigInt(vehicleId) === BigInt(primaryVehicleId) : false
            }
          });
        }
      }

      // Привязываем к районам
      if (districtIds.length > 0) {
        await (tx as any).driverDistrict.createMany({
          data: districtIds.map((districtId: number) => ({
            driver_id: newDriver.id,
            district_id: districtId
          }))
        });
      }

      // Возвращаем водителя с полной информацией
      return await (tx as any).driver.findUnique({
        where: { id: newDriver.id },
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
    const serializedDriver = {
      ...driver,
      id: driver.id.toString(),
      vehicles: driver.vehicles.map((dv: any) => ({
        ...dv,
        id: dv.id.toString(),
        driver_id: dv.driver_id.toString(),
        vehicle_id: dv.vehicle_id.toString(),
        vehicle: {
          ...dv.vehicle,
          id: dv.vehicle.id.toString()
        }
      })),
      districts: driver.districts.map((dd: any) => ({
        ...dd,
        id: dd.id.toString(),
        driver_id: dd.driver_id.toString(),
        district_id: dd.district_id.toString(),
        district: {
          ...dd.district,
          id: dd.district.id.toString()
        }
      }))
    };

    return NextResponse.json(serializedDriver, { status: 201 });
  } catch (error) {
    console.error('Ошибка создания водителя:', error);
    return NextResponse.json(
      { error: 'Ошибка создания водителя' },
      { status: 500 }
    );
  }
}

// PUT - обновить водителя
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      id, 
      name, 
      phone, 
      login, 
      pin_code, 
      license_number, 
      vehicleIds = [], 
      districtIds = [], 
      primaryVehicleId,
      is_active 
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID водителя обязателен' },
        { status: 400 }
      );
    }

    // Проверка существования водителя
    const existingDriver = await (prisma as any).driver.findUnique({
      where: { id: BigInt(id) }
    });

    if (!existingDriver) {
      return NextResponse.json(
        { error: 'Водитель не найден' },
        { status: 404 }
      );
    }

    // Проверка уникальности логина (если изменился)
    if (login && login !== existingDriver.login) {
              const loginExists = await (prisma as any).driver.findUnique({
        where: { login }
      });

      if (loginExists) {
        return NextResponse.json(
          { error: 'Водитель с таким логином уже существует' },
          { status: 400 }
        );
      }
    }

    // Подготовка данных для обновления
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (login !== undefined) updateData.login = login;
    if (license_number !== undefined) updateData.license_number = license_number;
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
    const driver = await prisma.$transaction(async (tx) => {
      // Обновляем основную информацию
      const updatedDriver = await (tx as any).driver.update({
        where: { id: BigInt(id) },
        data: updateData
      });

      // Обновляем привязки к машинам
      await (tx as any).driverVehicle.updateMany({
        where: { driver_id: BigInt(id) },
        data: { is_active: false }
      });

      if (vehicleIds.length > 0) {
        for (const vehicleId of vehicleIds) {
          await (tx as any).driverVehicle.upsert({
            where: {
              driver_id_vehicle_id: {
                driver_id: BigInt(id),
                vehicle_id: BigInt(vehicleId)
              }
            },
            create: {
              driver_id: BigInt(id),
              vehicle_id: BigInt(vehicleId),
              is_active: true,
              is_primary: primaryVehicleId ? BigInt(vehicleId) === BigInt(primaryVehicleId) : false
            },
            update: {
              is_active: true,
              is_primary: primaryVehicleId ? BigInt(vehicleId) === BigInt(primaryVehicleId) : false
            }
          });
        }
      }

      // Обновляем привязки к районам
      await (tx as any).driverDistrict.updateMany({
        where: { driver_id: BigInt(id) },
        data: { is_active: false }
      });

      if (districtIds.length > 0) {
        for (const districtId of districtIds) {
          await (tx as any).driverDistrict.upsert({
            where: {
              driver_id_district_id: {
                driver_id: BigInt(id),
                district_id: BigInt(districtId)
              }
            },
            create: {
              driver_id: BigInt(id),
              district_id: BigInt(districtId),
              is_active: true
            },
            update: {
              is_active: true
            }
          });
        }
      }

      // Возвращаем обновленного водителя
      return await (tx as any).driver.findUnique({
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
    const serializedDriver = {
      ...driver,
      id: driver.id.toString(),
      vehicles: driver.vehicles.map((dv: any) => ({
        ...dv,
        id: dv.id.toString(),
        driver_id: dv.driver_id.toString(),
        vehicle_id: dv.vehicle_id.toString(),
        vehicle: {
          ...dv.vehicle,
          id: dv.vehicle.id.toString()
        }
      })),
      districts: driver.districts.map((dd: any) => ({
        ...dd,
        id: dd.id.toString(),
        driver_id: dd.driver_id.toString(),
        district_id: dd.district_id.toString(),
        district: {
          ...dd.district,
          id: dd.district.id.toString()
        }
      }))
    };

    return NextResponse.json(serializedDriver);
  } catch (error) {
    console.error('Ошибка обновления водителя:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления водителя' },
      { status: 500 }
    );
  }
}

// DELETE - удалить водителя
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID водителя обязателен' },
        { status: 400 }
      );
    }

    // Проверка существования водителя
    const existingDriver = await (prisma as any).driver.findUnique({
      where: { id: BigInt(id) }
    });

    if (!existingDriver) {
      return NextResponse.json(
        { error: 'Водитель не найден' },
        { status: 404 }
      );
    }

    // Мягкое удаление - деактивация
    await (prisma as any).driver.update({
      where: { id: BigInt(id) },
      data: { is_active: false }
    });

    return NextResponse.json({ message: 'Водитель деактивирован' });
  } catch (error) {
    console.error('Ошибка удаления водителя:', error);
    return NextResponse.json(
      { error: 'Ошибка удаления водителя' },
      { status: 500 }
    );
  }
}