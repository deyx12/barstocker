import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import {
  MovementType,
  PrismaClient,
  ProductStatus,
  Role,
  SaleStatus,
  Status,
} from "../lib/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://johndoe:randompassword@localhost:5432/mydb?schema=public",
});
const prisma = new PrismaClient({ adapter });

const demoPassword = "BarStocker123!";

async function ensureSupabaseUser(
  email: string,
  name: string,
  fallbackId: string,
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return fallbackId;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: listedUsers, error: listError } =
    await supabase.auth.admin.listUsers();

  if (listError) {
    console.warn(`No se pudo consultar Supabase Auth: ${listError.message}`);
    return fallbackId;
  }

  const existing = listedUsers.users.find((user) => user.email === email);
  if (existing) {
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: demoPassword,
    email_confirm: true,
    user_metadata: { name },
  });

  if (error || !data.user) {
    console.warn(`No se pudo crear ${email} en Supabase Auth: ${error?.message}`);
    return fallbackId;
  }

  return data.user.id;
}

async function main() {
  const adminAuthId = await ensureSupabaseUser(
    "admin@barstocker.com",
    "Administrador BarStocker",
    "11111111-1111-1111-1111-111111111111",
  );
  const sellerAuthId = await ensureSupabaseUser(
    "vendedor@barstocker.com",
    "Vendedor Barra",
    "22222222-2222-2222-2222-222222222222",
  );

  const admin = await prisma.userProfile.upsert({
    where: { email: "admin@barstocker.com" },
    update: {
      authUserId: adminAuthId,
      name: "Administrador BarStocker",
      role: Role.ADMIN,
      status: Status.ACTIVE,
    },
    create: {
      authUserId: adminAuthId,
      name: "Administrador BarStocker",
      email: "admin@barstocker.com",
      role: Role.ADMIN,
      status: Status.ACTIVE,
    },
  });

  const seller = await prisma.userProfile.upsert({
    where: { email: "vendedor@barstocker.com" },
    update: {
      authUserId: sellerAuthId,
      name: "Vendedor Barra",
      role: Role.VENDEDOR,
      status: Status.ACTIVE,
    },
    create: {
      authUserId: sellerAuthId,
      name: "Vendedor Barra",
      email: "vendedor@barstocker.com",
      role: Role.VENDEDOR,
      status: Status.ACTIVE,
    },
  });

  const suppliers = await Promise.all(
    [
      {
        name: "Distribuidora Andes",
        phone: "3105550181",
        email: "ventas@andesbebidas.com",
        address: "Carrera 45 # 18-20, Bogota",
      },
      {
        name: "Licores La Cava",
        phone: "3115550192",
        email: "contacto@lacava.com",
        address: "Calle 72 # 11-45, Bogota",
      },
      {
        name: "Insumos Mixologia Pro",
        phone: "3125550103",
        email: "hola@mixologiapro.com",
        address: "Avenida Suba # 95-30, Bogota",
      },
    ].map((supplier) =>
      prisma.supplier.upsert({
        where: { email: supplier.email },
        update: { ...supplier, status: Status.ACTIVE },
        create: { ...supplier, status: Status.ACTIVE },
      }),
    ),
  );

  const [andes, cava, mixologia] = suppliers;
  const productSeed = [
    {
      code: "RON-001",
      name: "Ron Añejo 750 ml",
      category: "Licores",
      description: "Ron premium para cocteles clasicos.",
      price: 82000,
      stock: 18,
      minStock: 6,
      status: ProductStatus.AVAILABLE,
      supplierId: cava.id,
    },
    {
      code: "GIN-001",
      name: "Ginebra London Dry 750 ml",
      category: "Licores",
      description: "Base para gin tonic y cocteles secos.",
      price: 96000,
      stock: 10,
      minStock: 5,
      status: ProductStatus.AVAILABLE,
      supplierId: cava.id,
    },
    {
      code: "TEQ-001",
      name: "Tequila Blanco 750 ml",
      category: "Licores",
      description: "Tequila para margaritas y shots.",
      price: 88000,
      stock: 3,
      minStock: 5,
      status: ProductStatus.LOW_STOCK,
      supplierId: cava.id,
    },
    {
      code: "VOD-001",
      name: "Vodka Premium 750 ml",
      category: "Licores",
      description: "Vodka para cocteles y servicio por botella.",
      price: 76000,
      stock: 14,
      minStock: 6,
      status: ProductStatus.AVAILABLE,
      supplierId: andes.id,
    },
    {
      code: "CER-001",
      name: "Cerveza Lager 330 ml",
      category: "Cervezas",
      description: "Cerveza nacional en botella.",
      price: 7000,
      stock: 56,
      minStock: 24,
      status: ProductStatus.AVAILABLE,
      supplierId: andes.id,
    },
    {
      code: "TON-001",
      name: "Agua Tonica 300 ml",
      category: "Mezcladores",
      description: "Mezclador carbonatado para gin tonic.",
      price: 4500,
      stock: 0,
      minStock: 12,
      status: ProductStatus.OUT_OF_STOCK,
      supplierId: mixologia.id,
    },
    {
      code: "LIM-001",
      name: "Zumo de Limon 1 L",
      category: "Insumos",
      description: "Insumo fresco para cocteleria.",
      price: 12000,
      stock: 6,
      minStock: 8,
      status: ProductStatus.LOW_STOCK,
      supplierId: mixologia.id,
    },
    {
      code: "HIE-001",
      name: "Bolsa de Hielo 5 kg",
      category: "Insumos",
      description: "Hielo para servicio de barra.",
      price: 9000,
      stock: 22,
      minStock: 10,
      status: ProductStatus.AVAILABLE,
      supplierId: mixologia.id,
    },
  ];

  const products = await Promise.all(
    productSeed.map((product) =>
      prisma.product.upsert({
        where: { code: product.code },
        update: product,
        create: product,
      }),
    ),
  );

  const productByCode = new Map(products.map((product) => [product.code, product]));
  const sampleSales = [
    {
      saleNumber: "VENTA-DEMO-001",
      userId: seller.id,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
      items: [
        { code: "CER-001", quantity: 6 },
        { code: "RON-001", quantity: 1 },
      ],
    },
    {
      saleNumber: "VENTA-DEMO-002",
      userId: admin.id,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26),
      items: [
        { code: "GIN-001", quantity: 1 },
        { code: "LIM-001", quantity: 2 },
      ],
    },
  ];

  for (const sampleSale of sampleSales) {
    const exists = await prisma.sale.findUnique({
      where: { saleNumber: sampleSale.saleNumber },
    });

    if (exists) continue;

    const lines = sampleSale.items.map((item) => {
      const product = productByCode.get(item.code);

      if (!product) {
        throw new Error(`Producto de seed no encontrado: ${item.code}`);
      }

      return {
        product,
        quantity: item.quantity,
        unitPrice: Number(product.price),
        subtotal: Number(product.price) * item.quantity,
      };
    });
    const total = lines.reduce((sum, line) => sum + line.subtotal, 0);

    await prisma.sale.create({
      data: {
        saleNumber: sampleSale.saleNumber,
        userId: sampleSale.userId,
        total,
        status: SaleStatus.COMPLETED,
        createdAt: sampleSale.createdAt,
        details: {
          create: lines.map((line) => ({
            productId: line.product.id,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            subtotal: line.subtotal,
          })),
        },
      },
    });

    for (const line of lines) {
      await prisma.inventoryMovement.create({
        data: {
          productId: line.product.id,
          type: MovementType.SALE_ADJUSTMENT,
          quantity: line.quantity,
          previousStock: line.product.stock + line.quantity,
          newStock: line.product.stock,
          reason: `Venta ${sampleSale.saleNumber}`,
          createdAt: sampleSale.createdAt,
        },
      });
    }
  }

  await prisma.$disconnect();
  console.log("Seed completado para BarStocker Web.");
  console.log(`Admin: admin@barstocker.com / ${demoPassword}`);
  console.log(`Vendedor: vendedor@barstocker.com / ${demoPassword}`);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
