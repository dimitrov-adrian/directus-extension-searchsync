/**
 * @typedef {(config: object) => {
 *   createIndex: (collection: string) => Promise,
 *   deleteItems: (collection: string) => Promise,
 *   deleteItem: (collection: string, id: string) => Promise,
 *   updateItem: (collection: string, id: string, data: object, pk: ?string) => Promise,
 * }} IndexerInterface
 */

/**
 * @type {Record<string, IndexerInterface>}
 */
module.exports = {
	algolia: require('./algolia'),
	meilisearch: require('./meilisearch'),
	elasticsearch: require('./elasticsearch'),
	elasticsearch_legacy: require('./elasticsearch-legacy.js'),
};
