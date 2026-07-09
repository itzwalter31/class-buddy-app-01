export function successResponse(data: unknown, message = 'Success') {
  return { success: true, message, data };
}

export function errorResponse(message: string, status = 500, details?: unknown) {
  return { success: false, message, status, details };
}
