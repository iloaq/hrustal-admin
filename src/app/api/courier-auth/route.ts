import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../generated/prisma';
// Убираем bcrypt, так как пин-коды не хешируем
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// JWT секрет (в реальном проекте должен быть в переменных окружения)
const JWT_SECRET = process.env.JWT_SECRET || 'courier-secret-key-2025';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'courier-refresh-secret-key-2025';

// POST - авторизация курьера
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

    // Поиск курьера по логину
    const courier = await prisma.courier.findUnique({
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

    if (!courier) {
      return NextResponse.json(
        { error: 'Неверный логин или пин-код' },
        { status: 401 }
      );
    }

    // Проверка пин-кода (простое сравнение)
    if (courier.pin_code !== pin_code) {
      return NextResponse.json(
        { error: 'Неверный логин или пин-код' },
        { status: 401 }
      );
    }

    // Создание JWT токенов
    const accessToken = jwt.sign(
      {
        courierId: courier.id.toString(),
        login: courier.login,
        name: courier.name
      },
      JWT_SECRET,
      { expiresIn: '24h' } // Токен доступа на 24 часа
    );

    const refreshToken = jwt.sign(
      {
        courierId: courier.id.toString(),
        login: courier.login
      },
      JWT_REFRESH_SECRET,
      { expiresIn: '30d' } // Refresh токен на 30 дней
    );

    // Подготовка данных курьера для ответа (без пароля)
    const courierData = {
      id: courier.id.toString(),
      name: courier.name,
      login: courier.login,
      phone: courier.phone,
      vehicles: courier.vehicles.map(cv => ({
        id: cv.vehicle.id.toString(),
        name: cv.vehicle.name,
        brand: cv.vehicle.brand,
        license_plate: cv.vehicle.license_plate,
        capacity: cv.vehicle.capacity
      })),
      districts: courier.districts.map(cd => ({
        id: cd.district.id.toString(),
        name: cd.district.name,
        description: cd.district.description
      }))
    };

    // Устанавливаем refresh токен в httpOnly cookie
    const response = NextResponse.json({
      success: true,
      accessToken,
      courier: courierData
    });

    response.cookies.set('courierRefreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 // 30 дней
    });

    return response;

  } catch (error) {
    console.error('Ошибка авторизации курьера:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// PUT - обновление токена доступа
export async function PUT(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('courierRefreshToken')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh токен не найден' },
        { status: 401 }
      );
    }

    // Верификация refresh токена
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;

    // Проверка, что курьер все еще активен
    const courier = await prisma.courier.findUnique({
      where: { 
        id: BigInt(decoded.courierId),
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

    if (!courier) {
      return NextResponse.json(
        { error: 'Курьер не найден или деактивирован' },
        { status: 401 }
      );
    }

    // Создание нового access токена
    const accessToken = jwt.sign(
      {
        courierId: courier.id.toString(),
        login: courier.login,
        name: courier.name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Подготовка данных курьера
    const courierData = {
      id: courier.id.toString(),
      name: courier.name,
      login: courier.login,
      phone: courier.phone,
      vehicles: courier.vehicles.map(cv => ({
        id: cv.vehicle.id.toString(),
        name: cv.vehicle.name,
        brand: cv.vehicle.brand,
        license_plate: cv.vehicle.license_plate,
        capacity: cv.vehicle.capacity
      })),
      districts: courier.districts.map(cd => ({
        id: cd.district.id.toString(),
        name: cd.district.name,
        description: cd.district.description
      }))
    };

    return NextResponse.json({
      success: true,
      accessToken,
      courier: courierData
    });

  } catch (error) {
    console.error('Ошибка обновления токена:', error);
    return NextResponse.json(
      { error: 'Невалидный refresh токен' },
      { status: 401 }
    );
  }
}

// DELETE - выход курьера
export async function DELETE(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true, message: 'Выход выполнен' });
    
    // Удаляем refresh токен из cookies
    response.cookies.set('courierRefreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0
    });

    return response;

  } catch (error) {
    console.error('Ошибка выхода курьера:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}