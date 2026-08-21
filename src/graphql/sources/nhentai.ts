import {
  GraphQLBoolean, GraphQLInt, GraphQLList,
  GraphQLObjectType, GraphQLString,
} from "graphql";
import { nhentaiGetUrl, nhentaiRelatedUrl, nhentaiSearchUrl, nhentaiRandomUrl } from "../../utils/nhentai";
import { scrapeContent as nhentaiGetScrape } from "../../scraper/nhentai/nhentaiGetController";
import { scrapeContent as nhentaiSearchScrape } from "../../scraper/nhentai/nhentaiSearchController";
import { scrapeContent as nhentaiRelatedScrape } from "../../scraper/nhentai/nhentaiRelatedController";

const NHentaiTitleType = new GraphQLObjectType({
  name: "NHentaiTitle",
  fields: { english: { type: GraphQLString }, japanese: { type: GraphQLString }, pretty: { type: GraphQLString } },
});

const NHentaiGetDataType = new GraphQLObjectType({
  name: "NHentaiGetData",
  fields: {
    title: { type: GraphQLString },
    optional_title: { type: NHentaiTitleType },
    id: { type: GraphQLInt },
    language: { type: GraphQLString },
    tags: { type: new GraphQLList(GraphQLString) },
    total: { type: GraphQLInt },
    image: { type: new GraphQLList(GraphQLString) },
    num_pages: { type: GraphQLInt },
    num_favorites: { type: GraphQLInt },
    artist: { type: new GraphQLList(GraphQLString) },
    group: { type: GraphQLString },
    parodies: { type: new GraphQLList(GraphQLString) },
    characters: { type: new GraphQLList(GraphQLString) },
    upload_date: { type: GraphQLString },
  },
});

const NHentaiGetResultType = new GraphQLObjectType({
  name: "NHentaiGetResult",
  fields: { success: { type: GraphQLBoolean }, data: { type: NHentaiGetDataType }, source: { type: GraphQLString } },
});

const NHentaiSearchDataType = new GraphQLObjectType({
  name: "NHentaiSearchData",
  fields: {
    title: { type: NHentaiTitleType }, id: { type: GraphQLInt }, language: { type: GraphQLString },
    upload_date: { type: GraphQLString }, total: { type: GraphQLInt }, cover: { type: GraphQLString },
    tags: { type: new GraphQLList(GraphQLString) },
  },
});

const NHentaiSearchResultType = new GraphQLObjectType({
  name: "NHentaiSearchResult",
  fields: {
    success: { type: GraphQLBoolean }, data: { type: new GraphQLList(NHentaiSearchDataType) },
    page: { type: GraphQLInt }, sort: { type: GraphQLString }, source: { type: GraphQLString },
  },
});

const NHentaiRelatedDataType = new GraphQLObjectType({
  name: "NHentaiRelatedData",
  fields: {
    title: { type: NHentaiTitleType }, id: { type: GraphQLInt }, language: { type: GraphQLString },
    upload_date: { type: GraphQLString }, total: { type: GraphQLInt }, tags: { type: new GraphQLList(GraphQLString) },
  },
});

const NHentaiRelatedResultType = new GraphQLObjectType({
  name: "NHentaiRelatedResult",
  fields: {
    success: { type: GraphQLBoolean }, data: { type: new GraphQLList(NHentaiRelatedDataType) },
    source: { type: GraphQLString },
  },
});

export const NHentaiQueriesType = new GraphQLObjectType({
  name: "NHentaiQueries",
  fields: {
    get: {
      type: NHentaiGetResultType,
      args: { book: { type: GraphQLInt } },
      resolve: async (_: unknown, args: { book: number }) => nhentaiGetScrape(nhentaiGetUrl(String(args.book))),
    },
    search: {
      type: NHentaiSearchResultType,
      args: {
        key: { type: GraphQLString },
        page: { type: GraphQLInt, defaultValue: 1 },
        sort: { type: GraphQLString, defaultValue: "date" },
      },
      resolve: async (_: unknown, args: { key: string; page: number; sort: string }) =>
        nhentaiSearchScrape(nhentaiSearchUrl(args.key, args.page, args.sort)),
    },
    random: {
      type: NHentaiGetResultType,
      resolve: async () => nhentaiGetScrape(nhentaiRandomUrl(), true),
    },
    related: {
      type: NHentaiRelatedResultType,
      args: { book: { type: GraphQLInt } },
      resolve: async (_: unknown, args: { book: number }) =>
        nhentaiRelatedScrape(nhentaiRelatedUrl(String(args.book))),
    },
  },
});