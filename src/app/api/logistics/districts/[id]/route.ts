import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const districtId = params.id;
    const body = await request.json();

    const { name, description, is_active } = body;

    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;

    const updatedDistrict = await prisma.district.update({
      where: { id: BigInt(districtId) },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      district: {
        id: updatedDistrict.id.toString(),
        name: updatedDistrict.name,
        description: updatedDistrict.description || '',
        is_active: updatedDistrict.is_active
      },
      message: 'Район успешно обновлен'
    });

  } catch (error) {
    console.error('Ошибка обновления района:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}