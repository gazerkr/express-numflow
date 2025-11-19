import { IncomingMessage, ServerResponse, Server as HttpServer } from 'http'

/**
 * Extended Request interface
 * Express-compatible request with additional properties and methods
 */
export interface Request extends IncomingMessage {
  /**
   * Parsed request body (populated by body parser middleware)
   */
  body?: any

  /**
   * Route parameters
   */
  params?: Record<string, string>

  /**
   * Query string parameters
   */
  query?: Record<string, string | string[]>

  /**
   * Request path (without query string)
   */
  path?: string

  /**
   * Original URL (preserved from initial request, unmodified by middleware)
   */
  originalUrl?: string

  /**
   * Reference to the Application instance
   */
  app?: any

  /**
   * Host (from Host header, includes port)
   * Differs from hostname which excludes port
   */
  host?: string

  /**
   * Hostname (from Host header, without port)
   */
  hostname?: string

  /**
   * Client IP address (considers X-Forwarded-For)
   */
  ip?: string

  /**
   * Array of proxy IPs (from X-Forwarded-For)
   */
  ips?: string[]

  /**
   * Protocol (http or https)
   */
  protocol?: string

  /**
   * True if connection is HTTPS
   */
  secure?: boolean

  /**
   * True if X-Requested-With is XMLHttpRequest
   */
  xhr?: boolean

  /**
   * Parsed cookies (populated by cookie-parser middleware)
   */
  cookies?: Record<string, string>

  /**
   * Parsed signed cookies (populated by cookie-parser middleware)
   */
  signedCookies?: Record<string, string>

  /**
   * Get request header value
   */
  get(name: string): string | undefined

  /**
   * Check if request accepts given content type(s)
   */
  accepts(...types: string[]): string | false

  /**
   * Check if request accepts given charset(s)
   */
  acceptsCharsets(...charsets: string[]): string | false

  /**
   * Check if request accepts given encoding(s)
   */
  acceptsEncodings(...encodings: string[]): string | false

  /**
   * Check if request accepts given language(s)
   */
  acceptsLanguages(...languages: string[]): string | false

  /**
   * Check if Content-Type matches given type(s)
   */
  is(...types: string[]): string | false | null

  /**
   * Base URL (router mount path)
   * The path pattern where a router is mounted
   */
  baseUrl?: string

  /**
   * Current route information
   * Contains path and methods for the matched route
   */
  route?: {
    path: string
    methods: Record<string, boolean>
  }

  /**
   * Subdomain array
   * Array of subdomains in reverse order (Express compatibility)
   */
  subdomains?: string[]

  /**
   * Cache freshness indicator
   * True if cache validators indicate resource is fresh
   */
  fresh?: boolean

  /**
   * Cache staleness indicator
   * Opposite of req.fresh (true if cache is stale)
   */
  stale?: boolean

  /**
   * Parse Range header
   * Returns array of ranges, -1 for malformed, -2 for unsatisfiable/missing
   *
   * @param size - Size of the resource
   * @param options - Options (combine: boolean)
   * @returns Array of ranges, -1 (malformed), or -2 (unsatisfiable/missing)
   */
  range?(size: number, options?: { combine?: boolean }): Array<{ start: number; end: number }> | -1 | -2

  /**
   * Reference to Response object
   * Allows accessing response from request
   */
  res?: Response
}

/**
 * Cookie options for res.cookie()
 */
export interface CookieOptions {
  domain?: string
  encode?: (val: string) => string
  expires?: Date
  httpOnly?: boolean
  maxAge?: number
  path?: string
  secure?: boolean
  signed?: boolean
  sameSite?: boolean | 'lax' | 'strict' | 'none'
}

/**
 * Extended Response interface
 * Express-compatible response with additional methods
 */
export interface Response extends ServerResponse {
  /**
   * Local variables for templates (passed to views)
   * Shared across middleware and accessible in templates
   */
  locals?: Record<string, any>

  /**
   * Set status code
   */
  status(code: number): Response

  /**
   * Send response with automatic Content-Type detection
   */
  send(body?: any): void

  /**
   * Send JSON response
   */
  json(obj: any): void

  /**
   * Send JSONP response
   */
  jsonp(obj: any): void

  /**
   * Redirect to URL
   */
  redirect(url: string): void
  redirect(status: number, url: string): void

  /**
   * Send status code with default message
   */
  sendStatus(code: number): void

  /**
   * Set response header(s)
   */
  set(field: string, value: string | string[]): Response
  set(fields: Record<string, string | string[]>): Response

  /**
   * Alias for set()
   */
  header(field: string, value: string | string[]): Response
  header(fields: Record<string, string | string[]>): Response

  /**
   * Get response header value
   */
  get(field: string): string | string[] | number | undefined

  /**
   * Append value to header
   */
  append(field: string, value: string | string[]): Response

  /**
   * Set Content-Type header
   */
  type(type: string): Response

  /**
   * Set Location header
   */
  location(url: string): Response

  /**
   * Set cookie
   */
  cookie(name: string, value: string, options?: CookieOptions): Response

  /**
   * Clear cookie
   */
  clearCookie(name: string, options?: CookieOptions): Response

  /**
   * Set Content-Disposition header to "attachment"
   * Optionally sets filename and Content-Type based on extension
   *
   * @param filename - Optional filename for the attachment
   * @returns Response for chaining
   */
  attachment(filename?: string): Response

  /**
   * Send file
   */
  sendFile(filePath: string): Promise<void>

  /**
   * Download file (triggers browser download)
   */
  download(filePath: string, filename?: string): Promise<void>

  /**
   * Render template and send HTML response
   */
  render(
    view: string,
    locals?: Record<string, any>,
    callback?: (err: Error | null, html?: string) => void
  ): Promise<void>

  /**
   * Set Link header
   * Appends link relations to the Link header
   */
  links(links: Record<string, string>): Response

  /**
   * Set Vary header
   * Appends field to the Vary header (no duplicates)
   */
  vary(field: string): Response

  /**
   * Content-Type negotiation response
   * Calls handler based on Accept header, sends 406 if no match
   */
  format(obj: Record<string, () => void>): void
}

/**
 * Next function type
 * Function to pass control to the next middleware or route handler
 */
export type NextFunction = (err?: any) => void

/**
 * Parameter callback type
 * Callback invoked when a route parameter is matched
 */
export type ParamCallback = (
  req: Request,
  res: Response,
  next: NextFunction,
  value: string,
  name?: string
) => void | Promise<void>

/**
 * Request handler type
 * Express-style request handler
 */
export type RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>

/**
 * Error handler type
 * Handler that processes errors (4 parameters)
 */
export type ErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>

/**
 * Middleware type
 * Regular middleware or error middleware
 */
export type Middleware = RequestHandler | ErrorHandler

/**
 * Listen callback type
 */
export type ListenCallback = () => void

/**
 * Application settings type
 */
export interface ApplicationSettings {
  [key: string]: any
}

/**
 * Server type (HTTP/HTTPS)
 */
export type Server = HttpServer

/**
 * Route handler type
 * Route handler (req includes params and query, supports middleware system)
 */
export type RouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>

/**
 * Router options
 */
export interface RouteOptions {
  ignoreTrailingSlash?: boolean
  caseSensitive?: boolean
}

/**
 * Light-my-request types for inject() method
 * Not used in express-numflow
 */
// export type { InjectOptions, Response as InjectResponse, CallbackFunc as InjectCallback } from 'light-my-request'
