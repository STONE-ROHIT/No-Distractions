/**
 * Creates an Error carrying an HTTP status code. Throwing this from any
 * route lets the central error handler respond with the right status and
 * a safe, user-facing message.
 *
 * @param {number} status - HTTP status (400, 401, 404, ...)
 * @param {string} message - Safe message shown to the client
 * @param {object} [fields] - Optional per-field validation messages
 */
export function httpError(status, message, fields) {
  const err = new Error(message)
  err.status = status
  if (fields) err.fields = fields
  return err
}
