
import { 
  Application,
  Gemtext, Line, LineText, LineLink, LineHeading, // LineQuote, LineListItem, LinePreformattingToggle,
  handleRedirects, handleRoutes, Route,
  ConfigArgument, // Redirect,
} from '../deps.mts';

import type {
  JsDoc, Param, Tag, // SeeTag, ExampleTag, ReturnTag, ParamTag, UnsupportedTag,
  Constructor, MethodDef, // FunctionDef, ClassDef,
  Definition, // ClassDefinition,
} from './jsdoc-types.mts';

import { Cache } from './cache.mts';


let 
servingFromCache: boolean = false,
jsdocDir: string,
certFile: string,
keyFile: string,
cacheSize: number,
cache: Cache | null,
hostname: string,
port: number
;

const
_         = new LineText(''),

dirPage = async (path: string):Promise<Line[]> => {
  // console.debug(`dir path: ${path}`);
  try {
    const 
    expandedPath     = `${jsdocDir}/${path}`,
    dirLines: Line[] = [],
    docLines: Line[] = await docPage(`${path}/jsdoc.json`);
  
    // list the subdirectories
    for await (const dirEntry of Deno.readDir(expandedPath)) {
      // // console.debug(`dir: ${dirEntry.name}`);
      if (!dirEntry.isDirectory) continue;
      dirLines.push(new LineLink(`/${path}/${dirEntry.name}`.replace('//','/'), dirEntry.name));
    }

    if (dirLines.length > 0) {
      dirLines.unshift(_);
      dirLines.push(_);
    }

    if (docLines.length > 0) {
      // dirLines.push(new LineHeading(`JSdoc`,2));
      for (const docLine of docLines) {
        dirLines.push(docLine);
      }
    }

    return dirLines;
  } catch (_error) {
    // dirLines.push(new LineHeading('Error'));
    // return [new LineText(`${error}`)];
    return [new LineText('Not found.')];
  }
},

getJsdocLines = (jsdoc: JsDoc):Line[] =>{
  const lines: Line[] = [];
  if(jsdoc.doc) [
    new LineText(jsdoc.doc.trim()), _,
  ];
  for (const tag of (jsdoc.tags as Tag[])) {
    switch (tag.kind) {
      case 'unsupported':
        lines.push(new LineText(`🏷  ${tag.value}`));
        lines.push(_);
        break;

      case 'param':
        lines.push(new LineText(`🏷  @${tag.kind}`));
        lines.push(new LineText(`  {${tag.type}}`));
        lines.push(new LineText(`  🆔 ${tag.name}`));
        lines.push(new LineText(`  💬 ${tag.doc}`));
        lines.push(_);
        break;

      case 'return':
        lines.push(new LineText(`🏷  @${tag.kind} {${tag.type}}`));
        lines.push(_);
        break;

      case 'see':
        try {
          const 
          re    = /\s*\{@link\s+(?<url>[^\s|]+)(?<text>(|.*)?)\}\s*/,
          match = tag.doc.match(re);

          if (match) {
            const 
            url = new URL((match.groups as {url:string}).url),
            text = match.groups?.text.substring(1);

            lines.push(new LineText(`🏷  @${tag.kind}`));
            if (text) {
              lines.push(new LineLink(`${url}`, `${text}`));
            } else {
              lines.push(new LineLink(`${url}`, `${url}`));
            }
          }
          lines.push(_);
        } catch (error) {
          console.error(`🏷  @see tag error: ${error}`);
        }
        break;

      default:
        lines.push(new LineText(`🏷  @${tag.kind} ${tag.doc}`));
        lines.push(_);
        break;
    }
  }
  lines.push(_);
  return lines;
},

getFileInfo = async (path: string): Promise<Deno.FileInfo> => {
  const 
  expandedPath = `${jsdocDir}/${path}`, // BUG? ensure that paths that are outside of jsdocDir are redirected to / ?
  fileInfo     = await Deno.stat(expandedPath);

  return fileInfo;
},

