CREATE TYPE "ContributionStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL,
    "receipt" TEXT NOT NULL,
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "donorName" TEXT,
    "donorEmail" TEXT,
    "message" TEXT,
    "status" "ContributionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Contribution_receipt_key" ON "Contribution"("receipt");
CREATE UNIQUE INDEX "Contribution_razorpayOrderId_key" ON "Contribution"("razorpayOrderId");
CREATE UNIQUE INDEX "Contribution_razorpayPaymentId_key" ON "Contribution"("razorpayPaymentId");
CREATE INDEX "Contribution_status_createdAt_idx" ON "Contribution"("status", "createdAt");