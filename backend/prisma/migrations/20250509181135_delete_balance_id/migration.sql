/*
  Warnings:

  - You are about to drop the column `balance_id` on the `Worker` table. All the data in the column will be lost.
  - You are about to drop the column `locked_amoung` on the `Worker` table. All the data in the column will be lost.
  - Added the required column `locked_amount` to the `Worker` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Worker" DROP COLUMN "balance_id",
DROP COLUMN "locked_amoung",
ADD COLUMN     "locked_amount" INTEGER NOT NULL;
