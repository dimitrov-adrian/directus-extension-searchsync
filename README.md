# Simple search engine indexer

### Supported engines
- MeiliSearch
- ElasticSearch
- Algolia

### Environment variables
`EXTENSION_SEARCHSYNC_CONFIG` path to `config.json`, if not set then `<extension_directory>/config.json` will be used.

### Example `config.json`

```json
{
  "server": {
    "type": "meilisearch",
    "host": "http://search:7700",
    "key": "the-private-key"
  },
  "reindexOnStart": true,
  "collections": {
    "products": {
      "filter": {
        "status": "published",
        "stock": "inStock"
      },
      "fields": [
        "title",
        "image.id",
        "category.title",
        "brand.title",
        "tags",
        "description",
        "price",
        "rating"
      ]
    },
    "blog_posts": {
      "filter": {
        "status": "published"
      },
      "fields": [
        "title",
        "teaser",
        "body",
        "thumbnail.id"
      ]
    }
  }
}

```


### References
- `server` holds configuration for the search engine
- `reindexOnStart` boolean causing to reindex all documents upon directus starts
- `collections` object that contain definition of how to index items
- `collections.*.filter` the filter query in format like directus on which item must match to be indexed
- `collections.*.fields` array of fields that will be indexed in directus format

##### Meilisearch server config
```json
{
  "type": "meilisearch",
  "host": "http://search:7700",
  "key": "the-private-key"
}
```

##### ElasticSearch server config
```json
{
  "type": "elasticsearch",
  "host": "http://search:7700",
  "key": "the-api-key"
}
```

##### ElasticSearch server config
```json
{
  "type": "algolia",
  "appId": "Application-Id",
  "key": "secret-api-key"
}
```
