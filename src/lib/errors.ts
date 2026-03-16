export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public friendlyMessage?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: unknown) {
    super(message, 400, "VALIDATION_ERROR", "Some fields are missing or incorrect. Please check the form and try again.");
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super(
      `${entity} not found: ${id}`,
      404,
      "NOT_FOUND",
      `This ${entity.toLowerCase()} was not found. It may have been removed.`
    );
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED", "Your session has expired. Please log in again.");
    this.name = "UnauthorizedError";
  }
}

export class DuplicateError extends AppError {
  constructor(message: string = "Duplicate event") {
    super(message, 200, "DUPLICATE");
    this.name = "DuplicateError";
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, public rawError?: unknown) {
    super(
      `${service} error: ${message}`,
      502,
      "EXTERNAL_SERVICE_ERROR",
      `Could not connect to ${service}. Please check your ${service} credentials in Settings and try again.`
    );
    this.name = "ExternalServiceError";
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return Response.json(
      {
        error: error.message,
        friendlyMessage: error.friendlyMessage,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  console.error("Unhandled error:", error);
  return Response.json(
    {
      error: "Internal server error",
      friendlyMessage: "Something went wrong. Please try again or contact support.",
      code: "INTERNAL_ERROR",
    },
    { status: 500 }
  );
}
