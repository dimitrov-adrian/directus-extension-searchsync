# Simple search engine indexer

> ### This extension is in development and could have breaking changes until Directus 9 official releases.

## Supported engines

- MeiliSearch
- ElasticSearch
- Algolia

## How to install

### Install as a dependency in `package.json`

```json
{
	"dependencies": {
		"directus-extension-searchsync": "^dimitrov-adrian/directus-extension-searchsync#v1.0.0-rc.95"
	}
}
```

Then do `npm install`

## CLI Commands

Usage: `npx directus extension:searchsync <subdommand>`

Subcommands:

- `index` - Reindex all documents from configuration

## Configuration

The extension uses [cosmiconfig](https://github.com/davidtheclark/cosmiconfig#cosmiconfig) for configuration loader with
`searchsync` block or if `EXTENSION_SEARCHSYNC_CONFIG_PATH` is set will try to use the file.

Simply `searchsync.config.js` or `searchsync.config.js` should do the trick.

### Environment variables

### References

- `server: object` Holds configuration for the search engine
- `batchLimit: number` Batch limit when performing index/reindex (defaults to 100)
- `reindexOnStart: boolean` Performs full reindex of all documents upon Directus starts
- `collections: object` Indexing data definition
- `collections.<collection>.filter: object` The filter query in format like Directus on which item must match to be
  indexed (check [Filter Rules ](https://docs.directus.io/reference/filter-rules/#filter-rules))
- `collections.<collection>.fields: array<string>` Fields that will be indexed in Directus format
- `collections.<collection>.transform: function` (Could be defined only if config file is .js) A callback to return
  transformed/formatted data for indexing.
- `collections.<collection>.indexName: string` Force collection name when storing in search index
- `collections.<collection>.collectionField: string` If set, such field with value of the collection name will be added
  to the indexed document. Useful with conjuction with the _indexName_ option

### Examples

#### `searchsync.config.json`

```json
{
	"server": {
		"type": "meilisearch",
		"host": "http://search:7700",
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

#### `searchsync.config.js`

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

##### ElasticSearch for 5.x and 6.x

Old type behaviour, use collection names as types.

```json
{
	"type": "elasticsearch_legacy",
	"host": "http://search:9200/projectindex"
}
```
