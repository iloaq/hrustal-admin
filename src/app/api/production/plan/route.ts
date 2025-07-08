import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
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
    // Собираем все продукты из заявок с разбивкой по времени доставки
    const productMap: Record<string, { 
      name: string; 
      quantity: number; 
      productId?: string;
      morning: number;
      day: number;
      evening: number;
    }> = {};
    
    leads.forEach((lead: any) => {
      const products = lead.products ? Object.values(lead.products) : [];
      const deliveryTime = lead.delivery_time || '';
      
      products.forEach((product: any) => {
        // Исключаем "Тара 19л" из производства
        if (product.name === 'Тара 19л') {
          return;
        }
        
        if (!productMap[product.name]) {
          productMap[product.name] = { 
            name: product.name, 
            quantity: 0, 
            productId: product.productId,
            morning: 0,
            day: 0,
            evening: 0
          };
        }
        const quantity = Number(product.quantity) || 0;
        productMap[product.name].quantity += quantity;
        
        // Распределяем по времени доставки
        if (deliveryTime.includes('Утро') || deliveryTime.includes('утро')) {
          productMap[product.name].morning += quantity;
        } else if (deliveryTime.includes('День') || deliveryTime.includes('день')) {
          productMap[product.name].day += quantity;
        } else if (deliveryTime.includes('Вечер') || deliveryTime.includes('вечер')) {
          productMap[product.name].evening += quantity;
        }
      });
    });
    
    // Получаем производственные заказы на эту дату
    const prodOrders = await prisma.productionOrder.findMany({
      where: { 
        production_date: {
          gte: deliveryDate,
          lt: nextDay
        }
      },
      include: { product: true }
    });
    
    // Автоматически создаем заказы для продуктов, которых нет в справочнике
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

      // Создаем отдельные заказы для каждого времени доставки
      if (data.morning > 0) {
        const existingOrder = prodOrders.find((o: any) => o.product.name === productName && o.notes === 'Утро');
        if (!existingOrder) {
          const order = await prisma.productionOrder.create({
            data: {
              lead_id: leads[0]?.lead_id || BigInt(0),
              product_id: product.id,
              quantity: data.morning,
              status: 'pending',
              priority: 'normal',
              production_date: deliveryDate,
              delivery_date: deliveryDate,
              notes: 'Утро'
            }
          });
          createdOrders.push(order);
        }
      }

      if (data.day > 0) {
        const existingOrder = prodOrders.find((o: any) => o.product.name === productName && o.notes === 'День');
        if (!existingOrder) {
          const order = await prisma.productionOrder.create({
            data: {
              lead_id: leads[0]?.lead_id || BigInt(0),
              product_id: product.id,
              quantity: data.day,
              status: 'pending',
              priority: 'normal',
              production_date: deliveryDate,
              delivery_date: deliveryDate,
              notes: 'День'
            }
          });
          createdOrders.push(order);
        }
      }

      if (data.evening > 0) {
        const existingOrder = prodOrders.find((o: any) => o.product.name === productName && o.notes === 'Вечер');
        if (!existingOrder) {
          const order = await prisma.productionOrder.create({
            data: {
              lead_id: leads[0]?.lead_id || BigInt(0),
              product_id: product.id,
              quantity: data.evening,
              status: 'pending',
              priority: 'normal',
              production_date: deliveryDate,
              delivery_date: deliveryDate,
              notes: 'Вечер'
            }
          });
          createdOrders.push(order);
        }
      }
    }
    
    // Обновляем список заказов, если были созданы новые
    let updatedProdOrders = prodOrders;
    if (createdOrders.length > 0) {
      updatedProdOrders = await prisma.productionOrder.findMany({
        where: { 
          production_date: {
            gte: deliveryDate,
            lt: nextDay
          }
        },
        include: { product: true }
      });
    }
    
    // Формируем итоговый массив с разбивкой по времени
    const result: any[] = [];
    
    // Создаем отдельные записи для каждого времени доставки
    Object.values(productMap).forEach((prod: any) => {
      // Если есть заказы на утро
      if (prod.morning > 0) {
        const morningOrder = updatedProdOrders.find((o: any) => o.product.name === prod.name && o.notes === 'Утро');
        result.push({
          productName: prod.name,
          quantity: prod.morning,
          timeSlot: 'Утро',
          totalQuantity: prod.quantity,
          morning: prod.morning,
          day: prod.day,
          evening: prod.evening,
          productId: morningOrder?.product_id?.toString() || prod.productId || null,
          status: morningOrder?.status || 'pending',
          productionOrderId: morningOrder?.id?.toString() || null
        });
      }
      
      // Если есть заказы на день
      if (prod.day > 0) {
        const dayOrder = updatedProdOrders.find((o: any) => o.product.name === prod.name && o.notes === 'День');
        result.push({
          productName: prod.name,
          quantity: prod.day,
          timeSlot: 'День',
          totalQuantity: prod.quantity,
          morning: prod.morning,
          day: prod.day,
          evening: prod.evening,
          productId: dayOrder?.product_id?.toString() || prod.productId || null,
          status: dayOrder?.status || 'pending',
          productionOrderId: dayOrder?.id?.toString() || null
        });
      }
      
      // Если есть заказы на вечер
      if (prod.evening > 0) {
        const eveningOrder = updatedProdOrders.find((o: any) => o.product.name === prod.name && o.notes === 'Вечер');
        result.push({
          productName: prod.name,
          quantity: prod.evening,
          timeSlot: 'Вечер',
          totalQuantity: prod.quantity,
          morning: prod.morning,
          day: prod.day,
          evening: prod.evening,
          productId: eveningOrder?.product_id?.toString() || prod.productId || null,
          status: eveningOrder?.status || 'pending',
          productionOrderId: eveningOrder?.id?.toString() || null
        });
      }
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching production plan:', error);
    return NextResponse.json({ error: 'Ошибка получения плана производства' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { productionOrderId, status } = await request.json();
    
    if (!productionOrderId) {
      return NextResponse.json({ error: 'Не передан productionOrderId' }, { status: 400 });
    }
    
    const updateData: any = { status };
    if (status === 'completed') {
      updateData.completed_at = new Date();
    }
    
    const updated = await prisma.productionOrder.update({
      where: { id: BigInt(productionOrderId) },
      data: updateData
    });
    
    // Преобразуем BigInt в обычные числа для JSON
    const serializedUpdated = {
      ...updated,
      id: Number(updated.id),
      lead_id: Number(updated.lead_id),
      product_id: Number(updated.product_id)
    };
    
    return NextResponse.json({ success: true, updated: serializedUpdated });
  } catch (error) {
    console.error('Error updating production order:', error);
    return NextResponse.json({ error: 'Ошибка обновления статуса' }, { status: 500 });
  }
} 