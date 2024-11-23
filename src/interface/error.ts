export type IErrorResponse = {
  success: false;
  message: string;
  errorMessage: string;
  statusCode: number;
  errorDetails: Record<string, unknown>;
};
