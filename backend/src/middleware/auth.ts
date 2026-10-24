import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

import prisma from "../config/prisma.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: "ADMIN" | "TEACHER" | "STUDENT";
    schoolId: string;
  };
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);


export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {

  const header = req.headers.authorization;

  const token = header?.startsWith("Bearer ")
    ? header.substring(7)
    : null;


  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication token missing"
    });
  }


  try {

    const { data, error } = await supabase.auth.getUser(token);


    if (error || !data.user) {
      return res.status(401).json({
        success:false,
        message:"Invalid Supabase token"
      });
    }


    const dbUser = await prisma.user.findUnique({
      where: { id: data.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        schoolId: true,
      },
    });

    if (!dbUser) {
      return res.status(403).json({
        success: false,
        message: "Authenticated user is not registered in this application",
      });
    }

    if (!dbUser.schoolId) {
      return res.status(403).json({
        success: false,
        message: "Authenticated user is not assigned to a school",
      });
    }

    if (dbUser.role !== "ADMIN" && dbUser.role !== "TEACHER" && dbUser.role !== "STUDENT") {
      return res.status(403).json({
        success: false,
        message: "Authenticated user does not have an assigned application role",
      });
    }

    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      schoolId: dbUser.schoolId,
    };

    next();


  } catch {
    console.error("Authentication verification failed");
    return res.status(500).json({
      success: false,
      message: "Authentication could not be verified",
    });

  }

}



export function requireRole(
  ...roles:Array<"ADMIN"|"TEACHER"|"STUDENT">
){

  return (
    req:AuthenticatedRequest,
    res:Response,
    next:NextFunction
  )=>{


    if(!req.user){
      return res.status(401).json({
        success:false,
        message:"Authentication required"
      });
    }


    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }

    next();

  };

}