docPage = async (path: string):Promise<Line[]> => {
  // console.debug(`doc path: ${path}`);
  try {
    const 
    expandedPath  = `${jsdocDir}/${path}`,
    json          = await Deno.readTextFile(expandedPath),
    sorter        = (a:Definition | MethodDef,b:Definition | MethodDef)=>{return a.name < b.name ? -1 : (a.name === b.name ? 0 : 1);},
    jsdoc         = (JSON.parse(json) as Array<Definition>).sort(sorter),
    lines: Line[] = [_];

    for (const def of jsdoc) {
      // console.debug(`\nDefinition(name: ${def.name}, kind: ${def.kind})`);
      if (def.kind === 'class' && def.declarationKind === 'export') {
        // header
        let classHeader = `${def.kind} ${def.name}`;
        if (def.classDef.extends) {
          classHeader += ` extends ${def.classDef.extends}`;
        }
        if ((def.classDef.implements as string[]).length>0) {
          classHeader += ` implements ${(def.classDef.implements as string[]).join(', ')}`;
        }
        lines.push(new LineHeading(classHeader, 2));
        lines.push(_);

        // constructor
        for (const constr of (def.classDef.constructors as Constructor[])) {
          // console.debug(`constructor`);
          if (constr.jsDoc) {
            // header
            const 
            paramNames: string = (constr.params as Param[]).map(p => p.name).join(', '),
            constrHeader: string = `constructor(${paramNames})`;

            lines.push(new LineHeading(constrHeader, 3)); lines.push(_);

            if (constr.jsDoc) {
              const jsdocLines = getJsdocLines(constr.jsDoc);

              for (const line of jsdocLines) lines.push(line);
              lines.push(_);
            }
          }
        }
        // lines.push(_);

        // methods
        for (const method of (def.classDef.methods as MethodDef[]).sort(sorter)) {
          // console.debug(`method: ${method.name}`);
          // header
          const 
          staticMarker = method.isStatic ? 'static ' : '',
          asyncMarker = method.functionDef.isAsync ? 'async ' : '',
          paramNames: string = (method.functionDef.params as Param[]).map(p => p.name).join(', '),
          methodHeader: string = method.kind === 'getter' ? `getter ${method.name}` : `${staticMarker}${asyncMarker}${method.name}(${paramNames})`;

          // console.debug(`method header: ${methodHeader}`);
          lines.push(new LineHeading(methodHeader, 3)); lines.push(_);

          if (method.jsDoc) {
            // console.debug(`  reading jsdoc`);
            const jsdocLines = getJsdocLines(method.jsDoc);

            for (const line of jsdocLines) lines.push(line);
            lines.push(_);
          }
        }
        lines.push(_);
      }
    }

    lines.push(_);
    return lines;
  } catch (_error) {
    // console.error(`🔴 doc error: ${error}`);
    return [] as Line[];
    // lines.push(new LineHeading('Error'));
    // lines.push(new LineText(`${error}`));
  }
},

mainRoute = new Route('/', async (ctx) => {
  // // console.debug('main route');
  try {
    const path = '/';

    // prefer returning gemtext from cache
    if (cacheSize > 0) {
      const cached = cache?.get(path);

      if (cached ) {
        const fileInfo = await getFileInfo('');
        let jsdocInfo: Deno.FileInfo | undefined;
        try {
          jsdocInfo = await getFileInfo('jsdoc.json');
        } catch (_error) {
          // console.debug('root dir has no jsdoc.json');
        }
        if (
          fileInfo.mtime && !(cached.timestamp < fileInfo.mtime) &&
          (!jsdocInfo || (jsdocInfo.mtime && !(cached.timestamp < jsdocInfo.mtime)) )
        ) {
          // console.debug(`Serving from cache: '${path}'`);
          servingFromCache = true;
          ctx.response.body = cached.bytes;
          return;
        }
      }
    }

    // generate gemtext from scratch
    const 
    lines = await dirPage(''),
    gemtext = new Gemtext(
      new LineHeading('Qworum JSDoc Server', 1), _,
      ...lines,
    );
    cache?.set(path, gemtext);
    ctx.response.body = gemtext;

  } catch (_error) {
    ctx.response.body =
    new Gemtext(
      // new LineHeading('Error'), _,
      // new LineText(`${error}`)
      new LineHeading('Error', 1), _,
      // new LineText(`${error}`)
      new LineText('Not found.')
    );
  }
}),

