/**
 * Central error handling. Every thrown error in a route ends up here
 * (Express 5 also forwards errors from async handlers automatically).
 *
 * Rules:
 *  - Client errors (status < 500) return their own message.
 *  - Unexpected errors return a generic message; details are logged
 *    server-side only, never leaked to the response.
 */

function isClientError(status) {
  return status >= 400 && status < 500
}

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Mongoose validation errors -> 400 with a message per field.
  if (err.name === 'ValidationError') {
    const fields = {}
    for (const [path, fieldError] of Object.entries(err.errors)) {
      fields[path] = fieldError.message
    }
    return res.status(400).json({ message: 'Please check the highlighted fields.', fields })
  }

  // Malformed ObjectId in a URL parameter.
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid id in request.' })
  }

  const status = err.status || 500

  if (!isClientError(status)) {
    // Unexpected server error: log the details, keep the response generic.
    console.error('[error]', req.method, req.originalUrl, err)
    return res.status(500).json({ message: 'Something went wrong on our side. Please try again.' })
  }

  return res.status(status).json({
    message: err.message || 'Request failed.',
    ...(err.fields ? { fields: err.fields } : {}),
  })
}

/** Handler for requests that match no route. */
export function notFoundHandler(req, res) {
  res.status(404).json({ message: `No route matches ${req.method} ${req.path}` })
}
