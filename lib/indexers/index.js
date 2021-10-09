/**
 * @typedef {(config: object) => {
 *   createIndex: (collection: string) => Promise,
 *   deleteItems: (collection: string) => Promise,
 *   deleteItem: (collection: string, id: string) => Promise,
 *   updateItem: (collection: string, id: string, data: object, pk: ?string) => Promise,
 * }} IndexerInterface
 */

export { default as algolia } from './algolia.js';
export { default as meilisearch } from './meilisearch.js';
export { default as elasticsearch } from './elasticsearch.js';
export { default as elasticsearch_legacy } from './elasticsearch-legacy.js';
