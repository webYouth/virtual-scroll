const CSS_MODULES_REGEX = /\.module\.\w+$/i;
const isCSSModules = ({ resourcePath, resourceQuery, resourceFragment, modules })=>{
    if ('boolean' == typeof modules) return modules;
    if ('string' == typeof modules) return 'global' !== modules;
    const { auto } = modules;
    if ('boolean' == typeof auto) return auto && CSS_MODULES_REGEX.test(resourcePath);
    if (auto instanceof RegExp) return auto.test(resourcePath);
    if ('function' == typeof auto) return auto(resourcePath, resourceQuery, resourceFragment);
    return true;
};
function loader(content) {
    const { resourcePath, resourceQuery, resourceFragment } = this;
    const { modules = true } = this.getOptions() || {};
    if (isCSSModules({
        resourcePath,
        resourceQuery,
        resourceFragment,
        modules
    })) return content;
    return '';
}
export { loader as default };
