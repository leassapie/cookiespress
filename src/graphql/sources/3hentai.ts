import {
  GraphQLBoolean, GraphQLInt, GraphQLList,
  GraphQLObjectType, GraphQLString,
} from "graphql";
import { SITES } from "../../utils/constants";
import { scrapeContent as threehentaiGetScrape } from "../../scraper/3hentai/3hentaiGetController";
import { scrapeContent as threehentaiSearchScrape } from "../../scraper/3hentai/3hentaiSearchController";

const ThreehentaiGetDataType = new GraphQLObjectType({
  name: "ThreehentaiGetData",
  fields: {
    title: { type: GraphQLString }, id: { type: GraphQLInt }, tags: { type: new GraphQLList(GraphQLString) },
    total: { type: GraphQLInt }, image: { type: new GraphQLList(GraphQLString) }, upload_date: { type: GraphQLString },
  },
});

const ThreehentaiGetResultType = new GraphQLObjectType({
  name: "ThreehentaiGetResult",
  fields: { success: { type: GraphQLBoolean }, data: { type: ThreehentaiGetDataType }, source: { type: GraphQLString } },
});

const ThreehentaiSearchDataType = new GraphQLObjectType({
  name: "ThreehentaiSearchData",
  fields: { title: { type: GraphQLString }, id: { type: GraphQLInt } },
});

const ThreehentaiSearchResultType = new GraphQLObjectType({
  name: "ThreehentaiSearchResult",
  fields: {
    success: { type: GraphQLBoolean }, data: { type: new GraphQLList(ThreehentaiSearchDataType) },
    page: { type: GraphQLInt }, sort: { type: GraphQLString }, source: { type: GraphQLString },
  },
});

export const ThreehentaiQueriesType = new GraphQLObjectType({
  name: "ThreehentaiQueries",
  fields: {
    get: {
      type: ThreehentaiGetResultType,
      args: { book: { type: GraphQLInt } },
      resolve: async (_: unknown, args: { book: number }) =>
        threehentaiGetScrape(`${SITES.THREEHENTAI}/d/${args.book}`),
    },
    search: {
      type: ThreehentaiSearchResultType,
      args: {
        key: { type: GraphQLString }, page: { type: GraphQLInt, defaultValue: 1 },
        sort: { type: GraphQLString, defaultValue: "recent" },
      },
      resolve: async (_: unknown, args: { key: string; page: number; sort: string }) =>
        threehentaiSearchScrape(`${SITES.THREEHENTAI}/search?q=${args.key}&page=${args.page}&sort=${args.sort}`),
    },
    random: {
      type: ThreehentaiGetResultType,
      resolve: async () => threehentaiGetScrape(`${SITES.THREEHENTAI}/random`),
    },
  },
});