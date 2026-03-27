function createHttpError(status, message, details) {
  const error = new Error(message);
  error.status = status;

  if (details !== undefined) {
    error.details = details;
  }

  return error;
}

function errorToResponse(error) {
  return {
    error: error.message || 'Unexpected server error',
    details: error.details,
  };
}

module.exports = {
  createHttpError,
  errorToResponse,
};
