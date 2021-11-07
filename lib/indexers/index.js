/**
 * @type {Record<string, import('../../types.js').IndexerInterface>}
 */
module.exports = {
	algolia: require('./algolia'),
	meilisearch: require('./meilisearch'),
	elasticsearch: require('./elasticsearch'),
	elasticsearch_legacy: require('./elasticsearch-legacy.js'),
};
