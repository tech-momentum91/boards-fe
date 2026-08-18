/** Standard service-layer result shape used across Frappe API wrappers. */
export type ServiceResult<T = unknown> = {
  data?: T;
  error?: string;
  partialErrors?: string[];
};

export type FrappeRpcPayload = Record<string, unknown> & {
  exc_type?: string;
  exc?: string;
  _server_messages?: string;
  message?: unknown;
};
