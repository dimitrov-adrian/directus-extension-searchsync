# Simple search engine indexer

## Supported engines

- MeiliSearch
- ElasticSearch
- Algolia

## How to install

In your Directus installation root

```
npm install dimitrov-adrian/directus-extension-searchsync
```

or yarn

```
yarn add https://github.com/dimitrov-adrian/directus-extension-searchsync
```

Restart directus

## CLI Commands

Usage: `npx directus extension:searchsync <subdommand>`

Subcommands:

- `index` - Reindex all documents from configuration

## Configuration

The extension uses [cosmiconfig](https://github.com/davidtheclark/cosmiconfig#cosmiconfig) for configuration loader with
`searchsync` block or if `EXTENSION_SEARCHSYNC_CONFIG_PATH` is set will try to use the file.

So, configuration should comes from one of next files:

- package.json `"searchsync":{...}`
- .searchsyncrc
- .searchsyncrc.json
- .searchsyncrc.yaml
- .searchsyncrc.yml
- .searchsyncrc.js
- .searchsyncrc.cjs
- searchsync.config.js
- searchsync.config.cjs

### Environment variables

### References

- `server: object` Holds configuration for the search engine
- `batchLimit: number` Batch limit when performing index/reindex (defaults to 100)
- `reindexOnStart: boolean` Performs full reindex of all documents upon Directus starts
- `collections: object` Indexing data definition
- `collections.<collection>.filter: object` The filter query in format like Directus on which item must match to be
  indexed (check [Filter Rules](https://docs.directus.io/reference/filter-rules/#filter-rules))
- `collections.<collection>.deep: object` The deep query in format like Directus on which item must match to be
  indexed (check [Deep Parameter](https://docs.directus.io/reference/query.html#deep))
- `collections.<collection>.fields: array<string>` Fields that will be indexed in Directus format
- `collections.<collection>.transform: function` (Could be defined only if config file is .js) A callback to return
  transformed/formatted data for indexing.
- `collections.<collection>.indexName: string` Force collection name when storing in search index
- `collections.<collection>.collectionField: string` If set, such field with value of the collection name will be added
  to the indexed document. Useful with conjuction with the _indexName_ option

### Examples

#### `.searchsyncrc.json`

```json
{
	"server": {
		"type": "meilisearch",
		"host": "http://search:7700/myindex",
		"key": "the-private-key"
	},
	"batchLimit": 100,
	"reindexOnStart": false,
	"collections": {
		"products": {
			"filter": {
				"status": "published",
				"stock": "inStock"
			},
			"fields": ["title", "image.id", "category.title", "brand.title", "tags", "description", "price", "rating"]
		},
		"posts": {
			"indexName": "blog_posts",
			"collectionField": "_collection",

			"filter": {
				"status": "published"
			},
			"fields": ["title", "teaser", "body", "thumbnail.id"]
		}
	}
}
```

#### `.searchsyncrc.js`

```javascript
const config = {
	server: {
		type: 'meilisearch',
		host: 'http://search:7700',
		key: 'the-private-key',
	},
	reindexOnStart: false,
	batchLimit: 100,
	collections: {
		pages: {
			filter: {
				status: 'published',
			},
			fields: ['title', 'teaser', 'body', 'thumbnail.id'],
			transform: (item, { flattenObject, striptags }) => {
				return {
					...flattenObject(item),
					body: striptags(item.body),
					someCustomValue: 'Hello World!',
				};
			},
		},
	},
};

// Use as object.
module.exports = config;
```

##### Collection transformation callback description

```javascript
/**
 * @param {Object} item
 * @param {{striptags, flattenObject, objectMap}} utils
 * @param {String} collectionName
 * @returns {Object}
 */
function (item, { striptags, flattenObject, objectMap }, collectionName) {
	return item
}
```

#### Search engines config references

##### Meilisearch

```json
{
	"type": "meilisearch",
	"host": "http://search:7700",
	"key": "the-private-key"
}
```

##### Algolia

```json
{
	"type": "algolia",
	"appId": "Application-Id",
	"key": "secret-api-key"
}
```

##### ElasticSearch

New typeless behaviour, use collection names as index name.

```json
{
	"type": "elasticsearch",
	"host": "http://search:9200/"
}
```

Use Authentification.

```json
{
	"type": "elasticsearch",
	"host": "http://search:9200/",
	"username": "elastic",
	"password": "somepassword"
}
```

Ignore ssl-certificate-error.

```json
{
	"type": "elasticsearch",
	"host": "http://search:9200/",
	"ignore_cert": true,
}
```

##### ElasticSearch for 5.x and 6.x

Old type behaviour, use collection names as types.

```json
{
	"type": "elasticsearch_legacy",
	"host": "http://search:9200/projectindex"
}
```
