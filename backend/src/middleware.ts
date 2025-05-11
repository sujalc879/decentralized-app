import { Request, Response, NextFunction } from "express";
import { JWT_SECRETE, WORKER_JWT_SECRETE } from "./config";
import jwt from 'jsonwebtoken';


export function authMiddleware(req: Request, res: Response, next: NextFunction): any {
    const authHeader = req.headers["authorization"] ?? "";

    try {
        const decoded = jwt.verify(authHeader, JWT_SECRETE);
        // @ts-ignore
        if (decoded.userId) {
            // @ts-ignore
            req.userId = decoded.userId;
            return next();
        } else {
            return res.status(403).json({ Message : "you are not logged in"});    
        }
    } catch (e) {
        return res.status(403).json({ Message : "you are not logged in"});
    }
}

export function workerMiddleware(req: Request, res: Response, next: NextFunction): any {
    const authHeader = req.headers["authorization"] ?? "";

    try {
        const decoded = jwt.verify(authHeader, WORKER_JWT_SECRETE);
        // @ts-ignore
        if (decoded.userId) {
            // @ts-ignore
            req.userId = decoded.userId;
            return next();
        } else {
            return res.status(403).json({ Message : "you are not logged in"});    
        }
    } catch (e) {
        return res.status(403).json({ Message : "you are not logged in"});
    }
}