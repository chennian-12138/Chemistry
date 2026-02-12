// 本文件用于数据上传，保存与重置的按钮创建
// 不涉及按钮的样式，仅用于按钮的功能
"use client";

import { DataupSchema } from "@/types/dataup-shema";
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";

interface DataUpActions {
  reset: () => void;
  //   void返回的是不返回任何值，即这些函数都是用于触发某些操作，而不是返回数据
  exportJSON: () => void;
  submit: () => void;
  loadData: (data: DataupSchema & { id?: string }) => void;
  isAvailable: boolean;
}

// createContext：用于创建一个“空间”，由该hook创建的“父组件”，其内容可以传递给“子组件”，而无需写极度复杂的props。
// 当中，.provider就是所谓的“”父组件
// 如下DataUpActionsContext包含了三个属性：register、unregister、actions
// register与unregister用于注册与注销函数，用于在组件树中传递数据上传相关的函数
// actionsRef用于存储注册的函数，setIsAvailable用于更新isAvailable状态，用于判断是否有组件注册了函数
const DataUpActionsContext = createContext<{
  // 这一部分适用于定义DataUpActionsContext数据类型结构，包含register、unregister、actions
  // 当中，register包含了除了inAvailable以外的其他内容
  // actions则是其余的动作
  register: (actions: Omit<DataUpActions, "isAvailable">) => void;
  unregister: () => void;
  actions: DataUpActions;
}>({
  // 这一段是默认值，要依从上述的DataUpActionsContext数据类型结构
  register: () => {},
  unregister: () => {},
  actions: {
    reset: () => {},
    exportJSON: () => {},
    submit: () => {},
    loadData: () => {},
    isAvailable: false,
  },
});

// 这里定义了Provider，其实就是DataUpActionsContext的具体实现
// 之所以不写在一起，“定义与功能不要写在一起”。谁知道呢
export function DataUpActionsProvider({ children }: { children: ReactNode }) {
  // ReactNode用于表示React组件的子元素，即children属性，可以是任何类型，包括字符串、数字、布尔值、数组、对象、函数等
  const [actions, setActions] = useState<DataUpActions>({
    reset: () => {},
    exportJSON: () => {},
    submit: () => {},
    loadData: () => {},
    isAvailable: false,
  });

  // 如果有组件注册了函数，那么isAvailable就为true，否则为false
  // 将除了isAvailable属性的其他属性赋值给actionsRef.current，
  const register = useCallback(
    (newActions: Omit<DataUpActions, "isAvailable">) => {
      setActions({ ...newActions, isAvailable: true });
    },
    [],
  );

  const unregister = useCallback(() => {
    setActions({
      reset: () => {},
      exportJSON: () => {},
      submit: () => {},
      loadData: () => {},
      isAvailable: false,
    });
  }, []);

  return (
    <DataUpActionsContext.Provider
      value={{
        register,
        unregister,
        actions,
      }}
    >
      {children}
    </DataUpActionsContext.Provider>
  );
}

export const useDataUpActions = () => useContext(DataUpActionsContext);
