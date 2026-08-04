-- CreateTable
CREATE TABLE "user_llm_config" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "apiKeyEnc" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_llm_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_llm_config_userId_key" ON "user_llm_config"("userId");

-- AddForeignKey
ALTER TABLE "user_llm_config" ADD CONSTRAINT "user_llm_config_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
