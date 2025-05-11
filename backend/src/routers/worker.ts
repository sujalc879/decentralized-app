import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import jwt from 'jsonwebtoken';
import { workerMiddleware } from "../middleware";
import { TOTAL_DECIMALS, WORKER_JWT_SECRETE } from "../config";
import { getNextTask } from "../db";
import { createSubmissionInput } from "../types";

const TOTAL_SUBMISSIONS = 100;

const prismaClient = new PrismaClient();

const router = Router();


// @ts-ignore
router.post("/payout", workerMiddleware, async (req, res) => {
    // @ts-ignore
    const userId: string = req.userId;
    const worker = await prismaClient.worker.findFirst({
        where: { id: Number(userId) }
    })

    if (!worker) {
        return res.status(403).json({
            Message: "user not found"
        })
    }
    const address = worker.address;

    const txnId = "0x23466456";

    await prismaClient.$transaction(async tx => {
        
        await tx.worker.update({
            where: {
                id: Number(userId)
            },
            data: {
                pending_amount: {
                    decrement: worker.pending_amount
                },
                locked_amount: {
                    increment: worker.pending_amount
                }
            }
        })

        await tx.payouts.create({
            data: {
                user_id: Number(userId),
                amount: worker.pending_amount,
                status: "Processing",
                signature: txnId
            }
        })
    })

    // once this is done, we have to send this transaction to solana blockchain

    res.json({
        message: "Processing Your Payout",
        amount: worker.pending_amount
    })
})

router.get("/balance", workerMiddleware, async (req, res) => {
    // @ts-ignore
    const userId: string = req.userId;

    const worker = await prismaClient.worker.findFirst({
        where: {
            id: Number(userId)
        }
    })

    res.json({
        pendingAmount: worker?.pending_amount,
        lockedAmount: worker?.pending_amount
    });
})

router.post("/submission", workerMiddleware, async (req, res) => {
    // @ts-ignore
    const userId = req.userId;
    const body = req.body;
    const parsedBody = createSubmissionInput.safeParse(body);

    if (parsedBody.success) {
        const task = await getNextTask(Number(userId));
        if (!task || task?.id !== Number(parsedBody.data.taskId)) {
             res.status(411).json({ Message : "Incorret task id"});
        }

        const amount = (Number(task?.amount) / TOTAL_SUBMISSIONS).toString();

        const submission = await prismaClient.$transaction(async tx => {
            const submission = await tx.submission.create({
                data: {
                    option_id: Number(parsedBody.data.selection),
                    worker_id: userId,
                    task_id: Number(parsedBody.data.taskId),
                    amount: Number(amount)
                }
            })

            await tx.worker.update({
                where: {
                    id: userId
                },
                data: {
                    pending_amount: {
                        increment: Number(amount)
                    }
                }
            })

            return submission;

        })


        const nextTask = await getNextTask(Number(userId));
        res.json({
            nextTask,
            amount
        })
    } else {
        
    }
})

router.get("/nextTask", workerMiddleware, async (req, res) => {
    // @ts-ignore
    const userId:string = req.userId;

    const task = await getNextTask(Number(userId));

    if (!task) {
        res.status(411).json({
            message: "No more tasks left for you"
        })
    } else {
        res.json({
            task
        })
    }
})

router.post("/signin", async(req, res) => {
 // Todo: add sign verification logic here
    const hardCodedWalletAddress = "EPfF4UJKr5hiyzfPnKjHfyGWwZYunj6UbtQH4vuzYWNJa"

    const existingUser = await prismaClient.worker.findFirst({
        where: {
            address: hardCodedWalletAddress
        }
    })

    if (existingUser) {
        const token = jwt.sign({
            userId: existingUser.id
        }, WORKER_JWT_SECRETE);
        res.json({
            token
        })
    } else {
        const user = await prismaClient.worker.create({
            data: {
                address: hardCodedWalletAddress,
                pending_amount: 0,
                locked_amount: 0
            }
        })
        
        const token = jwt.sign({
            userId: user.id
        }, WORKER_JWT_SECRETE);

        res.json({
            token
        })
    }
})

export default router;