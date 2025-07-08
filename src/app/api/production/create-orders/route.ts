import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { date } = await request.json();
    if (!date) {
      return NextResponse.json({ error: 'Не указана дата' }, { status: 400 });
    }

    // Преобразуем строку даты в объект Date и создаем диапазон для поиска за весь день
    const deliveryDate = new Date(date);
    const nextDay = new Date(deliveryDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // Получаем все заявки на выбранную дату
    const leads = await prisma.lead.findMany({
      where: {
        delivery_date: {
          gte: deliveryDate,
          lt: nextDay
        }
      }
    });

    // Группируем продукты по названию
    const productMap: Record<string, { name: string; quantity: number }> = {};
    leads.forEach(lead => {
      const products = lead.products ? Object.values(lead.products) : [];
      products.forEach((product: any) => {
        if (!productMap[product.name]) {
          productMap[product.name] = { name: product.name, quantity: 0 };
        }
        productMap[product.name].quantity += Number(product.quantity) || 0;
      });
    });

    // Получаем или создаем продукты в справочнике
    const createdOrders = [];
    for (const [productName, data] of Object.entries(productMap)) {
      // Ищем продукт в справочнике
      let product = await prisma.product.findFirst({
        where: { name: productName }
      });

      // Если продукт не найден, создаем его
      if (!product) {
        product = await prisma.product.create({
          data: {
            name: productName,
            type: 'water',
            volume: 19, // По умолчанию 19л
            is_active: true
          }
        });
      }

      // Проверяем, есть ли уже заказ на этот продукт и дату
      const existingOrder = await prisma.productionOrder.findFirst({
        where: {
          product_id: product.id,
          production_date: new Date(date)
        }
      });

      if (!existingOrder) {
        // Создаем новый производственный заказ
        const order = await prisma.productionOrder.create({
          data: {
            lead_id: leads[0].lead_id, // Берем ID первой заявки как пример
            product_id: product.id,
            quantity: data.quantity,
            status: 'pending',
            priority: 'normal',
            production_date: new Date(date),
            delivery_date: new Date(date)
          }
        });
        createdOrders.push(order);
      }
    }

    // Преобразуем BigInt в обычные числа для JSON
    const serializedOrders = createdOrders.map(order => ({
      ...order,
      id: Number(order.id),
      lead_id: Number(order.lead_id),
      product_id: Number(order.product_id)
    }));

    return NextResponse.json({ 
      success: true, 
      message: `Создано ${createdOrders.length} производственных заказов`,
      orders: serializedOrders
    });

  } catch (error) {
    console.error('Error creating production orders:', error);
    return NextResponse.json({ error: 'Ошибка создания заказов' }, { status: 500 });
  }
} 