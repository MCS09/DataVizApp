import { create } from 'zustand';

interface SharedState {
  aiContext: string;
  aiResponseContext: string;
}

// Define the store's state and methods
interface Store {
  sharedState: SharedState;
  updateState: (newState: Partial<SharedState>) => void;
}

const useStore = create<Store>((set) => ({
  sharedState: { aiContext: '', aiResponseContext: ''},
  updateState: (newState) => set((state) => ({
    sharedState: { ...state.sharedState, ...newState },
  })),
}));

export default useStore;