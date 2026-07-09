import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';

export function notFoundHandler(_req: Request, res: Response, _next: NextFunction) {
  res.status(404).json({ success: false, message: 'Route not found' });
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(err.statusCode ?? 500).json({ success: false, message: err.message ?? 'Internal server error' });
};
