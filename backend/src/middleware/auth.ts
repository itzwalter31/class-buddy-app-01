import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: "ADMIN" | "TEACHER" | "STUDENT";
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


    req.user = {
      id:data.user.id,
      email:data.user.email!,
      role:"ADMIN"
    };


    next();


  } catch(error){

    return res.status(401).json({
      success:false,
      message:"Authentication failed"
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


    // temporary: allow authenticated Supabase users
    next();

  };

}