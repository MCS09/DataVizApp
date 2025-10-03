import { create } from 'zustand';

export interface SharedState {
  aiContext: string;
  aiResponseContext: string;
  cleaningScanStatus: 'idle' | 'running' | 'ready' | 'failed';
}

// Define the store's state and methods
interface Store {
  sharedState: SharedState;
  updateState: (newState: Partial<SharedState>) => void;
}

const useStore = create<Store>((set) => ({
  sharedState: { aiContext: '', aiResponseContext: '', cleaningScanStatus: 'idle' },
  updateState: (newState) => set((state) => ({
    sharedState: { ...state.sharedState, ...newState },
  })),
}));

export default useStore;