-- 文献生词同步：待取队列（全局单租户，不带 userId）
-- wordKey 唯一：同一个词在被手机 ack 之前再推一次是「合并」而不是新增
CREATE TABLE "sync_word" (
    "id" TEXT NOT NULL,
    "wordKey" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "meaning" TEXT NOT NULL DEFAULT '',
    "phonetic" TEXT NOT NULL DEFAULT '',
    "example" TEXT NOT NULL DEFAULT '',
    "phrases" TEXT NOT NULL DEFAULT '',
    "sourceRef" TEXT NOT NULL DEFAULT '',
    "contextSentence" TEXT NOT NULL DEFAULT '',
    "bookName" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_word_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sync_word_wordKey_key" ON "sync_word"("wordKey");
CREATE INDEX "sync_word_createdAt_idx" ON "sync_word"("createdAt");
