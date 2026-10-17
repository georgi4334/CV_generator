/**
 * Messages for the API's error codes (see `errorMessage`). Codes without an
 * entry show the server's English message.
 */
export const errors = {
  network_error: 'Cannot reach the server. Check your connection.',
  api_unreachable: 'The server is starting up. Try again in a minute.',
  database_unavailable: 'The database is not available right now. Please try again shortly.',
  internal_error: 'Something went wrong on the server.',
  validation_error: 'Some of the information is not valid.',
  unauthorized: 'Sign in to continue.',
  forbidden: 'You are not allowed to do this.',
  forbidden_origin: 'Requests from this site are not allowed.',
  not_found: 'Not found.',
  conflict: 'This was changed somewhere else in the meantime.',
  invalid_credentials: 'Wrong email or password',
  email_taken: 'An account with this email already exists',
  too_many_requests: 'Too many attempts. Please wait a while and try again.',
  invalid_token: 'This link is invalid or has expired',
  wrong_password: 'The password is not correct',
  email_failed: 'The email could not be sent. Please try again later.',
  plan_limit: 'You have reached the limit of your plan.',
  file_too_large: 'Images must be 5 MB or smaller',
  unsupported_type: 'Only PNG, JPEG and WebP images are allowed',
  no_file: 'Choose an image to upload.',
  ai_unavailable: 'AI features are not set up on this server.',
  ai_limit: 'You have used all your AI requests for today. The limit resets at midnight (UTC).',
  ai_busy: 'The AI is busy right now. Try again in a minute.',
  ai_failed: 'The AI could not answer. Please try again.',
  ai_blocked: 'The AI refused to answer this request.',
  invalid_target: 'Choose what to write.',
}
