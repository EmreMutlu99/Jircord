-- CreateTable
CREATE TABLE "public"."Message" (
    "id" SERIAL NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);
