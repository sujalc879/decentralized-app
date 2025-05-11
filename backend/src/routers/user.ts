import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import jwt from 'jsonwebtoken'
import { JWT_SECRETE, TOTAL_DECIMALS } from "../config";
import { authMiddleware } from "../middleware";
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { createTaskInput } from "../types";
import { number, string } from "zod";

const DEFAULT_TITLE = "select the most performing thumbnail";

// const s3Client = new S3Client({
//     credentials: {
//         accessKeyId: "",
//         secretAccessKey: ""
//     },
//     region : "ap-south-1"
// })

const router = Router();

const prismaClient = new PrismaClient();

// @ts-ignore
router.get("/task", authMiddleware, async (req, res) => {
    // @ts-ignore
    const taskId: string = req.query.taskId;
    // @ts-ignore
    const userId: string = req.userId;

    const taskDetails = await prismaClient.task.findFirst({
        where: {
            user_id: Number(userId),
            id: Number(taskId)
        },
        include: {
            options: true
        }
    })

    if (!taskDetails) {
        return res.status(411).json({ Message : "you dont Have Access to this task"});
    }

    // todo: can you make this faster ? there are few ways to do it
    const responses = await prismaClient.submission.findMany({
        where: {
            task_id: Number(taskId)
        },
        include: {
            option: true
        }
    });

    const result: Record<string, {
        count: number;
        option: {
            image_Url: string
        }
    }> = {};

    taskDetails.options.forEach(option => {
        result[option.id] = {
                count: 0,
                option: {
                    image_Url: option.image_url
                }
            }
    })


    responses.forEach(r => {
            result[r.option_id].count++;
    });

    res.json({
        result
    })
})

// @ts-ignore
router.post("/task", authMiddleware, async(req, res) => {
    // @ts-ignore
    const userId = req.userId;
    // we have to validate the inputs from the users
    const body = req.body;

    const parseData = createTaskInput.safeParse(body);

    if (!parseData.success) {
        return res.status(411).json({ Message : "You send Us Wrong Inputs"});
    }
    // parse the signature here to ensure the person has paid 50$

    let response = await prismaClient.$transaction(async tx => {
        
       const response = await tx.task.create({
            data: {
                title: parseData.data.title ?? DEFAULT_TITLE,
                amount: 1 * TOTAL_DECIMALS,
                signature: parseData.data.signature,
                user_id: userId
            }
        });

        await tx.option.createMany({
            data: parseData.data.options.map(x => ({
                image_url: x.imageUrl,
                task_id: response.id
            }))
        })

        return response;
    })

    res.json({
        id: response.id
    })

})

router.get("/presignedUrl", authMiddleware, async (req, res) => {
    // @ts-ignore
    const userId = req.userId;

    const { url, fields } = await createPresignedPost(s3Client, {
        Bucket: 'decentralized-app',
        Key: `app/${userId}/${Math.random()}/image.jpg`,
        Conditions: [
          ['content-length-range', 0, 5 * 1024 * 1024] // 5 MB max
        ],
        Expires: 3600
    })

    res.json({
        preSignedUrl: url,
        fields
    })
    
})

// we have to support wallet login, because our service is related to the decentralized apps
router.post("/signin", async(req, res) => {
    // Todo: add sign verification logic here
    const hardCodedWalletAddress = "EPfF4UJKr5hiyzfPnKjHfyGWwZYunj6UbtQH4vuzYWNJ"

    const existingUser = await prismaClient.user.findFirst({
        where: {
            address: hardCodedWalletAddress
        }
    })

    if (existingUser) {
        const token = jwt.sign({
            userId: existingUser.id
        }, JWT_SECRETE);
        res.json({
            token
        })
    } else {
        const user = await prismaClient.user.create({
            data: {
                address: hardCodedWalletAddress,

            }
        })
        
        const token = jwt.sign({
            userId: user.id
        }, JWT_SECRETE);

        res.json({
            token
        })
    }

})

export default router;