/**
 * @file articleStore.js
 * @description Nanostores atom for article list state: articles array, pagination info, and current page number.
 */

let store = {
    articles: [],
    pageInfo: {
      endCursor: null,
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null
    },
    currentPage: 1
  };

  const subscribers = new Set();

  export const articleStore = {
    subscribe(callback) {
      subscribers.add(callback);
      callback(store);
      return () => subscribers.delete(callback);
    },
    set(newStore) {
      store = { ...store, ...newStore };
      subscribers.forEach(callback => callback(store));
    },
    update(updater) {
      const newStore = updater(store);
      articleStore.set(newStore);
    }
  };