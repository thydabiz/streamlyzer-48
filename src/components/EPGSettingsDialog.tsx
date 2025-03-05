import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { db } from '../services/database';

interface EPGSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EPGSettingsDialog({ isOpen, onClose }: EPGSettingsDialogProps) {
  const [epgUrl, setEpgUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await db.settings.put({ key: 'epgUrl', value: epgUrl });
      onClose();
    } catch (err) {
      setError('Failed to save EPG settings');
      console.error('Error saving EPG settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-gray-800">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                  EPG Settings
                </Dialog.Title>

                <form onSubmit={handleSubmit} className="mt-4">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="epgUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        EPG URL
                      </label>
                      <input
                        type="url"
                        id="epgUrl"
                        name="epgUrl"
                        value={epgUrl}
                        onChange={(e) => setEpgUrl(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                        placeholder="https://example.com/epg.xml"
                        required
                      />
                    </div>

                    {error && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {error}
                      </p>
                    )}

                    <div className="mt-4 flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
