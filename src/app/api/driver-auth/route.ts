import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../generated/prisma';
// Убираем bcrypt, так как пин-коды не хешируем
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// JWT секрет для водителей (отдельный от курьеров)
const JWT_SECRET = process.env.DRIVER_JWT_SECRET || 'driver-secret-key-2025';
const JWT_REFRESH_SECRET = process.env.DRIVER_JWT_REFRESH_SECRET || 'driver-refresh-secret-key-2025';

// POST - авторизация водителя
export async function POST(request: NextRequest) {
  try {
    const { login, pin_code } = await request.json();

    // Валидация входных данных
    if (!login || !pin_code) {
      return NextResponse.json(
        { error: 'Логин и пин-код обязательны' },
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

    // Поиск водителя по логину
    const driver = await (prisma as any).driver.findUnique({
      where: { 
        login,
        is_active: true 
      },
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
        }
      }
    });

    if (!driver) {
      return NextResponse.json(
        { error: 'Неверный логин или пин-код' },
        { status: 401 }
      );
    }

    // Проверка пин-кода (простое сравнение)
    if (driver.pin_code !== pin_code) {
      return NextResponse.json(
        { error: 'Неверный логин или пин-код' },
        { status: 401 }
      );
    }

    // Создание JWT токенов
    const accessToken = jwt.sign(
      {
        driverId: driver.id.toString(),
        login: driver.login,
        name: driver.name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      {
        driverId: driver.id.toString(),
        login: driver.login
      },
      JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );

    // Подготовка данных водителя для ответа (без пароля)
    const driverData = {
      id: driver.id.toString(),
      name: driver.name,
      login: driver.login,
      phone: driver.phone,
      license_number: driver.license_number,
      vehicles: driver.vehicles.map((dv: any) => ({
        id: dv.vehicle.id.toString(),
        name: dv.vehicle.name,
        brand: dv.vehicle.brand,
        license_plate: dv.vehicle.license_plate,
        capacity: dv.vehicle.capacity,
        is_primary: dv.is_primary
      })),
      districts: driver.districts.map((dd: any) => ({ 
        id: dd.district.id.toString(),
        name: dd.district.name,
        description: dd.district.description
      }))
    };

    // Устанавливаем refresh токен в httpOnly cookie
    const response = NextResponse.json({
      success: true,
      accessToken,
      driver: driverData
    });

    response.cookies.set('driverRefreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 // 30 дней
    });

    return response;

  } catch (error) {
    console.error('Ошибка авторизации водителя:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// PUT - обновление токена доступа
export async function PUT(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('driverRefreshToken')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh токен не найден' },
        { status: 401 }
      );
    }

    // Верификация refresh токена
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;

    // Проверка, что водитель все еще активен
    const driver = await (prisma as any).driver.findUnique({
      where: { 
        id: BigInt(decoded.driverId),
        is_active: true 
      },
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
        }
      }
    });

    if (!driver) {
      return NextResponse.json(
        { error: 'Водитель не найден или деактивирован' },
        { status: 401 }
      );
    }

    // Создание нового access токена
    const accessToken = jwt.sign(
      {
        driverId: driver.id.toString(),
        login: driver.login,
        name: driver.name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Подготовка данных водителя
    const driverData = {
      id: driver.id.toString(),
      name: driver.name,
      login: driver.login,
      phone: driver.phone,
      license_number: driver.license_number,
      vehicles: driver.vehicles.map((dv: any) => ({
        id: dv.vehicle.id.toString(),
        name: dv.vehicle.name,
        brand: dv.vehicle.brand,
        license_plate: dv.vehicle.license_plate,
        capacity: dv.vehicle.capacity,
        is_primary: dv.is_primary
      })),
      districts: driver.districts.map((dd: any) => ({
        id: dd.district.id.toString(),
        name: dd.district.name,
        description: dd.district.description
      }))
    };

    return NextResponse.json({
      success: true,
      accessToken,
      driver: driverData
    });

  } catch (error) {
    console.error('Ошибка обновления токена водителя:', error);
    return NextResponse.json(
      { error: 'Невалидный refresh токен' },
      { status: 401 }
    );
  }
}

// DELETE - выход водителя
export async function DELETE(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true, message: 'Выход выполнен' });
    
    // Удаляем refresh токен из cookies
    response.cookies.set('driverRefreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0
    });

    return response;

  } catch (error) {
    console.error('Ошибка выхода водителя:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}