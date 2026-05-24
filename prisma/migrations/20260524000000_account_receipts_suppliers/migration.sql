-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN "nit" TEXT;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "customerName" TEXT,
ADD COLUMN "customerDocument" TEXT,
ADD COLUMN "customerPhone" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_nit_key" ON "Supplier"("nit");
