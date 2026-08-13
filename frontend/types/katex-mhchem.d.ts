// katex 的 contrib/mhchem 子路径只导出 JS、不附带类型声明，
// 这里补一个模块声明，让副作用导入（注册 \ce 宏）通过 TS 检查。
declare module "katex/contrib/mhchem";
