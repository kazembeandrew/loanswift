
export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

/**
 * A custom error class to represent Firestore permission errors with rich context.
 */
export class FirestorePermissionError extends Error {
  public context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    const message = `FirestoreError: Missing or insufficient permissions.`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;

    // This is for V8's stack trace API
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FirestorePermissionError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      context: this.context,
    };
  }
}
