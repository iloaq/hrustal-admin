import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../../generated/prisma';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: NextRequest) {
  try {
    const { login, pin_code } = await request.json();

    if (!login || !pin_code) {
      return NextResponse.json(
        { error: 'Необходимы login и pin_code' },
        { status: 400 }
      );
    }

    // Находим водителя
    const driver = await prisma.driver.findUnique({
      where: { 
        login,
        is_active: true
      },
      include: {
        driver_vehicles: {
          where: { is_active: true, is_primary: true },
          include: { vehicle: true }
        },
        driver_districts: {
          where: { is_active: true },
          include: { district: true }
        }
      }
    });

    if (!driver) {
      return NextResponse.json(
        { error: 'Водитель не найден' },
        { status: 404 }
      );
    }

    // Проверяем PIN-код
    if (driver.pin_code !== pin_code) {
      return NextResponse.json(
        { error: 'Неверный PIN-код' },
        { status: 401 }
      );
    }

    // Обновляем статус водителя на "online"
    await prisma.driver.update({
      where: { id: driver.id },
      data: { status: 'online' }
    });

    // Создаем JWT токен
    const token = jwt.sign(
      { 
        driver_id: driver.id.toString(),
        login: driver.login,
        name: driver.name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return NextResponse.json({
      success: true,
      token,
      driver: {
        id: driver.id.toString(),
        name: driver.name,
        phone: driver.phone,
        login: driver.login,
        status: 'online',
        vehicle: driver.driver_vehicles[0]?.vehicle || null,
        districts: driver.driver_districts.map((dd: any) => dd.district.name)
      }
    });

  } catch (error) {
    console.error('Ошибка аутентификации водителя:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Токен не предоставлен' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      const driver = await prisma.driver.findUnique({
        where: { id: BigInt(decoded.driver_id) },
        include: {
          driver_vehicles: {
            where: { is_active: true, is_primary: true },
            include: { vehicle: true }
          },
          driver_districts: {
            where: { is_active: true },
            include: { district: true }
          }
        }
      });

      if (!driver) {
        return NextResponse.json(
          { error: 'Водитель не найден' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        driver: {
          id: driver.id.toString(),
          name: driver.name,
          phone: driver.phone,
          login: driver.login,
          status: driver.status,
          vehicle: driver.driver_vehicles[0]?.vehicle || null,
          districts: driver.driver_districts.map((dd: any) => dd.district.name)
        }
      });

    } catch (jwtError) {
      return NextResponse.json(
        { error: 'Недействительный токен' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Ошибка проверки токена:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
