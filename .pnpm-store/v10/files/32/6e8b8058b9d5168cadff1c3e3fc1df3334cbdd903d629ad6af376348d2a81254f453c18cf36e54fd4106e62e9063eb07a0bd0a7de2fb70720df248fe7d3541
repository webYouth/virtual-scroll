const originalWebpackRequire = __webpack_require__;
__webpack_require__ = new Proxy(function(...args) {
    try {
        return originalWebpackRequire(...args);
    } catch (e) {
        const errMsg = e.message ?? e.toString();
        if (errMsg.includes('__webpack_modules__[moduleId] is not a function')) throw new Error(`[Rstest] Cannot find module "${args[0]}"`);
        throw e;
    }
}, {
    set (target, property, value) {
        target[property] = value;
        originalWebpackRequire[property] = value;
        return true;
    },
    get (target, property) {
        if (property in target) return target[property];
        return originalWebpackRequire[property];
    }
});
__webpack_require__.rstest_original_modules = {};
__webpack_require__.rstest_original_module_factories = {};
__webpack_require__.rstest_unmock = (id)=>{
    const originalModuleFactory = __webpack_require__.rstest_original_module_factories[id];
    if (originalModuleFactory) __webpack_modules__[id] = originalModuleFactory;
    delete __webpack_module_cache__[id];
};
__webpack_require__.rstest_do_unmock = __webpack_require__.rstest_unmock;
__webpack_require__.rstest_require_actual = __webpack_require__.rstest_import_actual = (id)=>{
    const originalModule = __webpack_require__.rstest_original_modules[id];
    const fallbackMod = __webpack_require__(id);
    return originalModule ? originalModule : fallbackMod;
};
__webpack_require__.rstest_mock = (id, modFactory)=>{
    let requiredModule;
    try {
        requiredModule = __webpack_require__(id);
    } catch  {} finally{
        __webpack_require__.rstest_original_modules[id] = requiredModule;
        __webpack_require__.rstest_original_module_factories[id] = __webpack_modules__[id];
    }
    if ('string' == typeof modFactory || 'number' == typeof modFactory) __webpack_module_cache__[id] = {
        exports: __webpack_require__(modFactory)
    };
    else if ('function' == typeof modFactory) {
        const finalModFactory = function(__unused_webpack_module, __webpack_exports__, __webpack_require__1) {
            __webpack_require__1.r(__webpack_exports__);
            const res = modFactory();
            for(const key in res)__webpack_require__1.d(__webpack_exports__, {
                [key]: ()=>res[key]
            });
        };
        __webpack_modules__[id] = finalModFactory;
        delete __webpack_module_cache__[id];
    }
};
__webpack_require__.rstest_mock_require = (id, modFactory)=>{
    let requiredModule;
    try {
        requiredModule = __webpack_require__(id);
    } catch  {} finally{
        __webpack_require__.rstest_original_modules[id] = requiredModule;
        __webpack_require__.rstest_original_module_factories[id] = __webpack_modules__[id];
    }
    if ('string' == typeof modFactory || 'number' == typeof modFactory) __webpack_module_cache__[id] = {
        exports: __webpack_require__(modFactory)
    };
    else if ('function' == typeof modFactory) {
        const exports = modFactory();
        __webpack_require__.r(exports);
        __webpack_module_cache__[id] = {
            exports,
            id,
            loaded: true
        };
    }
};
__webpack_require__.rstest_do_mock = (id, modFactory)=>{
    let requiredModule;
    try {
        requiredModule = __webpack_require__(id);
    } catch  {} finally{
        __webpack_require__.rstest_original_modules[id] = requiredModule;
        __webpack_require__.rstest_original_module_factories[id] = __webpack_modules__[id];
    }
    if ('string' == typeof modFactory || 'number' == typeof modFactory) __webpack_module_cache__[id] = {
        exports: __webpack_require__(modFactory)
    };
    else if ('function' == typeof modFactory) {
        const exports = modFactory();
        __webpack_require__.r(exports);
        __webpack_module_cache__[id] = {
            exports,
            id,
            loaded: true
        };
    }
};
__webpack_require__.rstest_do_mock_require = (id, modFactory)=>{
    let requiredModule;
    try {
        requiredModule = __webpack_require__(id);
    } catch  {} finally{
        __webpack_require__.rstest_original_modules[id] = requiredModule;
        __webpack_require__.rstest_original_module_factories[id] = __webpack_modules__[id];
    }
    if ('string' == typeof modFactory || 'number' == typeof modFactory) __webpack_module_cache__[id] = {
        exports: __webpack_require__(modFactory)
    };
    else if ('function' == typeof modFactory) {
        const exports = modFactory();
        __webpack_require__.r(exports);
        __webpack_module_cache__[id] = {
            exports,
            id,
            loaded: true
        };
    }
};
__webpack_require__.rstest_reset_modules = ()=>{
    const mockedIds = Object.keys(__webpack_require__.rstest_original_modules);
    Object.keys(__webpack_module_cache__).forEach((id)=>{
        if (!mockedIds.includes(id)) delete __webpack_module_cache__[id];
    });
};
__webpack_require__.rstest_hoisted = (fn)=>fn();
