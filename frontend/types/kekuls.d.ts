/* eslint-disable @typescript-eslint/no-explicit-any */
// 由于 Kekule 没有提供类型定义文件，我们在这里创建一个简单的声明文件
// 如有必要，在后期可以对其进行重新改写，以提供更完整的类型定义

// types/kekule.d.ts

declare module 'kekule' {
  export const Kekule: any;
}

declare module 'kekule/theme/default' {
  const content: any;
  export default content;
}