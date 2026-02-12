/*
  Warnings:

  - You are about to drop the column `acidityBasicity` on the `reaction_pattern` table. All the data in the column will be lost.
  - You are about to drop the column `concentration` on the `reaction_pattern` table. All the data in the column will be lost.
  - You are about to drop the column `duration` on the `reaction_pattern` table. All the data in the column will be lost.
  - You are about to drop the column `hydro` on the `reaction_pattern` table. All the data in the column will be lost.
  - You are about to drop the column `microwave` on the `reaction_pattern` table. All the data in the column will be lost.
  - You are about to drop the column `pressure` on the `reaction_pattern` table. All the data in the column will be lost.
  - You are about to drop the column `solvent` on the `reaction_pattern` table. All the data in the column will be lost.
  - You are about to drop the column `temperature` on the `reaction_pattern` table. All the data in the column will be lost.
  - Added the required column `acidityBasicity` to the `reaction_section` table without a default value. This is not possible if the table is not empty.
  - Added the required column `concentration` to the `reaction_section` table without a default value. This is not possible if the table is not empty.
  - Added the required column `duration` to the `reaction_section` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hydro` to the `reaction_section` table without a default value. This is not possible if the table is not empty.
  - Added the required column `microwave` to the `reaction_section` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pressure` to the `reaction_section` table without a default value. This is not possible if the table is not empty.
  - Added the required column `solvent` to the `reaction_section` table without a default value. This is not possible if the table is not empty.
  - Added the required column `temperature` to the `reaction_section` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "reaction_pattern" DROP COLUMN "acidityBasicity",
DROP COLUMN "concentration",
DROP COLUMN "duration",
DROP COLUMN "hydro",
DROP COLUMN "microwave",
DROP COLUMN "pressure",
DROP COLUMN "solvent",
DROP COLUMN "temperature";

-- AlterTable
ALTER TABLE "reaction_section" ADD COLUMN     "acidityBasicity" TEXT NOT NULL,
ADD COLUMN     "concentration" TEXT NOT NULL,
ADD COLUMN     "duration" TEXT NOT NULL,
ADD COLUMN     "hydro" TEXT NOT NULL,
ADD COLUMN     "microwave" TEXT NOT NULL,
ADD COLUMN     "pressure" TEXT NOT NULL,
ADD COLUMN     "solvent" TEXT NOT NULL,
ADD COLUMN     "temperature" TEXT NOT NULL;
