/* eslint-disable @typescript-eslint/no-explicit-any */
// 由于 Kekule-react 也没有提供类型定义文件，我们在这里创建一个简单的声明文件
// 如有必要，在后期可以对其进行重新改写，以提供更完整的类型定义

declare module 'kekule-react' {
  export const KekuleReact: any;
  export const Components: {
    Viewer: React.ComponentType<any>;
    Composer: React.ComponentType<any>;
    PeriodicTable: React.ComponentType<any>;
  };
}

declare module 'kekule/theme/default' {
  const content: any;
  export default content;
}