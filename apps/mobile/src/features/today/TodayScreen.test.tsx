import { act, fireEvent, render, screen } from '@testing-library/react-native';

import TodayScreen from '@/app/(tabs)/index';
import { dayKey } from '@/lib/dates';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

// Real stores, fake edges: no native modules, no network.
jest.mock('@/features/auth', () => {
  const { createSessionStore } = jest.requireActual('@/features/auth/session');
  const useSession = createSessionStore({
    apiUrl: 'https://api.test',
    storage: {
      getRefreshToken: async () => null,
      setRefreshToken: async () => {},
      getCachedUser: async () => null,
      setCachedUser: async () => {},
      clear: async () => {},
    },
    providers: {
      apple: { isAvailable: async () => false, signIn: async () => null },
      google: { isConfigured: () => false, signIn: async () => null, signOut: async () => {} },
    },
    fetch: async () => {
      throw new TypeError('offline');
    },
  });
  return { useSession, api: () => useSession.getState().api };
});

jest.mock('@/features/drinks', () => {
  const store = jest.requireActual('@/features/drinks/store');
  const { useSession } = jest.requireMock('@/features/auth');
  const data = new Map<string, string>();
  let n = 0;
  const useDrinks = store.createDrinkStore({
    api: () => useSession.getState().api,
    storage: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    },
    newId: () => `id-${++n}`,
  });
  return { ...store, useDrinks };
});

const { useSession } = jest.requireMock('@/features/auth');
const { useDrinks } = jest.requireMock('@/features/drinks');

beforeEach(() => {
  useDrinks.getState().reset();
  useSession.setState({
    status: 'signedIn',
    user: {
      id: 'u1',
      email: null,
      display_name: 'Ash',
      timezone: 'UTC',
      daily_goal_ml: 2000,
      created_at: '2026-11-08T00:00:00Z',
      updated_at: '2026-11-08T00:00:00Z',
    },
  });
});

describe('Today screen', () => {
  it("shows today's progress against the user's goal", async () => {
    useDrinks.setState({
      logs: {
        a: {
          id: 'a',
          amountMl: 1500,
          drinkType: 'water',
          loggedAt: new Date().toISOString(),
          dayKey: dayKey(),
          sync: 'synced',
        },
        old: {
          id: 'old',
          amountMl: 900,
          drinkType: 'water',
          loggedAt: '2020-01-01T09:00:00Z',
          dayKey: '2020-01-01',
          sync: 'synced',
        },
      },
    });
    await render(<TodayScreen />);

    expect(screen.getByText('1,500')).toBeTruthy();
    expect(screen.getByText('75%')).toBeTruthy();
    expect(screen.getByText('of 2,000 ml')).toBeTruthy();
    expect(screen.getByText("Only 500 ml to go. We've got this!")).toBeTruthy();
  });

  it('logs a quick-add drink immediately (offline-first)', async () => {
    await render(<TodayScreen />);
    expect(screen.getByText("Let's start the day with a glass!")).toBeTruthy();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Add 250 millilitres (Glass)' }));
    });

    expect(screen.getByRole('progressbar', { name: '250 of 2,000 millilitres' })).toBeTruthy();
    expect(screen.getByLabelText('Delete 250 ml Water')).toBeTruthy();
    expect(screen.getByText(/not synced yet/)).toBeTruthy(); // network is down in this test
  });

  it('deletes a drink from the list', async () => {
    await render(<TodayScreen />);
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Add 500 millilitres (Bottle)' }));
    });
    await act(async () => {
      await fireEvent.press(screen.getByLabelText('Delete 500 ml Water'));
    });
    expect(screen.queryByLabelText('Delete 500 ml Water')).toBeNull();
    expect(screen.getByText('0%')).toBeTruthy();
  });
});