// Kaksik BUG/feature: at most one "parameterized route" is allowed !
// Kaksik BUG/feature: `:path` does not match strings that contain "/" !
dirRoute = new Route<{path?: string}>('/:path', async (ctx) => {
  // // console.debug('dir route');
  try {
    const path: string = (ctx.pathParams as {path: string}).path;
    // console.debug(`dir route path: '${path}'`);

    // prefer returning gemtext from cache
    if (cacheSize > 0) {
      const cached = cache?.get(path);
      if (cached ) {
        const fileInfo = await getFileInfo(`${path}/jsdoc.json`);
        if (fileInfo.mtime && !(cached.timestamp < fileInfo.mtime)) {
          // console.debug(`Serving from  cache: '${path}'`);
          servingFromCache = true;
          ctx.response.body = cached.bytes;
          return;
        }
      }
    }

    // generate gemtext from scratch
    const 
    lines = await dirPage(path),
    gemtext = new Gemtext(
      new LineHeading(`${path}`, 1), _,
      ...lines,
    );
    cache?.set(path, gemtext);
    ctx.response.body = gemtext;
  } catch (_error) {
    ctx.response.body =
    new Gemtext(
      new LineHeading('Error', 1), _,
      // new LineText(`${error}`)
      new LineText('Not found.')
    );
  }
}),

/**
 * @see {@link gemini://mozz.us/files/rfc_gemini_favicon.gmi|RFC: Gemini favicon}
*/
// faviconRoute = new Route<{path?: string}>('/favicon.txt', async (ctx) => {
  
//   ctx.response.
// }),

serve = async (): Promise<void> => {
  while(true) try {
    const 
    key: string = await Deno.readTextFile(keyFile),
    cert: string = await Deno.readTextFile(certFile),
    config: ConfigArgument = { key, cert, hostname, port },
    app = new Application(config);

    app.use(async (ctx, next) => {
      servingFromCache = false;

      const ingressDate = new Date();
      
      // console.time(logLine);
      await next();
      // console.debug(ctx.response);
      
      const 
      egressDate = new Date(),
      latencyInMilliseconds = egressDate.getTime() - ingressDate.getTime(),
      latencyTag = ` • ${latencyInMilliseconds} ms`,
      cacheTag = servingFromCache ? ' • from cache' : '',

      /*
      BUG what happens if the request is malformed? 
      
      Here the path is missing (this really happened):
      [2024-05-28T14:14:40.184Z] /robots.txt • 4 ms
      [2024-05-28T19:27:47.974Z] / • 7 ms • from cache
      [2024-05-29T08:15:10.315Z] / • 5 ms • from cache
      [2024-05-29T08:15:11.946Z] / • 1 ms • from cache
      [2024-05-29T08:32:17.921Z]  • 4 ms ⬅︎ ⚠️
      [2024-05-29T08:32:18.086Z] /favicon.txt • 3 ms
      */
      logLine = `[${ingressDate.toISOString()}] ${ctx.request.path}${latencyTag}${cacheTag}`;

      console.info(logLine);
    });

    app.use(handleRedirects(
      // new Redirect('/', '/dir/'),
    ));

    app.use(handleRoutes(
      mainRoute,
      dirRoute,
    ));

    app.use((ctx) => {
      ctx.response.body = new Gemtext(
        new LineHeading('No routes matched'), 
      );
    });
    await app.start();
  } catch (error) {
    console.error('Restarting the server after this error: ', error);
    // return;
  }
};

// await serve();

type ServerConfig = {
  keyFile?: string,
  certFile?: string,
  hostname?: string,
  port?: number,

  jsdocDir?: string,
  cacheSize?: number,
};

const configDefaults: Required<ServerConfig> = {
  keyFile: './cert/key.pem',
  certFile: './cert/cert.pem',
  hostname: '0.0.0.0', 
  port: 1965,

  jsdocDir: './jsdoc',
  cacheSize: 100, 
};

class Server {
  #config: Required<ServerConfig>;

  constructor(config?: ServerConfig) {
    // console.debug('server config', config);
    if (!config) config = {}; // throw new TypeError('Server config required.');
    this.#config = Object.assign(configDefaults, config);
  }

  async run(): Promise<void> {
    keyFile = this.#config.keyFile;
    certFile = this.#config.certFile;
    hostname = this.#config.hostname;
    port = this.#config.port;

    jsdocDir = this.#config.jsdocDir;
    cacheSize = this.#config.cacheSize;

    cache = cacheSize > 0 ? new Cache(cacheSize) : null;

    console.info('Starting the JSDoc server using this configuration:', this.#config);

    await serve();
  }
}

export type {ServerConfig};
export {Server};
