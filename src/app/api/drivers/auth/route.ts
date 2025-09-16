import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../../generated/prisma';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Аутентификация водителя по PIN-коду
export async function POST(request: NextRequest) {
  try {
    const { pin_code } = await request.json();
    
    if (!pin_code) {
      return NextResponse.json(
        { error: 'PIN-код обязателен' },
        { status: 400 }
      );
    }
    
    // Ищем водителя по PIN-коду
    const driver = await prisma.driver.findFirst({
      where: {
        pin_code,
        is_active: true
      },
      include: {
        driver_districts: {
          where: { is_active: true },
          include: {
            district: true
          }
        },
        driver_vehicles: {
          where: { is_active: true },
          include: {
            vehicle: true
          }
        }
      }
    });
    
    if (!driver) {
      return NextResponse.json(
        { error: 'Неверный PIN-код или водитель неактивен' },
        { status: 401 }
      );
    }
    
    // Обновляем статус водителя на "online"
    await prisma.driver.update({
      where: { id: driver.id },
      data: { 
        status: 'online',
        updated_at: new Date()
      }
    });
    
    // Создаем JWT токен
    const token = jwt.sign(
      { 
        driverId: driver.id.toString(),
        name: driver.name,
        login: driver.login
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Подготавливаем данные водителя
    const driverData = {
      id: driver.id.toString(),
      name: driver.name,
      phone: driver.phone,
      login: driver.login,
      license_number: driver.license_number,
      status: 'online',
      districts: driver.driver_districts.map((dd: any) => ({
        id: dd.district.id.toString(),
        name: dd.district.name,
        description: dd.district.description
      })),
      vehicles: driver.driver_vehicles.map((dv: any) => ({
        id: dv.vehicle.id.toString(),
        name: dv.vehicle.name,
        brand: dv.vehicle.brand,
        license_plate: dv.vehicle.license_plate,
        capacity: dv.vehicle.capacity,
        is_primary: dv.is_primary,
        is_active: dv.vehicle.is_active
      }))
    };
    
    console.log(`🚗 Водитель ${driver.name} (ID: ${driver.id}) вошел в систему`);
    
    return NextResponse.json({
      success: true,
      token,
      driver: driverData,
      message: `Добро пожаловать, ${driver.name}!`
    });
    
  } catch (error) {
    console.error('❌ Ошибка аутентификации водителя:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера при аутентификации' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Проверка токена водителя
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
        where: { id: BigInt(decoded.driverId) },
        include: {
          driver_districts: {
            where: { is_active: true },
            include: {
              district: true
            }
          },
          driver_vehicles: {
            where: { is_active: true },
            include: {
              vehicle: true
            }
          }
        }
      });

      if (!driver) {
        return NextResponse.json(
          { error: 'Водитель не найден' },
          { status: 404 }
        );
      }

      const driverData = {
        id: driver.id.toString(),
        name: driver.name,
        phone: driver.phone,
        login: driver.login,
        license_number: driver.license_number,
        status: driver.status,
        districts: driver.driver_districts.map((dd: any) => ({
          id: dd.district.id.toString(),
          name: dd.district.name,
          description: dd.district.description
        })),
        vehicles: driver.driver_vehicles.map((dv: any) => ({
          id: dv.vehicle.id.toString(),
          name: dv.vehicle.name,
          brand: dv.vehicle.brand,
          license_plate: dv.vehicle.license_plate,
          capacity: dv.vehicle.capacity,
          is_primary: dv.is_primary,
          is_active: dv.vehicle.is_active
        }))
      };

      return NextResponse.json({
        success: true,
        driver: driverData
      });

    } catch (jwtError) {
      return NextResponse.json(
        { error: 'Недействительный токен' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('❌ Ошибка проверки токена:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Выход водителя из системы
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Токен не предоставлен' },
        { status: 401 }
      );
    }
    
    // Декодируем токен
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const driverId = BigInt(decoded.driverId);
    
    // Обновляем статус водителя на "offline"
    await prisma.driver.update({
      where: { id: driverId },
      data: { 
        status: 'offline',
        updated_at: new Date()
      }
    });
    
    console.log(`🚗 Водитель ID: ${driverId} вышел из системы`);
    
    return NextResponse.json({
      success: true,
      message: 'Вы успешно вышли из системы'
    });
    
  } catch (error) {
    console.error('❌ Ошибка выхода водителя:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера при выходе' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
