-- CreateTable
CREATE TABLE "AccountCode" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "regCode" TEXT,
    "resetCode" TEXT,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "AccountCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountCode_userId_key" ON "AccountCode"("userId");
