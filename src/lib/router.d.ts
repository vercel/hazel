declare module "router" {
  import { OutgoingMessage } from "http";

  export default Router;

  type HttpMethods =
    | "get"
    | "post"
    | "put"
    | "head"
    | "delete"
    | "options"
    | "trace"
    | "copy"
    | "lock"
    | "mkcol"
    | "move"
    | "purge"
    | "propfind"
    | "proppatch"
    | "unlock"
    | "report"
    | "mkactivity"
    | "checkout"
    | "merge"
    | "m-search"
    | "notify"
    | "subscribe"
    | "unsubscribe"
    | "patch"
    | "search"
    | "connect";

  export interface RouterOptions {
    strict?: boolean;
    caseSensitive?: boolean;
    mergeParams?: boolean;
  }

  export interface IncomingRequest {
    url?: string;
    method?: string;
    originalUrl?: string;
    params?: Record<string, string>;
  }

  interface BaseRoutedRequest extends IncomingRequest {
    baseUrl: string;
    next?: NextFunction;
    route?: IRoute;
  }

  export type RoutedRequest = BaseRoutedRequest & {
    [key: string]: any;
  };

  export interface NextFunction {
    (err?: any): void;
  }

  type IRoute = Record<HttpMethods, IRouterHandler<IRoute>> & {
    path: string;
    all: IRouterHandler<IRoute>;
  };

  type RequestParamHandler = (
    req: IncomingRequest,
    res: OutgoingMessage,
    next: NextFunction,
    value: string,
    name: string,
  ) => void;

  export interface RouteHandler {
    (req: RoutedRequest, res: OutgoingMessage, next: NextFunction): void;
  }

  export interface RequestHandler {
    (req: IncomingRequest, res: OutgoingMessage, next: NextFunction): void;
  }

  type ErrorRequestHandler = (
    err: any,
    req: IncomingRequest,
    res: OutgoingMessage,
    next: NextFunction,
  ) => void;

  type PathParams = string | RegExp | Array<string | RegExp>;

  type RequestHandlerParams =
    | RouteHandler
    | ErrorRequestHandler
    | Array<RouteHandler | ErrorRequestHandler>;

  interface IRouterMatcher<T> {
    (path: PathParams, ...handlers: RouteHandler[]): T;
    (path: PathParams, ...handlers: RequestHandlerParams[]): T;
  }

  interface IRouterHandler<T> {
    (...handlers: RouteHandler[]): T;
    (...handlers: RequestHandlerParams[]): T;
  }

  type IRouter = Record<HttpMethods, IRouterMatcher<IRouter>> & {
    param(name: string, handler: RequestParamHandler): IRouter;
    param(
      callback: (name: string, matcher: RegExp) => RequestParamHandler,
    ): IRouter;
    all: IRouterMatcher<IRouter>;
    use: IRouterHandler<IRouter> & IRouterMatcher<IRouter>;
    handle: RequestHandler;
    route(prefix: PathParams): IRoute;
  };

  interface RouterConstructor {
    new (options?: RouterOptions): IRouter & RequestHandler;
    (options?: RouterOptions): IRouter & RequestHandler;
  }

  var Router: RouterConstructor;
}
