import 'module';
/*#__PURE__*/ import.meta.url;
const LIVING_KEYS = [
    'DOMException',
    'URL',
    'URLSearchParams',
    'EventTarget',
    'NamedNodeMap',
    'Node',
    'Attr',
    'Element',
    'DocumentFragment',
    'DOMImplementation',
    'Document',
    'XMLDocument',
    'CharacterData',
    'Text',
    'CDATASection',
    'ProcessingInstruction',
    'Comment',
    'DocumentType',
    'NodeList',
    'RadioNodeList',
    'HTMLCollection',
    'HTMLOptionsCollection',
    'DOMStringMap',
    'DOMTokenList',
    'StyleSheetList',
    'HTMLElement',
    'HTMLHeadElement',
    'HTMLTitleElement',
    'HTMLBaseElement',
    'HTMLLinkElement',
    'HTMLMetaElement',
    'HTMLStyleElement',
    'HTMLBodyElement',
    'HTMLHeadingElement',
    'HTMLParagraphElement',
    'HTMLHRElement',
    'HTMLPreElement',
    'HTMLUListElement',
    'HTMLOListElement',
    'HTMLLIElement',
    'HTMLMenuElement',
    'HTMLDListElement',
    'HTMLDivElement',
    'HTMLAnchorElement',
    'HTMLAreaElement',
    'HTMLBRElement',
    'HTMLButtonElement',
    'HTMLCanvasElement',
    'HTMLDataElement',
    'HTMLDataListElement',
    'HTMLDetailsElement',
    'HTMLDialogElement',
    'HTMLDirectoryElement',
    'HTMLFieldSetElement',
    'HTMLFontElement',
    'HTMLFormElement',
    'HTMLHtmlElement',
    'HTMLImageElement',
    'HTMLInputElement',
    'HTMLLabelElement',
    'HTMLLegendElement',
    'HTMLMapElement',
    'HTMLMarqueeElement',
    'HTMLMediaElement',
    'HTMLMeterElement',
    'HTMLModElement',
    'HTMLOptGroupElement',
    'HTMLOptionElement',
    'HTMLOutputElement',
    'HTMLPictureElement',
    'HTMLProgressElement',
    'HTMLQuoteElement',
    'HTMLScriptElement',
    'HTMLSelectElement',
    'HTMLSlotElement',
    'HTMLSourceElement',
    'HTMLSpanElement',
    'HTMLTableCaptionElement',
    'HTMLTableCellElement',
    'HTMLTableColElement',
    'HTMLTableElement',
    'HTMLTimeElement',
    'HTMLTableRowElement',
    'HTMLTableSectionElement',
    'HTMLTemplateElement',
    'HTMLTextAreaElement',
    'HTMLUnknownElement',
    'HTMLFrameElement',
    'HTMLFrameSetElement',
    'HTMLIFrameElement',
    'HTMLEmbedElement',
    'HTMLObjectElement',
    'HTMLParamElement',
    'HTMLVideoElement',
    'HTMLAudioElement',
    'HTMLTrackElement',
    'HTMLFormControlsCollection',
    'SVGElement',
    'SVGGraphicsElement',
    'SVGSVGElement',
    'SVGGElement',
    'SVGDefsElement',
    'SVGDescElement',
    'SVGMetadataElement',
    'SVGTitleElement',
    'SVGSymbolElement',
    'SVGSwitchElement',
    'SVGAnimatedPreserveAspectRatio',
    'SVGAnimatedRect',
    'SVGAnimatedString',
    'SVGNumber',
    'SVGPreserveAspectRatio',
    'SVGRect',
    'SVGStringList',
    'Event',
    'BeforeUnloadEvent',
    'BlobEvent',
    'CloseEvent',
    'CustomEvent',
    'MessageEvent',
    'ErrorEvent',
    'HashChangeEvent',
    'PopStateEvent',
    'StorageEvent',
    'ProgressEvent',
    'PageTransitionEvent',
    'SubmitEvent',
    'UIEvent',
    'FocusEvent',
    'InputEvent',
    'MouseEvent',
    'KeyboardEvent',
    'TouchEvent',
    'CompositionEvent',
    'WheelEvent',
    'BarProp',
    'External',
    'Location',
    'History',
    'Screen',
    'Performance',
    'Navigator',
    'Crypto',
    'PluginArray',
    'MimeTypeArray',
    'Plugin',
    'MimeType',
    'FileReader',
    'Blob',
    'File',
    'FileList',
    'ValidityState',
    'DOMParser',
    'XMLSerializer',
    'FormData',
    'XMLHttpRequestEventTarget',
    'XMLHttpRequestUpload',
    'XMLHttpRequest',
    'WebSocket',
    'NodeFilter',
    'NodeIterator',
    'TreeWalker',
    'AbstractRange',
    'Range',
    'StaticRange',
    'Selection',
    'Storage',
    'CustomElementRegistry',
    'ElementInternals',
    'ShadowRoot',
    'MutationObserver',
    'MutationRecord',
    'Headers',
    'AbortController',
    'AbortSignal',
    'Uint8Array',
    'Uint16Array',
    'Uint32Array',
    'Uint8ClampedArray',
    'Int8Array',
    'Int16Array',
    'Int32Array',
    'Float32Array',
    'Float64Array',
    'ArrayBuffer',
    'DeviceMotionEventAcceleration',
    'DeviceMotionEventRotationRate',
    'DOMRectReadOnly',
    'DOMRect',
    'Image',
    'Audio',
    'Option',
    'CSS'
];
const OTHER_KEYS = [
    'addEventListener',
    'alert',
    'blur',
    'cancelAnimationFrame',
    'close',
    'confirm',
    'createPopup',
    'dispatchEvent',
    'document',
    'focus',
    'frames',
    'getComputedStyle',
    'history',
    'innerHeight',
    'innerWidth',
    'length',
    'location',
    'matchMedia',
    'moveBy',
    'moveTo',
    'name',
    'navigator',
    'open',
    'outerHeight',
    'outerWidth',
    'pageXOffset',
    'pageYOffset',
    'parent',
    'postMessage',
    'print',
    'prompt',
    'removeEventListener',
    'requestAnimationFrame',
    'resizeBy',
    'resizeTo',
    'screen',
    'screenLeft',
    'screenTop',
    'screenX',
    'screenY',
    'scroll',
    'scrollBy',
    'scrollLeft',
    'scrollTo',
    'scrollTop',
    'scrollX',
    'scrollY',
    'self',
    'stop',
    'top',
    'Window',
    'window'
];
const KEYS = LIVING_KEYS.concat(OTHER_KEYS);
const SKIP_KEYS = [
    'window',
    'self',
    'top',
    'parent'
];
function getWindowKeys(global, win, additionalKeys = []) {
    const keysArray = [
        ...additionalKeys,
        ...KEYS
    ];
    return new Set(keysArray.concat(Object.getOwnPropertyNames(win)).filter((k)=>{
        if (SKIP_KEYS.includes(k)) return false;
        if (k in global) return keysArray.includes(k);
        return true;
    }));
}
function isClassLike(name) {
    return name[0] === name[0]?.toUpperCase();
}
function installGlobal(global, win, options = {}) {
    const { bindFunctions = true } = options || {};
    const keys = getWindowKeys(global, win, options.additionalKeys);
    const originals = new Map();
    const overrides = new Map();
    for (const key of keys){
        const boundFunction = bindFunctions && 'function' == typeof win[key] && !isClassLike(key) && win[key].bind(win);
        if (key in global) originals.set(key, global[key]);
        Object.defineProperty(global, key, {
            get () {
                if (overrides.has(key)) return overrides.get(key);
                if (boundFunction) return boundFunction;
                return win[key];
            },
            set (v) {
                overrides.set(key, v);
            },
            configurable: true
        });
    }
    global.window = global;
    global.self = global;
    global.top = global;
    global.parent = global;
    if (global.global) global.global = global;
    if (global.document?.defaultView) Object.defineProperty(global.document, 'defaultView', {
        get: ()=>global,
        enumerable: true,
        configurable: true
    });
    for (const k of SKIP_KEYS)keys.add(k);
    return ()=>{
        for (const key of keys)delete global[key];
        originals.forEach((v, k)=>{
            global[k] = v;
        });
    };
}
function addDefaultErrorHandler(window) {
    let userErrorListenerCount = 0;
    const throwUnhandledError = (e)=>{
        if (0 === userErrorListenerCount && null != e.error) process.emit('uncaughtException', e.error);
    };
    const addEventListener = window.addEventListener.bind(window);
    const removeEventListener = window.removeEventListener.bind(window);
    window.addEventListener('error', throwUnhandledError);
    window.addEventListener = function(...args) {
        if ('error' === args[0]) userErrorListenerCount++;
        return addEventListener.apply(this, args);
    };
    window.removeEventListener = function(...args) {
        if ('error' === args[0] && userErrorListenerCount) userErrorListenerCount--;
        return removeEventListener.apply(this, args);
    };
    return ()=>{
        window.removeEventListener('error', throwUnhandledError);
    };
}
export { addDefaultErrorHandler, installGlobal };
