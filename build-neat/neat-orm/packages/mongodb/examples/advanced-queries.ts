/**
 * Advanced MongoDB Queries Example
 *
 * Demonstrates aggregation pipelines, text search, and complex queries.
 */

import 'reflect-metadata';
import { Entity, Column } from '@neat-orm/core';
import {
  createMongoAdapter,
  MongoDBRepository,
  createMongoQuery,
  ObjectId,
  MongoDBTextIndex,
  MongoDBGeospatialIndex,
} from '@neat-orm/mongodb';

@Entity('articles')
@MongoDBTextIndex(['title', 'content'])
export class Article {
  @Column({ type: 'ObjectId' })
  _id!: ObjectId;

  @Column()
  title!: string;

  @Column()
  content!: string;

  @Column()
  authorId!: ObjectId;

  @Column()
  category!: string;

  @Column()
  tags!: string[];

  @Column()
  views!: number;

  @Column()
  createdAt!: Date;
}

@Entity('locations')
@MongoDBGeospatialIndex('coordinates', '2dsphere')
export class Location {
  @Column({ type: 'ObjectId' })
  _id!: ObjectId;

  @Column()
  name!: string;

  @Column()
  coordinates!: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
}

async function main() {
  const adapter = createMongoAdapter({
    url: 'mongodb://localhost:27017',
    database: 'neat_orm_advanced',
  });

  await adapter.connect();

  // Aggregation Pipeline Example
  const query = createMongoQuery(adapter, 'articles');

  const popularArticles = await query
    .aggregate([
      // Match articles from this year
      {
        $match: {
          createdAt: { $gte: new Date('2024-01-01') },
        },
      },
      // Group by category
      {
        $group: {
          _id: '$category',
          totalViews: { $sum: '$views' },
          articleCount: { $sum: 1 },
          avgViews: { $avg: '$views' },
        },
      },
      // Sort by total views
      {
        $sort: { totalViews: -1 },
      },
      // Limit to top 5
      {
        $limit: 5 },
    ])
    .execute();

  console.log('Popular categories:', popularArticles.rows);

  // Text Search Example
  const searchResults = await createMongoQuery(adapter, 'articles')
    .where({ $text: { $search: 'typescript mongodb' } })
    .select({ title: 1, score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(10)
    .all();

  console.log('Search results:', searchResults);

  // Geospatial Query Example
  const nearbyLocations = await createMongoQuery(adapter, 'locations')
    .where({
      coordinates: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [-73.97, 40.77], // New York City
          },
          $maxDistance: 5000, // 5km
        },
      },
    })
    .all();

  console.log('Nearby locations:', nearbyLocations);

  // Complex Query with Lookup (JOIN)
  const articlesWithAuthors = await createMongoQuery(adapter, 'articles')
    .aggregate([
      {
        $match: { views: { $gte: 100 } },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'authorId',
          foreignField: '_id',
          as: 'author',
        },
      },
      {
        $unwind: '$author',
      },
      {
        $project: {
          title: 1,
          views: 1,
          authorName: '$author.name',
          authorEmail: '$author.email',
        },
      },
    ])
    .execute();

  console.log('Articles with authors:', articlesWithAuthors.rows);

  await adapter.disconnect();
}

main().catch(console.error);

