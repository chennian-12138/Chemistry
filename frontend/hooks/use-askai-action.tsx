// 本文件用于把「问问 AI」页的标题与「新对话」动作提升到 navbar 里。
// 结构与 use-dataup-action 一致：Context + register/unregister + actions。
// AskAi 页在挂载时注册标题和 newChat 回调，navbar 消费它们渲染到顶栏；
// 离开页面时 unregister，navbar 便不再显示这部分内容。
"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";

interface AskAiActions {
  // 当前会话标题（新会话为空，显示默认名）
  title: string;
  // 「新对话」按钮点击回调
  newChat: () => void;
  // 是否已有页面注册（决定 navbar 是否渲染这部分）
  isAvailable: boolean;
}

const AskAiActionsContext = createContext<{
  register: (actions: Omit<AskAiActions, "isAvailable">) => void;
  unregister: () => void;
  actions: AskAiActions;
}>({
  register: () => {},
  unregister: () => {},
  actions: {
    title: "",
    newChat: () => {},
    isAvailable: false,
  },
});

export function AskAiActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<AskAiActions>({
    title: "",
    newChat: () => {},
    isAvailable: false,
  });

  const register = useCallback(
    (newActions: Omit<AskAiActions, "isAvailable">) => {
      setActions({ ...newActions, isAvailable: true });
    },
    [],
  );

  const unregister = useCallback(() => {
    setActions({
      title: "",
      newChat: () => {},
      isAvailable: false,
    });
  }, []);

  return (
    <AskAiActionsContext.Provider value={{ register, unregister, actions }}>
      {children}
    </AskAiActionsContext.Provider>
  );
}

export const useAskAiActions = () => useContext(AskAiActionsContext);
