import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Transaction } from '../domain/types';
import { CategoriesScreen } from './CategoriesScreen';
import { FirstRun } from './FirstRun';
import { Home } from './Home';
import { OpeningBalanceDialog } from './OpeningBalanceDialog';
import { SettingsScreen } from './SettingsScreen';
import { useStore } from './store';
import { TransactionForm } from './TransactionForm';
import { SaveFailedDialog, ToastView } from './ui';

type Screen = 'home' | 'settings' | 'categories';

function Shell() {
  const [screen, setScreen] = useState<Screen>('home');
  const [form, setForm] = useState<{ transaction?: Transaction } | null>(null);

  return (
    <>
      {screen === 'home' && (
        <Home onAdd={() => setForm({})} onEdit={(transaction) => setForm({ transaction })} onSettings={() => setScreen('settings')} />
      )}
      {screen === 'settings' && (
        <SettingsScreen onBack={() => setScreen('home')} onCategories={() => setScreen('categories')} />
      )}
      {screen === 'categories' && <CategoriesScreen onBack={() => setScreen('settings')} />}
      {form && <TransactionForm transaction={form.transaction} onClose={() => setForm(null)} />}
    </>
  );
}

export default function App() {
  const { t } = useTranslation();
  const store = useStore();

  let body;
  if (!store.ready) body = <div className="splash" aria-busy="true" />;
  else if (store.storageError)
    body = (
      <div className="screen first-run">
        <h1>{t('form.saveFailedTitle')}</h1>
        <p>{t('form.saveFailedBody')}</p>
      </div>
    );
  else if (!store.settings.onboarded) body = <FirstRun />;
  else body = <Shell />;

  return (
    <div className="app">
      {body}
      {store.openingCheck && (
        <OpeningBalanceDialog
          title={t('import.openingCheckTitle')}
          body={t('import.openingCheckBody')}
          onClose={store.dismissOpeningCheck}
        />
      )}
      <SaveFailedDialog />
      <ToastView />
    </div>
  );
}
