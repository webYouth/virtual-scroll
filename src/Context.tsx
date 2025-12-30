import { createContext } from "react";

export const WheelLockContext = createContext<(lock: boolean) => void>(() => {})