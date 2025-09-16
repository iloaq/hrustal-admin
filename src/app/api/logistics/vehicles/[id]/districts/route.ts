import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// GET /api/logistics/vehicles/[id]/districts - получить районы машины
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: vehicleId } = await params;
    
    // Получаем все районы машины
    const vehicleDistricts = await prisma.vehicleDistrict.findMany({
      where: { vehicle_id: BigInt(vehicleId) },
      include: {
        district: true
      },
      orderBy: {
        assigned_at: 'desc'
      }
    });
    
    const districts = vehicleDistricts.map((vd: any) => ({
      id: vd.district.id.toString(),
      name: vd.district.name,
      description: vd.district.description,
      assigned_at: vd.assigned_at
    }));
    
    return NextResponse.json({
      success: true,
      districts
    });
    
  } catch (error: any) {
    console.error('Error fetching vehicle districts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicle districts', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/logistics/vehicles/[id]/districts - добавить район к машине
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: vehicleId } = await params;
    const { district_id } = await request.json();
    
    if (!district_id) {
      return NextResponse.json(
        { error: 'district_id обязателен' },
        { status: 400 }
      );
    }
    
    // Проверяем, не привязан ли район уже к этой машине
    const existingAssignment = await prisma.vehicleDistrict.findFirst({
      where: {
        vehicle_id: BigInt(vehicleId),
        district_id: BigInt(district_id),
        is_active: true
      }
    });
    
    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Район уже привязан к этой машине' },
        { status: 400 }
      );
    }
    
    // Создаем привязку
    const vehicleDistrict = await prisma.vehicleDistrict.create({
      data: {
        vehicle_id: BigInt(vehicleId),
        district_id: BigInt(district_id),
        assigned_at: new Date()
      },
      include: {
        district: true
      }
    });
    
    return NextResponse.json({
      success: true,
      district: {
        id: vehicleDistrict.district.id.toString(),
        name: vehicleDistrict.district.name,
        description: vehicleDistrict.district.description,
        assigned_at: vehicleDistrict.assigned_at
      }
    });
    
  } catch (error: any) {
    console.error('Error adding district to vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to add district to vehicle', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/logistics/vehicles/[id]/districts - удалить район из машины
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: vehicleId } = await params;
    const { searchParams } = new URL(request.url);
    const district_id = searchParams.get('district_id');
    
    if (!district_id) {
      return NextResponse.json(
        { error: 'district_id обязателен' },
        { status: 400 }
      );
    }
    
    // Удаляем привязку
    await prisma.vehicleDistrict.deleteMany({
      where: {
        vehicle_id: BigInt(vehicleId),
        district_id: BigInt(district_id)
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Район удален из машины'
    });
    
  } catch (error: any) {
    console.error('Error removing district from vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to remove district from vehicle', details: error.message },
      { status: 500 }
    );
  }
}
